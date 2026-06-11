import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  KNOWLEDGE_BASE_CONTENT_MAX_LENGTH,
  KNOWLEDGE_BASE_DESCRIPTION_MAX_LENGTH,
  KNOWLEDGE_BASE_NAME_MAX_LENGTH,
} from "@/common/constants";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { getDataSource } from "@/server/db/data-source";
import { KnowledgeBase } from "@/server/db/entities/KnowledgeBase";
import { vectorizeKnowledgeBase } from "@/server/knowledge-base/vectorize";
import { validateKnowledgeBaseTags } from "@/server/knowledge-base/validate-tags";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";

export const runtime = "nodejs";

type PostBody = {
  name?: unknown;
  description?: unknown;
  tags?: unknown;
  contentFormat?: unknown;
  content?: unknown;
  sourceType?: unknown;
};

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
 * GET /api/knowledge-bases — 列出当前用户知识库；错误 message 随 locale 双语。
 */
export const GET = withApiWrapper(async (request: Request) => {
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
 * POST /api/knowledge-bases — 新建知识库并触发向量化。
 */
export const POST = withApiWrapper(async (request: Request) => {
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
  const name = trimString(body.name);
  if (!name) {
    details.push({ field: "name", message: tApiMessage(locale, "validation.required") });
  } else if (name.length > KNOWLEDGE_BASE_NAME_MAX_LENGTH) {
    details.push({
      field: "name",
      message: tApiMessage(locale, "validation.maxLength", { max: KNOWLEDGE_BASE_NAME_MAX_LENGTH }),
    });
  }

  const descriptionRaw = body.description;
  let description: string | null = null;
  if (descriptionRaw !== undefined && descriptionRaw !== null) {
    if (typeof descriptionRaw !== "string") {
      details.push({ field: "description", message: tApiMessage(locale, "validation.stringOrNull") });
    } else {
      const d = descriptionRaw.trim();
      if (d.length > KNOWLEDGE_BASE_DESCRIPTION_MAX_LENGTH) {
        details.push({
          field: "description",
          message: tApiMessage(locale, "validation.maxLength", {
            max: KNOWLEDGE_BASE_DESCRIPTION_MAX_LENGTH,
          }),
        });
      } else {
        description = d.length > 0 ? d : null;
      }
    }
  }

  const tagsParsed = validateKnowledgeBaseTags(body.tags, locale);
  if (!tagsParsed.ok) {
    details.push({ field: "tags", message: tagsParsed.message });
  }

  const contentFormat = trimString(body.contentFormat);
  if (contentFormat !== "markdown" && contentFormat !== "plain") {
    details.push({
      field: "contentFormat",
      message: tApiMessage(locale, "validation.knowledgeBase.contentFormatEnum"),
    });
  }

  const content = trimString(body.content);
  if (!content) {
    details.push({ field: "content", message: tApiMessage(locale, "validation.required") });
  } else if (codePointLen(content) > KNOWLEDGE_BASE_CONTENT_MAX_LENGTH) {
    details.push({
      field: "content",
      message: tApiMessage(locale, "validation.maxLength", { max: KNOWLEDGE_BASE_CONTENT_MAX_LENGTH }),
    });
  }

  const sourceType = trimString(body.sourceType || "text");
  if (sourceType !== "text") {
    details.push({
      field: "sourceType",
      message: tApiMessage(locale, "validation.knowledgeBase.sourceTypeTextOnly"),
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
  const repo = ds.getRepository(KnowledgeBase);
  const row = repo.create({
    id: uuidv4(),
    userId: user.id,
    name,
    description,
    tags: tagsParsed.ok && tagsParsed.tags.length > 0 ? tagsParsed.tags : null,
    contentFormat: contentFormat as "markdown" | "plain",
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
      const conflictMsg = tApiMessage(locale, "validation.knowledgeBase.nameConflict");
      return jsonError(
        ErrorCode.VALIDATION_ERROR,
        conflictMsg,
        HttpStatus.UNPROCESSABLE_ENTITY,
        [{ field: "name", message: conflictMsg }],
      );
    }
    return jsonError(
      ErrorCode.INTERNAL_ERROR,
      tApiMessage(locale, "saveFailedRetry"),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
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
