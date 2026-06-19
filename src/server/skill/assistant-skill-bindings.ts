import type { DataSource } from "typeorm";
import { In } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { AssistantSkillBinding } from "@/server/db/entities/AssistantSkillBinding";
import { UserSkillConfig } from "@/server/db/entities/UserSkillConfig";

export async function listSkillConfigIdsByAssistantIds(
  ds: DataSource,
  userId: string,
  assistantIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (assistantIds.length === 0) return map;
  const repo = ds.getRepository(AssistantSkillBinding);
  const rows = await repo.find({
    where: { userId, assistantId: In(assistantIds) } as any,
    order: { skillConfigId: "ASC" },
  });
  for (const aid of assistantIds) {
    map.set(aid, []);
  }
  for (const r of rows) {
    const cur = map.get(r.assistantId);
    if (cur) cur.push(r.skillConfigId);
  }
  return map;
}

export async function countAssistantsReferencingSkill(
  ds: DataSource,
  userId: string,
  skillConfigId: string,
): Promise<number> {
  return ds.getRepository(AssistantSkillBinding).count({ where: { userId, skillConfigId } as any });
}

export type ReplaceAssistantSkillBindingsResult =
  | { ok: true }
  | { ok: false; reason: "INVALID_SKILL_CONFIG_IDS" };

/**
 * 整表替换助手与 Skill 的挂载集合。
 * 无效 id（非当前用户或未存在）统一返回 INVALID_SKILL_CONFIG_IDS，避免泄露存在性。
 */
export async function replaceAssistantSkillBindings(
  ds: DataSource,
  userId: string,
  assistantId: string,
  skillConfigIds: string[],
): Promise<ReplaceAssistantSkillBindingsResult> {
  const unique = [...new Set(skillConfigIds)];
  if (unique.length > 0) {
    const n = await ds.getRepository(UserSkillConfig).count({
      where: { userId, id: In(unique) } as any,
    });
    if (n !== unique.length) {
      return { ok: false, reason: "INVALID_SKILL_CONFIG_IDS" };
    }
  }

  await ds.transaction(async (em) => {
    await em.delete(AssistantSkillBinding, { assistantId, userId } as any);
    for (const skillConfigId of unique) {
      await em.insert(AssistantSkillBinding, {
        id: uuidv4(),
        userId,
        assistantId,
        skillConfigId,
      });
    }
  });
  return { ok: true };
}
