import { v4 as uuidv4 } from "uuid";
import type { DataSource, EntityManager } from "typeorm";
import { In } from "typeorm";
import { SkillPackFile } from "@/server/db/entities/SkillPackFile";
import { UserSkillConfig } from "@/server/db/entities/UserSkillConfig";
import { SKILL_PACK_SKILL_MD_PATH } from "@/common/constants";
import {
  extractSkillMetadataFromFrontmatter,
  parseAlwaysLoadFromFrontmatter,
  parseEnabledFromFrontmatter,
  stripSkillMdFrontmatter,
} from "@/server/skill/pack-frontmatter";
import { hasScriptsPrefix, isSkillMdPath } from "@/server/skill/pack-path";
import { skillMdBodyFromContent } from "@/server/skill/skill-pack-file-validation";

export type PackFileAggregate = {
  fileCount: number;
  totalBytes: number;
  hasScripts: boolean;
};

export type SkillPackFileMeta = {
  path: string;
  sizeBytes: number;
  updatedAt: Date;
};

function byteSize(content: string): number {
  return Buffer.byteLength(content, "utf8");
}

function sortPackPaths(paths: string[]): string[] {
  return [...paths].sort((a, b) => {
    if (a === SKILL_PACK_SKILL_MD_PATH) return -1;
    if (b === SKILL_PACK_SKILL_MD_PATH) return 1;
    return a.localeCompare(b, "en");
  });
}

/** 批量加载 Pack 文件聚合（fileCount / hasScripts / totalBytes）。 */
export async function loadPackAggregatesByPackIds(
  ds: DataSource,
  packIds: string[],
): Promise<Map<string, PackFileAggregate>> {
  const map = new Map<string, PackFileAggregate>();
  if (packIds.length === 0) return map;
  for (const id of packIds) {
    map.set(id, { fileCount: 0, totalBytes: 0, hasScripts: false });
  }
  const rows = await ds.getRepository(SkillPackFile).find({
    where: { packId: In(packIds) } as any,
  });
  for (const row of rows) {
    const agg = map.get(row.packId);
    if (!agg) continue;
    agg.fileCount += 1;
    agg.totalBytes += byteSize(row.content);
    if (hasScriptsPrefix(row.path)) agg.hasScripts = true;
  }
  return map;
}

/** 按 id 查询系统 Skill Pack；不存在返回 null。 */
export async function getPackById(
  ds: DataSource,
  packId: string,
): Promise<UserSkillConfig | null> {
  return ds.getRepository(UserSkillConfig).findOne({ where: { id: packId } });
}

/** @deprecated 0.1.21 使用 getPackById */
export async function getOwnedPackOrNull(
  ds: DataSource,
  _userId: string,
  packId: string,
): Promise<UserSkillConfig | null> {
  return getPackById(ds, packId);
}

export async function listPackFilesMeta(
  ds: DataSource,
  packId: string,
): Promise<{ files: SkillPackFileMeta[]; totalBytes: number; fileCount: number }> {
  const rows = await ds.getRepository(SkillPackFile).find({
    where: { packId },
    order: { path: "ASC" },
  });
  let totalBytes = 0;
  const files: SkillPackFileMeta[] = rows.map((r) => {
    const sizeBytes = byteSize(r.content);
    totalBytes += sizeBytes;
    return { path: r.path, sizeBytes, updatedAt: r.updatedAt };
  });
  files.sort((a, b) => {
    if (a.path === SKILL_PACK_SKILL_MD_PATH) return -1;
    if (b.path === SKILL_PACK_SKILL_MD_PATH) return 1;
    return a.path.localeCompare(b.path, "en");
  });
  return { files, totalBytes, fileCount: files.length };
}

export async function getPackFileContent(
  ds: DataSource,
  packId: string,
  path: string,
): Promise<SkillPackFile | null> {
  return ds.getRepository(SkillPackFile).findOne({ where: { packId, path } });
}

/** 读取 SKILL.md 正文（去 frontmatter）；缺失或空返回 null。 */
export async function loadSkillMdBodyForPack(
  ds: DataSource,
  packId: string,
): Promise<string | null> {
  const row = await getPackFileContent(ds, packId, SKILL_PACK_SKILL_MD_PATH);
  if (!row) return null;
  const body = skillMdBodyFromContent(row.content);
  return body.length > 0 ? body : null;
}

export async function assertSkillMdPresent(ds: DataSource, packId: string): Promise<boolean> {
  const body = await loadSkillMdBodyForPack(ds, packId);
  return body !== null;
}

