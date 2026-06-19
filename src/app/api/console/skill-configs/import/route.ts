import { NextResponse } from "next/server";
import { SKILL_CONFIG_MAX_PER_USER, SKILL_CONFIG_NAME_MAX_LENGTH } from "@/common/constants";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { getDataSource } from "@/server/db/data-source";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";
import {
  countUserPacks,
  createPackFromImport,
  parseFolderImportParts,
  parseZipImportBuffer,
  resolveImportPackName,
  validateImportEntries,
} from "@/server/skill/pack-import";
import { loadPackAggregatesByPackIds } from "@/server/skill/pack-files";
import { userSkillConfigToListItemJson } from "@/server/skill/skill-config-dto";
import { countAssistantsReferencingSkill } from "@/server/skill/assistant-skill-bindings";
import { validateSkillMdRequiredOnImport } from "@/server/skill/skill-pack-file-validation";
import { validateSkillName, trimString } from "@/server/skill/skill-config-validation";

export const runtime = "nodejs";

/**
 * POST /api/console/skill-configs/import — zip 或 multipart 文件夹导入。
 */
export const POST = withApiWrapper(async (request: Request) => {
  const locale = resolveRequestLocale(request);
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, tApiMessage(locale, "unauthorized"), HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  const ds = await getDataSource();
  const packCount = await countUserPacks(ds, user.id);
  if (packCount >= SKILL_CONFIG_MAX_PER_USER) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.skillConfigLimitPerUser", { max: SKILL_CONFIG_MAX_PER_USER }),
      HttpStatus.UNPROCESSABLE_ENTITY,
      [{ field: "import", message: tApiMessage(locale, "validation.skillConfigLimitReached") }],
    );
  }

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
  try {
    if (zipFile instanceof File && zipFile.size > 0) {
      const buf = Buffer.from(await zipFile.arrayBuffer());
      parsed = parseZipImportBuffer(buf);
      zipBaseName = zipFile.name.replace(/\.zip$/i, "");
    } else if (folderParts.length > 0) {
      const parts: Array<{ filename: string; buffer: Buffer }> = [];
      for (const p of folderParts) {
        if (!(p instanceof File)) continue;
        parts.push({
          filename: p.name,
          buffer: Buffer.from(await p.arrayBuffer()),
        });
      }
      parsed = parseFolderImportParts(parts);
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

  const packName = resolveImportPackName(overrideName, parsed, zipBaseName, null);
  const description = parsed.suggestedDescription ?? null;

  try {
    const { pack, importedFileCount } = await createPackFromImport(
      ds,
      user.id,
      packName,
      description,
      parsed.entries,
    );
    const refCount = await countAssistantsReferencingSkill(ds, user.id, pack.id);
    const agg = (await loadPackAggregatesByPackIds(ds, user.id, [pack.id])).get(pack.id)!;
    return NextResponse.json(
      {
        item: userSkillConfigToListItemJson(pack, refCount, agg),
        importSummary: {
          importedFileCount,
          skippedFileCount: parsed.skipped.length,
          skipped: parsed.skipped,
          totalBytes: parsed.totalBytes,
          hasScripts: parsed.hasScripts,
        },
      },
      { status: HttpStatus.CREATED },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
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
