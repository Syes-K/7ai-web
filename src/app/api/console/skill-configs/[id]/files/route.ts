import { NextResponse } from "next/server";
import type { JsonErrorDetail } from "@/server/http/json-response";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { getDataSource } from "@/server/db/data-source";
import { jsonError } from "@/server/http/json-response";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";
import { getOwnedPackOrNull, listPackFilesMeta } from "@/server/skill/pack-files";
import {
  batchUpsertPackFiles,
  byteSize,
  loadPackAggregatesByPackIds,
} from "@/server/skill/pack-files";
import { userSkillConfigToDetailItemJson } from "@/server/skill/skill-config-dto";
import { countAssistantsReferencingSkill } from "@/server/skill/assistant-skill-bindings";
import {
  validatePackFileContentField,
  validatePackFilePathField,
  validatePackQuotaAfterWrite,
} from "@/server/skill/skill-pack-file-validation";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET / PUT — Pack 文件列表 / 批量 upsert。
 */
export const GET = withApiWrapper(async (request: Request, ctx: RouteParams) => {
  const locale = resolveRequestLocale(request);
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, tApiMessage(locale, "unauthorized"), HttpStatus.UNAUTHORIZED);
  }
  const { id: packId } = await ctx.params;
  const ds = await getDataSource();
  const pack = await getOwnedPackOrNull(ds, reqCtx.user.id, packId);
  if (!pack) {
    return jsonError(
      ErrorCode.SKILL_CONFIG_NOT_FOUND,
      tApiMessage(locale, "skillConfigNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }
  const { files, totalBytes, fileCount } = await listPackFilesMeta(ds, reqCtx.user.id, packId);
  return NextResponse.json({
    packId,
    files: files.map((f) => ({
      path: f.path,
      sizeBytes: f.sizeBytes,
      updatedAt: f.updatedAt.toISOString(),
    })),
    totalBytes,
    fileCount,
  });
});

type BatchBody = { files?: unknown };

export const PUT = withApiWrapper(async (request: Request, ctx: RouteParams) => {
  const locale = resolveRequestLocale(request);
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, tApiMessage(locale, "unauthorized"), HttpStatus.UNAUTHORIZED);
  }
  const { id: packId } = await ctx.params;
  const ds = await getDataSource();
  const pack = await getOwnedPackOrNull(ds, reqCtx.user.id, packId);
  if (!pack) {
    return jsonError(
      ErrorCode.SKILL_CONFIG_NOT_FOUND,
      tApiMessage(locale, "skillConfigNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }

  let body: BatchBody;
  try {
    body = (await request.json()) as BatchBody;
  } catch {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidJson"),
      HttpStatus.BAD_REQUEST,
    );
  }
  if (!Array.isArray(body.files)) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidParams"),
      HttpStatus.UNPROCESSABLE_ENTITY,
      [{ field: "files", message: tApiMessage(locale, "validation.arrayRequired") }],
    );
  }

  const details: JsonErrorDetail[] = [];
  const parsed: Array<{ path: string; content: string }> = [];
  const agg = (await loadPackAggregatesByPackIds(ds, reqCtx.user.id, [packId])).get(packId) ?? {
    fileCount: 0,
    totalBytes: 0,
    hasScripts: false,
  };

  // 模拟批量写入后的配额（单事务全成功或全失败）
  let simCount = agg.fileCount;
  let simTotal = agg.totalBytes;
  const existingPaths = new Set<string>();
  const existingRows = await listPackFilesMeta(ds, reqCtx.user.id, packId);
  for (const f of existingRows.files) {
    existingPaths.add(f.path);
  }
  const pathToOldBytes = new Map(existingRows.files.map((f) => [f.path, f.sizeBytes]));

  for (let i = 0; i < body.files.length; i++) {
    const raw = body.files[i] as { path?: unknown; content?: unknown };
    const fieldPath = `files[${i}].path`;
    const rawPath = typeof raw?.path === "string" ? raw.path : "";
    const path = validatePackFilePathField(rawPath, fieldPath, details, locale);
    if (!path) continue;
    const content = validatePackFileContentField(raw.content, `files[${i}].content`, path, details, locale);
    if (content === null) continue;
    const isNew = !existingPaths.has(path);
    const oldBytes = pathToOldBytes.get(path) ?? 0;
    const newBytes = byteSize(content);
    if (
      !validatePackQuotaAfterWrite(
        simCount,
        simTotal,
        path,
        oldBytes,
        path,
        newBytes,
        isNew,
        details,
        locale,
        fieldPath,
      )
    ) {
      continue;
    }
    if (isNew) simCount += 1;
    simTotal = simTotal - oldBytes + newBytes;
    pathToOldBytes.set(path, newBytes);
    existingPaths.add(path);
    parsed.push({ path, content });
  }

  if (details.length > 0) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidParams"),
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    );
  }

  const { pack: updatedPack, savedCount } = await batchUpsertPackFiles(ds, reqCtx.user.id, pack, parsed);
  const newAgg = (await loadPackAggregatesByPackIds(ds, reqCtx.user.id, [packId])).get(packId)!;
  const refCount = await countAssistantsReferencingSkill(ds, reqCtx.user.id, packId);
  return NextResponse.json({
    savedCount,
    totalBytes: newAgg.totalBytes,
    fileCount: newAgg.fileCount,
    item: userSkillConfigToDetailItemJson(updatedPack, refCount, newAgg),
  });
});
