import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import type { Tool } from "@langchain/core/tools";
import { v4 as uuidv4 } from "uuid";
import { RUN_SKILL_SCRIPT_TOOL_NAME } from "@/common/constants";
import { getDataSource } from "@/server/db/data-source";
import { UserSkillConfig } from "@/server/db/entities/UserSkillConfig";
import { SkillScriptRun } from "@/server/db/entities/SkillScriptRun";
import { In } from "typeorm";
import { normalizePackFilePath } from "@/server/skill/pack-path";
import { getPackFileContent } from "@/server/skill/pack-files";
import { runSkillScriptInSandbox } from "@/server/skill/skill-script-sandbox";
import { isDailyScriptRunQuotaExceeded } from "@/server/skill/skill-script-quota";
import {
  getSkillScriptDefaultTimeoutMs,
  getSkillScriptMaxRunsPerTurn,
  getSkillScriptMaxRunsPerUserDay,
  getSkillScriptMaxTimeoutMs,
} from "@/server/skill/skill-script-env";
import type { ChatSkillPackRef, ChatTurnCapabilityContext } from "@/server/chat/turn-capabilities";

/** Q15：统计本 Turn run_skill_script spawn 次数与样本（最多 5 条）。 */
export class SkillScriptRunStatsCollector {
  scriptRunCount = 0;
  scriptRunSamples: string[] = [];

  /** 仅 spawn 尝试计入（含失败 exitCode；配额拒绝不计）。 */
  recordAttempt(packName: string, scriptPath: string, exitCode: number | null): void {
    this.scriptRunCount += 1;
    if (this.scriptRunSamples.length < 5) {
      const codeLabel = exitCode === null ? "-" : String(exitCode);
      this.scriptRunSamples.push(`${packName}:${scriptPath}:${codeLabel}`);
    }
  }
}

function isAllowedScriptPath(normalized: string): boolean {
  if (!normalized.startsWith("scripts/")) return false;
  const ext = normalized.slice(normalized.lastIndexOf(".")).toLowerCase();
  return ext === ".py" || ext === ".sh";
}

/**
 * 构建 run_skill_script LangChain Tool。
 * packId 白名单 = 本 Turn loaded refs；spawn 前校验配额并写审计表。
 */
export async function skillPackRefsToRunTools(
  ctx: ChatTurnCapabilityContext,
  refs: ChatSkillPackRef[],
  collector: SkillScriptRunStatsCollector,
): Promise<Tool[]> {
  if (refs.length === 0) return [];

  const allowedIds = new Set(refs.map((r) => r.id));
  const ds = await getDataSource();
  const rows = await ds.getRepository(UserSkillConfig).find({
    where: { userId: ctx.userId, id: In([...allowedIds]) } as any,
  });
  const nameById = new Map(rows.map((r) => [r.id, r.name]));
  const packList = refs.map((r) => `${r.id}: ${nameById.get(r.id) ?? r.id}`).join(", ");

  const description =
    `Run a script from a loaded Skill Pack in a sandboxed subprocess. ` +
    `Only scripts under scripts/ with .py or .sh extensions. ` +
    `No outbound network. Loaded packs only: ${packList}. ` +
    `Use read_skill_file to view source without executing.`;

  const maxTimeout = getSkillScriptMaxTimeoutMs();
  const defaultTimeout = getSkillScriptDefaultTimeoutMs();
  const maxPerTurn = getSkillScriptMaxRunsPerTurn();

  const tool = new DynamicStructuredTool({
    name: RUN_SKILL_SCRIPT_TOOL_NAME,
    description,
    schema: z.object({
      packId: z.string().uuid().describe("UUID of a loaded Skill Pack"),
      path: z
        .string()
        .describe("Must start with scripts/ and end with .py or .sh"),
      args: z.array(z.string()).optional().describe("CLI arguments passed to the script"),
      timeoutMs: z
        .number()
        .int()
        .min(1000)
        .max(maxTimeout)
        .optional()
        .describe(`Execution timeout in ms; default ${defaultTimeout}, max ${maxTimeout}`),
    }),
    func: async ({ packId, path, args: scriptArgs, timeoutMs: inputTimeoutMs }) => {
      const logDenied = (reason: string) => {
        console.info(
          JSON.stringify({
            event: "skill_script_run_denied",
            userId: ctx.userId,
            packId,
            path,
            reason,
          }),
        );
      };

      if (!allowedIds.has(packId)) {
        logDenied("not_loaded");
        return "Error: packId not available in this turn.";
      }

      const normalized = normalizePackFilePath(path);
      if (!normalized || !isAllowedScriptPath(normalized)) {
        logDenied("invalid_path");
        return "Error: path must be under scripts/ and end with .py or .sh";
      }

      const fileRow = await getPackFileContent(ds, ctx.userId, packId, normalized);
      if (!fileRow) {
        logDenied("not_found");
        return `Error: script not found: ${normalized}`;
      }

      if (collector.scriptRunCount >= maxPerTurn) {
        logDenied("quota_turn");
        return `Error: script run quota exceeded for this turn (max ${maxPerTurn}).`;
      }

      if (await isDailyScriptRunQuotaExceeded(ctx.userId)) {
        logDenied("quota_day");
        return `Error: daily script run quota exceeded (max ${getSkillScriptMaxRunsPerUserDay()}).`;
      }

      const timeoutMs = Math.min(inputTimeoutMs ?? defaultTimeout, maxTimeout);
      const started = Date.now();
      const result = await runSkillScriptInSandbox({
        ds,
        userId: ctx.userId,
        packId,
        scriptPath: normalized,
        args: scriptArgs ?? [],
        timeoutMs,
      });

      const packName = nameById.get(packId) ?? packId;
      const durationMs = Date.now() - started;

      if (result.errorSummary === "script_not_found") {
        logDenied("not_found");
        return `Error: script not found: ${normalized}`;
      }
      if (result.errorSummary === "timeout") {
        collector.recordAttempt(packName, normalized, null);
        await ds.getRepository(SkillScriptRun).save({
          id: uuidv4(),
          userId: ctx.userId,
          packId,
          path: normalized,
          exitCode: null,
          durationMs,
          errorSummary: "timeout",
        });
        console.info(
          JSON.stringify({
            event: "skill_script_run",
            userId: ctx.userId,
            packId,
            path: normalized,
            exitCode: null,
            durationMs,
          }),
        );
        return `Error: script timed out after ${timeoutMs}ms`;
      }
      if (result.errorSummary) {
        logDenied("sandbox");
        return `Error: sandbox execution failed: ${result.errorSummary}`;
      }

      collector.recordAttempt(packName, normalized, result.exitCode);
      await ds.getRepository(SkillScriptRun).save({
        id: uuidv4(),
        userId: ctx.userId,
        packId,
        path: normalized,
        exitCode: result.exitCode,
        durationMs,
        errorSummary: null,
      });
      console.info(
        JSON.stringify({
          event: "skill_script_run",
          userId: ctx.userId,
          packId,
          path: normalized,
          exitCode: result.exitCode,
          durationMs,
        }),
      );

      const stderrBlock = result.stderr.trim() ? result.stderr : "";
      return [
        `exitCode: ${result.exitCode ?? "null"}`,
        "stdout:",
        result.stdout || "(empty)",
        "stderr:",
        stderrBlock || "(empty)",
      ].join("\n");
    },
  });

  return [tool as unknown as Tool];
}
