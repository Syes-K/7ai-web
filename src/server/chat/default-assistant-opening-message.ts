import type { AppLocale } from "@/common/constants/i18n";
import { tApiMessage } from "@/server/i18n/t-api-message";

/** 绑定助手但未配置开场白时，首条助手消息文案（按请求 locale）。 */
export function defaultAssistantOpeningMessage(locale: AppLocale): string {
  return tApiMessage(locale, "chat.defaultAssistantOpeningMessage");
}
