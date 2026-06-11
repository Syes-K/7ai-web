/**
 * 知识库 tags 校验：trim、去重、个数与长度上限；错误 message 随 locale 双语。
 */
import {
  KNOWLEDGE_BASE_TAG_MAX_LENGTH,
  KNOWLEDGE_BASE_TAGS_MAX_COUNT,
} from "@/common/constants";
import type { AppLocale } from "@/common/constants/i18n";
import { tApiMessage } from "@/server/i18n/t-api-message";

export function validateKnowledgeBaseTags(
  raw: unknown,
  locale: AppLocale,
): { ok: true; tags: string[] } | { ok: false; message: string } {
  if (raw === undefined || raw === null) {
    return { ok: true, tags: [] };
  }
  if (!Array.isArray(raw)) {
    return {
      ok: false,
      message: tApiMessage(locale, "validation.knowledgeBase.tagsArrayRequired"),
    };
  }
  const tags = raw
    .filter((t) => typeof t === "string")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (tags.length > KNOWLEDGE_BASE_TAGS_MAX_COUNT) {
    return {
      ok: false,
      message: tApiMessage(locale, "validation.knowledgeBase.tagsMaxCount", {
        max: KNOWLEDGE_BASE_TAGS_MAX_COUNT,
      }),
    };
  }
  for (const t of tags) {
    if (t.length > KNOWLEDGE_BASE_TAG_MAX_LENGTH) {
      return {
        ok: false,
        message: tApiMessage(locale, "validation.knowledgeBase.tagMaxLength", {
          max: KNOWLEDGE_BASE_TAG_MAX_LENGTH,
        }),
      };
    }
  }
  const out: string[] = [];
  const set = new Set<string>();
  for (const t of tags) {
    if (!set.has(t)) {
      set.add(t);
      out.push(t);
    }
  }
  return { ok: true, tags: out };
}
