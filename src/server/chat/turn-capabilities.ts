/**
 * 单轮对话（Turn）的 tools / MCP / skills 加载入口。
 *
 * MCP：助手直接挂载的 MCP 配置（去重），经 {@link loadMcpBindingsForChatTurn} 与
 * {@link mcpBindingsToLangChainTools} 注入 Agent tools。
 * `langchain-agent` 中 {@link getAssistantAgent} 通过 {@link resolveAllToolsForAgent} 与
 * {@link resolveSystemPromptWithSkills} 统一接入，避免在路由或 Agent 内散落逻辑。
 */
import type { Tool } from "@langchain/core/tools";
import { In } from "typeorm";
import {
  MCP_CONFIG_MAX_BINDINGS_PER_CHAT_TURN,
  SKILL_CONFIG_MAX_BINDINGS_PER_CHAT_TURN,
  SKILL_MD_MAX_BODY_LENGTH,
  SKILL_PACK_SKILL_MD_PATH,
} from "@/common/constants";
import type {
  SkillPackSelectionResult,
  SkillPackSkippedRef,
  SkillPackUiRef,
  SkillsTurnUiSnapshot,
} from "@/common/types/skill-turn";
import type { SkillPackIntentResult } from "@/server/skill/skill-pack-intent-agent";
import type { User } from "@/server/db/entities/User";
import { UserMcpConfig } from "@/server/db/entities/UserMcpConfig";
import { UserSkillConfig } from "@/server/db/entities/UserSkillConfig";
import { SkillPackFile } from "@/server/db/entities/SkillPackFile";
import { AssistantMcpBinding } from "@/server/db/entities/AssistantMcpBinding";
import { AssistantSkillBinding } from "@/server/db/entities/AssistantSkillBinding";
import { getDataSource } from "@/server/db/data-source";
import { decryptMcpCredentials } from "@/server/crypto/mcp-credentials-crypto";
import { mcpServerNameForConfigId } from "@/server/mcp/mcp-connection-from-row";
import { openMcpLangChainToolsForChatSession, sanitizeMcpErrorSummary } from "@/server/mcp/mcp-client-tools";
import { stripSkillMdFrontmatter } from "@/server/skill/pack-frontmatter";
import { decideSkillPackIntent } from "@/server/skill/skill-pack-intent-agent";
import {
  SkillReadStatsCollector,
  skillPackRefsToReadTools,
} from "@/server/skill/read-skill-file-tool";
import {
  SkillScriptRunStatsCollector,
  skillPackRefsToRunTools,
} from "@/server/skill/run-skill-script-tool";

export type {
  SkillPackSelectionResult,
  SkillPackSkippedRef,
  SkillPackUiRef,
  SkillsTurnUiSnapshot,
} from "@/common/types/skill-turn";

/** 与 `GetChatAssistantAgentOptions`（`langchain-agent.ts`）对齐的最小上下文，用于解析本 Turn 可用能力。 */
export type ChatTurnCapabilityContext = {
  userId: string;
  user?: User | null;
  assistantId?: string | null;
};

/** 预留：MCP 服务端点或注册 id，后续用于拉取工具定义并转为 LangChain Tool。 */
export type McpServerBinding = {
  id: string;
};

/** 对话 Turn 面板「MCP 工具」步骤展示用：与 {@link resolveAllToolsForAgent} 同源解析。 */
export type McpTurnUiConfigLine = {
  mcpConfigId: string;
  displayName: string;
  toolNames: string[];
  loadOk: boolean;
  errorSummary?: string;
};

export type McpTurnUiSnapshot = {
  /** 无会话助手时为 true，面板提示未启用 MCP */
  assistantMissing: boolean;
  configs: McpTurnUiConfigLine[];
};

function isToolFromServer(toolName: string, serverName: string): boolean {
  // 不同版本适配器的前缀分隔符可能不同，做宽松匹配，避免误判“未拉取到工具”。
  return (
    toolName.startsWith(`${serverName}__`) ||
    toolName.startsWith(`${serverName}_`) ||
    toolName.startsWith(`${serverName}:`) ||
    toolName.includes(serverName)
  );
}

/** 对话 Turn 面板「Skills」步骤展示用（见 {@link buildSkillsTurnUiFromSelection}）。 */
export type SkillsMergeResult = {
  extra: string;
  merged: SkillPackUiRef[];
  skippedCount: number;
  loadFailed: boolean;
};

