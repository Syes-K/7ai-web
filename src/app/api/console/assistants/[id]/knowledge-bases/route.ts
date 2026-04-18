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

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

type PutBody = { knowledgeBaseIds?: unknown };

function parseIdList(raw: unknown): { ok: true; ids: string[] } | { ok: false; message: string } {
  if (!Array.isArray(raw)) return { ok: false, message: "须为数组" };
  const ids = raw.filter((x) => typeof x === "string").map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  const set = new Set<string>();
  for (const id of ids) {
    if (!set.has(id)) {
      set.add(id);
      out.push(id);
    }
  }
  return { ok: true, ids: out };
}

export const GET = withApiWrapper(async (_request: Request, ctx: RouteParams) => {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  const { id: assistantId } = await ctx.params;
  if (!assistantId) {
    return jsonError(ErrorCode.VALIDATION_ERROR, "id 无效", HttpStatus.BAD_REQUEST);
  }

  const ds = await getDataSource();
  const assistantRepo = ds.getRepository(Assistant);
  const assistant = await assistantRepo.findOne({ where: { id: assistantId } });
  if (!assistant) {
    return jsonError(ErrorCode.ASSISTANT_NOT_FOUND, "助手不存在", HttpStatus.NOT_FOUND);
  }

  // 系统助手可读但不可配置；个人助手仅本人可读写
  const readable =
    assistant.scope === AssistantScope.System ||
    (assistant.scope === AssistantScope.Personal && assistant.userId === user.id);
  if (!readable) {
    return jsonError(ErrorCode.ASSISTANT_NOT_FOUND, "助手不存在", HttpStatus.NOT_FOUND);
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
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  const { id: assistantId } = await ctx.params;
  if (!assistantId) {
    return jsonError(ErrorCode.VALIDATION_ERROR, "id 无效", HttpStatus.BAD_REQUEST);
  }

  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return jsonError(ErrorCode.VALIDATION_ERROR, "请求体须为 JSON", HttpStatus.BAD_REQUEST);
  }

  const parsed = parseIdList(body.knowledgeBaseIds);
  if (!parsed.ok) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "knowledgeBaseIds 无效",
      HttpStatus.UNPROCESSABLE_ENTITY,
      [{ field: "knowledgeBaseIds", message: parsed.message } satisfies JsonErrorDetail],
    );
  }

  const ds = await getDataSource();
  const assistantRepo = ds.getRepository(Assistant);
  const assistant = await assistantRepo.findOne({
    where: { id: assistantId, scope: AssistantScope.Personal, userId: user.id },
  });
  if (!assistant) {
    return jsonError(ErrorCode.ASSISTANT_NOT_FOUND, "助手不存在", HttpStatus.NOT_FOUND);
  }

  // 校验 knowledgeBaseIds 都属于本人
  const kbRepo = ds.getRepository(KnowledgeBase);
  const kbRows = parsed.ids.length
    ? await kbRepo.createQueryBuilder("kb")
        .select(["kb.id"])
        .where("kb.userId = :uid", { uid: user.id })
        .andWhere("kb.id IN (:...ids)", { ids: parsed.ids })
        .getMany()
    : [];
  const okSet = new Set(kbRows.map((r) => r.id));
  const invalid = parsed.ids.filter((id) => !okSet.has(id));
  if (invalid.length > 0) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "包含无效知识库",
      HttpStatus.UNPROCESSABLE_ENTITY,
      [{ field: "knowledgeBaseIds", message: "包含不存在或无权访问的知识库" }],
    );
  }

  const relRepo = ds.getRepository(AssistantKnowledgeBase);
  await relRepo
    .createQueryBuilder()
    .delete()
    .where("assistantId = :aid AND userId = :uid", { aid: assistant.id, uid: user.id })
    .execute();

  const rels = parsed.ids.map((kid) =>
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
    { assistantId: assistant.id, knowledgeBaseIds: parsed.ids },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

