import { v4 as uuidv4 } from "uuid";
import type { DataSource } from "typeorm";
import { SkillPackFile } from "@/server/db/entities/SkillPackFile";
import { UserSkillConfig } from "@/server/db/entities/UserSkillConfig";
import { SKILL_PACK_SKILL_MD_PATH } from "@/common/constants";
import { wrapSkillMdMigrationContent } from "@/server/skill/pack-frontmatter";

/**
 * 0.1.18 content 列 → skill_pack_files(SKILL.md) 幂等回填。
 * 已有 files 的 pack 跳过；成功后清空 deprecated content。
 */
export async function migrateSkillContentToPackFiles(ds: DataSource): Promise<void> {
  const packRepo = ds.getRepository(UserSkillConfig);
  const fileRepo = ds.getRepository(SkillPackFile);
  const rows = await packRepo.find();

  for (const row of rows) {
    const existingCount = await fileRepo.count({ where: { packId: row.id } });
    if (existingCount > 0) {
      console.info(
        JSON.stringify({
          event: "skill_migrate_skip",
          reason: "files_exist",
          id: row.id,
        }),
      );
      continue;
    }

    const legacy = row.content?.trim() ?? "";
    if (!legacy) {
      console.info(
        JSON.stringify({
          event: "skill_migrate_skip",
          reason: "empty_content",
          id: row.id,
        }),
      );
      continue;
    }

    const skillMd = wrapSkillMdMigrationContent(row.name, row.description, legacy);
    await fileRepo.save(
      fileRepo.create({
        id: uuidv4(),
        packId: row.id,
        userId: row.userId,
        path: SKILL_PACK_SKILL_MD_PATH,
        content: skillMd,
      }),
    );
    row.content = null;
    await packRepo.save(row);
    console.info(
      JSON.stringify({
        event: "skill_migrate_ok",
        id: row.id,
      }),
    );
  }
}
