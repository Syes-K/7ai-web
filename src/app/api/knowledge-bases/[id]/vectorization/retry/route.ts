import { NextResponse } from "next/server";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { jsonError } from "@/server/http/json-response";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { getDataSource } from "@/server/db/data-source";
import { KnowledgeBase } from "@/server/db/entities/KnowledgeBase";
import { vectorizeKnowledgeBase } from "@/server/knowledge-base/vectorize";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

export const POST = withApiWrapper(async (_request: Request, ctx: RouteParams) => {
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

  try {
    await vectorizeKnowledgeBase(ds, row);
  } catch {
    // vectorize 内会落 failed；这里返回 202，交由前端轮询/提示
  }

  const fresh = await repo.findOne({ where: { id: row.id, userId: user.id } });
  return NextResponse.json(
    {
      vectorStatus: fresh?.vectorStatus ?? row.vectorStatus,
      vectorUpdatedAt: fresh?.vectorUpdatedAt ? fresh.vectorUpdatedAt.toISOString() : null,
      vectorLastStartedAt: fresh?.vectorLastStartedAt ? fresh.vectorLastStartedAt.toISOString() : null,
      vectorError: fresh?.vectorError ?? row.vectorError,
    },
    { status: HttpStatus.ACCEPTED, headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