function emptySkillPackSelection(
  overrides: Partial<SkillPackSelectionResult> = {},
): SkillPackSelectionResult {
  return {
    mountedRefs: [],
    selectedRefs: [],
    mounted: [],
    loaded: [],
    skipped: [],
    skippedCount: 0,
    intentSource: "skipped",
    loadFailed: false,
    ...overrides,
  };
}

async function resolveSkillIdsForChatTurn(ctx: ChatTurnCapabilityContext): Promise<string[]> {
  if (!ctx.assistantId) return [];

  const ds = await getDataSource();
  const bindings = await ds.getRepository(AssistantSkillBinding).find({
    where: { userId: ctx.userId, assistantId: ctx.assistantId } as any,
  });
  const skillIds = [...new Set(bindings.map((b) => b.skillConfigId))].sort();
  if (skillIds.length === 0) return [];

  const configs = await ds.getRepository(UserSkillConfig).find({
    where: { id: In(skillIds), enabled: true } as any,
  });
  const allowed = new Set(configs.map((c) => c.id));
  return skillIds.filter((id) => allowed.has(id)).slice(0, SKILL_CONFIG_MAX_BINDINGS_PER_CHAT_TURN);
}

async function buildSkillsMergeResult(
  ctx: ChatTurnCapabilityContext,
  refs: ChatSkillPackRef[],
): Promise<SkillsMergeResult> {
  if (refs.length === 0) {
    return { extra: "", merged: [], skippedCount: 0, loadFailed: false };
  }

  const ds = await getDataSource();
  const ids = refs.map((r) => r.id);
  const [packRows, skillMdRows] = await Promise.all([
    ds.getRepository(UserSkillConfig).find({
      where: { id: In(ids) } as any,
    }),
    ds.getRepository(SkillPackFile).find({
      where: { packId: In(ids), path: SKILL_PACK_SKILL_MD_PATH } as any,
    }),
  ]);
  const rowById = new Map(packRows.map((r) => [r.id, r]));
  const skillMdByPackId = new Map(skillMdRows.map((r) => [r.packId, r]));

  const blocks: string[] = [];
  const merged: SkillPackUiRef[] = [];
  let skippedCount = 0;

  for (const ref of refs) {
    const row = rowById.get(ref.id);
    if (!row) {
      skippedCount += 1;
      console.warn(
        JSON.stringify({
          event: "skill_skip",
          userId: ctx.userId,
          assistantId: ctx.assistantId ?? null,
          skillConfigId: ref.id,
          reason: "not_found",
        }),
      );
      continue;
    }
    if (!row.enabled) {
      skippedCount += 1;
      console.warn(
        JSON.stringify({
          event: "skill_skip",
          userId: ctx.userId,
          assistantId: ctx.assistantId ?? null,
          skillConfigId: ref.id,
          reason: "disabled",
        }),
      );
      continue;
    }
    const skillMd = skillMdByPackId.get(ref.id);
    if (!skillMd) {
      skippedCount += 1;
      console.warn(
        JSON.stringify({
          event: "skill_skip",
          userId: ctx.userId,
          assistantId: ctx.assistantId ?? null,
          skillConfigId: ref.id,
          reason: "missing_skill_md",
        }),
      );
      continue;
    }
    const { body } = stripSkillMdFrontmatter(skillMd.content);
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      skippedCount += 1;
      console.warn(
        JSON.stringify({
          event: "skill_skip",
          userId: ctx.userId,
          assistantId: ctx.assistantId ?? null,
          skillConfigId: ref.id,
          reason: "missing_skill_md",
        }),
      );
      continue;
    }
    if (trimmedBody.length > SKILL_MD_MAX_BODY_LENGTH) {
      skippedCount += 1;
      console.warn(
        JSON.stringify({
          event: "skill_skip",
          userId: ctx.userId,
          assistantId: ctx.assistantId ?? null,
          skillConfigId: ref.id,
          reason: "body_too_long",
        }),
      );
      continue;
    }
    const name = row.name.trim();
    blocks.push(`## Skill: ${name}\n${trimmedBody}`);
    merged.push({ id: row.id, name });
  }

  const extra = blocks.length > 0 ? blocks.join("\n\n---\n\n") : "";
  return { extra, merged, skippedCount, loadFailed: false };
}

