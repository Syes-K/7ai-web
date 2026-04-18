import { NextResponse } from "next/server";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { jsonError } from "@/server/http/json-response";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { getDataSource } from "@/server/db/data-source";
import { KnowledgeBase } from "@/server/db/entities/KnowledgeBase";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

export const GET = withApiWrapper(async (_request: Request, ctx: RouteParams) => {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  const { id } = await ctx.params;
  const ds = await getDataSource();
  const repo = ds.getRepository(KnowledgeBase);
  const row = await repo.findOne({ where: { id, userId: user.id } });
  if (!row) {
    return jsonError(ErrorCode.KNOWLEDGE_BASE_NOT_FOUND, "知识库不存在", HttpStatus.NOT_FOUND);
  }

  return NextResponse.json(
    {
      vectorStatus: row.vectorStatus,
      vectorUpdatedAt: row.vectorUpdatedAt ? row.vectorUpdatedAt.toISOString() : null,
      vectorLastStartedAt: row.vectorLastStartedAt ? row.vectorLastStartedAt.toISOString() : null,
      vectorError: row.vectorError,
    },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

