/**
 * 聊天业务与 LangChain Agent 之间的胶水层。
 *
 * 职责：将数据库中的会话 {@link Message} 转为 LangChain `BaseMessage` 序列；调用
 * {@link getAssistantAgent} 做非流式 {@link invokeAssistantReply} 与流式
 * {@link streamAssistantReply}（委托 {@link streamChatAssistantAgentText}）。
 * 模型解析、系统提示、Agent 构建均在 `server/chat/langchain-agent`，本文件不重复实现。
 */
import type { BaseMessage } from "@langchain/core/messages";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { MessageRole } from "@/common/enums";
import type { Message } from "@/server/db/entities/Message";
import type { User } from "@/server/db/entities/User";
import {
  getAssistantAgent,
  streamChatAssistantAgentTextFromAgent,
} from "@/server/chat/langchain-agent";
import {
  applySkillReadStatsToTurnUi,
  applySkillScriptRunStatsToTurnUi,
  type McpTurnUiSnapshot,
  type SkillsTurnUiSnapshot,
} from "@/server/chat/turn-capabilities";
import {
  LoggerCallbackHandler,
  SummarizationLlmCallbackHandler,
  ToolTraceCallbackHandler,
  type ToolTraceEvent,
} from "@/server/llm/callback";

type AssistantRuntimeOptions = {
  /** 与 userId 对应且已加载的 User，可省去模型解析时再查一次 User */
  user?: User;
  /**
   * 会话绑定的助手 id；null/undefined 表示普通对话。
   * 实际模型与系统提示由 {@link getAssistantAgent} 统一解析。
   */
  assistantId?: string | null;
  /** 本轮用户消息，供技能包意图路由 */
  userMessageText?: string;
  /** Agent 构建完成（与 tools/MCP/skills 同源），在首 token 之前调用，用于写入 Turn C1b/C2。 */
  onAgentPrepared?: (payload: {
    mcpTurnUi: McpTurnUiSnapshot;
    skillsTurnUi: SkillsTurnUiSnapshot;
  }) => Promise<void> | void;
  /** Agent 执行完成后注入 read 统计后的 Skills 快照（Q13）。 */
  onSkillsTurnFinalized?: (skillsTurnUi: SkillsTurnUiSnapshot) => Promise<void> | void;
  /** 摘要中间件产出新摘要时回调（用于落库会话摘要）。 */
  onSummary?: (summary: string) => Promise<void> | void;
  /** 采集工具调用事件（含 MCP/Tools）。 */
  onToolEvent?: (event: ToolTraceEvent) => Promise<void> | void;
};

function historyToBaseMessages(history: Message[]): BaseMessage[] {
  const out: BaseMessage[] = [];
  for (const m of history) {
    if (m.role === MessageRole.User) {
      out.push(new HumanMessage(m.content));
    } else if (m.role === MessageRole.Assistant) {
      out.push(new AIMessage(m.content));
    } else {
      out.push(new SystemMessage(m.content));
    }
  }
  return out;
}

function aiMessageContentToString(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((p) =>
        typeof p === "object" && p && "text" in p ? String((p as { text: string }).text) : "",
      )
      .join("");
  }
  return String(content ?? "");
}

function lastAssistantText(messages: BaseMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (AIMessage.isInstance(msg)) {
      return aiMessageContentToString(msg.content);
    }
  }
  return "";
}

/**
 * 基于已持久化的会话消息（含本轮用户消息）生成助手回复文本。
 * 统一经 {@link getAssistantAgent}（LangChain `createAgent`）执行。
 */
export async function invokeAssistantReply(
  historyOrdered: Message[],
  userId: string,
  runtime?: AssistantRuntimeOptions,
): Promise<string> {
  const { agent, mcpTurnUi, skillsTurnUi, skillsReadCollector, skillsRunCollector, disposeMcp } =
    await getAssistantAgent({
      userId,
      user: runtime?.user,
      assistantId: runtime?.assistantId,
      userMessageText: runtime?.userMessageText,
    });
  await runtime?.onAgentPrepared?.({ mcpTurnUi, skillsTurnUi });
  try {
    const state = await agent.invoke(
      {
        messages: historyToBaseMessages(historyOrdered),
      },
      {
        callbacks: [
          // new LoggerCallbackHandler(),
          new SummarizationLlmCallbackHandler({ onSummary: runtime?.onSummary }),
          new ToolTraceCallbackHandler({ onToolEvent: runtime?.onToolEvent }),
        ],
      },
    );
    const finalSkillsUi = applySkillScriptRunStatsToTurnUi(
      applySkillReadStatsToTurnUi(skillsTurnUi, skillsReadCollector),
      skillsRunCollector,
    );
    await runtime?.onSkillsTurnFinalized?.(finalSkillsUi);
    const msgs = (state as { messages?: BaseMessage[] }).messages ?? [];
    return lastAssistantText(msgs);
  } finally {
    await disposeMcp();
  }
}

/**
 * 流式生成助手回复；按片段产出文本增量（用于 SSE）。
 * 与 {@link invokeAssistantReply} 使用同一套 Agent 配置。
 */
export async function* streamAssistantReply(
  historyOrdered: Message[],
  userId: string,
  runtime?: AssistantRuntimeOptions,
): AsyncGenerator<string, void, undefined> {
  const { agent, mcpTurnUi, skillsTurnUi, skillsReadCollector, skillsRunCollector, disposeMcp } =
    await getAssistantAgent({
      userId,
      user: runtime?.user,
      assistantId: runtime?.assistantId,
      userMessageText: runtime?.userMessageText,
    });
  await runtime?.onAgentPrepared?.({ mcpTurnUi, skillsTurnUi });
  try {
    yield* streamChatAssistantAgentTextFromAgent(
      agent,
      { messages: historyToBaseMessages(historyOrdered) },
      [
        new SummarizationLlmCallbackHandler({ onSummary: runtime?.onSummary }),
        new ToolTraceCallbackHandler({ onToolEvent: runtime?.onToolEvent }),
      ],
    );
    const finalSkillsUi = applySkillScriptRunStatsToTurnUi(
      applySkillReadStatsToTurnUi(skillsTurnUi, skillsReadCollector),
      skillsRunCollector,
    );
    await runtime?.onSkillsTurnFinalized?.(finalSkillsUi);
  } finally {
    await disposeMcp();
  }
}
