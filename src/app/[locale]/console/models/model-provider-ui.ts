import { ModelProvider } from "@/common/enums";

type ProviderT = (key: string) => string;

/** Provider 表单选项（枚举 value 不变，展示名走 i18n） */
export function getModelProviderOptions(
  t: ProviderT,
): { label: string; value: ModelProvider }[] {
  return [
    { label: t("provider.aliyun"), value: ModelProvider.ALYUN },
    { label: t("provider.glm"), value: ModelProvider.GLM },
    { label: t("provider.deepseek"), value: ModelProvider.DEEPSEEK },
    { label: t("provider.kimi"), value: ModelProvider.KIMI },
    { label: t("provider.siliconflow"), value: ModelProvider.SILICONFLOW },
  ];
}

/** Provider 键 → 列表 Tag 颜色与展示名 */
export function getProviderTagProps(
  t: ProviderT,
  key: string,
): { color: string; label: string } | null {
  const map: Record<string, { color: string; labelKey: string }> = {
    [ModelProvider.ALYUN]: { color: "blue", labelKey: "provider.aliyun" },
    [ModelProvider.GLM]: { color: "purple", labelKey: "provider.glm" },
    [ModelProvider.DEEPSEEK]: { color: "green", labelKey: "provider.deepseek" },
    [ModelProvider.KIMI]: { color: "orange", labelKey: "provider.kimi" },
    [ModelProvider.SILICONFLOW]: { color: "cyan", labelKey: "provider.siliconflow" },
  };
  const entry = map[key];
  if (!entry) return null;
  return { color: entry.color, label: t(entry.labelKey) };
}

/** 向后兼容 admin 等仍引用 providerTagProps 的模块 */
export function providerTagProps(key: string): { color: string; label: string } | null {
  const map: Record<string, { color: string; label: string }> = {
    [ModelProvider.ALYUN]: { color: "blue", label: "阿里云百炼" },
    [ModelProvider.GLM]: { color: "purple", label: "智谱" },
    [ModelProvider.DEEPSEEK]: { color: "green", label: "深度求索" },
    [ModelProvider.KIMI]: { color: "orange", label: "月之暗面" },
    [ModelProvider.SILICONFLOW]: { color: "cyan", label: "硅基流动" },
  };
  return map[key] ?? null;
}

/** @deprecated 请使用 getModelProviderOptions(t) */
export const MODEL_PROVIDER_OPTIONS: { label: string; value: ModelProvider }[] = [
  { label: "阿里云百炼", value: ModelProvider.ALYUN },
  { label: "智谱", value: ModelProvider.GLM },
  { label: "深度求索", value: ModelProvider.DEEPSEEK },
  { label: "月之暗面", value: ModelProvider.KIMI },
  { label: "硅基流动", value: ModelProvider.SILICONFLOW },
];
