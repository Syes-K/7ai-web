import type { Conversation } from "@/server/db/entities/Conversation";

/** 列表/详情共用的助手快照（来自会话列，非实时 JOIN） */
export type ChatAssistantSnapshot = {
  id: string;
  name: string;
  icon: string | null;
};

/**
 * 组装会话 API 中的助手字段：有绑定则返回快照；若 assistants 表中已无该行，附带 assistantUnavailable。
 */
export function chatAssistantFields(
  c: Conversation,
  assistantRowExists: boolean,
): { assistant: ChatAssistantSnapshot | null; assistantUnavailable?: boolean } {
  if (!c.assistantId) {
    return { assistant: null };
  }
  return {
    assistant: {
      id: c.assistantId,
      name: c.assistantName ?? "",
      icon: c.assistantIcon,
    },
    ...(!assistantRowExists ? { assistantUnavailable: true as const } : {}),
  };
}
