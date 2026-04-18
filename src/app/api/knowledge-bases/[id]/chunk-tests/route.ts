import { NextResponse } from "next/server";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { getDataSource } from "@/server/db/data-source";
import { KnowledgeBase } from "@/server/db/entities/KnowledgeBase";
import { retrieveKnowledgeBaseChunks } from "@/server/knowledge-base/search";
import { resolveKnowledgePreferenceByUserId } from "@/server/knowledge-base/user-preference";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

type PostBody = {
  query?: unknown;
  topK?: unknown;
  threshold?: unknown;
};

function toNumber(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

export const POST = withApiWrapper(async (request: Request, ctx: RouteParams) => {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  const { id } = await ctx.params;
  if (!id) {
    return jsonError(ErrorCode.VALIDATION_ERROR, "id 无效", HttpStatus.BAD_REQUEST);
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return jsonError(ErrorCode.VALIDATION_ERROR, "请求体须为 JSON", HttpStatus.BAD_REQUEST);
  }

  const details: JsonErrorDetail[] = [];
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) details.push({ field: "query", message: "不能为空" });

  const pref = await resolveKnowledgePreferenceByUserId(user.id);

  const topKRaw = toNumber(body.topK);
  const topK = topKRaw == null ? pref.topK : Math.floor(topKRaw);
  if (!Number.isFinite(topK) || topK < 1 || topK > 20) {
    details.push({ field: "topK", message: "须为 1–20 的整数" });
  }

  const thresholdRaw = toNumber(body.threshold);
  const threshold = thresholdRaw == null ? pref.threshold : thresholdRaw;
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    details.push({ field: "threshold", message: "须为 0–1 的数字" });
  }

  if (details.length > 0) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "请求参数不合法",
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    );
  }

  const ds = await getDataSource();
  const kbRepo = ds.getRepository(KnowledgeBase);
  const kb = await kbRepo.findOne({ where: { id, userId: user.id } });
  if (!kb) {
    return jsonError(ErrorCode.KNOWLEDGE_BASE_NOT_FOUND, "知识库不存在", HttpStatus.NOT_FOUND);
  }

  if (kb.vectorStatus !== "success") {
    return jsonError(
      ErrorCode.KNOWLEDGE_BASE_CHUNK_TEST_UNAVAILABLE,
      "向量化未完成，暂不可测试",
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  const chunks = await retrieveKnowledgeBaseChunks(ds, {
    userId: user.id,
    knowledgeBaseIds: [kb.id],
    query,
    topK,
    threshold,
  });

  const items = chunks.map((c, i) => ({
    rank: i + 1,
    knowledgeBaseId: c.knowledgeBaseId,
    chunkIndex: c.chunkIndex,
    score: Number(c.score.toFixed(6)),
    chunkPreview: c.chunkContent.slice(0, 400),
    chunkContent: c.chunkContent,
  }));

  console.info(
    JSON.stringify({
      module: "kb.chunk_test",
      userId: user.id,
      knowledgeBaseId: kb.id,
      queryLength: query.length,
      topK,
      threshold,
      hitCount: chunks.length,
      shownCount: items.length,
      topScore: items[0]?.score ?? null,
    }),
  );

  return NextResponse.json(
    { items, topK, threshold },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