/** 服务端「技能包」引用（非 Cursor 编辑器 Skill 文件）。 */
export type ChatSkillPackRef = {
  id: string;
};
/** 内置/原生工具（非 MCP）。当前为空数组。 */

/** 解析本 Turn 应连接的 MCP 绑定列表（助手挂载的 MCP 配置 id，去重）。 */
export async function loadMcpBindingsForChatTurn(ctx: ChatTurnCapabilityContext): Promise<McpServerBinding[]> {
  if (!ctx.assistantId) return [];

  const ds = await getDataSource();
  const bindings = await ds.getRepository(AssistantMcpBinding).find({
    where: { userId: ctx.userId, assistantId: ctx.assistantId } as any,
  });
  const mcpIds = [...new Set(bindings.map((b) => b.mcpConfigId))].sort();
  if (mcpIds.length === 0) return [];

  const configs = await ds.getRepository(UserMcpConfig).find({
    where: { userId: ctx.userId, id: In(mcpIds), enabled: true } as any,
  });
  const allowed = new Set(configs.map((c) => c.id));
  const ordered = mcpIds.filter((id) => allowed.has(id)).slice(0, MCP_CONFIG_MAX_BINDINGS_PER_CHAT_TURN);
  return ordered.map((id) => ({ id }));
}

/**
 * 将 MCP 绑定转为可传入 `createAgent({ tools })` 的 LangChain Tool 列表，并附带 UI 用元数据。
 * 使用**单一** {@link MultiServerMCPClient} 保持连接至本轮对话结束（见 {@link McpTurnUiConfigLine} 与 `disposeMcp`），
 * 避免 `list_tools` 后立刻 `close` 导致工具 invoke 时报 `Not connected`。
 */
export async function mcpBindingsToLangChainToolsWithMeta(
  ctx: ChatTurnCapabilityContext,
  bindings: McpServerBinding[],
): Promise<{ tools: Tool[]; configs: McpTurnUiConfigLine[]; disposeMcp: () => Promise<void> }> {
  if (bindings.length === 0) {
    return { tools: [], configs: [], disposeMcp: async () => undefined };
  }

  const ds = await getDataSource();
  const ids = bindings.map((b) => b.id);
  const rows = await ds.getRepository(UserMcpConfig).find({
    where: { userId: ctx.userId, id: In(ids), enabled: true } as any,
  });

  const rowById = new Map(rows.map((r) => [r.id, r]));
  const credentialPlainByConfigId = new Map<string, string | null>();
  const decryptFailedLines: McpTurnUiConfigLine[] = [];

  for (const row of rows) {
    let credPlain: string | null = null;
    if (row.credentialsCipher) {
      credPlain = decryptMcpCredentials(row.credentialsCipher);
      if (!credPlain) {
        console.warn(
          JSON.stringify({
            phase: "mcp_list_tools",
            userId: ctx.userId,
            assistantId: ctx.assistantId ?? null,
            mcpConfigId: row.id,
            reason: "credentials_decrypt_failed",
          }),
        );
        decryptFailedLines.push({
          mcpConfigId: row.id,
          displayName: row.name,
          toolNames: [],
          loadOk: false,
          errorSummary: "凭证解密失败（请检查服务端密钥或重新保存凭证）",
        });
        continue;
      }
    }
    credentialPlainByConfigId.set(row.id, credPlain);
  }

  const rowsToConnect = bindings
    .map((b) => rowById.get(b.id))
    .filter((r): r is UserMcpConfig => {
      if (!r) return false;
      return credentialPlainByConfigId.has(r.id);
    });

  if (rowsToConnect.length === 0) {
    const byId = new Map(decryptFailedLines.map((c) => [c.mcpConfigId, c]));
    const configsOrdered = bindings
      .map((b) => byId.get(b.id))
      .filter((c): c is McpTurnUiConfigLine => Boolean(c));
    return { tools: [], configs: configsOrdered, disposeMcp: async () => undefined };
  }

  try {
    const session = await openMcpLangChainToolsForChatSession(rowsToConnect, credentialPlainByConfigId);
    const tools = session.tools;
    const disposeMcp = session.dispose;

    const lineById = new Map<string, McpTurnUiConfigLine>();
    const singleConfigMode = rowsToConnect.length === 1;
    for (const row of rowsToConnect) {
      const serverName = mcpServerNameForConfigId(row.id);
      const rowTools = singleConfigMode
        ? tools
        : tools.filter((t) => isToolFromServer(t.name, serverName));
      lineById.set(row.id, {
        mcpConfigId: row.id,
        displayName: row.name,
        toolNames: rowTools.map((t) => t.name),
        loadOk: rowTools.length > 0,
        errorSummary:
          rowTools.length === 0 ? "未拉取到工具（可能连接失败，或服务端未暴露可用工具）" : undefined,
      });
    }
    for (const line of decryptFailedLines) {
      lineById.set(line.mcpConfigId, line);
    }

    const configsOrdered = bindings
      .map((b) => lineById.get(b.id))
      .filter((c): c is McpTurnUiConfigLine => Boolean(c));

    return { tools, configs: configsOrdered, disposeMcp };
  } catch (e) {
    console.warn(
      JSON.stringify({
        phase: "mcp_list_tools",
        userId: ctx.userId,
        assistantId: ctx.assistantId ?? null,
        reason: "session_open_failed",
        message: sanitizeMcpErrorSummary(e),
      }),
    );
    const failLine = (row: UserMcpConfig): McpTurnUiConfigLine => ({
      mcpConfigId: row.id,
      displayName: row.name,
      toolNames: [],
      loadOk: false,
      errorSummary: sanitizeMcpErrorSummary(e),
    });
    const merged = new Map(decryptFailedLines.map((l) => [l.mcpConfigId, l]));
    for (const row of rowsToConnect) {
      merged.set(row.id, failLine(row));
    }
    const configsOrdered = bindings
      .map((b) => merged.get(b.id))
      .filter((c): c is McpTurnUiConfigLine => Boolean(c));
    return { tools: [], configs: configsOrdered, disposeMcp: async () => undefined };
  }
}

