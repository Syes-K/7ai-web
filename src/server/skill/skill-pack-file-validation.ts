import type { AppLocale } from "@/common/constants/i18n";
import type { JsonErrorDetail } from "@/server/http/json-response";
import {
  SKILL_MD_MAX_BODY_LENGTH,
  SKILL_PACK_FILE_MAX_BYTES,
  SKILL_PACK_MAX_FILES,
  SKILL_PACK_MAX_TOTAL_BYTES,
  SKILL_PACK_SKILL_MD_PATH,
} from "@/common/constants";
import { tApiMessage } from "@/server/i18n/t-api-message";
import {
  isPackFileExtensionAllowed,
  isSkillMdPath,
  normalizePackFilePath,
} from "@/server/skill/pack-path";
import { stripSkillMdFrontmatter } from "@/server/skill/pack-frontmatter";

/** 校验 UTF-8 文本（拒绝非法 surrogate 与 NUL）。 */
export function assertValidUtf8Text(content: string): boolean {
  if (content.includes("\0")) return false;
  return true;
}

export function validatePackFilePathField(
  rawPath: string,
  field: string,
  details: JsonErrorDetail[],
  locale: AppLocale,
): string | null {
  const normalized = normalizePackFilePath(rawPath);
  if (!normalized) {
    details.push({
      field,
      message: tApiMessage(locale, "validation.skillPackInvalidPath"),
    });
    return null;
  }
  if (!isPackFileExtensionAllowed(normalized)) {
    details.push({
      field,
      message: tApiMessage(locale, "validation.skillPackFileExtensionDenied"),
    });
    return null;
  }
  return normalized;
}

export function validatePackFileContentField(
  content: unknown,
  field: string,
  path: string,
  details: JsonErrorDetail[],
  locale: AppLocale,
): string | null {
  if (typeof content !== "string") {
    details.push({ field, message: tApiMessage(locale, "validation.required") });
    return null;
  }
  if (!assertValidUtf8Text(content)) {
    details.push({
      field,
      message: tApiMessage(locale, "validation.skillPackNotUtf8"),
    });
    return null;
  }
  const bytes = Buffer.byteLength(content, "utf8");
  if (bytes > SKILL_PACK_FILE_MAX_BYTES) {
    details.push({
      field,
      message: tApiMessage(locale, "validation.skillPackFileTooLarge", {
        max: SKILL_PACK_FILE_MAX_BYTES,
      }),
    });
    return null;
  }
  if (isSkillMdPath(path)) {
    const { body } = stripSkillMdFrontmatter(content);
    if (body.length > SKILL_MD_MAX_BODY_LENGTH) {
      details.push({
        field,
        message: tApiMessage(locale, "validation.skillMdBodyTooLarge", {
          max: SKILL_MD_MAX_BODY_LENGTH,
        }),
      });
      return null;
    }
  }
  return content;
}

/** 写入前校验 Pack 级配额（不含被替换文件的旧字节时需传入 delta）。 */
export function validatePackQuotaAfterWrite(
  currentFileCount: number,
  currentTotalBytes: number,
  replacingPath: string | null,
  replacingOldBytes: number,
  newPath: string,
  newBytes: number,
  isNewFile: boolean,
  details: JsonErrorDetail[],
  locale: AppLocale,
  field = "path",
): boolean {
  const nextCount = isNewFile ? currentFileCount + 1 : currentFileCount;
  const nextTotal =
    currentTotalBytes - (replacingPath === newPath ? replacingOldBytes : 0) + newBytes;

  if (nextCount > SKILL_PACK_MAX_FILES) {
    details.push({
      field,
      message: tApiMessage(locale, "validation.skillPackFileCountExceeded", {
        max: SKILL_PACK_MAX_FILES,
      }),
    });
    return false;
  }
  if (nextTotal > SKILL_PACK_MAX_TOTAL_BYTES) {
    details.push({
      field,
      message: tApiMessage(locale, "validation.skillPackTotalSizeExceeded", {
        max: SKILL_PACK_MAX_TOTAL_BYTES,
      }),
    });
    return false;
  }
  return true;
}

export function validateSkillMdRequiredForEnable(
  skillMdBody: string | null,
  details: JsonErrorDetail[],
  locale: AppLocale,
): void {
  const body = skillMdBody?.trim() ?? "";
  if (!body) {
    details.push({
      field: "enabled",
      message: tApiMessage(locale, "validation.skillMdRequired"),
    });
  }
}

export function validateSkillMdDeleteForbidden(
  details: JsonErrorDetail[],
  locale: AppLocale,
  field = "path",
): void {
  details.push({
    field,
    message: tApiMessage(locale, "validation.skillMdDeleteForbidden"),
  });
}

export function validateDeprecatedContentField(
  details: JsonErrorDetail[],
  locale: AppLocale,
): void {
  details.push({
    field: "content",
    message: tApiMessage(locale, "validation.skillContentDeprecated"),
  });
}

export function validateSkillMdRequiredOnImport(
  details: JsonErrorDetail[],
  locale: AppLocale,
  extra?: string,
): void {
  details.push({
    field: "SKILL.md",
    message: tApiMessage(locale, "validation.skillMdRequiredOnImport"),
  });
  if (extra) {
    details.push({ field: "import", message: extra });
  }
}

/** 读取 SKILL.md 正文（去 frontmatter）用于启用校验。 */
export function skillMdBodyFromContent(content: string): string {
  return stripSkillMdFrontmatter(content).body.trim();
}

export { SKILL_PACK_SKILL_MD_PATH };
