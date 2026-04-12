import type { User } from "@/server/db/entities/User";
import { getCurrentUser } from "./session-user";

/**
 * 单次请求内的「登录用户 + 偏好指针」聚合。
 * Next.js 无全局 ctx，在 Route Handler / RSC 中每请求 `await` 一次本函数即可。
 */
export type RequestUserContext = {
  user: User;
  /**
   * 控制台默认对话模型 UserModelConfig id；与 {@link User.preferredModelConfigId} 一致。
   */
  preferredModelConfigId: string | null;
  /**
   * 控制台默认向量（Embedding）模型 UserModelConfig id；与 {@link User.preferredVectorModelConfigId} 一致。
   */
  preferredVectorModelConfigId: string | null;
};

/**
 * 解析当前请求的登录用户，并显式带上偏好指针（默认模型配置 id）。
 * 未登录返回 `null`。
 *
 * 新代码应优先使用本函数替代「先 getCurrentUser 再各处读 user.preferredModelConfigId」的散落写法；
 * `session-user` 中的 `getCurrentUser` 仍保留为底层实现，仅在不需要偏好语义时使用。
 */
export async function getRequestUserContext(): Promise<RequestUserContext | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  return {
    user,
    preferredModelConfigId: user.preferredModelConfigId ?? null,
    preferredVectorModelConfigId: user.preferredVectorModelConfigId ?? null,
  };
}
