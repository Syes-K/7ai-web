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
import { MCP_CONFIG_MAX_BINDINGS_PER_CHAT_TURN } from "@/common/constants";
import type { User } from "@/server/db/entities/User";
import { UserMcpConfig } from "@/server/db/entities/UserMcpConfig";
import { AssistantMcpBinding } from "@/server/db/entities/AssistantMcpBinding";
import { getDataSource } from "@/server/db/data-source";
import { decryptMcpCredentials } from "@/server/crypto/mcp-credentials-crypto";
import { mcpServerNameForConfigId } from "@/server/mcp/mcp-connection-from-row";
import { openMcpLangChainToolsForChatSession, sanitizeMcpErrorSummary } from "@/server/mcp/mcp-client-tools";

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

/** 预留：服务端「技能包」引用（非 Cursor 编辑器 Skill 文件），后续映射为提示词片段与可选工具子集。 */
export type ChatSkillPackRef = {
  id: string;
};

/** 内置/原生工具（非 MCP）。当前为空数组。 */
export async function loadToolsForChatTurn(_ctx: ChatTurnCapabilityContext): Promise<Tool[]> {
  return [];
}

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

/** 解析本 Turn 应启用的技能包引用。当前为空数组。 */
export async function loadSkillPackRefsForChatTurn(_ctx: ChatTurnCapabilityContext): Promise<ChatSkillPackRef[]> {
  return [];
}

/**
 * 将技能包引用转为追加到系统提示后的额外文案（或后续改为独立 System 消息）。
 * 当前返回空字符串。
 */
export async function skillRefsToExtraSystemText(
  _ctx: ChatTurnCapabilityContext,
  _refs: ChatSkillPackRef[],
): Promise<string> {
  return "";
}

/** 合并原生工具与 MCP 衍生工具，供 Agent 绑定；`mcpTurnUi` 与对话「MCP 工具」面板同源。 */
export async function resolveAllToolsForAgent(ctx: ChatTurnCapabilityContext): Promise<{
  tools: Tool[];
  mcpTurnUi: McpTurnUiSnapshot;
  /** 无 MCP 或打开失败时为 no-op；须在 Agent invoke / 流式结束后再调用 */
  disposeMcp: () => Promise<void>;
}> {
  const native = await loadToolsForChatTurn(ctx);
  if (!ctx.assistantId) {
    return {
      tools: native,
      mcpTurnUi: { assistantMissing: true, configs: [] },
      disposeMcp: async () => undefined,
    };
  }
  const bindings = await loadMcpBindingsForChatTurn(ctx);
  if (bindings.length === 0) {
    return {
      tools: native,
      mcpTurnUi: { assistantMissing: false, configs: [] },
      disposeMcp: async () => undefined,
    };
  }
  const { tools: mcpTools, configs, disposeMcp } = await mcpBindingsToLangChainToolsWithMeta(ctx, bindings);
  return {
    tools: [...native, ...mcpTools],
    mcpTurnUi: { assistantMissing: false, configs },
    disposeMcp,
  };
}

/** 在基础系统提示上追加技能包文案（若有）。 */
export async function resolveSystemPromptWithSkills(
  baseSystemPrompt: string,
  ctx: ChatTurnCapabilityContext,
): Promise<string> {
  const refs = await loadSkillPackRefsForChatTurn(ctx);
  const extra = await skillRefsToExtraSystemText(ctx, refs);
  const t = extra.trim();
  return t ? `${baseSystemPrompt}\n\n${t}` : baseSystemPrompt;
}