/** import 事务内：从 SKILL.md frontmatter 同步主表 name/description/enabled/alwaysLoad。 */
export async function syncPackMetadataFromSkillMd(
  em: EntityManager,
  pack: UserSkillConfig,
  skillMdContent: string,
): Promise<UserSkillConfig> {
  const { frontmatter } = stripSkillMdFrontmatter(skillMdContent);
  if (!frontmatter) return pack;
  const meta = extractSkillMetadataFromFrontmatter(frontmatter);
  if (meta.name) pack.name = meta.name;
  if (meta.description !== undefined) pack.description = meta.description || null;
  const always = parseAlwaysLoadFromFrontmatter(frontmatter);
  if (always !== undefined) pack.alwaysLoad = always;
  const enabled = parseEnabledFromFrontmatter(frontmatter);
  if (enabled !== undefined) pack.enabled = enabled;
  return em.getRepository(UserSkillConfig).save(pack);
}

export type UpsertPackFileResult = {
  file: SkillPackFile;
  created: boolean;
  pack: UserSkillConfig;
};

/** 创建或覆盖单文件（调用方须已校验 path/content/配额）。 */
export async function upsertPackFile(
  ds: DataSource,
  pack: UserSkillConfig,
  path: string,
  content: string,
): Promise<UpsertPackFileResult> {
  return ds.transaction(async (em) => {
    const repo = em.getRepository(SkillPackFile);
    let row = await repo.findOne({ where: { packId: pack.id, path } });
    const created = !row;
    if (!row) {
      row = repo.create({
        id: uuidv4(),
        packId: pack.id,
        path,
        content,
      });
    } else {
      row.content = content;
    }
    await repo.save(row);
    let updatedPack = pack;
    if (isSkillMdPath(path)) {
      try {
        updatedPack = await syncPackMetadataFromSkillMd(em, pack, content);
      } catch (e) {
        console.warn(
          JSON.stringify({
            event: "skill_frontmatter_sync_failed",
            packId: pack.id,
            message: e instanceof Error ? e.message : String(e),
          }),
        );
      }
    } else {
      pack.updatedAt = new Date();
      await em.getRepository(UserSkillConfig).save(pack);
    }
    return { file: row, created, pack: updatedPack };
  });
}

export async function deletePackFile(
  ds: DataSource,
  packId: string,
  path: string,
): Promise<boolean> {
  const res = await ds.getRepository(SkillPackFile).delete({ packId, path });
  return (res.affected ?? 0) > 0;
}

export async function movePackFile(
  ds: DataSource,
  packId: string,
  oldPath: string,
  newPath: string,
): Promise<SkillPackFile | null> {
  return ds.transaction(async (em) => {
    const repo = em.getRepository(SkillPackFile);
    const row = await repo.findOne({ where: { packId, path: oldPath } });
    if (!row) return null;
    row.path = newPath;
    await repo.save(row);
    return row;
  });
}

export async function deleteAllPackFiles(ds: DataSource, packId: string): Promise<void> {
  await ds.getRepository(SkillPackFile).delete({ packId });
}

export async function batchUpsertPackFiles(
  ds: DataSource,
  pack: UserSkillConfig,
  entries: Array<{ path: string; content: string }>,
): Promise<{ pack: UserSkillConfig; savedCount: number }> {
  return ds.transaction(async (em) => {
    const repo = em.getRepository(SkillPackFile);
    let updatedPack = pack;
    let savedCount = 0;
    let skillMdContent: string | null = null;
    for (const entry of entries) {
      let row = await repo.findOne({
        where: { packId: pack.id, path: entry.path },
      });
      if (!row) {
        row = repo.create({
          id: uuidv4(),
          packId: pack.id,
          path: entry.path,
          content: entry.content,
        });
      } else {
        row.content = entry.content;
      }
      await repo.save(row);
      savedCount += 1;
      if (isSkillMdPath(entry.path)) skillMdContent = entry.content;
    }
    if (skillMdContent) {
      try {
        updatedPack = await syncPackMetadataFromSkillMd(em, pack, skillMdContent);
      } catch (e) {
        console.warn(
          JSON.stringify({
            event: "skill_frontmatter_sync_failed",
            packId: pack.id,
            message: e instanceof Error ? e.message : String(e),
          }),
        );
      }
    }
    return { pack: updatedPack, savedCount };
  });
}

export async function insertPackFilesBulk(
  em: EntityManager,
  packId: string,
  entries: Array<{ path: string; content: string }>,
): Promise<void> {
  const repo = em.getRepository(SkillPackFile);
  for (const entry of entries) {
    await repo.save(
      repo.create({
        id: uuidv4(),
        packId,
        path: entry.path,
        content: entry.content,
      }),
    );
  }
}

export { sortPackPaths, byteSize };
