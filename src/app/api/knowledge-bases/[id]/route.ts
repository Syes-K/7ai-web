import { NextResponse } from "next/server";
import {
  KNOWLEDGE_BASE_CONTENT_MAX_LENGTH,
  KNOWLEDGE_BASE_DESCRIPTION_MAX_LENGTH,
  KNOWLEDGE_BASE_NAME_MAX_LENGTH,
  KNOWLEDGE_BASE_TAG_MAX_LENGTH,
  KNOWLEDGE_BASE_TAGS_MAX_COUNT,
} from "@/common/constants";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { getDataSource } from "@/server/db/data-source";
import { AssistantKnowledgeBase } from "@/server/db/entities/AssistantKnowledgeBase";
import { KnowledgeBase } from "@/server/db/entities/KnowledgeBase";
import { KnowledgeBaseVectorChunk } from "@/server/db/entities/KnowledgeBaseVectorChunk";
import { vectorizeKnowledgeBase } from "@/server/knowledge-base/vectorize";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

type PatchBody = {
  name?: unknown;
  description?: unknown;
  tags?: unknown;
  contentFormat?: unknown;
  content?: unknown;
};

function trimString(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function codePointLen(s: string): number {
  return [...s].length;
}

function normalizeTags(raw: unknown): { ok: true; tags: string[] } | { ok: false; message: string } {
  if (raw === undefined || raw === null) return { ok: true, tags: [] };
  if (!Array.isArray(raw)) return { ok: false, message: "须为字符串数组" };
  const tags = raw
    .filter((t) => typeof t === "string")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (tags.length > KNOWLEDGE_BASE_TAGS_MAX_COUNT) {
    return { ok: false, message: `最多 ${KNOWLEDGE_BASE_TAGS_MAX_COUNT} 个` };
  }
  for (const t of tags) {
    if (t.length > KNOWLEDGE_BASE_TAG_MAX_LENGTH) {
      return { ok: false, message: `单个标签最长 ${KNOWLEDGE_BASE_TAG_MAX_LENGTH} 字` };
    }
  }
  const out: string[] = [];
  const set = new Set<string>();
  for (const t of tags) {
    if (!set.has(t)) {
      set.add(t);
      out.push(t);
    }
  }
  return { ok: true, tags: out };
}

function kbDto(row: KnowledgeBase, includeContent: boolean) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    tags: row.tags ?? [],
    contentFormat: row.contentFormat,
    content: includeContent ? row.content : undefined,
    sourceType: row.sourceType,
    vectorStatus: row.vectorStatus,
    vectorUpdatedAt: row.vectorUpdatedAt ? row.vectorUpdatedAt.toISOString() : null,
    vectorLastStartedAt: row.vectorLastStartedAt ? row.vectorLastStartedAt.toISOString() : null,
    vectorError: row.vectorError,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const GET = withApiWrapper(async (_request: Request, ctx: RouteParams) => {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  const { id } = await ctx.params;
  if (!id) {
    return jsonError(ErrorCode.VALIDATION_ERROR, "id 无效", HttpStatus.BAD_REQUEST);
  }

  const ds = await getDataSource();
  const repo = ds.getRepository(KnowledgeBase);
  const row = await repo.findOne({ where: { id, userId: user.id } });
  if (!row) {
    return jsonError(ErrorCode.KNOWLEDGE_BASE_NOT_FOUND, "知识库不存在", HttpStatus.NOT_FOUND);
  }

  return NextResponse.json(
    { item: kbDto(row, true) },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

export const PATCH = withApiWrapper(async (request: Request, ctx: RouteParams) => {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  const { id } = await ctx.params;
  if (!id) {
    return jsonError(ErrorCode.VALIDATION_ERROR, "id 无效", HttpStatus.BAD_REQUEST);
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return jsonError(ErrorCode.VALIDATION_ERROR, "请求体须为 JSON", HttpStatus.BAD_REQUEST);
  }

  const ds = await getDataSource();
  const repo = ds.getRepository(KnowledgeBase);
  const row = await repo.findOne({ where: { id, userId: user.id } });
  if (!row) {
    return jsonError(ErrorCode.KNOWLEDGE_BASE_NOT_FOUND, "知识库不存在", HttpStatus.NOT_FOUND);
  }

  const details: JsonErrorDetail[] = [];
  let nextName = row.name;
  let nextDescription = row.description;
  let nextTags = row.tags ?? [];
  let nextFormat = row.contentFormat;
  let nextContent = row.content;

  if ("name" in body) {
    const name = trimString(body.name);
    if (!name) details.push({ field: "name", message: "不能为空" });
    else if (name.length > KNOWLEDGE_BASE_NAME_MAX_LENGTH) {
      details.push({ field: "name", message: `长度不能超过 ${KNOWLEDGE_BASE_NAME_MAX_LENGTH}` });
    } else nextName = name;
  }

  if ("description" in body) {
    if (body.description !== null && body.description !== undefined && typeof body.description !== "string") {
      details.push({ field: "description", message: "须为字符串或 null" });
    } else {
      const d = trimString(body.description);
      if (d.length > KNOWLEDGE_BASE_DESCRIPTION_MAX_LENGTH) {
        details.push({
          field: "description",
          message: `长度不能超过 ${KNOWLEDGE_BASE_DESCRIPTION_MAX_LENGTH}`,
        });
      } else {
        nextDescription = d.length > 0 ? d : null;
      }
    }
  }

  if ("tags" in body) {
    const parsed = normalizeTags(body.tags);
    if (!parsed.ok) details.push({ field: "tags", message: parsed.message });
    else nextTags = parsed.tags;
  }

  if ("contentFormat" in body) {
    const f = trimString(body.contentFormat);
    if (f !== "markdown" && f !== "plain") {
      details.push({ field: "contentFormat", message: "须为 markdown 或 plain" });
    } else nextFormat = f as any;
  }

  if ("content" in body) {
    const c = trimString(body.content);
    if (!c) details.push({ field: "content", message: "不能为空" });
    else if (codePointLen(c) > KNOWLEDGE_BASE_CONTENT_MAX_LENGTH) {
      details.push({
        field: "content",
        message: `长度不能超过 ${KNOWLEDGE_BASE_CONTENT_MAX_LENGTH} 个字符`,
      });
    } else nextContent = c;
  }

  if (details.length > 0) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "请求参数不合法",
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    );
  }

  row.name = nextName;
  row.description = nextDescription;
  row.tags = nextTags.length > 0 ? nextTags : null;
  row.contentFormat = nextFormat as any;
  row.content = nextContent;
  // 编辑后重新向量化
  row.vectorStatus = "pending";
  row.vectorError = null;
  row.vectorLastStartedAt = new Date();
  await repo.save(row);

  try {
    await vectorizeKnowledgeBase(ds, row);
  } catch {
    // 已落库 failed；不阻塞编辑保存
  }

  const fresh = await repo.findOne({ where: { id: row.id, userId: user.id } });
  return NextResponse.json(
    { item: kbDto(fresh ?? row, true) },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

/**
 * DELETE：删除知识库及其向量分片、助手绑定关系（仅本人）。
 */
export const DELETE = withApiWrapper(async (_request: Request, ctx: RouteParams) => {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  const { id } = await ctx.params;
  if (!id) {
    return jsonError(ErrorCode.VALIDATION_ERROR, "id 无效", HttpStatus.BAD_REQUEST);
  }

  const ds = await getDataSource();
  const kbRepo = ds.getRepository(KnowledgeBase);
  const row = await kbRepo.findOne({ where: { id, userId: user.id } });
  if (!row) {
    return jsonError(ErrorCode.KNOWLEDGE_BASE_NOT_FOUND, "知识库不存在", HttpStatus.NOT_FOUND);
  }

  const relRepo = ds.getRepository(AssistantKnowledgeBase);
  const chunkRepo = ds.getRepository(KnowledgeBaseVectorChunk);

  const refCount = await relRepo.count({
    where: { knowledgeBaseId: id, userId: user.id } as any,
  });
  if (refCount > 0) {
    return jsonError(
      ErrorCode.KNOWLEDGE_BASE_REFERENCED_BY_ASSISTANT,
      "该知识库仍被助手引用，请先在「助手管理」中解除知识库绑定后再删除。",
      HttpStatus.CONFLICT,
    );
  }

  await chunkRepo
    .createQueryBuilder()
    .delete()
    .where("knowledgeBaseId = :kid", { kid: id })
    .execute();

  await kbRepo.delete({ id, userId: user.id });

  return new NextResponse(null, { status: HttpStatus.NO_CONTENT });
});

