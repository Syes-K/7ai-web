import type { ModelConfigListItem } from "@/common/types";
import { ModelConfigVisibility } from "@/common/enums";
import type { UserModelConfig } from "@/server/db/entities/UserModelConfig";
import { normalizeStoredModelTags } from "./parse-model-tags";
import { decryptApiKey } from "./api-key-crypto";
import { maskApiKey } from "./mask-api-key";

/**
 * 实体 → 对外列表项：仅输出掩码后的密钥展示串，日志与响应中禁止附带明文。
 */
export function userModelConfigToListItem(row: UserModelConfig): ModelConfigListItem {
  let apiKeyMasked = "********";
  try {
    const plain = decryptApiKey(row.apiKeyCipher);
    apiKeyMasked = maskApiKey(plain);
  } catch {
    // 密文损坏或密钥轮换后无法解密：统一占位，避免泄露片段
  }
  const vis =
    (row.visibility ?? ModelConfigVisibility.Private) === ModelConfigVisibility.Public
      ? "public"
      : "private";
  const tags = normalizeStoredModelTags(row.tags);
  return {
    id: row.id,
    provider: row.provider,
    modelName: row.modelName,
    apiKeyMasked,
    visibility: vis,
    tags,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
