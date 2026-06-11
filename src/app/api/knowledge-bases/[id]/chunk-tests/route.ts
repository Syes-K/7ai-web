import { NextResponse } from "next/server";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { getDataSource } from "@/server/db/data-source";
import { KnowledgeBase } from "@/server/db/entities/KnowledgeBase";
import { retrieveKnowledgeBaseChunks } from "@/server/knowledge-base/search";
import { resolveKnowledgePreferenceByUserId } from "@/server/knowledge-base/user-preference";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";

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

/** POST：知识库分片召回测试；错误 message 随 locale 双语。 */
export const POST = withApiWrapper(async (request: Request, ctx: RouteParams) => {
  const locale = resolveRequestLocale(request);
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(
      ErrorCode.UNAUTHORIZED,
      tApiMessage(locale, "unauthorized"),
      HttpStatus.UNAUTHORIZED,
    );
  }
  const { user } = reqCtx;

  const { id } = await ctx.params;
  if (!id) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidId"),
      HttpStatus.BAD_REQUEST,
    );
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidJson"),
      HttpStatus.BAD_REQUEST,
    );
  }

  const details: JsonErrorDetail[] = [];
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    details.push({ field: "query", message: tApiMessage(locale, "validation.required") });
  }

  const pref = await resolveKnowledgePreferenceByUserId(user.id);

  const topKRaw = toNumber(body.topK);
  const topK = topKRaw == null ? pref.topK : Math.floor(topKRaw);
  if (!Number.isFinite(topK) || topK < 1 || topK > 20) {
    details.push({
      field: "topK",
      message: tApiMessage(locale, "validation.knowledgeBase.topKRange"),
    });
  }

  const thresholdRaw = toNumber(body.threshold);
  const threshold = thresholdRaw == null ? pref.threshold : thresholdRaw;
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    details.push({
      field: "threshold",
      message: tApiMessage(locale, "validation.knowledgeBase.thresholdRange"),
    });
  }

  if (details.length > 0) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidParams"),
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    );
  }

  const ds = await getDataSource();
  const kbRepo = ds.getRepository(KnowledgeBase);
  const kb = await kbRepo.findOne({ where: { id, userId: user.id } });
  if (!kb) {
    return jsonError(
      ErrorCode.KNOWLEDGE_BASE_NOT_FOUND,
      tApiMessage(locale, "knowledgeBaseNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }

  if (kb.vectorStatus !== "success") {
    return jsonError(
      ErrorCode.KNOWLEDGE_BASE_CHUNK_TEST_UNAVAILABLE,
      tApiMessage(locale, "knowledgeBaseChunkTestUnavailable"),
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
