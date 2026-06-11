import { DEFAULT_PROMPT_CONFIG } from "@/common/constants/defautPromptConfig";
import type { PromptConfigApiItem, PromptConfigKey } from "@/common/types";

type PromptItemT = (key: string) => string;

function normalizePromptValue(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

/** 出厂/历史内置正文（含 summarySystemPrefix 带 {content} 的旧版） */
function knownBuiltinValues(key: PromptConfigKey): string[] {
  const base = normalizePromptValue(DEFAULT_PROMPT_CONFIG[key].value);
  const variants = new Set<string>([base]);

  if (key === "summarySystemPrefix") {
    for (const suffix of ["{content}", "\n{content}", "\n\n{content}"]) {
      variants.add(normalizePromptValue(`${base}${suffix}`));
    }
  }

  return [...variants];
}

function isKnownBuiltinValue(key: PromptConfigKey, value: string): boolean {
  const normalized = normalizePromptValue(value);
  return knownBuiltinValues(key).some((builtin) => normalized === builtin);
}

/** 将 API/内置项的展示用 name、desc、参数说明映射为当前 locale；仍为出厂内置 value 时一并替换为 locale 默认正文 */
export function localizePromptConfigItems(
  items: PromptConfigApiItem[],
  t: PromptItemT,
): PromptConfigApiItem[] {
  return items.map((item) => localizePromptConfigItem(item, t));
}

export function localizePromptConfigItem(
  item: PromptConfigApiItem,
  t: PromptItemT,
): PromptConfigApiItem {
  const key = item.key as PromptConfigKey;
  const prefix = `items.${key}`;
  const value = isKnownBuiltinValue(key, item.value)
    ? t(`${prefix}.defaultValue`)
    : item.value;

  return {
    ...item,
    name: t(`${prefix}.name`),
    desc: t(`${prefix}.desc`),
    value,
    params: item.params.map((p) => ({
      ...p,
      description: t(`${prefix}.params.${p.name}`),
    })),
  };
}

/** 重置为当前 locale 的内置默认（不读磁盘） */
export function buildDefaultPromptConfigItems(t: PromptItemT): PromptConfigApiItem[] {
  return (Object.keys(DEFAULT_PROMPT_CONFIG) as PromptConfigKey[]).map((key) => {
    const def = DEFAULT_PROMPT_CONFIG[key];
    const prefix = `items.${key}`;
    return {
      key,
      name: t(`${prefix}.name`),
      desc: t(`${prefix}.desc`),
      value: t(`${prefix}.defaultValue`),
      params: (def.params ?? []).map((p) => ({
        ...p,
        description: t(`${prefix}.params.${p.name}`),
      })),
    };
  });
}
