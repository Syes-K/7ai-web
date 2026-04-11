import type { DataSource } from "typeorm";
import { Conversation } from "@/server/db/entities/Conversation";

/**
 * 校验会话归属当前用户；不存在或越权时返回 null（路由层映射 404）。
 */
export async function findOwnedConversation(
  ds: DataSource,
  userId: string,
  conversationId: string,
): Promise<Conversation | null> {
  const repo = ds.getRepository(Conversation);
  return repo.findOne({
    where: { id: conversationId, userId },
  });
}
