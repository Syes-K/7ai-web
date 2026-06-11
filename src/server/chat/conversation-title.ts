import type { AppLocale } from "@/common/constants/i18n";
import {
  CHAT_TITLE_FROM_USER_MAX_CHARS,
} from "@/common/constants";
import { defaultConversationTitle } from "@/server/chat/default-conversation-title";

/**
 * 由首条用户消息生成列表标题（按 Unicode 码点截断）。
 * @param locale - 空内容时的默认标题语言
 */
export function titleFromFirstUserMessage(content: string, locale: AppLocale): string {
  const t = content.trim();
  if (!t) {
    return defaultConversationTitle(locale);
  }
  const chars = [...t];
  if (chars.length <= CHAT_TITLE_FROM_USER_MAX_CHARS) {
    return chars.join("");
  }
  return `${chars.slice(0, CHAT_TITLE_FROM_USER_MAX_CHARS).join("")}…`;
}