export async function mcpBindingsToLangChainTools(
  ctx: ChatTurnCapabilityContext,
  bindings: McpServerBinding[],
): Promise<{ tools: Tool[]; disposeMcp: () => Promise<void> }> {
  return mcpBindingsToLangChainToolsWithMeta(ctx, bindings);
}

export async function loadToolsForChatTurn(_ctx: ChatTurnCapabilityContext): Promise<Tool[]> {
  return [];
}

/** 解析本 Turn 应启用的技能包引用（mounted = 助手绑定且 enabled）。 */
export async function loadSkillPackRefsForChatTurn(ctx: ChatTurnCapabilityContext): Promise<ChatSkillPackRef[]> {
  try {
    const ids = await resolveSkillIdsForChatTurn(ctx);
    return ids.map((id) => ({ id }));
  } catch (e) {
    console.warn(
      JSON.stringify({
        event: "skills_load_error",
        userId: ctx.userId,
        assistantId: ctx.assistantId ?? null,
        message: e instanceof Error ? e.message : String(e),
      }),
    );
    return [];
  }
}

/**
 * 将技能包引用转为追加到系统提示后的额外文案。
 * 块格式：`## Skill: {name}\n{content}`，块间 `\n\n---\n\n`。
 */
export async function skillRefsToExtraSystemText(
  ctx: ChatTurnCapabilityContext,
  refs: ChatSkillPackRef[],
): Promise<string> {
  try {
    const result = await buildSkillsMergeResult(ctx, refs);
    return result.extra;
  } catch (e) {
    console.warn(
      JSON.stringify({
        event: "skills_load_error",
        userId: ctx.userId,
        assistantId: ctx.assistantId ?? null,
        message: e instanceof Error ? e.message : String(e),
      }),
    );
    return "";
  }
}

/**
 * 单轮技能包选用：alwaysLoad 无条件加载 + 意图路由筛选候选包。
 * selectedRefs / loaded 白名单仅含 merge 成功者（缺 SKILL.md 等不计入）。
 */
