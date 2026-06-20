import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import type { Tool } from "@langchain/core/tools";
import { getDataSource } from "@/server/db/data-source";
import { UserSkillConfig } from "@/server/db/entities/UserSkillConfig";
import { In } from "typeorm";
import { normalizePackFilePath } from "@/server/skill/pack-path";
import { getPackFileContent } from "@/server/skill/pack-files";
import type { ChatSkillPackRef, ChatTurnCapabilityContext } from "@/server/chat/turn-capabilities";

/** Q13：统计本 Turn read_skill_file 成功次数与样本（最多 5 条）。 */
export class SkillReadStatsCollector {
  readFileCount = 0;
  readFileSamples: string[] = [];

  recordSuccess(packName: string, path: string): void {
    this.readFileCount += 1;
    if (this.readFileSamples.length < 5) {
      this.readFileSamples.push(`${packName}:${path}`);
    }
  }
}

export const READ_SKILL_FILE_TOOL_NAME = "read_skill_file";

/**
 * 构建 read_skill_file LangChain Tool。
 * packId 白名单 = 本 Turn loaded refs；路径经 normalizePackFilePath；仅读 DB，不 exec。
 */
export async function skillPackRefsToReadTools(
  ctx: ChatTurnCapabilityContext,
  refs: ChatSkillPackRef[],
  collector: SkillReadStatsCollector,
): Promise<Tool[]> {
  if (refs.length === 0) return [];

  const allowedIds = new Set(refs.map((r) => r.id));
  const ds = await getDataSource();
  const rows = await ds.getRepository(UserSkillConfig).find({
    where: { userId: ctx.userId, id: In([...allowedIds]) } as any,
  });
  const nameById = new Map(rows.map((r) => [r.id, r.name]));
  const packList = refs
    .map((r) => `${r.id}: ${nameById.get(r.id) ?? r.id}`)
    .join(", ");

  const description =
    `Read a text file from a loaded Skill Pack. ` +
    `Only paths under packs listed below are allowed. ` +
    `Scripts can be run with run_skill_script when loaded. ` +
    `Available packs: ${packList}`;

  const tool = new DynamicStructuredTool({
    name: READ_SKILL_FILE_TOOL_NAME,
    description,
    schema: z.object({
      packId: z.string().describe("UUID of the Skill Pack (must be in the available packs list)"),
      path: z
        .string()
        .describe("POSIX relative path within the pack, e.g. reference.md or scripts/search.py"),
    }),
    func: async ({ packId, path }) => {
      if (!allowedIds.has(packId)) {
        console.info(
          JSON.stringify({
            event: "skill_read_file",
            packId,
            path,
            ok: false,
            reason: "pack_not_allowed",
          }),
        );
        return "Error: packId not available in this turn.";
      }
      const normalized = normalizePackFilePath(path);
      if (!normalized) {
        console.info(
          JSON.stringify({ event: "skill_read_file", packId, path, ok: false, reason: "invalid_path" }),
        );
        return "Error: invalid path.";
      }
      try {
        const row = await getPackFileContent(ds, ctx.userId, packId, normalized);
        if (!row) {
          console.info(
            JSON.stringify({
              event: "skill_read_file",
              packId,
              path: normalized,
              ok: false,
              reason: "not_found",
            }),
          );
          return `Error: file not found: ${normalized}`;
        }
        const packName = nameById.get(packId) ?? packId;
        collector.recordSuccess(packName, normalized);
        console.info(
          JSON.stringify({
            event: "skill_read_file",
            packId,
            path: normalized,
            ok: true,
          }),
        );
        return row.content;
      } catch {
        console.info(
          JSON.stringify({ event: "skill_read_file", packId, path: normalized, ok: false, reason: "db_error" }),
        );
        return "Error: failed to read file.";
      }
    },
  });

  return [tool as unknown as Tool];
}
