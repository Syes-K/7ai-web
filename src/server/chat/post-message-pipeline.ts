/**
 * POST /api/chat/.../messages 单轮分支步骤（对齐 iterations/0.1.7/design/pipeline-branch-steps.md）。
 * 路由层负责 A1/A2 与流式分支；本模块承载 B（历史与输入侧摘要）、C（知识库注入）、E（摘要落库回调工厂）。
 */
import type { DataSource } from "typeorm";
import { NextResponse } from "next/server";
import { CHAT_USER_MESSAGE_MAX_LENGTH } from "@/common/constants";
import { ErrorCode, HttpStatus, MessageRole } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";
import { getConversationSummaryConfig, getSummaryPromptTemplates } from "@/server/chat/conversation-summary";
import { titleFromFirstUserMessage } from "@/server/chat/conversation-title";
import { buildKnowledgeInjectionForChat } from "@/server/knowledge-base/injection";
import type { KnowledgeInjectionResult } from "@/server/knowledge-base/injection";
import { Conversation } from "@/server/db/entities/Conversation";
import { Message } from "@/server/db/entities/Message";
import type { User } from "@/server/db/entities/User";
import { v4 as uuidv4 } from "uuid";
import type { Repository } from "typeorm";
import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";

export type PostMessageBody = { content?: unknown; stream?: unknown; retryUserMessageId?: unknown };

export type ValidatePostMessageBodyResult =
  | { ok: true; content: string; stream: boolean; retryUserMessageId: string | null }
  | { ok: false; response: NextResponse };

/** A1：解析并校验 POST body（不含鉴权）。 */
export function validatePostMessageBody(body: PostMessageBody): ValidatePostMessageBodyResult {
  const contentRaw = body.content;
  if (typeof contentRaw !== "string") {
    return {
      ok: false,
      response: jsonError(
        ErrorCode.VALIDATION_ERROR,
        "content 无效",
        HttpStatus.UNPROCESSABLE_ENTITY,
        [{ field: "content", message: "须为非空字符串" }],
      ),
    };
  }

  const content = [...contentRaw.trim()].join("");
  if (!content) {
    return {
      ok: false,
      response: jsonError(
        ErrorCode.VALIDATION_ERROR,
        "content 不能为空",
        HttpStatus.UNPROCESSABLE_ENTITY,
        [{ field: "content", message: "不能为空" }],
      ),
    };
  }

  if ([...content].length > CHAT_USER_MESSAGE_MAX_LENGTH) {
    return {
      ok: false,
      response: jsonError(
        ErrorCode.VALIDATION_ERROR,
        "content 过长",
        HttpStatus.UNPROCESSABLE_ENTITY,
        [{ field: "content", message: `长度不能超过 ${CHAT_USER_MESSAGE_MAX_LENGTH} 个字符` }],
      ),
    };
  }

  const retryUserMessageId =
    typeof body.retryUserMessageId === "string" && body.retryUserMessageId.trim()
      ? body.retryUserMessageId.trim()
      : null;
  return { ok: true, content, stream: body.stream === true, retryUserMessageId };
}

/** B2：拉取会话全量历史（升序）。 */
export async function loadFullHistoryForConversation(
  ds: DataSource,
  conversationId: string,
): Promise<Message[]> {
  const msgRepo = ds.getRepository(Message);
  return msgRepo.find({
    where: { conversationId },
    order: { sortOrder: "ASC" },
  });
}

export type ApplyPersistedSummaryWindowResult = {
  historyForModel: Message[];
  summaryCutoffCandidate: number | null;
};

/**
 * B1～B4：在已有全量 history 上应用落库摘要窗口；配置异常时回退全量历史。
 * 对应 design 中 `loadSummaryConfig` + `applyPersistedSummaryWindow` + `fallbackFullHistoryOnConfigError`。
 */
