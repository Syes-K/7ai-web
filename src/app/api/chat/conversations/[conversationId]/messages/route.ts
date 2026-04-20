import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  CHAT_DEFAULT_CONVERSATION_TITLE,
  CHAT_MESSAGE_LIST_DEFAULT_LIMIT,
  CHAT_MESSAGE_LIST_MAX_LIMIT,
} from "@/common/constants";
import { ErrorCode, HttpStatus, MessageRole } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { invokeAssistantReply, streamAssistantReply } from "@/server/chat/assistant";
import {
  createConversationSummaryUpdater,
  getNextMessageSortOrder,
  prepareModelInputForPostMessage,
  persistUserMessageAndTouchConversation,
  validatePostMessageBody,
  type PostMessageBody,
} from "@/server/chat/post-message-pipeline";
import { decodeCursor, encodeCursor } from "@/server/chat/cursor";
import { findOwnedConversation } from "@/server/chat/conversation-access";
import {
  createInitialTurnSnapshot,
  serializeTurnSnapshot,
  TurnRuntimeState,
  type TurnInterruptionReason,
} from "@/server/chat/turn-runtime";
import { getDataSource } from "@/server/db/data-source";
import { ChatTurn } from "@/server/db/entities/ChatTurn";
import { Conversation } from "@/server/db/entities/Conversation";
import { Message } from "@/server/db/entities/Message";
import { withApiWrapper } from "@/server/http/with-api-wrapper";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ conversationId: string }> };

type MsgCursor = { s: number };

function messageDto(m: Message) {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    turnId: m.turnId ?? null,
  };
}

function reasoningDto(snapshotText: string) {
  try {
    const parsed = JSON.parse(snapshotText) as {
      reasoning?: {
        visibilityLevel?: number;
        status?: string;
        safeSummary?: string | null;
      };
    };
    const r = parsed.reasoning;
    return {
      visibilityLevel: 0,
      status: r?.status ?? "not_triggered",
      safeSummary: r?.safeSummary ?? null,
    };
  } catch {
    return {
      visibilityLevel: 0,
      status: "not_triggered",
      safeSummary: null,
    };
  }
}

function kbDetailsFromInjection(inject: {
  needSearch: boolean;
  reason: string | null;
  chunks: Array<{
    knowledgeBaseName: string;
    chunkIndex: number;
    score: number;
    chunkContent: string;
  }>;
}): Array<{ title: string; content: string }> {
  const details: Array<{ title: string; content: string }> = [];
  if (inject.chunks.length > 0) {
    const kbNames = Array.from(new Set(inject.chunks.map((c) => c.knowledgeBaseName)));
    details.push({
      title: "命中知识库",
      content: kbNames.join("、"),
    });
  }
  if (inject.reason) {
    details.push({
      title: "命中理由",
      content: inject.reason,
    });
  }
  if (inject.chunks.length > 0) {
    details.push({
      title: "命中片段",
      content: inject.chunks
        .slice(0, 5)
        .map(
          (chunk, index) =>
            `#${index + 1} ${chunk.knowledgeBaseName} / chunk=${chunk.chunkIndex} / score=${chunk.score.toFixed(4)}\n${chunk.chunkContent}`,
        )
        .join("\n\n"),
    });
  }
  return details;
}

function parseMessageLimit(raw: string | null): number | null {
  if (raw === null || raw === undefined || raw === "") {
    return CHAT_MESSAGE_LIST_DEFAULT_LIMIT;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return null;
  }
  return Math.min(n, CHAT_MESSAGE_LIST_MAX_LIMIT);
}

/**
 * GET /api/chat/conversations/:conversationId/messages
 */
