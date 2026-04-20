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
import { getDataSource } from "@/server/db/data-source";
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
  };
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
  const { content, stream } = validated;

  const ds = await getDataSource();
  const conv = await findOwnedConversation(ds, user.id, conversationId);
  if (!conv) {
    return jsonError(ErrorCode.CONVERSATION_NOT_FOUND, "会话不存在", HttpStatus.NOT_FOUND);
  }

  const msgRepo = ds.getRepository(Message);
  const convRepo = ds.getRepository(Conversation);

  const userMsg = await persistUserMessageAndTouchConversation({ ds, conv, user, content });

  const { historyForModel, summaryCutoffCandidate } = await prepareModelInputForPostMessage({
    ds,
    conv,
    userId: user.id,
    userMessageText: content,
  });

  const updateConversationSummary = createConversationSummaryUpdater({
    convRepo,
    conv,
    summaryCutoffCandidate,
  });

  if (stream) {
    const encoder = new TextEncoder();
    const streamResponse = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        };

        try {
          send("meta", { conversationId: conv.id });
          send("user_message", messageDto(userMsg));

          let full = "";
          for await (const delta of streamAssistantReply(historyForModel, user.id, {
            user,
            assistantId: conv.assistantId,
            onSummary: async (summary) => {
              await updateConversationSummary(summary);
            },
          })) {
            full += delta;
            send("assistant_delta", { text: delta });
          }

          const asstSort = await getNextMessageSortOrder(ds, conv.id);
          const asstMsg = msgRepo.create({
            id: uuidv4(),
            conversationId: conv.id,
            userId: user.id,
            role: MessageRole.Assistant,
            content: full,
            sortOrder: asstSort,
          });
          await msgRepo.save(asstMsg);
          await convRepo.update({ id: conv.id }, { updatedAt: new Date() });

          const convOut = await convRepo.findOne({ where: { id: conv.id } });
          send("assistant_done", {
            ...messageDto(asstMsg),
            conversation: {
              id: conv.id,
              title: convOut?.title ?? conv.title,
              updatedAt: (convOut?.updatedAt ?? new Date()).toISOString(),
            },
          });
          controller.close();
        } catch (e) {
          const msg = e instanceof Error ? e.message : "模型调用失败";
          send("error", { code: ErrorCode.MODEL_ERROR, message: msg });
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

  let assistantText: string;
  try {
    assistantText = await invokeAssistantReply(historyForModel, user.id, {
      user,
      assistantId: conv.assistantId,
      onSummary: async (summary) => {
        await updateConversationSummary(summary);
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "模型调用失败";
    return jsonError(ErrorCode.MODEL_ERROR, msg, HttpStatus.BAD_GATEWAY);
  }

  const asstSort = await getNextMessageSortOrder(ds, conv.id);
  const asstMsg = msgRepo.create({
    id: uuidv4(),
    conversationId: conv.id,
    userId: user.id,
    role: MessageRole.Assistant,
    content: assistantText,
    sortOrder: asstSort,
  });
  await msgRepo.save(asstMsg);
  await convRepo.update({ id: conv.id }, { updatedAt: new Date() });

  const convOut = await convRepo.findOne({ where: { id: conv.id } });

  return NextResponse.json(
    {
      userMessage: messageDto(userMsg),
      assistantMessage: messageDto(asstMsg),
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
