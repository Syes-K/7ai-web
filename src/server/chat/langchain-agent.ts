/**
 * `/chat` 对话链路的 LangChain Agent 编排（原 `server/llm/assistant.ts`，已迁入 `chat/`）。
 *
 * 职责：用 {@link getChatRuntimeModel} 解析用户侧模型；用 {@link findReadableAssistant} 与默认
 * {@link CHAT_SYSTEM_PROMPT} 解析系统提示；经 {@link resolveAllToolsForAgent} /
 * {@link resolveSystemPromptWithSkills} 加载 tools/MCP/skills（当前均为空占位）；通过 `createAgent` 得到统一执行体。
 * 纯模型构造见 `server/llm/model.ts`；本模块不处理 HTTP 与 TypeORM `Message` 持久化结构。
 *
 * 流式输出见 {@link streamChatAssistantAgentText}（基于 LangGraph `streamEvents`）。
 */
import { createAgent, summarizationMiddleware } from "langchain";
import { AIMessageChunk } from "@langchain/core/messages";
import type { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import {
  CHAT_LANGUAGE_REPLY_SUFFIX,
  CHAT_SYSTEM_PROMPT,
  LLM_SUMMARIZATION_TAG,
} from "@/common/constants";
import { findReadableAssistant } from "@/server/assistant/readable-assistant";
import { getConversationSummaryConfig, getSummaryPromptTemplates } from "@/server/chat/conversation-summary";
import { getChatRuntimeModel, getChatRuntimeSummarizationModel } from "@/server/chat/llm-runtime";
import { getDataSource } from "@/server/db/data-source";
import type { User } from "@/server/db/entities/User";
import {
  resolveAllToolsForAgent,
  resolveSystemPromptWithSkills,
  type McpTurnUiSnapshot,
} from "@/server/chat/turn-capabilities";

export type GetChatAssistantAgentOptions = {
  userId: string;
  /** 与 userId 对应且已加载的 User，可省去模型解析时再查一次 User */
  user?: User | null;
  /**
   * 会话绑定的助手 id；不传或 null 表示普通对话，系统提示为 {@link CHAT_SYSTEM_PROMPT}。
   * 传入时经 {@link findReadableAssistant} 解析提示词（无权限或已删除则回退默认提示）。
   */
  assistantId?: string | null;
};

/**
 * 解析对话使用的系统提示（与 {@link getAssistantAgent} 内逻辑一致，供需要仅取文案的场景复用）。
 */
export async function resolveChatAssistantSystemPrompt(
  options: GetChatAssistantAgentOptions,
): Promise<string> {
  const { userId, assistantId } = options;
  if (!assistantId) {
    return CHAT_SYSTEM_PROMPT;
  }
  const ds = await getDataSource();
  const row = await findReadableAssistant(ds, assistantId, userId);
  return row?.prompt?.trim() ? row.prompt.trim() : CHAT_SYSTEM_PROMPT;
}

/**
 * 获取用于 `/chat` 对话的 LangChain `createAgent` 实例。
 * tools/MCP/skills 经 {@link resolveAllToolsForAgent} / {@link resolveSystemPromptWithSkills} 注入（当前为空列表与空追加）。
 * 普通对话与绑定助手会话均经此入口创建，模型来自用户偏好 {@link getChatRuntimeModel}。
 */
export type GetAssistantAgentResult = {
  agent: Awaited<ReturnType<typeof createAgent>>;
  mcpTurnUi: McpTurnUiSnapshot;
  disposeMcp: () => Promise<void>;
};

export async function getAssistantAgent(options: GetChatAssistantAgentOptions): Promise<GetAssistantAgentResult> {
  const { userId, user, assistantId } = options;
  const model = await getChatRuntimeModel(userId, { user: user ?? undefined });
  const summaryModel = await getChatRuntimeSummarizationModel(userId, { user: user ?? undefined });
  const capCtx = { userId, user, assistantId };
  const baseSystemPrompt = await resolveChatAssistantSystemPrompt({ userId, user, assistantId });
  const [systemPrompt, toolsRes] = await Promise.all([
    resolveSystemPromptWithSkills(baseSystemPrompt, capCtx),
    resolveAllToolsForAgent(capCtx),
  ]);
  const tools = toolsRes.tools;
  const mcpTurnUi = toolsRes.mcpTurnUi;
  const disposeMcp = toolsRes.disposeMcp;
  const summaryCfg = await getConversationSummaryConfig();
  const summaryTemplates = await getSummaryPromptTemplates();
  // LangChain summarizationMiddleware 会对 summaryPrompt 执行 .replace("{messages}", 历史正文)，
  // 模板中必须保留字面量 {messages}。此处仅替换 {maxChars}，不能用 PromptTemplate 一次 format 掉全部占位符。
  const summaryPrompt = summaryTemplates.contextSummarySystem.replace(
    /\{maxChars\}/g,
    String(summaryCfg.maxChars),
  );
  const trigger =
    summaryCfg.mode === "tokens"
      ? { tokens: summaryCfg.summaryTriggerTokens }
      : { messages: summaryCfg.summaryTriggerMessages };
  const keep =
    summaryCfg.mode === "tokens"
      ? { tokens: summaryCfg.summaryKeepTokens }
      : { messages: summaryCfg.summaryKeepMessages };

  const agent = createAgent({
    model,
    systemPrompt: `${systemPrompt}${CHAT_LANGUAGE_REPLY_SUFFIX}`,
    tools,
    middleware: summaryCfg.enabled
      ? [
          summarizationMiddleware({
            // 摘要专用模型由 @/server/llm/model 构造，内置 summarization tag。
            model: summaryModel,
            trigger,
            keep,
            summaryPrefix: summaryTemplates.summarySystemPrefix,
            summaryPrompt,
          }),
        ]
      : [],
  });
  return { agent, mcpTurnUi, disposeMcp };
}

type StreamEventV2 = {
  event?: string;
  data?: { chunk?: unknown };
  tags?: string[];
  metadata?: Record<string, unknown>;
};

function chunkToText(chunk: unknown): string {
  if (typeof chunk === "string") {
    return chunk;
  }
  if (chunk && typeof chunk === "object" && AIMessageChunk.isInstance(chunk)) {
    const c = chunk.content;
    if (typeof c === "string") {
      return c;
    }
    if (Array.isArray(c)) {
      return c
        .map((p) =>
          typeof p === "object" && p && "text" in p ? String((p as { text: string }).text) : "",
        )
        .join("");
    }
  }
  return "";
}

/**
 * 流式执行已构建的 Agent 图，产出与旧版 `model.stream` 类似的文本增量。
 * 使用 LangGraph `streamEvents` 过滤模型分词事件。
 */
export async function* streamChatAssistantAgentTextFromAgent(
  agent: GetAssistantAgentResult["agent"],
  /** LangGraph invoke 状态：`messages` 为 LangChain 消息列表 */
  state: { messages: import("@langchain/core/messages").BaseMessage[] },
  callbacks?: BaseCallbackHandler[],
): AsyncGenerator<string, void, undefined> {
  const eventStream = agent.streamEvents(state, { version: "v2", callbacks });
  for await (const raw of eventStream) {
    const ev = raw as StreamEventV2;
    if (ev.event !== "on_chat_model_stream" || !ev.data?.chunk) {
      continue;
    }
    if (
      (Array.isArray(ev.tags) && ev.tags.includes(LLM_SUMMARIZATION_TAG)) ||
      ev.metadata?.lc_source === LLM_SUMMARIZATION_TAG
    ) {
      continue;
    }
    const text = chunkToText(ev.data.chunk);
    if (text.length > 0) {
      yield text;
    }
  }
}

/**
 * 流式执行同一 {@link getAssistantAgent} 图，产出与旧版 `model.stream` 类似的文本增量。
 */
export async function* streamChatAssistantAgentText(
  options: GetChatAssistantAgentOptions,
  state: { messages: import("@langchain/core/messages").BaseMessage[] },
  callbacks?: BaseCallbackHandler[],
): AsyncGenerator<string, void, undefined> {
  const { agent, disposeMcp } = await getAssistantAgent(options);
  try {
    yield* streamChatAssistantAgentTextFromAgent(agent, state, callbacks);
  } finally {
    await disposeMcp();
  }
}
