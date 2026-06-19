import { NextResponse } from "next/server";
import {
  SKILL_PACK_SKILL_MD_PATH,
} from "@/common/constants";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { getDataSource } from "@/server/db/data-source";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";
import {
  byteSize,
  deletePackFile,
  getOwnedPackOrNull,
  getPackFileContent,
  listPackFilesMeta,
  loadPackAggregatesByPackIds,
  movePackFile,
  upsertPackFile,
} from "@/server/skill/pack-files";
import { userSkillConfigToDetailItemJson } from "@/server/skill/skill-config-dto";
import { countAssistantsReferencingSkill } from "@/server/skill/assistant-skill-bindings";
import { isSkillMdPath, normalizePackFilePath } from "@/server/skill/pack-path";
import {
  validatePackFileContentField,
  validatePackFilePathField,
  validatePackQuotaAfterWrite,
  validateSkillMdDeleteForbidden,
} from "@/server/skill/skill-pack-file-validation";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string; path: string[] }> };

function joinPathParam(segments: string[]): string {
  return segments.map((s) => decodeURIComponent(s)).join("/");
}

async function loadOwnedPack(locale: import("@/common/constants/i18n").AppLocale, userId: string, packId: string) {
  const ds = await getDataSource();
  const pack = await getOwnedPackOrNull(ds, userId, packId);
  if (!pack) {
    return {
      ds,
      pack: null,
      error: jsonError(
        ErrorCode.SKILL_CONFIG_NOT_FOUND,
        tApiMessage(locale, "skillConfigNotFound"),
        HttpStatus.NOT_FOUND,
      ),
    };
  }
  return { ds, pack, error: null };
}

/** GET / PUT / PATCH / DELETE 单文件。 */
export const GET = withApiWrapper(async (request: Request, ctx: RouteParams) => {
  const locale = resolveRequestLocale(request);
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, tApiMessage(locale, "unauthorized"), HttpStatus.UNAUTHORIZED);
  }
  const { id: packId, path: pathSegs } = await ctx.params;
  const relPath = normalizePackFilePath(joinPathParam(pathSegs));
  if (!relPath) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidParams"),
      HttpStatus.UNPROCESSABLE_ENTITY,
      [{ field: "path", message: tApiMessage(locale, "validation.skillPackInvalidPath") }],
    );
  }
  const owned = await loadOwnedPack(locale, reqCtx.user.id, packId);
  if (!owned.pack) return owned.error!;
  const row = await getPackFileContent(owned.ds, reqCtx.user.id, packId, relPath);
  if (!row) {
    return jsonError(
      ErrorCode.SKILL_PACK_FILE_NOT_FOUND,
      tApiMessage(locale, "skillPackFileNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }
  return NextResponse.json({
    path: row.path,
    content: row.content,
    sizeBytes: byteSize(row.content),
    updatedAt: row.updatedAt.toISOString(),
  });
});

type PutBody = { content?: unknown };

export const PUT = withApiWrapper(async (request: Request, ctx: RouteParams) => {
  const locale = resolveRequestLocale(request);
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, tApiMessage(locale, "unauthorized"), HttpStatus.UNAUTHORIZED);
  }
  const { id: packId, path: pathSegs } = await ctx.params;
  const details: JsonErrorDetail[] = [];
  const relPath = validatePackFilePathField(joinPathParam(pathSegs), "path", details, locale);
  if (!relPath || details.length > 0) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidParams"),
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
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

  const owned = await loadOwnedPack(locale, reqCtx.user.id, packId);
  if (!owned.pack) return owned.error!;

  const content = validatePackFileContentField(body.content, "content", relPath, details, locale);
  const agg = (await loadPackAggregatesByPackIds(owned.ds, reqCtx.user.id, [packId])).get(packId)!;
  const existing = await getPackFileContent(owned.ds, reqCtx.user.id, packId, relPath);
  const isNew = !existing;
  const oldBytes = existing ? byteSize(existing.content) : 0;
  const newBytes = content ? byteSize(content) : 0;
  if (content !== null) {
    validatePackQuotaAfterWrite(
      agg.fileCount,
      agg.totalBytes,
      relPath,
      oldBytes,
      relPath,
      newBytes,
      isNew,
      details,
      locale,
    );
  }
  if (details.length > 0 || content === null) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidParams"),
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    );
  }

  const result = await upsertPackFile(owned.ds, reqCtx.user.id, owned.pack, relPath, content);
  const newAgg = (await loadPackAggregatesByPackIds(owned.ds, reqCtx.user.id, [packId])).get(packId)!;
  const refCount = await countAssistantsReferencingSkill(owned.ds, reqCtx.user.id, packId);
  return NextResponse.json(
    {
      file: {
        path: result.file.path,
        content: result.file.content,
        sizeBytes: byteSize(result.file.content),
        updatedAt: result.file.updatedAt.toISOString(),
      },
      item: userSkillConfigToDetailItemJson(result.pack, refCount, newAgg),
    },
    { status: result.created ? HttpStatus.CREATED : HttpStatus.OK },
  );
});

