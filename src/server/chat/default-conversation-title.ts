import type { AppLocale } from "@/common/constants/i18n";
import { CHAT_DEFAULT_CONVERSATION_TITLE } from "@/common/constants";
import { tApiMessage } from "@/server/i18n/t-api-message";

/** 按请求 locale 返回默认会话标题（写入 DB）。 */
export function defaultConversationTitle(locale: AppLocale): string {
  return tApiMessage(locale, "chat.defaultConversationTitle");
}

/** 是否为系统默认标题（含历史硬编码「新对话」）。 */
export function isDefaultConversationTitle(title: string): boolean {
  return (
    title === CHAT_DEFAULT_CONVERSATION_TITLE ||
    title === tApiMessage("en", "chat.defaultConversationTitle") ||
    title === tApiMessage("zh", "chat.defaultConversationTitle")
  );
}
