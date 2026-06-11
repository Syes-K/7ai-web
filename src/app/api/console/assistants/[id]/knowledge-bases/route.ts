import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { AssistantScope, ErrorCode, HttpStatus } from "@/common/enums";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { getDataSource } from "@/server/db/data-source";
import { Assistant } from "@/server/db/entities/Assistant";
import { AssistantKnowledgeBase } from "@/server/db/entities/AssistantKnowledgeBase";
import { KnowledgeBase } from "@/server/db/entities/KnowledgeBase";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

type PutBody = { knowledgeBaseIds?: unknown };

/**
 * GET / PUT：助手关联知识库；错误 message 随 locale 双语。
 */
export const GET = withApiWrapper(async (request: Request, ctx: RouteParams) => {
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

  const { id: assistantId } = await ctx.params;
  if (!assistantId) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidId"),
      HttpStatus.BAD_REQUEST,
    );
  }

  const ds = await getDataSource();
  const assistantRepo = ds.getRepository(Assistant);
  const assistant = await assistantRepo.findOne({ where: { id: assistantId } });
  if (!assistant) {
    return jsonError(
      ErrorCode.ASSISTANT_NOT_FOUND,
      tApiMessage(locale, "assistantNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }

  const readable =
    assistant.scope === AssistantScope.System ||
    (assistant.scope === AssistantScope.Personal && assistant.userId === user.id);
  if (!readable) {
    return jsonError(
      ErrorCode.ASSISTANT_NOT_FOUND,
      tApiMessage(locale, "assistantNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }

  const relRepo = ds.getRepository(AssistantKnowledgeBase);
  const rels = await relRepo.find({
    where: { assistantId: assistant.id, userId: user.id } as any,
  });
  const ids = rels.map((r) => r.knowledgeBaseId);
  return NextResponse.json(
    { assistantId: assistant.id, knowledgeBaseIds: ids },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

export const PUT = withApiWrapper(async (request: Request, ctx: RouteParams) => {
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

  const { id: assistantId } = await ctx.params;
  if (!assistantId) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidId"),
      HttpStatus.BAD_REQUEST,
    );
  }

  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidJson"),
      HttpStatus.BAD_REQUEST,
    );
  }

  if (!Array.isArray(body.knowledgeBaseIds)) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.knowledgeBaseIdsInvalid"),
      HttpStatus.UNPROCESSABLE_ENTITY,
      [{
        field: "knowledgeBaseIds",
        message: tApiMessage(locale, "validation.arrayRequired"),
      }],
    );
  }

  const ids = body.knowledgeBaseIds
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
  const parsedIds: string[] = [];
  const set = new Set<string>();
  for (const id of ids) {
    if (!set.has(id)) {
      set.add(id);
      parsedIds.push(id);
    }
  }

  const ds = await getDataSource();
  const assistantRepo = ds.getRepository(Assistant);
  const assistant = await assistantRepo.findOne({
    where: { id: assistantId, scope: AssistantScope.Personal, userId: user.id },
  });
  if (!assistant) {
    return jsonError(
      ErrorCode.ASSISTANT_NOT_FOUND,
      tApiMessage(locale, "assistantNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }

  const kbRepo = ds.getRepository(KnowledgeBase);
  const kbRows = parsedIds.length
    ? await kbRepo.createQueryBuilder("kb")
        .select(["kb.id"])
        .where("kb.userId = :uid", { uid: user.id })
        .andWhere("kb.id IN (:...ids)", { ids: parsedIds })
        .getMany()
    : [];
  const okSet = new Set(kbRows.map((r) => r.id));
  const invalid = parsedIds.filter((id) => !okSet.has(id));
  if (invalid.length > 0) {
    const kbMsg = tApiMessage(locale, "validation.invalidKnowledgeBaseIds");
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      kbMsg,
      HttpStatus.UNPROCESSABLE_ENTITY,
      [{ field: "knowledgeBaseIds", message: kbMsg } satisfies JsonErrorDetail],
    );
  }

  const relRepo = ds.getRepository(AssistantKnowledgeBase);
  await relRepo
    .createQueryBuilder()
    .delete()
    .where("assistantId = :aid AND userId = :uid", { aid: assistant.id, uid: user.id })
    .execute();

  const rels = parsedIds.map((kid) =>
    relRepo.create({
      id: uuidv4(),
      userId: user.id,
      assistantId: assistant.id,
      knowledgeBaseId: kid,
    }),
  );
  if (rels.length > 0) {
    await relRepo.save(rels);
  }

  return NextResponse.json(
    { assistantId: assistant.id, knowledgeBaseIds: parsedIds },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});
