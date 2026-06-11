/**
 * Q4-B：将 validatePromptTemplate 返回的 code 映射为 api.message 译文。
 */
import type { PromptTemplateValidationCode } from "@/common/prompt/validatePromptTemplate";
import type { AppLocale } from "@/common/constants/i18n";
import { tApiMessage } from "@/server/i18n/t-api-message";

export function mapPromptTemplateError(
  locale: AppLocale,
  code: PromptTemplateValidationCode,
  param?: string,
): string {
  if (code === "invalidBrace") {
    return tApiMessage(locale, "validation.promptConfig.template.invalidBrace");
  }
  return tApiMessage(locale, "validation.promptConfig.template.undeclaredParam", {
    param: param ?? "",
  });
}
