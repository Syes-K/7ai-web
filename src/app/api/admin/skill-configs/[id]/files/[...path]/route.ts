import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SKILL_PACK_FILE_MAX_BYTES } from "@/common/constants";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";
import { withAdminApi } from "@/server/auth/with-admin-api";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { getDataSource } from "@/server/db/data-source";
import type { User } from "@/server/db/entities/User";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";
import { byteSize, getPackById, getPackFileContent } from "@/server/skill/pack-files";
import { normalizePackFilePath } from "@/server/skill/pack-path";
import { skillConfigWriteDisabledResponse } from "@/server/skill/skill-config-api-responses";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string; path: string[] }> };

function joinPathParam(segments: string[]): string {
  return segments.map((s) => decodeURIComponent(s)).join("/");
}

/**
 * GET：单文件内容（只读）；超大文件返回 truncated: true。
 * PUT/PATCH/DELETE：禁止在线写 → 403。
 */
export const GET = withApiWrapper([withAdminApi], async (_admin: User, request: NextRequest, ctx: RouteParams) => {
  const locale = resolveRequestLocale(request);
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
  const ds = await getDataSource();
  const pack = await getPackById(ds, packId);
  if (!pack) {
    return jsonError(
      ErrorCode.SKILL_CONFIG_NOT_FOUND,
      tApiMessage(locale, "skillConfigNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }
  const row = await getPackFileContent(ds, packId, relPath);
  if (!row) {
    return jsonError(
      ErrorCode.SKILL_PACK_FILE_NOT_FOUND,
      tApiMessage(locale, "skillPackFileNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }
  const sizeBytes = byteSize(row.content);
  const truncated = sizeBytes > SKILL_PACK_FILE_MAX_BYTES;
  const content = truncated ? row.content.slice(0, SKILL_PACK_FILE_MAX_BYTES) : row.content;
  return NextResponse.json({
    path: row.path,
    content,
    sizeBytes,
    updatedAt: row.updatedAt.toISOString(),
    ...(truncated ? { truncated: true } : {}),
  });
});

export const PUT = withApiWrapper([withAdminApi], async (_admin: User, request: NextRequest) => {
  const locale = resolveRequestLocale(request);
  return skillConfigWriteDisabledResponse(locale);
});

export const PATCH = withApiWrapper([withAdminApi], async (_admin: User, request: NextRequest) => {
  const locale = resolveRequestLocale(request);
  return skillConfigWriteDisabledResponse(locale);
});

export const DELETE = withApiWrapper([withAdminApi], async (_admin: User, request: NextRequest) => {
  const locale = resolveRequestLocale(request);
  return skillConfigWriteDisabledResponse(locale);
});
