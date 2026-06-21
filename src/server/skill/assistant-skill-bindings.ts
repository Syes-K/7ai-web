import type { DataSource } from "typeorm";
import { In } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { Assistant } from "@/server/db/entities/Assistant";
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

/** 全局查询仍挂载该 Pack 的助手（含用户助手与系统助手）。 */
export async function listAssistantsReferencingSkill(
  ds: DataSource,
  skillConfigId: string,
): Promise<Array<{ id: string; name: string }>> {
  const raw = await ds
    .getRepository(AssistantSkillBinding)
    .createQueryBuilder("b")
    .innerJoin(Assistant, "a", "a.id = b.assistantId")
    .select("a.id", "id")
    .addSelect("a.name", "name")
    .where("b.skillConfigId = :sid", { sid: skillConfigId })
    .orderBy("a.name", "ASC")
    .getRawMany<{ id: string; name: string }>();
  return raw;
}

/** @deprecated 0.1.21 使用 listAssistantsReferencingSkill */
export async function countAssistantsReferencingSkill(
  ds: DataSource,
  _userId: string,
  skillConfigId: string,
): Promise<number> {
  const list = await listAssistantsReferencingSkill(ds, skillConfigId);
  return list.length;
}

export type ReplaceAssistantSkillBindingsResult =
  | { ok: true }
  | { ok: false; reason: "INVALID_SKILL_CONFIG_IDS" };

/**
 * 整表替换助手与 Skill 的挂载集合。
 * 无效 id（不存在于系统库）统一返回 INVALID_SKILL_CONFIG_IDS，避免泄露存在性。
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
      where: { id: In(unique) } as any,
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
