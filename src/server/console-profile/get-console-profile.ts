import type { ConsoleProfileResponse } from "@/common/types";
import { getDataSource } from "@/server/db/data-source";
import { User } from "@/server/db/entities/User";
import { findModelConfigUsableByUser } from "@/server/model-config/find-usable-config";
import { resolveKnowledgePreferenceFromUserRow } from "@/server/knowledge-base/user-preference";

/**
 * 组装控制台「账号与偏好」聚合数据；若偏好指针悬空则清空并标记 preferenceStale。
 */
export async function getConsoleProfileResponse(userId: string): Promise<ConsoleProfileResponse> {
  const ds = await getDataSource();
  const userRepo = ds.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    throw new Error("user not found");
  }

  let prefId = user.preferredModelConfigId ?? null;
  let preferredModel: ConsoleProfileResponse["preference"]["preferredModel"] = null;
  let preferenceStale = false;

  if (prefId) {
    const mc = await findModelConfigUsableByUser(ds, prefId, userId);
    if (!mc) {
      preferenceStale = true;
      user.preferredModelConfigId = null;
      await userRepo.save(user);
      prefId = null;
    } else {
      preferredModel = {
        id: mc.id,
        provider: mc.provider,
        modelName: mc.modelName,
        updatedAt: mc.updatedAt.toISOString(),
      };
    }
  }

  let vecId = user.preferredVectorModelConfigId ?? null;
  let preferredVectorModel: ConsoleProfileResponse["preference"]["preferredVectorModel"] = null;
  let vectorPreferenceStale = false;

  if (vecId) {
    const vm = await findModelConfigUsableByUser(ds, vecId, userId);
    if (!vm) {
      vectorPreferenceStale = true;
      user.preferredVectorModelConfigId = null;
      await userRepo.save(user);
      vecId = null;
    } else {
      preferredVectorModel = {
        id: vm.id,
        provider: vm.provider,
        modelName: vm.modelName,
        updatedAt: vm.updatedAt.toISOString(),
      };
    }
  }

  const knowledgePref = resolveKnowledgePreferenceFromUserRow(user);

  return {
    profile: {
      email: user.email,
      nickName: user.nickName,
      telNo: user.telNo,
    },
    preference: {
      preferredModelConfigId: prefId,
      preferredModel,
      preferenceStale,
      preferredVectorModelConfigId: vecId,
      preferredVectorModel,
      vectorPreferenceStale,
      preferredKnowledgeTopK: user.preferredKnowledgeTopK ?? null,
      preferredKnowledgeThreshold: user.preferredKnowledgeThreshold ?? null,
      preferredKnowledgeChunkSize: user.preferredKnowledgeChunkSize ?? null,
      preferredKnowledgeChunkOverlap: user.preferredKnowledgeChunkOverlap ?? null,
      knowledgeTopKEffective: knowledgePref.topK,
      knowledgeThresholdEffective: knowledgePref.threshold,
      knowledgeChunkSizeEffective: knowledgePref.chunkSize,
      knowledgeChunkOverlapEffective: knowledgePref.chunkOverlap,
    },
  };
}
