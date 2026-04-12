import { NextResponse } from "next/server";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { findOwnedConversation } from "@/server/chat/conversation-access";
import { getDataSource } from "@/server/db/data-source";
import { Conversation } from "@/server/db/entities/Conversation";
import { Message } from "@/server/db/entities/Message";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ conversationId: string }> };

/**
 * GET /api/chat/conversations/:conversationId — 会话详情
 */
export async function GET(_req: Request, ctx: RouteParams) {
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
  const messageCount = await msgRepo.count({ where: { conversationId: conv.id } });

  return NextResponse.json(
    {
      conversation: {
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
        messageCount,
      },
    },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
}

/**
 * DELETE /api/chat/conversations/:conversationId — 删除整条会话及其消息
 */
export async function DELETE(_req: Request, ctx: RouteParams) {
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

  await ds.transaction(async (manager) => {
    await manager.delete(Message, { conversationId: conv.id });
    await manager.delete(Conversation, { id: conv.id });
  });

  return NextResponse.json(
    { deleted: true, id: conv.id },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
}
