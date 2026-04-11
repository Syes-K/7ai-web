import {
  CHAT_DEFAULT_CONVERSATION_TITLE,
  CHAT_TITLE_FROM_USER_MAX_CHARS,
} from "@/common/constants";

/**
 * 由首条用户消息生成列表标题（按 Unicode 码点截断）。
 */
export function titleFromFirstUserMessage(content: string): string {
  const t = content.trim();
  if (!t) {
    return CHAT_DEFAULT_CONVERSATION_TITLE;
  }
  const chars = [...t];
  if (chars.length <= CHAT_TITLE_FROM_USER_MAX_CHARS) {
    return chars.join("");
  }
  return `${chars.slice(0, CHAT_TITLE_FROM_USER_MAX_CHARS).join("")}…`;
}
