import {
  MODEL_CONFIG_TAG_OPTION_SET,
  MODEL_CONFIG_TAG_OPTIONS,
  type ModelConfigTag,
} from "@/common/constants";

/** 从库中读出的 JSON 数组规范为合法标签（过滤未知值、去重保序） */
export function normalizeStoredModelTags(
  raw: string[] | null | undefined,
): ModelConfigTag[] {
  const tagsRaw = Array.isArray(raw) ? raw : [];
  const out: ModelConfigTag[] = [];
  const seen = new Set<string>();
  for (const t of tagsRaw) {
    if (typeof t !== "string" || !MODEL_CONFIG_TAG_OPTION_SET.has(t)) {
      continue;
    }
    if (seen.has(t)) {
      continue;
    }
    seen.add(t);
    out.push(t as ModelConfigTag);
  }
  return out;
}

/**
 * 解析请求体中的 `tags`：可选多选，仅允许 {@link MODEL_CONFIG_TAG_OPTIONS} 中的值；trim、去重。
 */
export function parseModelConfigTags(
  input: unknown,
): { ok: true; tags: ModelConfigTag[] } | { ok: false; message: string } {
  if (input === undefined || input === null) {
    return { ok: false, message: "须为字符串数组" };
  }
  if (!Array.isArray(input)) {
    return { ok: false, message: "须为字符串数组" };
  }
  const out: ModelConfigTag[] = [];
  const seen = new Set<string>();
  const allowedHint = MODEL_CONFIG_TAG_OPTIONS.join("、");
  for (const raw of input) {
    if (typeof raw !== "string") {
      return { ok: false, message: "每个标签须为字符串" };
    }
    const t = raw.trim();
    if (t.length === 0) {
      continue;
    }
    if (!MODEL_CONFIG_TAG_OPTION_SET.has(t)) {
      return {
        ok: false,
        message: `标签仅允许：${allowedHint}`,
      };
    }
    if (seen.has(t)) {
      continue;
    }
    seen.add(t);
    out.push(t as ModelConfigTag);
  }
  return { ok: true, tags: out };
}
