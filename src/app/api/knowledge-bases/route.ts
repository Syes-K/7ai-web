import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
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
import { KnowledgeBase } from "@/server/db/entities/KnowledgeBase";
import { vectorizeKnowledgeBase } from "@/server/knowledge-base/vectorize";

export const runtime = "nodejs";

type PostBody = {
  name?: unknown;
  description?: unknown;
  tags?: unknown;
  contentFormat?: unknown;
  content?: unknown;
  sourceType?: unknown;
};

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

function trimString(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function codePointLen(s: string): number {
  return [...s].length;
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

/**
 * GET /api/knowledge-bases
 */
export const GET = withApiWrapper(async (request: Request) => {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  const url = new URL(request.url);
  const keyword = (url.searchParams.get("keyword") ?? "").trim();
  const ds = await getDataSource();
  const repo = ds.getRepository(KnowledgeBase);

  const qb = repo.createQueryBuilder("kb").where("kb.userId = :uid", { uid: user.id });
  if (keyword.length > 0) {
    qb.andWhere("(instr(lower(kb.name), lower(:kw)) > 0 OR instr(lower(kb.description), lower(:kw)) > 0)", {
      kw: keyword,
    });
  }

  const rows = await qb.orderBy("kb.updatedAt", "DESC").addOrderBy("kb.id", "DESC").getMany();
  const items = rows.map((r) => kbDto(r, false));
  return NextResponse.json(
    { items },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

/**
 * POST /api/knowledge-bases
 */
export const POST = withApiWrapper(async (request: Request) => {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return jsonError(ErrorCode.VALIDATION_ERROR, "请求体须为 JSON", HttpStatus.BAD_REQUEST);
  }

  const details: JsonErrorDetail[] = [];
  const name = trimString(body.name);
  if (!name) details.push({ field: "name", message: "不能为空" });
  else if (name.length > KNOWLEDGE_BASE_NAME_MAX_LENGTH) {
    details.push({ field: "name", message: `长度不能超过 ${KNOWLEDGE_BASE_NAME_MAX_LENGTH}` });
  }

  const descriptionRaw = body.description;
  let description: string | null = null;
  if (descriptionRaw !== undefined && descriptionRaw !== null) {
    if (typeof descriptionRaw !== "string") {
      details.push({ field: "description", message: "须为字符串或 null" });
    } else {
      const d = descriptionRaw.trim();
      if (d.length > KNOWLEDGE_BASE_DESCRIPTION_MAX_LENGTH) {
        details.push({
          field: "description",
          message: `长度不能超过 ${KNOWLEDGE_BASE_DESCRIPTION_MAX_LENGTH}`,
        });
      } else {
        description = d.length > 0 ? d : null;
      }
    }
  }

  const tagsParsed = normalizeTags(body.tags);
  if (!tagsParsed.ok) details.push({ field: "tags", message: tagsParsed.message });

  const contentFormat = trimString(body.contentFormat);
  if (contentFormat !== "markdown" && contentFormat !== "plain") {
    details.push({ field: "contentFormat", message: "须为 markdown 或 plain" });
  }

  const content = trimString(body.content);
  if (!content) details.push({ field: "content", message: "不能为空" });
  else if (codePointLen(content) > KNOWLEDGE_BASE_CONTENT_MAX_LENGTH) {
    details.push({
      field: "content",
      message: `长度不能超过 ${KNOWLEDGE_BASE_CONTENT_MAX_LENGTH} 个字符`,
    });
  }

  const sourceType = trimString(body.sourceType || "text");
  if (sourceType !== "text") {
    details.push({ field: "sourceType", message: "本期仅支持 text" });
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
  const repo = ds.getRepository(KnowledgeBase);
  const row = repo.create({
    id: uuidv4(),
    userId: user.id,
    name,
    description,
    tags: tagsParsed.ok && tagsParsed.tags.length > 0 ? tagsParsed.tags : null,
    contentFormat: contentFormat as any,
    content,
    sourceType: "text",
    vectorStatus: "pending",
    vectorUpdatedAt: null,
    vectorLastStartedAt: null,
    vectorContentHash: null,
    vectorError: null,
  });

  try {
    await repo.save(row);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("unique")) {
      return jsonError(
        ErrorCode.VALIDATION_ERROR,
        "名称已存在",
        HttpStatus.UNPROCESSABLE_ENTITY,
        [{ field: "name", message: "名称已存在，请更换名称" }],
      );
    }
    return jsonError(ErrorCode.INTERNAL_ERROR, "保存失败，请稍后重试", HttpStatus.INTERNAL_SERVER_ERROR);
  }

  try {
    await vectorizeKnowledgeBase(ds, row);
  } catch {
    // 已落库 failed；这里不抛给用户，保证“保存不被向量化阻塞”
  }

  const fresh = await repo.findOne({ where: { id: row.id, userId: user.id } });
  return NextResponse.json(
    { item: kbDto(fresh ?? row, true) },
    { status: HttpStatus.CREATED, headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});
