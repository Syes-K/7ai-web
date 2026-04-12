import { ModelProvider } from "@/common/enums";

/** Provider 键 → 列表 Tag 与表单选项（与 PRD 附录一致） */
export const MODEL_PROVIDER_OPTIONS: { label: string; value: ModelProvider }[] = [
  { label: "阿里云百炼", value: ModelProvider.ALYUN },
  { label: "智谱", value: ModelProvider.GLM },
  { label: "深度求索", value: ModelProvider.DEEPSEEK },
];

export function providerTagProps(
  key: string,
): { color: string; label: string } | null {
  const map: Record<string, { color: string; label: string }> = {
    [ModelProvider.ALYUN]: { color: "blue", label: "阿里云百炼" },
    [ModelProvider.GLM]: { color: "purple", label: "智谱" },
    [ModelProvider.DEEPSEEK]: { color: "green", label: "深度求索" },
  };
  return map[key] ?? null;
}
