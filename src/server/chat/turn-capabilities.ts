/**
 * 单轮对话（Turn）的 tools / MCP / skills 加载入口。
 *
 * 当前各列表均为空实现，占位后续按助手、用户权限、会话绑定注入。
 * `langchain-agent` 中 {@link getAssistantAgent} 通过 {@link resolveAllToolsForAgent} 与
 * {@link resolveSystemPromptWithSkills} 统一接入，避免在路由或 Agent 内散落逻辑。
 */
import type { Tool } from "@langchain/core/tools";
import type { User } from "@/server/db/entities/User";

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

/** 预留：服务端「技能包」引用（非 Cursor 编辑器 Skill 文件），后续映射为提示词片段与可选工具子集。 */
export type ChatSkillPackRef = {
  id: string;
};

/** 内置/原生工具（非 MCP）。当前为空数组。 */
export async function loadToolsForChatTurn(_ctx: ChatTurnCapabilityContext): Promise<Tool[]> {
  return [];
}

/** 解析本 Turn 应连接的 MCP 绑定列表。当前为空数组。 */
export async function loadMcpBindingsForChatTurn(_ctx: ChatTurnCapabilityContext): Promise<McpServerBinding[]> {
  return [];
}

/**
 * 将 MCP 绑定转为可传入 `createAgent({ tools })` 的 LangChain Tool 列表。
 * 当前为空实现。
 */
export async function mcpBindingsToLangChainTools(
  _ctx: ChatTurnCapabilityContext,
  _bindings: McpServerBinding[],
): Promise<Tool[]> {
  return [];
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

/** 合并原生工具与 MCP 衍生工具，供 Agent 绑定。 */
export async function resolveAllToolsForAgent(ctx: ChatTurnCapabilityContext): Promise<Tool[]> {
  const [native, bindings] = await Promise.all([loadToolsForChatTurn(ctx), loadMcpBindingsForChatTurn(ctx)]);
  const mcpTools = await mcpBindingsToLangChainTools(ctx, bindings);
  return [...native, ...mcpTools];
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