export const GET = withApiWrapper(async (req: Request, ctx: RouteParams) => {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  const { conversationId } = await ctx.params;
  const ds = await getDataSource();
  const conv = await findOwnedConversation(ds, user.id, conversationId);
  if (!conv) {
    return jsonError(ErrorCode.CONVERSATION_NOT_FOUND, "会话不存在", HttpStatus.NOT_FOUND);
  }

  const { searchParams } = new URL(req.url);
  const limit = parseMessageLimit(searchParams.get("limit"));
  if (limit === null) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "limit 参数无效",
      HttpStatus.UNPROCESSABLE_ENTITY,
      [{ field: "limit", message: "须为正整数" }],
    );
  }

  const cursorRaw = searchParams.get("cursor");
  const cur = decodeCursor<MsgCursor>(cursorRaw);

  const msgRepo = ds.getRepository(Message);
  const qb = msgRepo
    .createQueryBuilder("m")
    .where("m.conversationId = :cid", { cid: conv.id })
    .orderBy("m.sortOrder", "DESC")
    .take(limit + 1);

  if (cur != null && typeof cur.s === "number") {
    qb.andWhere("m.sortOrder < :s", { s: cur.s });
  }

  const batch = await qb.getMany();
  const hasOlder = batch.length > limit;
  const slice = hasOlder ? batch.slice(0, limit) : batch;
  const chronological = slice.slice().reverse();
  const items = chronological.map(messageDto);

  let nextCursor: string | null = null;
  if (hasOlder && slice.length > 0) {
    const oldestInPage = slice[slice.length - 1];
    nextCursor = encodeCursor({ s: oldestInPage.sortOrder });
  }

  return NextResponse.json(
    { items, nextCursor },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

/**
 * POST /api/chat/conversations/:conversationId/messages
 */
export const POST = withApiWrapper(async (req: Request, ctx: RouteParams) => {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  const { conversationId } = await ctx.params;

  let body: PostMessageBody;
  try {
    body = (await req.json()) as PostMessageBody;
  } catch {
    return jsonError(ErrorCode.VALIDATION_ERROR, "请求体须为 JSON", HttpStatus.UNPROCESSABLE_ENTITY);
  }

  const validated = validatePostMessageBody(body);
  if (!validated.ok) {
    return validated.response;
  }
  const { content, stream, retryUserMessageId } = validated;

  const ds = await getDataSource();
  const conv = await findOwnedConversation(ds, user.id, conversationId);
  if (!conv) {
    return jsonError(ErrorCode.CONVERSATION_NOT_FOUND, "会话不存在", HttpStatus.NOT_FOUND);
  }

  const msgRepo = ds.getRepository(Message);
  const convRepo = ds.getRepository(Conversation);
  const turnRepo = ds.getRepository(ChatTurn);
  const turnId = uuidv4();
  const turnState = new TurnRuntimeState(turnId, createInitialTurnSnapshot());
  const turnStartedAt = new Date();
  const saveTurnSnapshot = async (finalStatus?: "completed" | "failed" | "interrupted", interruptionReason?: TurnInterruptionReason) => {
    const snapshot = turnState.getSnapshot();
    const endedAt = finalStatus ? new Date() : null;
    await turnRepo.save(
      turnRepo.create({
        id: turnId,
        conversationId: conv.id,
        userId: user.id,
        userMessageId: null,
        assistantMessageId: null,
        finalStatus: finalStatus ?? "failed",
        interruptionReason: interruptionReason ?? null,
        reasoningVisibilityLevel: 0,
        startedAt: turnStartedAt,
        endedAt,
        durationMs: endedAt ? Math.max(0, endedAt.getTime() - turnStartedAt.getTime()) : null,
        stepsSnapshotJson: serializeTurnSnapshot(snapshot),
      }),
    );
  };
  await saveTurnSnapshot();
  turnState.updateStep("A1", "completed");

  let userMsg: Message;
  if (retryUserMessageId) {
    const existing = await msgRepo.findOne({
      where: {
        id: retryUserMessageId,
        conversationId: conv.id,
        userId: user.id,
        role: MessageRole.User,
      },
    });
    if (!existing) {
      return jsonError(
        ErrorCode.VALIDATION_ERROR,
        "重试目标用户消息不存在",
        HttpStatus.UNPROCESSABLE_ENTITY,
        [{ field: "retryUserMessageId", message: "无效或无权限" }],
      );
    }
    userMsg = existing;
    turnState.updateStep("A2", "completed", {
      safeMessage: "已复用原用户消息重试",
      reasonTag: "retry_without_new_user_message",
    });
  } else {
    userMsg = await persistUserMessageAndTouchConversation({ ds, conv, user, content, turnId });
    turnState.updateStep("A2", "completed");
  }
  await turnRepo.update({ id: turnId }, { userMessageId: userMsg.id });
  await turnRepo.update({ id: turnId }, { stepsSnapshotJson: serializeTurnSnapshot(turnState.getSnapshot()) });

  if (stream) {
    const encoder = new TextEncoder();
    const streamResponse = new ReadableStream({
      async start(controller) {
        const toolEvents: Array<{ phase: "start" | "end" | "error"; name: string; detail: string }> = [];
        const applyToolEventsToD1 = async (status: "running" | "completed" | "failed") => {
          turnState.updateStep("D1", status, {
            safeMessage:
              status === "running"
                ? "模型正在生成回复"
                : status === "completed"
                  ? "模型回复生成完成"
                  : "模型回复生成失败",
            details: [
              {
                title: "调用上下文",
                content: `assistantId=${conv.assistantId ?? "none"}\nstream=true`,
              },
              {
                title: "Tools/MCP 调用",
                content:
                  toolEvents.length > 0
                    ? toolEvents
                        .map((event, index) => `#${index + 1} [${event.phase}] ${event.name} - ${event.detail}`)
                        .join("\n")
                    : "当前轮未检测到显式工具调用事件",
              },
            ],
          });
          await turnRepo.update({ id: turnId }, { stepsSnapshotJson: serializeTurnSnapshot(turnState.getSnapshot()) });
        };
        const emitTurnDelta = async (stepKey: string, status: "running" | "completed" | "failed" | "skipped" | "interrupted") => {
          const delta = turnState.updateStep(stepKey, status);
          await turnRepo.update({ id: turnId }, { stepsSnapshotJson: serializeTurnSnapshot(delta.snapshot) });
          send("turn_step_delta", delta);
        };
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        };

        try {
          turnState.updateStep("B1", "running");
          await turnRepo.update({ id: turnId }, { stepsSnapshotJson: serializeTurnSnapshot(turnState.getSnapshot()) });
          const { historyForModel, summaryCutoffCandidate, kbInjection } = await prepareModelInputForPostMessage({
            ds,
            conv,
            userId: user.id,
            userMessageText: content,
          });
          turnState.updateStep("B1", "completed");
          turnState.updateStep("C1", "completed", {
            safeMessage: kbInjection?.needSearch
              ? `已命中 ${kbInjection.chunks.length} 个知识片段`
              : "未命中可用知识片段",
            reasonTag: kbInjection?.reason ?? null,
            details: kbInjection ? kbDetailsFromInjection(kbInjection) : [],
          });
          await turnRepo.update({ id: turnId }, { stepsSnapshotJson: serializeTurnSnapshot(turnState.getSnapshot()) });
          const updateConversationSummary = createConversationSummaryUpdater({
            convRepo,
            conv,
            summaryCutoffCandidate,
          });

          send("meta", { conversationId: conv.id });
          send("turn_started", { turnId, conversationId: conv.id, steps: turnState.getSnapshot() });
          send("user_message", messageDto(userMsg));

          let full = "";
          await emitTurnDelta("D1", "running");
          await applyToolEventsToD1("running");
          for await (const delta of streamAssistantReply(historyForModel, user.id, {
            user,
            assistantId: conv.assistantId,
            onToolEvent: async (event) => {
              toolEvents.push({
                phase: event.phase,
                name: event.name,
                detail: event.input ?? event.output ?? event.error ?? "",
              });
              await applyToolEventsToD1("running");
            },
            onSummary: async (summary) => {
              turnState.updateReasoning("running");
              turnState.updateStep("E1", "running", {
                safeMessage: "摘要回调处理中",
                details: [
                  {
                    title: "摘要长度",
                    content: `${summary.length} chars`,
                  },
                ],
              });
              await turnRepo.update({ id: turnId }, { stepsSnapshotJson: serializeTurnSnapshot(turnState.getSnapshot()) });
              await emitTurnDelta("E1", "running");
              await updateConversationSummary(summary);
              turnState.updateReasoning("completed", summary);
              turnState.updateStep("E1", "completed", {
                safeMessage: "摘要回调已完成",
                details: [
                  {
                    title: "摘要长度",
                    content: `${summary.length} chars`,
                  },
                  {
                    title: "摘要预览",
                    content: summary.slice(0, 200),
                  },
                ],
              });
              await turnRepo.update({ id: turnId }, { stepsSnapshotJson: serializeTurnSnapshot(turnState.getSnapshot()) });
              await emitTurnDelta("E1", "completed");
            },
          })) {
            full += delta;
            send("assistant_delta", { text: delta });
          }
          turnState.updateStep("D1", "completed", {
            safeMessage: "模型回复生成完成",
            details: [
              {
                title: "输出统计",
                content: `replyChars=${full.length}`,
              },
              {
                title: "Tools/MCP 调用",
                content:
                  toolEvents.length > 0
                    ? toolEvents
                        .map((event, index) => `#${index + 1} [${event.phase}] ${event.name} - ${event.detail}`)
                        .join("\n")
                    : "当前轮未检测到显式工具调用事件",
              },
            ],
          });
          await turnRepo.update({ id: turnId }, { stepsSnapshotJson: serializeTurnSnapshot(turnState.getSnapshot()) });
          await emitTurnDelta("D1", "completed");

          await emitTurnDelta("F1", "running");
          const asstSort = await getNextMessageSortOrder(ds, conv.id);
          const asstMsg = msgRepo.create({
            id: uuidv4(),
            conversationId: conv.id,
            turnId,
            userId: user.id,
            role: MessageRole.Assistant,
            content: full,
            sortOrder: asstSort,
          });
          await msgRepo.save(asstMsg);
          await turnRepo.update({ id: turnId }, { assistantMessageId: asstMsg.id });
          await convRepo.update({ id: conv.id }, { updatedAt: new Date() });
          await emitTurnDelta("F1", "completed");
          turnState.freeze("completed");
          const completedSnapshot = turnState.getSnapshot();
          await turnRepo.update(
            { id: turnId },
            {
              finalStatus: "completed",
              interruptionReason: null,
              endedAt: new Date(),
              durationMs: Math.max(0, Date.now() - turnStartedAt.getTime()),
              stepsSnapshotJson: serializeTurnSnapshot(completedSnapshot),
            },
          );

          const convOut = await convRepo.findOne({ where: { id: conv.id } });
          send("assistant_done", {
            ...messageDto(asstMsg),
            conversation: {
              id: conv.id,
              title: convOut?.title ?? conv.title,
              updatedAt: (convOut?.updatedAt ?? new Date()).toISOString(),
            },
          });
          send("turn_completed", {
            turnId,
            userMessageId: userMsg.id,
            assistantMessageId: asstMsg.id,
            finalStatus: "completed",
            interruptionReason: null,
            startedAt: turnStartedAt.toISOString(),
            endedAt: new Date().toISOString(),
            durationMs: Math.max(0, Date.now() - turnStartedAt.getTime()),
            steps: completedSnapshot,
            reasoning: reasoningDto(serializeTurnSnapshot(completedSnapshot)),
          });
          controller.close();
        } catch (e) {
          const msg = e instanceof Error ? e.message : "模型调用失败";
          turnState.updateReasoning("failed");
          turnState.updateStep("D1", "failed", {
            reasonTag: "unknown",
            error: { code: ErrorCode.MODEL_ERROR, message: msg },
          });
          turnState.freeze("failed", "unknown");
          await turnRepo.update(
            { id: turnId },
            {
              finalStatus: "failed",
              interruptionReason: "unknown",
              endedAt: new Date(),
              durationMs: Math.max(0, Date.now() - turnStartedAt.getTime()),
              stepsSnapshotJson: serializeTurnSnapshot(turnState.getSnapshot()),
            },
          );
          send("error", { code: ErrorCode.MODEL_ERROR, message: msg });
          send("turn_failed", {
            turnId,
            userMessageId: userMsg.id,
            assistantMessageId: null,
            finalStatus: "failed",
            interruptionReason: "unknown",
            startedAt: turnStartedAt.toISOString(),
            endedAt: new Date().toISOString(),
            durationMs: Math.max(0, Date.now() - turnStartedAt.getTime()),
            steps: turnState.getSnapshot(),
            reasoning: reasoningDto(serializeTurnSnapshot(turnState.getSnapshot())),
          });
          controller.close();
        }
      },
    });

    return new Response(streamResponse, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  turnState.updateStep("B1", "running");
  const { historyForModel, summaryCutoffCandidate, kbInjection } = await prepareModelInputForPostMessage({
    ds,
    conv,
    userId: user.id,
    userMessageText: content,
  });
  turnState.updateStep("B1", "completed");
  turnState.updateStep("C1", "completed", {
    safeMessage: kbInjection?.needSearch
      ? `已命中 ${kbInjection.chunks.length} 个知识片段`
      : "未命中可用知识片段",
    reasonTag: kbInjection?.reason ?? null,
    details: kbInjection ? kbDetailsFromInjection(kbInjection) : [],
  });
  await turnRepo.update({ id: turnId }, { stepsSnapshotJson: serializeTurnSnapshot(turnState.getSnapshot()) });

  const updateConversationSummary = createConversationSummaryUpdater({
    convRepo,
    conv,
    summaryCutoffCandidate,
  });

  let assistantText: string;
  try {
    const toolEvents: Array<{ phase: "start" | "end" | "error"; name: string; detail: string }> = [];
    turnState.updateStep("D1", "running", {
      safeMessage: "模型正在生成回复",
      details: [
        {
          title: "调用上下文",
          content: `assistantId=${conv.assistantId ?? "none"}\nstream=false`,
        },
        {
          title: "Tools/MCP 调用",
          content:
            toolEvents.length > 0
              ? toolEvents
                  .map((event, index) => `#${index + 1} [${event.phase}] ${event.name} - ${event.detail}`)
                  .join("\n")
              : "当前轮未检测到显式工具调用事件",
        },
      ],
    });
    await turnRepo.update({ id: turnId }, { stepsSnapshotJson: serializeTurnSnapshot(turnState.getSnapshot()) });
    assistantText = await invokeAssistantReply(historyForModel, user.id, {
      user,
      assistantId: conv.assistantId,
      onToolEvent: async (event) => {
        toolEvents.push({
          phase: event.phase,
          name: event.name,
          detail: event.input ?? event.output ?? event.error ?? "",
        });
        turnState.updateStep("D1", "running", {
          safeMessage: "模型正在生成回复",
          details: [
            {
              title: "调用上下文",
              content: `assistantId=${conv.assistantId ?? "none"}\nstream=false`,
            },
            {
              title: "Tools/MCP 调用",
              content:
                toolEvents.length > 0
                  ? toolEvents
                      .map((evt, index) => `#${index + 1} [${evt.phase}] ${evt.name} - ${evt.detail}`)
                      .join("\n")
                  : "当前轮未检测到显式工具调用事件",
            },
          ],
        });
        await turnRepo.update({ id: turnId }, { stepsSnapshotJson: serializeTurnSnapshot(turnState.getSnapshot()) });
      },
      onSummary: async (summary) => {
        turnState.updateReasoning("running");
        turnState.updateStep("E1", "running", {
          safeMessage: "摘要回调处理中",
          details: [
            {
              title: "摘要长度",
              content: `${summary.length} chars`,
            },
          ],
        });
        await turnRepo.update({ id: turnId }, { stepsSnapshotJson: serializeTurnSnapshot(turnState.getSnapshot()) });
        await updateConversationSummary(summary);
        turnState.updateReasoning("completed", summary);
        turnState.updateStep("E1", "completed", {
          safeMessage: "摘要回调已完成",
          details: [
            {
              title: "摘要长度",
              content: `${summary.length} chars`,
            },
            {
              title: "摘要预览",
              content: summary.slice(0, 200),
            },
          ],
        });
        await turnRepo.update({ id: turnId }, { stepsSnapshotJson: serializeTurnSnapshot(turnState.getSnapshot()) });
      },
    });
    turnState.updateStep("D1", "completed", {
      safeMessage: "模型回复生成完成",
      details: [
        {
          title: "输出统计",
          content: `replyChars=${assistantText.length}`,
        },
        {
          title: "Tools/MCP 调用",
          content:
            toolEvents.length > 0
              ? toolEvents
                  .map((event, index) => `#${index + 1} [${event.phase}] ${event.name} - ${event.detail}`)
                  .join("\n")
              : "当前轮未检测到显式工具调用事件",
        },
      ],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "模型调用失败";
    turnState.updateReasoning("failed");
    turnState.updateStep("D1", "failed", {
      reasonTag: "unknown",
      error: { code: ErrorCode.MODEL_ERROR, message: msg },
    });
    turnState.freeze("failed", "unknown");
    await turnRepo.update(
      { id: turnId },
      {
        finalStatus: "failed",
        interruptionReason: "unknown",
        endedAt: new Date(),
        durationMs: Math.max(0, Date.now() - turnStartedAt.getTime()),
        stepsSnapshotJson: serializeTurnSnapshot(turnState.getSnapshot()),
      },
    );
    return jsonError(ErrorCode.MODEL_ERROR, msg, HttpStatus.BAD_GATEWAY);
  }

  turnState.updateStep("F1", "running");
  const asstSort = await getNextMessageSortOrder(ds, conv.id);
  const asstMsg = msgRepo.create({
    id: uuidv4(),
    conversationId: conv.id,
    turnId,
    userId: user.id,
    role: MessageRole.Assistant,
    content: assistantText,
    sortOrder: asstSort,
  });
  await msgRepo.save(asstMsg);
  await convRepo.update({ id: conv.id }, { updatedAt: new Date() });
  turnState.updateStep("F1", "completed");
  turnState.freeze("completed");
  const finalSnapshot = turnState.getSnapshot();
  await turnRepo.update(
    { id: turnId },
    {
      assistantMessageId: asstMsg.id,
      finalStatus: "completed",
      interruptionReason: null,
      endedAt: new Date(),
      durationMs: Math.max(0, Date.now() - turnStartedAt.getTime()),
      stepsSnapshotJson: serializeTurnSnapshot(finalSnapshot),
    },
  );

  const convOut = await convRepo.findOne({ where: { id: conv.id } });

  return NextResponse.json(
    {
      userMessage: messageDto(userMsg),
      assistantMessage: messageDto(asstMsg),
      turn: {
        id: turnId,
        userMessageId: userMsg.id,
        assistantMessageId: asstMsg.id,
        finalStatus: "completed",
        interruptionReason: null,
        startedAt: turnStartedAt.toISOString(),
        endedAt: new Date().toISOString(),
        steps: finalSnapshot,
        reasoning: reasoningDto(serializeTurnSnapshot(finalSnapshot)),
      },
      conversation: {
        id: conv.id,
        title: convOut?.title ?? conv.title,
        updatedAt: (convOut?.updatedAt ?? new Date()).toISOString(),
      },
    },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

/**
 * DELETE /api/chat/conversations/:conversationId/messages — 清空该会话下全部消息
 */
export const DELETE = withApiWrapper(async (_req: Request, ctx: RouteParams) => {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  const { conversationId } = await ctx.params;
  const ds = await getDataSource();
  const conv = await findOwnedConversation(ds, user.id, conversationId);
  if (!conv) {
    return jsonError(ErrorCode.CONVERSATION_NOT_FOUND, "会话不存在", HttpStatus.NOT_FOUND);
  }

  const msgRepo = ds.getRepository(Message);
  const convRepo = ds.getRepository(Conversation);

  const del = await msgRepo
    .createQueryBuilder()
    .delete()
    .where("conversationId = :cid", { cid: conv.id })
    .execute();

  const deletedCount = typeof del.affected === "number" ? del.affected : 0;

  await convRepo.update(
    { id: conv.id },
    {
      title: CHAT_DEFAULT_CONVERSATION_TITLE,
      updatedAt: new Date(),
      contextSummary: null,
      contextSummaryUpdatedAt: null,
      contextSummaryCutoffSortOrder: null,
    },
  );

  const convOut = await convRepo.findOne({ where: { id: conv.id } });

  return NextResponse.json(
    {
      conversation: {
        id: conv.id,
        title: convOut?.title ?? CHAT_DEFAULT_CONVERSATION_TITLE,
        updatedAt: (convOut?.updatedAt ?? new Date()).toISOString(),
        messageCount: 0,
      },
      deletedCount,
    },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});
