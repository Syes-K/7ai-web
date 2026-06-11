import {
  ASSISTANT_TAG_MAX_LENGTH,
  ASSISTANT_TAGS_MAX_COUNT,
} from "@/common/constants";
import type { AppLocale } from "@/common/constants/i18n";
import { tApiMessage } from "@/server/i18n/t-api-message";

/** 从库中读出 tags：trim、去重、截断非法长度（防御脏数据） */
export function normalizeStoredAssistantTags(raw: string[] | null | undefined): string[] {
  const tagsRaw = Array.isArray(raw) ? raw : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of tagsRaw) {
    if (typeof t !== "string") {
      continue;
    }
    const s = t.trim();
    if (s.length === 0 || s.length > ASSISTANT_TAG_MAX_LENGTH) {
      continue;
    }
    if (seen.has(s)) {
      continue;
    }
    seen.add(s);
    out.push(s);
    if (out.length >= ASSISTANT_TAGS_MAX_COUNT) {
      break;
    }
  }
  return out;
}

/**
 * 解析请求体中的 `tags`：字符串数组；trim、去重、长度与个数上限。
 * @param locale - 未传时默认 zh，供管理端等未 i18n 路由保持中文错误文案。
 */
export function parseAssistantTags(
  input: unknown,
  locale: AppLocale = "zh",
): { ok: true; tags: string[] } | { ok: false; message: string } {
  if (input === undefined || input === null) {
    return { ok: true, tags: [] };
  }
  if (!Array.isArray(input)) {
    return {
      ok: false,
      message: tApiMessage(locale, "validation.assistantTagsArrayRequired"),
    };
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (typeof raw !== "string") {
      return {
        ok: false,
        message: tApiMessage(locale, "validation.tagMustBeString"),
      };
    }
    const t = raw.trim();
    if (t.length === 0) {
      continue;
    }
    if (t.length > ASSISTANT_TAG_MAX_LENGTH) {
      return {
        ok: false,
        message: tApiMessage(locale, "validation.assistantTagMaxLength", {
          max: ASSISTANT_TAG_MAX_LENGTH,
        }),
      };
    }
    if (seen.has(t)) {
      continue;
    }
    seen.add(t);
    out.push(t);
    if (out.length > ASSISTANT_TAGS_MAX_COUNT) {
      return {
        ok: false,
        message: tApiMessage(locale, "validation.assistantTagsMaxCount", {
          max: ASSISTANT_TAGS_MAX_COUNT,
        }),
      };
    }
  }
  return { ok: true, tags: out };
}