export async function resolveSkillPackSelectionForTurn(
  ctx: ChatTurnCapabilityContext,
  userMessageText: string,
): Promise<SkillPackSelectionResult> {
  if (!ctx.assistantId) {
    return emptySkillPackSelection();
  }

  let mountedRefs: ChatSkillPackRef[];
  try {
    mountedRefs = await loadSkillPackRefsForChatTurn(ctx);
  } catch (e) {
    console.warn(
      JSON.stringify({
        event: "skills_load_error",
        userId: ctx.userId,
        assistantId: ctx.assistantId ?? null,
        message: e instanceof Error ? e.message : String(e),
      }),
    );
    return emptySkillPackSelection({ loadFailed: true });
  }

  if (mountedRefs.length === 0) {
    return emptySkillPackSelection();
  }

  const ds = await getDataSource();
  const ids = mountedRefs.map((r) => r.id);
  const packRows = await ds.getRepository(UserSkillConfig).find({
    where: { id: In(ids) } as any,
  });
  const rowById = new Map(packRows.map((r) => [r.id, r]));
  const mounted: SkillPackUiRef[] = mountedRefs
    .map((ref) => {
      const row = rowById.get(ref.id);
      return row ? { id: row.id, name: row.name.trim() } : null;
    })
    .filter((m): m is SkillPackUiRef => Boolean(m));

  const alwaysIds = packRows.filter((p) => p.alwaysLoad && p.enabled).map((p) => p.id);
  const candidateRows = packRows.filter((p) => p.enabled && !alwaysIds.includes(p.id));

  let intentSelectedIds: string[] = [];
  let reasons: SkillPackIntentResult["reasons"] = {};
  let intentSource: SkillPackSelectionResult["intentSource"] = "skipped";

  if (candidateRows.length === 0) {
    intentSource = "always_load";
  } else if (!userMessageText.trim()) {
    intentSource = alwaysIds.length > 0 ? "always_load" : "skipped";
  } else {
    const intent = await decideSkillPackIntent({
      userId: ctx.userId,
      userMessageText,
      packs: candidateRows.map(({ id, name, description }) => ({ id, name, description })),
    });
    intentSelectedIds = intent.selectedIds.filter((id) => candidateRows.some((p) => p.id === id));
    reasons = intent.reasons ?? {};
    intentSource = intent.intentSource === "failed_safe" ? "failed_safe" : "intent_agent";
  }

  const mergeCandidateIds = [...new Set([...alwaysIds, ...intentSelectedIds])];
  const mergeCandidateRefs = mergeCandidateIds.map((id) => ({ id }));
  const mergeResult = await buildSkillsMergeResult(ctx, mergeCandidateRefs);
  const loaded = mergeResult.merged;
  const selectedRefs = loaded.map((l) => ({ id: l.id }));

  const loadedIdSet = new Set(loaded.map((l) => l.id));
  const skipped: SkillPackSkippedRef[] = mounted
    .filter((m) => !loadedIdSet.has(m.id))
    .slice(0, 5)
    .map((m) => {
      const reasonCode = reasons[m.id];
      return reasonCode ? { ...m, reasonCode } : { ...m };
    });

  return {
    mountedRefs,
    selectedRefs,
    mounted,
    loaded,
    skipped,
    skippedCount: mounted.length - loaded.length,
    intentSource,
    loadFailed: false,
  };
}

/** 由 selection 构建 Turn 面板 Skills 快照（与 system prompt / tools 同源）。 */
export function buildSkillsTurnUiFromSelection(
  selection: SkillPackSelectionResult,
  toolsMeta: { readToolEnabled: boolean; runToolEnabled: boolean; assistantMissing?: boolean },
): SkillsTurnUiSnapshot {
  if (toolsMeta.assistantMissing) {
    return {
      assistantMissing: true,
      mounted: [],
      loaded: [],
      readToolEnabled: false,
      runToolEnabled: false,
      readFileCount: 0,
    };
  }
  if (selection.loadFailed) {
    return {
      assistantMissing: false,
      mounted: [],
      loaded: [],
      loadFailed: true,
      readToolEnabled: false,
      runToolEnabled: false,
      readFileCount: 0,
    };
  }
  return {
    assistantMissing: false,
    mounted: selection.mounted,
    loaded: selection.loaded,
    skipped: selection.skipped.length > 0 ? selection.skipped : undefined,
    skippedCount: selection.skippedCount > 0 ? selection.skippedCount : undefined,
    intentSource: selection.intentSource,
    loadFailed: selection.loadFailed,
    readToolEnabled: toolsMeta.readToolEnabled,
    runToolEnabled: toolsMeta.runToolEnabled,
    readFileCount: 0,
  };
}

