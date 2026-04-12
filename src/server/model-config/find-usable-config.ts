import type { DataSource } from "typeorm";
import { ModelConfigVisibility } from "@/common/enums";
import { UserModelConfig } from "@/server/db/entities/UserModelConfig";

/**
 * 当前用户可选用的一条模型配置：公有任意用户可用，或私有且归属本人。
 */
export async function findModelConfigUsableByUser(
  ds: DataSource,
  configId: string,
  userId: string,
): Promise<UserModelConfig | null> {
  return ds
    .getRepository(UserModelConfig)
    .createQueryBuilder("c")
    .where("c.id = :id", { id: configId })
    .andWhere("(c.visibility = :pub OR c.userId = :uid)", {
      pub: ModelConfigVisibility.Public,
      uid: userId,
    })
    .getOne();
}
