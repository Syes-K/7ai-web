import {
  MODEL_CONFIG_TAG_OPTIONS,
  type ModelConfigTag,
  resolveModelConfigTagKey,
} from "@/common/model-config/model-tags";
import type { AppLocale } from "@/common/constants/i18n";
import { tApiMessage } from "@/server/i18n/t-api-message";

/** 从库中读出的 JSON 数组规范为合法标签（兼容旧中文、过滤未知值、去重保序） */
export function normalizeStoredModelTags(
  raw: string[] | null | undefined,
): ModelConfigTag[] {
  const tagsRaw = Array.isArray(raw) ? raw : [];
  const out: ModelConfigTag[] = [];
  const seen = new Set<string>();
  for (const t of tagsRaw) {
    if (typeof t !== "string") {
      continue;
    }
    const key = resolveModelConfigTagKey(t);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(key);
  }
  return out;
}

/**
 * 解析请求体中的 `tags`：可选多选，仅允许 {@link MODEL_CONFIG_TAG_OPTIONS} 中的值；trim、去重。
 * @param locale - 未传时默认 zh，供管理端等未 i18n 路由保持中文错误文案。
 */
export function parseModelConfigTags(
  input: unknown,
  locale: AppLocale = "zh",
): { ok: true; tags: ModelConfigTag[] } | { ok: false; message: string } {
  if (input === undefined || input === null) {
    return {
      ok: false,
      message: tApiMessage(locale, "validation.modelTagsArrayRequired"),
    };
  }
  if (!Array.isArray(input)) {
    return {
      ok: false,
      message: tApiMessage(locale, "validation.modelTagsArrayRequired"),
    };
  }
  const out: ModelConfigTag[] = [];
  const seen = new Set<string>();
  const allowedHint = MODEL_CONFIG_TAG_OPTIONS.join(", ");
  for (const raw of input) {
    if (typeof raw !== "string") {
      return {
        ok: false,
        message: tApiMessage(locale, "validation.tagMustBeString"),
      };
    }
    const key = resolveModelConfigTagKey(raw);
    if (!key) {
      return {
        ok: false,
        message: tApiMessage(locale, "validation.modelTagsAllowed", { allowed: allowedHint }),
      };
    }
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(key);
  }
  return { ok: true, tags: out };
}
