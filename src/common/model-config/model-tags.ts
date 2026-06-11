import {
  MODEL_CONFIG_TAG_OPTION_SET,
  MODEL_CONFIG_TAG_OPTIONS,
  type ModelConfigTag,
} from "@/common/constants";

/** 历史中文标签 → 英文 key（读库/请求体兼容） */
export const LEGACY_MODEL_CONFIG_TAG_MAP: Readonly<Record<string, ModelConfigTag>> = {
  免费: "free",
  文本: "text",
  视频: "video",
  声音: "audio",
  嵌入: "embedding",
  重排: "rerank",
  对话: "chat",
};

/** 将任意存储/输入标签规范为合法英文 key，未知则 null */
export function resolveModelConfigTagKey(raw: string): ModelConfigTag | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (MODEL_CONFIG_TAG_OPTION_SET.has(trimmed)) {
    return trimmed as ModelConfigTag;
  }
  return LEGACY_MODEL_CONFIG_TAG_MAP[trimmed] ?? null;
}

export { MODEL_CONFIG_TAG_OPTIONS, MODEL_CONFIG_TAG_OPTION_SET, type ModelConfigTag };