export async function applyPersistedSummaryWindow(options: {
  conv: Conversation;
  history: Message[];
}): Promise<ApplyPersistedSummaryWindowResult> {
  const { conv, history } = options;
  let historyForModel = history;
  let sourceMessagesForModel = history;
  let summaryCutoffCandidate: number | null = null;

  try {
    const summaryCfg = await getConversationSummaryConfig();
    const summaryText = conv.contextSummary?.trim();
    const minRecentMessages = Math.max(1, summaryCfg.summaryMinRecentMessages);
    if (summaryCfg.enabled && summaryText) {
      const templates = await getSummaryPromptTemplates();
      const cutoff = conv.contextSummaryCutoffSortOrder ?? -1;
      const afterCutoff = history.filter((m) => m.sortOrder > cutoff);
      const recent =
        afterCutoff.length >= minRecentMessages
          ? afterCutoff
          : history.slice(-minRecentMessages);
      sourceMessagesForModel = recent;
      const summaryInjected = {
        role: MessageRole.System,
        content: `${templates.summarySystemPrefix}\n\n${summaryText}`,
      } as Message;
      historyForModel = [summaryInjected, ...recent];
    }
    const idx = sourceMessagesForModel.length - minRecentMessages - 1;
    summaryCutoffCandidate = idx >= 0 ? sourceMessagesForModel[idx].sortOrder : null;
  } catch {
    // B4：与路由原行为一致，配置/模板异常时回退全量历史
    historyForModel = history;
    summaryCutoffCandidate = null;
  }

  return { historyForModel, summaryCutoffCandidate };
}

/**
 * C1～C5：知识库检索注入为额外 System 消息（不落库）；失败则保持 history 不变。
 * 对应 `buildKnowledgeInjection` 及注入顺序（摘要 System 之后）。
 */
export async function injectKbSystemIntoHistoryForModel(options: {
  ds: DataSource;
  userId: string;
  assistantId: string | null | undefined;
  userMessageText: string;
  historyForModel: Message[];
}): Promise<Message[]> {
  const { ds, userId, assistantId, userMessageText, historyForModel } = options;
  try {
    const inject = await buildKnowledgeInjectionForChat({
      ds,
      userId,
      assistantId,
      userMessageText,
    });
    if (!inject.systemMessageText) {
      const noKbHitGuard = {
        role: MessageRole.System,
        content: [
          "【知识库检索结果】",
          "本轮未命中可用知识片段。",
          "回答中禁止使用“根据知识库”“依据知识库检索片段”等表述。",
          "如需给出结论，请明确来源为通用知识或用户提供信息，避免误导为知识库命中。",
        ].join("\n"),
      } as Message;
      const insertAt = historyForModel[0]?.role === MessageRole.System ? 1 : 0;
      return [
        ...historyForModel.slice(0, insertAt),
        noKbHitGuard,
        ...historyForModel.slice(insertAt),
      ];
    }
    const injected = {
      role: MessageRole.System,
      content: inject.systemMessageText,
    } as Message;
    const insertAt = historyForModel[0]?.role === MessageRole.System ? 1 : 0;
    return [
      ...historyForModel.slice(0, insertAt),
      injected,
      ...historyForModel.slice(insertAt),
    ];
  } catch (e) {
    console.error(
      JSON.stringify({
        module: "kb.injection",
        action: "failed",
        message: e instanceof Error ? e.message : String(e),
      }),
    );
    return historyForModel;
  }
}

type PrepareModelInputState = {
  ds: DataSource;
  conv: Conversation;
  userId: string;
  userMessageText: string;
  history?: Message[];
  historyForModel?: Message[];
  summaryCutoffCandidate?: number | null;
};

export type PrepareModelInputForPostMessageInput = {
  ds: DataSource;
  conv: Conversation;
  userId: string;
  userMessageText: string;
};

export type PrepareModelInputForPostMessageOutput = {
  historyForModel: Message[];
  summaryCutoffCandidate: number | null;
  kbInjection: KnowledgeInjectionResult | null;
};

/**
 * B + C 组合：用 RunnableSequence 组织模型输入准备链路。
 * 仅负责 TurnContext 变换，不处理 HTTP 响应与数据库最终持久化。
 */