/** @deprecated 请使用 resolveSkillPackSelectionForTurn + buildSkillsTurnUiFromSelection */
export async function resolveSkillsTurnUiSnapshot(ctx: ChatTurnCapabilityContext): Promise<SkillsTurnUiSnapshot> {
  if (!ctx.assistantId) {
    return buildSkillsTurnUiFromSelection(emptySkillPackSelection(), {
      readToolEnabled: false,
      runToolEnabled: false,
      assistantMissing: true,
    });
  }
  const selection = await resolveSkillPackSelectionForTurn(ctx, "");
  return buildSkillsTurnUiFromSelection(selection, {
    readToolEnabled: selection.selectedRefs.length > 0,
    runToolEnabled: selection.selectedRefs.length > 0,
  });
}

/** Agent 完成后合并 read 统计。 */
export function applySkillReadStatsToTurnUi(
  base: SkillsTurnUiSnapshot,
  collector: SkillReadStatsCollector,
): SkillsTurnUiSnapshot {
  return {
    ...base,
    readFileCount: collector.readFileCount,
    readFileSamples:
      collector.readFileSamples.length > 0 ? [...collector.readFileSamples] : undefined,
  };
}

/** Agent 完成后合并 run 统计。 */
export function applySkillScriptRunStatsToTurnUi(
  base: SkillsTurnUiSnapshot,
  collector: SkillScriptRunStatsCollector,
): SkillsTurnUiSnapshot {
  return {
    ...base,
    scriptRunCount: collector.scriptRunCount,
    scriptRunSamples:
      collector.scriptRunSamples.length > 0 ? [...collector.scriptRunSamples] : undefined,
  };
}

/** 合并原生工具、Skill read/run tool 与 MCP 衍生工具。 */
export async function resolveAllToolsForAgent(
  ctx: ChatTurnCapabilityContext,
  selectedRefs: ChatSkillPackRef[] = [],
  _selection?: SkillPackSelectionResult | null,
): Promise<{
  tools: Tool[];
  mcpTurnUi: McpTurnUiSnapshot;
  skillsReadCollector: SkillReadStatsCollector;
  skillsRunCollector: SkillScriptRunStatsCollector;
  disposeMcp: () => Promise<void>;
}> {
  const native = await loadToolsForChatTurn(ctx);
  const skillsReadCollector = new SkillReadStatsCollector();
  const skillsRunCollector = new SkillScriptRunStatsCollector();

  if (!ctx.assistantId) {
    return {
      tools: native,
      mcpTurnUi: { assistantMissing: true, configs: [] },
      skillsReadCollector,
      skillsRunCollector,
      disposeMcp: async () => undefined,
    };
  }

  const bindings = await loadMcpBindingsForChatTurn(ctx);

  const skillTools =
    selectedRefs.length > 0
      ? [
          ...(await skillPackRefsToReadTools(ctx, selectedRefs, skillsReadCollector)),
          ...(await skillPackRefsToRunTools(ctx, selectedRefs, skillsRunCollector)),
        ]
      : [];

  let mcpTools: Tool[] = [];
  let mcpTurnUi: McpTurnUiSnapshot = { assistantMissing: false, configs: [] };
  let disposeMcp: () => Promise<void> = async () => undefined;

  if (bindings.length > 0) {
    const mcpRes = await mcpBindingsToLangChainToolsWithMeta(ctx, bindings);
    mcpTools = mcpRes.tools;
    mcpTurnUi = { assistantMissing: false, configs: mcpRes.configs };
    disposeMcp = mcpRes.disposeMcp;
  }

  return {
    tools: [...native, ...skillTools, ...mcpTools],
    mcpTurnUi,
    skillsReadCollector,
    skillsRunCollector,
    disposeMcp,
  };
}

/** 在基础系统提示上追加已选用技能包文案（若有）。 */
export async function resolveSystemPromptWithSkills(
  baseSystemPrompt: string,
  ctx: ChatTurnCapabilityContext,
  selectedRefs?: ChatSkillPackRef[],
): Promise<string> {
  const refs = selectedRefs ?? (await loadSkillPackRefsForChatTurn(ctx));
  const extra = await skillRefsToExtraSystemText(ctx, refs);
  const t = extra.trim();
  return t ? `${baseSystemPrompt}\n\n${t}` : baseSystemPrompt;
}
