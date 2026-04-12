import type { BaseMessage } from "@langchain/core/messages";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { MessageRole } from "@/common/enums";
import type { Message } from "@/server/db/entities/Message";
import type { User } from "@/server/db/entities/User";
import { getChatRuntimeModel } from "./llm-runtime";

type AssistantRuntimeOptions = {
  /** 与 userId 对应且已加载的 User，可省去模型解析时再查一次 User */
  user?: User;
};

const CHAT_SYSTEM_PROMPT = "你是一个有帮助的中文助手，回答简洁、准确。";

function toLangChainMessages(history: Message[]): BaseMessage[] {
  const out: BaseMessage[] = [new SystemMessage(CHAT_SYSTEM_PROMPT)];
  for (const m of history) {
    if (m.role === MessageRole.User) {
      out.push(new HumanMessage(m.content));
    } else if (m.role === MessageRole.Assistant) {
      out.push(new AIMessage(m.content));
    } else {
      out.push(new HumanMessage(`[system]\n${m.content}`));
    }
  }
  return out;
}

/**
 * 基于已持久化的会话消息（含本轮用户消息）生成助手回复文本。
 */
export async function invokeAssistantReply(
  historyOrdered: Message[],
  userId: string,
  runtime?: AssistantRuntimeOptions,
): Promise<string> {
  const model = await getChatRuntimeModel(userId, { user: runtime?.user });
  const res = await model.invoke(toLangChainMessages(historyOrdered));
  const content = res.content;
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((p) => (typeof p === "object" && p && "text" in p ? String((p as { text: string }).text) : ""))
      .join("");
  }
  return String(content ?? "");
}

/**
 * 流式生成助手回复；按片段产出文本增量（用于 SSE）。
 */
export async function* streamAssistantReply(
  historyOrdered: Message[],
  userId: string,
  runtime?: AssistantRuntimeOptions,
): AsyncGenerator<string, void, undefined> {
  const model = await getChatRuntimeModel(userId, { user: runtime?.user });
  const stream = await model.stream(toLangChainMessages(historyOrdered));
  for await (const chunk of stream) {
    const c = chunk.content;
    if (typeof c === "string" && c.length > 0) {
      yield c;
    } else if (Array.isArray(c)) {
      const text = c
        .map((p) =>
          typeof p === "object" && p && "text" in p ? String((p as { text: string }).text) : "",
        )
        .join("");
      if (text.length > 0) {
        yield text;
      }
    }
  }
}