export async function prepareModelInputForPostMessage(
  input: PrepareModelInputForPostMessageInput,
): Promise<PrepareModelInputForPostMessageOutput> {
  // 使用 RunnableSequence 组织模型输入准备链路
  const runnable = RunnableSequence.from<PrepareModelInputState, PrepareModelInputForPostMessageOutput>([
    // B1：加载全量历史
    RunnableLambda.from(async (state: PrepareModelInputState) => ({
      ...state,
      history: await loadFullHistoryForConversation(state.ds, state.conv.id),
    })),
    // B2：应用落库摘要窗口
    RunnableLambda.from(async (state: PrepareModelInputState) => {
      const history = state.history ?? [];
      const { historyForModel, summaryCutoffCandidate } = await applyPersistedSummaryWindow({
        conv: state.conv,
        history,
      });
      return { ...state, historyForModel, summaryCutoffCandidate };
    }),
    // C1：知识库注入
    RunnableLambda.from(async (state: PrepareModelInputState) => {
      const inject = await buildKnowledgeInjectionForChat({
        ds: state.ds,
        userId: state.userId,
        assistantId: state.conv.assistantId,
        userMessageText: state.userMessageText,
      });
      const historyForModel = inject.systemMessageText
        ? (() => {
            const injected = {
              role: MessageRole.System,
              content: inject.systemMessageText,
            } as Message;
            const current = state.historyForModel ?? [];
            const insertAt = current[0]?.role === MessageRole.System ? 1 : 0;
            return [...current.slice(0, insertAt), injected, ...current.slice(insertAt)];
          })()
        : state.historyForModel ?? [];
      return { ...state, historyForModel, kbInjection: inject };
    }),
    // B3：返回结果
    RunnableLambda.from((state: PrepareModelInputState) => ({
      historyForModel: state.historyForModel ?? [],
      summaryCutoffCandidate: state.summaryCutoffCandidate ?? null,
      kbInjection: (state as PrepareModelInputState & { kbInjection?: KnowledgeInjectionResult }).kbInjection ?? null,
    })),
  ]);

  return runnable.invoke({
    ds: input.ds,
    conv: input.conv,
    userId: input.userId,
    userMessageText: input.userMessageText,
  });
}

/** E1：生成摘要落库闭包（供 invoke/stream 的 onSummary）。 */
export function createConversationSummaryUpdater(options: {
  convRepo: Repository<Conversation>;
  conv: Conversation;
  summaryCutoffCandidate: number | null;
}): (summary: string) => Promise<void> {
  const { convRepo, conv, summaryCutoffCandidate } = options;
  return async (summary: string) => {
    const currentCutoff = conv.contextSummaryCutoffSortOrder;
    const nextCutoffSortOrder =
      summaryCutoffCandidate === null
        ? currentCutoff ?? null
        : currentCutoff == null
          ? summaryCutoffCandidate
          : Math.max(currentCutoff, summaryCutoffCandidate);
    await convRepo.update(
      { id: conv.id },
      {
        contextSummary: summary,
        contextSummaryUpdatedAt: new Date(),
        contextSummaryCutoffSortOrder: nextCutoffSortOrder,
      },
    );
  };
}

/** A3：写入用户消息并更新会话标题 / 时间（首条用户消息时写标题）。 */
export async function persistUserMessageAndTouchConversation(options: {
  ds: DataSource;
  conv: Conversation;
  user: User;
  content: string;
  turnId?: string | null;
}): Promise<Message> {
  const { ds, conv, user, content, turnId = null } = options;
  const msgRepo = ds.getRepository(Message);
  const convRepo = ds.getRepository(Conversation);

  const userSort = await getNextMessageSortOrder(ds, conv.id);
  const userMsg = msgRepo.create({
    id: uuidv4(),
    conversationId: conv.id,
    turnId,
    userId: user.id,
    role: MessageRole.User,
    content,
    sortOrder: userSort,
  });
  await msgRepo.save(userMsg);

  const userMsgCount = await msgRepo.count({
    where: { conversationId: conv.id, role: MessageRole.User },
  });
  if (userMsgCount === 1) {
    await convRepo.update(
      { id: conv.id },
      { title: titleFromFirstUserMessage(content), updatedAt: new Date() },
    );
  } else {
    await convRepo.update({ id: conv.id }, { updatedAt: new Date() });
  }

  return userMsg;
}

/** 下一条消息的 sortOrder（SQLite MAX 可能返回字符串）。供路由写入助手消息时复用。 */
export async function getNextMessageSortOrder(ds: DataSource, conversationId: string): Promise<number> {
  const msgRepo = ds.getRepository(Message);
  const row = await msgRepo
    .createQueryBuilder("m")
    .select("MAX(m.sortOrder)", "max")
    .where("m.conversationId = :cid", { cid: conversationId })
    .getRawOne<{ max: number | string | null }>();
  const raw = row?.max;
  const max =
    raw == null ? -1 : typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
  return Number.isFinite(max) ? max + 1 : 0;
}
