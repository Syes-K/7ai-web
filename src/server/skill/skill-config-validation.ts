import type { AppLocale } from "@/common/constants/i18n";
import type { JsonErrorDetail } from "@/server/http/json-response";
import {
  SKILL_CONFIG_DESCRIPTION_MAX_LENGTH,
  SKILL_CONFIG_NAME_MAX_LENGTH,
} from "@/common/constants";
import { tApiMessage } from "@/server/i18n/t-api-message";

export function trimString(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

export function parseBoolean(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === "boolean") return raw;
  return fallback;
}

/** 拒绝 0.1.19 已废弃的 content 字段。 */
export function rejectDeprecatedSkillContentField(
  body: Record<string, unknown>,
  details: JsonErrorDetail[],
  locale: AppLocale,
): void {
  if ("content" in body) {
    details.push({
      field: "content",
      message: tApiMessage(locale, "validation.skillContentDeprecated"),
    });
  }
}

/** Skill 配置字段校验；details[].message 经 locale 翻译后写入 API 响应。 */
export function validateSkillName(
  name: string,
  details: JsonErrorDetail[],
  locale: AppLocale,
): void {
  if (!name) {
    details.push({ field: "name", message: tApiMessage(locale, "validation.required") });
  } else if (name.length > SKILL_CONFIG_NAME_MAX_LENGTH) {
    details.push({
      field: "name",
      message: tApiMessage(locale, "validation.maxLength", { max: SKILL_CONFIG_NAME_MAX_LENGTH }),
    });
  }
}

export function validateSkillDescription(
  raw: unknown,
  details: JsonErrorDetail[],
  locale: AppLocale,
): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== "string") {
    details.push({
      field: "description",
      message: tApiMessage(locale, "validation.maxLength", {
        max: SKILL_CONFIG_DESCRIPTION_MAX_LENGTH,
      }),
    });
    return undefined;
  }
  const d = raw.trim();
  if (d.length > SKILL_CONFIG_DESCRIPTION_MAX_LENGTH) {
    details.push({
      field: "description",
      message: tApiMessage(locale, "validation.maxLength", {
        max: SKILL_CONFIG_DESCRIPTION_MAX_LENGTH,
      }),
    });
    return undefined;
  }
  return d.length > 0 ? d : null;
}
