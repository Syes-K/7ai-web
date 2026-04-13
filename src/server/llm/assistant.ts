/**
 * `/chat` 对话链路的 LangChain Agent 层。
 *
 * 职责：用 {@link getChatRuntimeModel} 解析用户侧模型；用 {@link findReadableAssistant} 与默认
 * {@link CHAT_SYSTEM_PROMPT} 解析系统提示；通过 `createAgent`（无工具）得到统一执行体。
 * 普通对话与绑定助手会话共用本模块，不处理 HTTP 与 TypeORM `Message` 持久化结构。
 *
 * 流式输出见 {@link streamChatAssistantAgentText}（基于 LangGraph `streamEvents`）。
 */
import { createAgent } from "langchain";
import { AIMessageChunk } from "@langchain/core/messages";
import { CHAT_SYSTEM_PROMPT } from "@/common/constants";
import { findReadableAssistant } from "@/server/assistant/readable-assistant";
import { getDataSource } from "@/server/db/data-source";
import type { User } from "@/server/db/entities/User";
import { getChatRuntimeModel } from "@/server/chat/llm-runtime";

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
 * 获取用于 `/chat` 对话的 LangChain `createAgent` 实例（无工具，纯对话）。
 * 普通对话与绑定助手会话均经此入口创建，模型来自用户偏好 {@link getChatRuntimeModel}。
 */
export async function getAssistantAgent(options: GetChatAssistantAgentOptions) {
  const { userId, user, assistantId } = options;
  const model = await getChatRuntimeModel(userId, { user: user ?? undefined });
  const systemPrompt = await resolveChatAssistantSystemPrompt({ userId, user, assistantId });

  return createAgent({
    model,
    systemPrompt,
    tools: [],
  });
}

type StreamEventV2 = {
  event?: string;
  data?: { chunk?: unknown };
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
 * 流式执行同一 {@link getAssistantAgent} 图，产出与旧版 `model.stream` 类似的文本增量。
 * 使用 LangGraph `streamEvents` 过滤模型分词事件。
 */
export async function* streamChatAssistantAgentText(
  options: GetChatAssistantAgentOptions,
  /** LangGraph invoke 状态：`messages` 为 LangChain 消息列表 */
  state: { messages: import("@langchain/core/messages").BaseMessage[] },
): AsyncGenerator<string, void, undefined> {
  const agent = await getAssistantAgent(options);
  const eventStream = agent.streamEvents(state, { version: "v2" });
  for await (const raw of eventStream) {
    const ev = raw as StreamEventV2;
    if (ev.event !== "on_chat_model_stream" || !ev.data?.chunk) {
      continue;
    }
    const text = chunkToText(ev.data.chunk);
    if (text.length > 0) {
      yield text;
    }
  }
}
