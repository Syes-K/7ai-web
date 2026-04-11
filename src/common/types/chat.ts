import type { MessageRole } from "@/common/enums";

/** API 返回的会话摘要 */
export type ChatConversationListItem = {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  preview: string | null;
  messageCount: number;
};

/** API 返回的消息 */
export type ChatMessageItem = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
};
