import { v4 as uuidv4 } from "uuid";
import type { ModelConfigTag } from "@/common/constants";
import { ModelConfigVisibility } from "@/common/enums";
import { UserModelConfig } from "@/server/db/entities/UserModelConfig";

/** 新建一条模型接入配置实体（未落库） */
export function createUserModelConfigRow(
  userId: string,
  provider: string,
  modelName: string,
  apiKeyCipher: string,
  visibility: ModelConfigVisibility,
  tags: ModelConfigTag[] = [],
): UserModelConfig {
  const row = new UserModelConfig();
  row.id = uuidv4();
  row.userId = userId;
  row.visibility = visibility;
  row.provider = provider;
  row.modelName = modelName;
  row.apiKeyCipher = apiKeyCipher;
  row.tags = tags;
  return row;
}
