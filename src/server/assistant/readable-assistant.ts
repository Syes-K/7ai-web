import type { DataSource } from "typeorm";
import { AssistantScope } from "@/common/enums";
import { Assistant } from "@/server/db/entities/Assistant";

/**
 * 与控制台助手详情一致：系统助手全员可读；个人助手仅创建者可读。
 * 不存在或无权限时返回 null（路由层映射 ASSISTANT_NOT_FOUND，不区分原因）。
 */
export async function findReadableAssistant(
  ds: DataSource,
  id: string,
  userId: string,
): Promise<Assistant | null> {
  const row = await ds.getRepository(Assistant).findOne({ where: { id } });
  if (!row) {
    return null;
  }
  if (row.scope === AssistantScope.System) {
    return row;
  }
  if (row.scope === AssistantScope.Personal && row.userId === userId) {
    return row;
  }
  return null;
}
