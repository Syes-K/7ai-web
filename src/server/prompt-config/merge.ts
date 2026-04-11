import { DEFAULT_PROMPT_CONFIG } from "@/common/constants/defautPromptConfig";
import type {
  PromptConfigApiItem,
  PromptConfigFileState,
  PromptConfigFragment,
  PromptConfigKey,
} from "@/common/types";

/**
 * 权威 key 顺序与 `DEFAULT_PROMPT_CONFIG` 源码定义顺序一致（Object.keys 对字符串键即插入序）。
 */
export function getAuthoritativePromptKeys(): PromptConfigKey[] {
  return Object.keys(DEFAULT_PROMPT_CONFIG) as PromptConfigKey[];
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** 与 data-models：trim 后非空才视为文件侧有效覆盖。 */
function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function copyDefault(k: PromptConfigKey): PromptConfigFragment {
  const d = DEFAULT_PROMPT_CONFIG[k];
  return { name: d.name, desc: d.desc, value: d.value };
}

/**
 * 将磁盘上的 JSON 文本与默认常量合并。
 * - `fileRaw === null`：文件不存在，全默认。
 * - 顶层解析失败或非 object：`invalid_json`，合并结果全默认（仍允许 PUT 覆盖修复）。
 */
export function mergePromptConfigFromFile(fileRaw: string | null): {
  merged: Record<PromptConfigKey, PromptConfigFragment>;
  fileState: PromptConfigFileState;
} {
  const keys = getAuthoritativePromptKeys();

  if (fileRaw === null) {
    const merged = {} as Record<PromptConfigKey, PromptConfigFragment>;
    for (const k of keys) {
      merged[k] = copyDefault(k);
    }
    return { merged, fileState: "ok" };
  }

  let fileObj: unknown;
  try {
    fileObj = JSON.parse(fileRaw);
  } catch {
    const merged = {} as Record<PromptConfigKey, PromptConfigFragment>;
    for (const k of keys) {
      merged[k] = copyDefault(k);
    }
    return { merged, fileState: "invalid_json" };
  }

  if (!isPlainObject(fileObj)) {
    const merged = {} as Record<PromptConfigKey, PromptConfigFragment>;
    for (const k of keys) {
      merged[k] = copyDefault(k);
    }
    return { merged, fileState: "invalid_json" };
  }

  const merged = {} as Record<PromptConfigKey, PromptConfigFragment>;
  for (const k of keys) {
    const defFrag = DEFAULT_PROMPT_CONFIG[k];
    const rawFrag = fileObj[k as string];
    if (rawFrag === undefined || !isPlainObject(rawFrag)) {
      merged[k] = copyDefault(k);
      continue;
    }
    merged[k] = {
      name: isNonEmptyString(rawFrag.name) ? rawFrag.name : defFrag.name,
      desc: isNonEmptyString(rawFrag.desc) ? rawFrag.desc : defFrag.desc,
      value: isNonEmptyString(rawFrag.value) ? rawFrag.value : defFrag.value,
    };
  }
  return { merged, fileState: "ok" };
}

export function mergedToApiItems(
  merged: Record<PromptConfigKey, PromptConfigFragment>,
): PromptConfigApiItem[] {
  return getAuthoritativePromptKeys().map((k) => ({
    key: k,
    ...merged[k],
    params: [...(DEFAULT_PROMPT_CONFIG[k].params ?? [])],
  }));
}