type PatchBody = { newPath?: unknown };

export const PATCH = withApiWrapper(async (request: Request, ctx: RouteParams) => {
  const locale = resolveRequestLocale(request);
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, tApiMessage(locale, "unauthorized"), HttpStatus.UNAUTHORIZED);
  }
  const { id: packId, path: pathSegs } = await ctx.params;
  const details: JsonErrorDetail[] = [];
  const oldPath = validatePackFilePathField(joinPathParam(pathSegs), "path", details, locale);
  if (!oldPath || details.length > 0) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidParams"),
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    );
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidJson"),
      HttpStatus.BAD_REQUEST,
    );
  }
  const newPath = validatePackFilePathField(
    typeof body.newPath === "string" ? body.newPath : "",
    "newPath",
    details,
    locale,
  );
  if (!newPath || details.length > 0) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidParams"),
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    );
  }

  const owned = await loadOwnedPack(locale, reqCtx.user.id, packId);
  if (!owned.pack) return owned.error!;

  const existing = await getPackFileContent(owned.ds, reqCtx.user.id, packId, oldPath);
  if (!existing) {
    return jsonError(
      ErrorCode.SKILL_PACK_FILE_NOT_FOUND,
      tApiMessage(locale, "skillPackFileNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }
  if (isSkillMdPath(oldPath) && !isSkillMdPath(newPath)) {
    const skillMd = await getPackFileContent(owned.ds, reqCtx.user.id, packId, SKILL_PACK_SKILL_MD_PATH);
    if (skillMd && skillMd.path === oldPath) {
      validateSkillMdDeleteForbidden(details, locale, "newPath");
      return jsonError(
        ErrorCode.VALIDATION_ERROR,
        tApiMessage(locale, "validation.invalidParams"),
        HttpStatus.UNPROCESSABLE_ENTITY,
        details,
      );
    }
  }

  const conflict = await getPackFileContent(owned.ds, reqCtx.user.id, packId, newPath);
  if (conflict && conflict.path !== oldPath) {
    return jsonError(
      ErrorCode.SKILL_PACK_FILE_PATH_CONFLICT,
      tApiMessage(locale, "skillPackFilePathConflict"),
      HttpStatus.CONFLICT,
    );
  }

  const moved = await movePackFile(owned.ds, reqCtx.user.id, packId, oldPath, newPath);
  if (!moved) {
    return jsonError(
      ErrorCode.SKILL_PACK_FILE_NOT_FOUND,
      tApiMessage(locale, "skillPackFileNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }
  return NextResponse.json({
    path: moved.path,
    updatedAt: moved.updatedAt.toISOString(),
  });
});

export const DELETE = withApiWrapper(async (request: Request, ctx: RouteParams) => {
  const locale = resolveRequestLocale(request);
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, tApiMessage(locale, "unauthorized"), HttpStatus.UNAUTHORIZED);
  }
  const { id: packId, path: pathSegs } = await ctx.params;
  const details: JsonErrorDetail[] = [];
  const relPath = validatePackFilePathField(joinPathParam(pathSegs), "path", details, locale);
  if (!relPath || details.length > 0) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidParams"),
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    );
  }

  const owned = await loadOwnedPack(locale, reqCtx.user.id, packId);
  if (!owned.pack) return owned.error!;

  if (isSkillMdPath(relPath)) {
    const meta = await listPackFilesMeta(owned.ds, reqCtx.user.id, packId);
    const skillMdCount = meta.files.filter((f) => isSkillMdPath(f.path)).length;
    if (skillMdCount <= 1) {
      validateSkillMdDeleteForbidden(details, locale);
      return jsonError(
        ErrorCode.VALIDATION_ERROR,
        tApiMessage(locale, "validation.invalidParams"),
        HttpStatus.UNPROCESSABLE_ENTITY,
        details,
      );
    }
  }

  const ok = await deletePackFile(owned.ds, reqCtx.user.id, packId, relPath);
  if (!ok) {
    return jsonError(
      ErrorCode.SKILL_PACK_FILE_NOT_FOUND,
      tApiMessage(locale, "skillPackFileNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }
  return new NextResponse(null, { status: HttpStatus.NO_CONTENT });
});
