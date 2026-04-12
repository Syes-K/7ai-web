import { getDataSource } from "@/server/db/data-source";
import { User } from "@/server/db/entities/User";
import { getModel } from "@/server/llm/model";
import { decryptApiKey } from "@/server/model-config/api-key-crypto";
import { findModelConfigUsableByUser } from "@/server/model-config/find-usable-config";

type GetChatRuntimeModelOptions = {
  /** 若调用方已通过 {@link getRequestUserContext} 等加载 User，传入可避免重复查库 */
  user?: User | null;
};

/**
 * 解析对话使用的 Chat 模型：优先用户「账号与偏好」中选中的 {@link UserModelConfig}；
 * 未选择、记录不存在或解密失败时回退到环境变量 `CHAT_LLM_*`（含 `CHAT_LLM_API_KEY`）。
 */
export async function getChatRuntimeModel(userId: string, options?: GetChatRuntimeModelOptions) {
  const ds = await getDataSource();
  const user =
    options?.user && options.user.id === userId
      ? options.user
      : await ds.getRepository(User).findOne({ where: { id: userId } });
  const prefId = user?.preferredModelConfigId ?? null;
  if (!prefId) {
    return getModel({ temperature: 0.7 });
  }

  const cfg = await findModelConfigUsableByUser(ds, prefId, userId);
  if (!cfg) {
    return getModel({ temperature: 0.7 });
  }

  try {
    const plainKey = decryptApiKey(cfg.apiKeyCipher);
    return getModel({
      model: cfg.modelName,
      provider: cfg.provider,
      temperature: 0.7,
      apiKey: plainKey,
    });
  } catch {
    // 解密失败、provider 非法等与「用户配置」相关的错误均回退系统默认
    return getModel({ temperature: 0.7 });
  }
}
