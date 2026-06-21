import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SKILL_CONFIG_NAME_MAX_LENGTH,
  SKILL_PACK_MAX_SYSTEM,
} from "@/common/constants";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { withAdminApi } from "@/server/auth/with-admin-api";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { getDataSource } from "@/server/db/data-source";
import type { User } from "@/server/db/entities/User";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";
import {
  countSystemPacks,
  createPackFromImport,
  overwritePackFromImport,
  parseFolderImportParts,
  parseZipImportBuffer,
  resolveImportDescription,
  resolveImportPackName,
  validateImportEntries,
} from "@/server/skill/pack-import";
import { getPackById, loadPackAggregatesByPackIds } from "@/server/skill/pack-files";
import { userSkillConfigToAdminListItemJson } from "@/server/skill/skill-config-dto";
import { validateSkillMdRequiredOnImport } from "@/server/skill/skill-pack-file-validation";
import { trimString, validateSkillName } from "@/server/skill/skill-config-validation";

export const runtime = "nodejs";

/**
 * POST /api/admin/skill-configs/import — 新建或覆盖导入（multipart）。
 * 覆盖模式：form 字段 packId 必填。
 */
export const POST = withApiWrapper([withAdminApi], async (_admin: User, request: NextRequest) => {
  const locale = resolveRequestLocale(request);
  const ds = await getDataSource();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidParams"),
      HttpStatus.BAD_REQUEST,
    );
  }

  const packIdRaw = form.get("packId");
  const packId = typeof packIdRaw === "string" && packIdRaw.trim() ? packIdRaw.trim() : null;
  const isOverwrite = Boolean(packId);

  if (!isOverwrite) {
    const packCount = await countSystemPacks(ds);
    if (packCount >= SKILL_PACK_MAX_SYSTEM) {
      return jsonError(
        ErrorCode.VALIDATION_ERROR,
        tApiMessage(locale, "validation.skillConfigLimitPerUser", { max: SKILL_PACK_MAX_SYSTEM }),
        HttpStatus.UNPROCESSABLE_ENTITY,
        [{ field: "import", message: tApiMessage(locale, "validation.skillConfigLimitReached") }],
      );
    }
  } else {
    const existing = await getPackById(ds, packId!);
    if (!existing) {
      return jsonError(
        ErrorCode.SKILL_CONFIG_NOT_FOUND,
        tApiMessage(locale, "skillConfigNotFound"),
        HttpStatus.NOT_FOUND,
      );
    }
  }

  const overrideNameRaw = form.get("name");
  const overrideName = typeof overrideNameRaw === "string" ? trimString(overrideNameRaw) : null;
  if (overrideName) {
    const nameDetails: JsonErrorDetail[] = [];
    validateSkillName(overrideName, nameDetails, locale);
    if (nameDetails.length > 0) {
      return jsonError(
        ErrorCode.VALIDATION_ERROR,
        tApiMessage(locale, "validation.invalidParams"),
        HttpStatus.UNPROCESSABLE_ENTITY,
        nameDetails,
      );
    }
  }

  const zipFile = form.get("file");
  const folderParts = form.getAll("files");

  let parsed;
  let zipBaseName: string | null = null;
  let folderRootName: string | null = null;
  try {
    if (zipFile instanceof File && zipFile.size > 0) {
      const buf = Buffer.from(await zipFile.arrayBuffer());
      parsed = parseZipImportBuffer(buf);
      zipBaseName = zipFile.name.replace(/\.zip$/i, "");
    } else if (folderParts.length > 0) {
      const parts: Array<{ filename: string; buffer: Buffer }> = [];
      for (const p of folderParts) {
        if (!(p instanceof File)) continue;
        parts.push({ filename: p.name, buffer: Buffer.from(await p.arrayBuffer()) });
      }
      parsed = parseFolderImportParts(parts);
      const first = parts[0]?.filename.split("/")[0];
      folderRootName = first ?? null;
    } else {
      return jsonError(
        ErrorCode.VALIDATION_ERROR,
        tApiMessage(locale, "validation.invalidParams"),
        HttpStatus.UNPROCESSABLE_ENTITY,
        [{ field: "file", message: tApiMessage(locale, "validation.required") }],
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "ZIP_TOO_LARGE") {
      return jsonError(
        ErrorCode.VALIDATION_ERROR,
        tApiMessage(locale, "validation.skillPackTotalSizeExceeded", { max: 2_000_000 }),
        HttpStatus.UNPROCESSABLE_ENTITY,
        [{ field: "file", message: tApiMessage(locale, "validation.skillPackTotalSizeExceeded", { max: 2_000_000 }) }],
      );
    }
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidParams"),
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  const importError = validateImportEntries(parsed);
  if (importError) {
    const details: JsonErrorDetail[] = [];
    validateSkillMdRequiredOnImport(details, locale, importError);
    if (importError === "too_many_files") {
      details.push({
        field: "import",
        message: tApiMessage(locale, "validation.skillPackFileCountExceeded", { max: 100 }),
      });
    }
    if (importError === "total_size_exceeded") {
      details.push({
        field: "import",
        message: tApiMessage(locale, "validation.skillPackTotalSizeExceeded", { max: 2_000_000 }),
      });
    }
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidParams"),
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    );
  }

  const packName = resolveImportPackName(overrideName, parsed, zipBaseName, folderRootName);
  const description = resolveImportDescription(parsed, parsed.entries, zipBaseName, folderRootName);

  try {
    const result = isOverwrite
      ? await overwritePackFromImport(ds, packId!, parsed.entries)
      : await createPackFromImport(ds, packName, description, parsed.entries);

    const agg = (await loadPackAggregatesByPackIds(ds, [result.pack.id])).get(result.pack.id)!;
    return NextResponse.json(
      {
        item: userSkillConfigToAdminListItemJson(result.pack, agg),
        importSummary: {
          importedFileCount: result.importedFileCount,
          skippedFileCount: parsed.skipped.length,
          skipped: parsed.skipped,
          totalBytes: parsed.totalBytes,
          hasScripts: parsed.hasScripts,
        },
      },
      { status: isOverwrite ? HttpStatus.OK : HttpStatus.CREATED },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PACK_NOT_FOUND") {
      return jsonError(
        ErrorCode.SKILL_CONFIG_NOT_FOUND,
        tApiMessage(locale, "skillConfigNotFound"),
        HttpStatus.NOT_FOUND,
      );
    }
    if (msg.toLowerCase().includes("unique")) {
      return jsonError(
        ErrorCode.SKILL_CONFIG_NAME_CONFLICT,
        tApiMessage(locale, "skillConfigNameConflict"),
        HttpStatus.CONFLICT,
        [{
          field: "name",
          message: tApiMessage(locale, "validation.skillConfigNameUnique", {
            maxLength: SKILL_CONFIG_NAME_MAX_LENGTH,
          }),
        }],
      );
    }
    return jsonError(
      ErrorCode.INTERNAL_ERROR,
      tApiMessage(locale, "saveFailedRetry"),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
});
