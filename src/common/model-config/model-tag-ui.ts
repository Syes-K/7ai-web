import {
  MODEL_CONFIG_TAG_OPTIONS,
  type ModelConfigTag,
  resolveModelConfigTagKey,
} from "@/common/model-config/model-tags";

type ModelTagT = (key: string) => string;

/** 列表/表单展示：英文 key → `tag.model.{key}` 文案 */
export function formatModelConfigTag(tag: string, t: ModelTagT): string {
  const key = resolveModelConfigTagKey(tag);
  if (key) {
    return t(`tag.model.${key}`);
  }
  return tag;
}

/** 多选下拉选项（value 为英文 key，label 走 i18n） */
export function getModelConfigTagSelectOptions(t: ModelTagT) {
  return MODEL_CONFIG_TAG_OPTIONS.map((value: ModelConfigTag) => ({
    value,
    label: t(`tag.model.${value}`),
  }));
}
