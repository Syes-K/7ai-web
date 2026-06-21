import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";
import { withAdminApi } from "@/server/auth/with-admin-api";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { getDataSource } from "@/server/db/data-source";
import type { User } from "@/server/db/entities/User";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";
import { getPackById, listPackFilesMeta } from "@/server/skill/pack-files";
import { skillConfigWriteDisabledResponse } from "@/server/skill/skill-config-api-responses";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET：Pack 文件 meta 列表（只读）。
 * POST：禁止在线写 → 403。
 */
export const GET = withApiWrapper([withAdminApi], async (_admin: User, request: NextRequest, ctx: RouteParams) => {
  const locale = resolveRequestLocale(request);
  const { id: packId } = await ctx.params;
  const ds = await getDataSource();
  const pack = await getPackById(ds, packId);
  if (!pack) {
    return jsonError(
      ErrorCode.SKILL_CONFIG_NOT_FOUND,
      tApiMessage(locale, "skillConfigNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }
  const { files, totalBytes, fileCount } = await listPackFilesMeta(ds, packId);
  return NextResponse.json({
    files: files.map((f) => ({
      path: f.path,
      sizeBytes: f.sizeBytes,
      updatedAt: f.updatedAt.toISOString(),
    })),
    totalBytes,
    fileCount,
  });
});

export const POST = withApiWrapper([withAdminApi], async (_admin: User, request: NextRequest) => {
  const locale = resolveRequestLocale(request);
  return skillConfigWriteDisabledResponse(locale);
});
