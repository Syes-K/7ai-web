import { getDataSource } from "@/server/db/data-source";
import { User } from "@/server/db/entities/User";
import { ModelConfigVisibility } from "@/common/enums";
import { findModelConfigUsableByUser } from "@/server/model-config/find-usable-config";

/**
 * 是否与 {@link getChatRuntimeModel} 一致：未选偏好 / 偏好不可用 / 选用公有配置时，
 * 对话 UI 可对用户提示「免费或共享接入」。
 */
export async function shouldShowFreeOrSharedChatModelHint(userId: string): Promise<boolean> {
  const ds = await getDataSource();
  const user = await ds.getRepository(User).findOne({ where: { id: userId } });
  const prefId = user?.preferredModelConfigId ?? null;
  if (!prefId) {
    return true;
  }
  const cfg = await findModelConfigUsableByUser(ds, prefId, userId);
  if (!cfg) {
    return true;
  }
  return cfg.visibility === ModelConfigVisibility.Public;
}
