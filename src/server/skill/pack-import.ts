import AdmZip from "adm-zip";
import { v4 as uuidv4 } from "uuid";
import type { DataSource } from "typeorm";
import {
  SKILL_CONFIG_DESCRIPTION_MAX_LENGTH,
  SKILL_PACK_IMPORT_ZIP_MAX_BYTES,
  SKILL_PACK_MAX_FILES,
  SKILL_PACK_MAX_TOTAL_BYTES,
  SKILL_PACK_SKILL_MD_PATH,
} from "@/common/constants";
import { UserSkillConfig } from "@/server/db/entities/UserSkillConfig";
import { SkillPackFile } from "@/server/db/entities/SkillPackFile";
import {
  extractSkillMetadataFromFrontmatter,
  parseAlwaysLoadFromFrontmatter,
  parseEnabledFromFrontmatter,
  stripSkillMdFrontmatter,
} from "@/server/skill/pack-frontmatter";
import {
  hasScriptsPrefix,
  isHiddenOrCachePath,
  isPackFileExtensionAllowed,
  normalizePackFilePath,
} from "@/server/skill/pack-path";
import {
  deleteAllPackFiles,
  insertPackFilesBulk,
  syncPackMetadataFromSkillMd,
} from "@/server/skill/pack-files";
import { skillMdBodyFromContent } from "@/server/skill/skill-pack-file-validation";

export type ImportSkippedEntry = { path: string; reason: string };

export type ParsedImportFiles = {
  entries: Array<{ path: string; content: string }>;
  skipped: ImportSkippedEntry[];
  totalBytes: number;
  hasScripts: boolean;
  suggestedName: string | null;
  suggestedDescription: string | null;
};

/** 去掉顶层单一文件夹包裹（与 .cursor/skills/<name>/ 同构）；保持与输入等长，空串表示目录占位项。 */
export function stripSingleRootFolder(paths: string[]): string[] {
  if (paths.length === 0) return paths;
  const firstSeg = paths[0].split("/")[0];
  if (!firstSeg) return paths;
  const allSame = paths.every((p) => p.startsWith(`${firstSeg}/`) || p === firstSeg);
  if (!allSame) return paths;
  return paths.map((p) => (p === firstSeg ? "" : p.slice(firstSeg.length + 1)));
}

function isValidUtf8Buffer(buf: Buffer): boolean {
  try {
    const s = buf.toString("utf8");
    return !s.includes("\0") && Buffer.byteLength(s, "utf8") === buf.length;
  } catch {
    return false;
  }
}

function pushSkip(skipped: ImportSkippedEntry[], path: string, reason: string): void {
  skipped.push({ path, reason });
}

/** 从 zip Buffer 解析可导入文件；非法路径/扩展名/UTF-8/隐藏项进入 skipped。 */
export function parseZipImportBuffer(buffer: Buffer): ParsedImportFiles {
  const skipped: ImportSkippedEntry[] = [];
  if (buffer.length > SKILL_PACK_IMPORT_ZIP_MAX_BYTES) {
    throw new Error("ZIP_TOO_LARGE");
  }
  const zip = new AdmZip(buffer);
  const rawEntries: Array<{ path: string; content: string }> = [];

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const rawName = entry.entryName.replace(/\\/g, "/");
    if (rawName.toLowerCase().endsWith(".zip")) {
      pushSkip(skipped, rawName, "nested_zip");
      continue;
    }
    const normalized = normalizePackFilePath(rawName);
    if (!normalized) {
      pushSkip(skipped, rawName, "invalid_path");
      continue;
    }
    if (isHiddenOrCachePath(normalized)) {
      pushSkip(skipped, normalized, "hidden");
      continue;
    }
    if (!isPackFileExtensionAllowed(normalized)) {
      pushSkip(skipped, normalized, "extension_denied");
      continue;
    }
    const data = entry.getData();
    if (!isValidUtf8Buffer(data)) {
      pushSkip(skipped, normalized, "not_utf8");
      continue;
    }
    rawEntries.push({ path: normalized, content: data.toString("utf8") });
  }

  return finalizeParsedEntries(rawEntries, skipped);
}

/** multipart 文件夹导入：filename 为 webkitRelativePath。 */
export function parseFolderImportParts(
  parts: Array<{ filename: string; buffer: Buffer }>,
): ParsedImportFiles {
  const skipped: ImportSkippedEntry[] = [];
  const rawEntries: Array<{ path: string; content: string }> = [];

  for (const part of parts) {
    const normalized = normalizePackFilePath(part.filename.replace(/\\/g, "/"));
    if (!normalized) {
      pushSkip(skipped, part.filename, "invalid_path");
      continue;
    }
    if (isHiddenOrCachePath(normalized)) {
      pushSkip(skipped, normalized, "hidden");
      continue;
    }
    if (!isPackFileExtensionAllowed(normalized)) {
      pushSkip(skipped, normalized, "extension_denied");
      continue;
    }
    if (!isValidUtf8Buffer(part.buffer)) {
      pushSkip(skipped, normalized, "not_utf8");
      continue;
    }
    rawEntries.push({ path: normalized, content: part.buffer.toString("utf8") });
  }

  return finalizeParsedEntries(rawEntries, skipped);
}

function finalizeParsedEntries(
  rawEntries: Array<{ path: string; content: string }>,
  skipped: ImportSkippedEntry[],
): ParsedImportFiles {
  const strippedPaths = stripSingleRootFolder(rawEntries.map((e) => e.path));
  const byPath = new Map<string, string>();
  for (let i = 0; i < rawEntries.length; i++) {
    const p = strippedPaths[i] ?? rawEntries[i].path;
    if (!p) continue;
    byPath.set(p, rawEntries[i].content);
  }

  const entries = [...byPath.entries()].map(([path, content]) => ({ path, content }));
  let totalBytes = 0;
  let hasScripts = false;
  for (const e of entries) {
    totalBytes += Buffer.byteLength(e.content, "utf8");
    if (hasScriptsPrefix(e.path)) hasScripts = true;
  }

  let suggestedName: string | null = null;
  let suggestedDescription: string | null = null;
  const skillMd = entries.find((e) => e.path === SKILL_PACK_SKILL_MD_PATH);
  if (skillMd) {
    const { frontmatter } = stripSkillMdFrontmatter(skillMd.content);
    if (frontmatter) {
      const meta = extractSkillMetadataFromFrontmatter(frontmatter);
      if (meta.name) suggestedName = meta.name;
      if (meta.description !== undefined) suggestedDescription = meta.description;
    }
  }

  return {
    entries,
    skipped,
    totalBytes,
    hasScripts,
    suggestedName,
    suggestedDescription,
  };
}

export function resolveImportPackName(
  overrideName: string | null,
  parsed: ParsedImportFiles,
  zipBaseName: string | null,
  folderRootName: string | null,
): string {
  if (overrideName?.trim()) return overrideName.trim();
  if (parsed.suggestedName?.trim()) return parsed.suggestedName.trim();
  if (folderRootName?.trim()) return folderRootName.trim();
  if (zipBaseName?.trim()) return zipBaseName.trim();
  return "Imported Skill Pack";
}

/**
 * P1：frontmatter description 为空时的回退策略。
 * 顺序：frontmatter → SKILL.md 正文首行 → zip/文件夹名。
 */
export function resolveImportDescription(
  parsed: ParsedImportFiles,
  entries: Array<{ path: string; content: string }>,
  zipBaseName: string | null,
  folderRootName: string | null,
): string | null {
  if (parsed.suggestedDescription?.trim()) {
    return parsed.suggestedDescription.trim().slice(0, SKILL_CONFIG_DESCRIPTION_MAX_LENGTH);
  }
  const skillMd = entries.find((e) => e.path === SKILL_PACK_SKILL_MD_PATH);
  if (skillMd) {
    const body = skillMdBodyFromContent(skillMd.content);
    for (const line of body.split("\n")) {
      const t = line.trim();
      if (t && !t.startsWith("#")) {
        return t.slice(0, 400);
      }
    }
  }
  const folderName = folderRootName?.trim() || zipBaseName?.trim();
  if (folderName) {
    return folderName.slice(0, SKILL_CONFIG_DESCRIPTION_MAX_LENGTH);
  }
  return null;
}

/** 校验 import 结果是否可落库（须含非空 SKILL.md）。 */
export function validateImportEntries(parsed: ParsedImportFiles): string | null {
  const skillMd = parsed.entries.find((e) => e.path === SKILL_PACK_SKILL_MD_PATH);
  if (!skillMd) return "missing_skill_md";
  const body = skillMdBodyFromContent(skillMd.content);
  if (!body) return "empty_skill_md";
  if (parsed.entries.length > SKILL_PACK_MAX_FILES) return "too_many_files";
  if (parsed.totalBytes > SKILL_PACK_MAX_TOTAL_BYTES) return "total_size_exceeded";
  return null;
}

export type ImportPackTransactionResult = {
  pack: UserSkillConfig;
  importedFileCount: number;
};

function metadataFromSkillMd(entries: Array<{ path: string; content: string }>): {
  alwaysLoad: boolean;
  enabled: boolean;
} {
  let alwaysLoad = false;
  let enabled = true;
  const skillMd = entries.find((e) => e.path === SKILL_PACK_SKILL_MD_PATH);
  if (skillMd) {
    const { frontmatter } = stripSkillMdFrontmatter(skillMd.content);
    if (frontmatter) {
      alwaysLoad = parseAlwaysLoadFromFrontmatter(frontmatter) ?? false;
      enabled = parseEnabledFromFrontmatter(frontmatter) ?? true;
    }
  }
  return { alwaysLoad, enabled };
}

/** 事务内创建系统 Pack + 批量插入 files。 */
export async function createPackFromImport(
  ds: DataSource,
  name: string,
  description: string | null,
  entries: Array<{ path: string; content: string }>,
): Promise<ImportPackTransactionResult> {
  const { alwaysLoad, enabled } = metadataFromSkillMd(entries);

  return ds.transaction(async (em) => {
    const pack = em.getRepository(UserSkillConfig).create({
      id: uuidv4(),
      name,
      description,
      content: null,
      enabled,
      alwaysLoad,
    });
    await em.getRepository(UserSkillConfig).save(pack);
    await insertPackFilesBulk(em, pack.id, entries);
    const skillMd = entries.find((e) => e.path === SKILL_PACK_SKILL_MD_PATH);
    if (skillMd) {
      await syncPackMetadataFromSkillMd(em, pack, skillMd.content);
    }
    const saved = await em.getRepository(UserSkillConfig).findOneOrFail({ where: { id: pack.id } });
    return { pack: saved, importedFileCount: entries.length };
  });
}

/**
 * 覆盖导入：保留 Pack id 与助手绑定；先删旧 files 再 bulk INSERT，并同步 frontmatter 元数据。
 */
export async function overwritePackFromImport(
  ds: DataSource,
  packId: string,
  entries: Array<{ path: string; content: string }>,
): Promise<ImportPackTransactionResult> {
  return ds.transaction(async (em) => {
    const packRepo = em.getRepository(UserSkillConfig);
    const pack = await packRepo.findOne({ where: { id: packId } });
    if (!pack) {
      throw new Error("PACK_NOT_FOUND");
    }
    await em.getRepository(SkillPackFile).delete({ packId });
    await insertPackFilesBulk(em, packId, entries);
    const skillMd = entries.find((e) => e.path === SKILL_PACK_SKILL_MD_PATH);
    if (skillMd) {
      await syncPackMetadataFromSkillMd(em, pack, skillMd.content);
    }
    pack.updatedAt = new Date();
    await packRepo.save(pack);
    const saved = await packRepo.findOneOrFail({ where: { id: packId } });
    return { pack: saved, importedFileCount: entries.length };
  });
}

/** 系统全局 Pack 总数。 */
export async function countSystemPacks(ds: DataSource): Promise<number> {
  return ds.getRepository(UserSkillConfig).count();
}

/** @deprecated 0.1.21 使用 countSystemPacks */
export async function countUserPacks(ds: DataSource, _userId: string): Promise<number> {
  return countSystemPacks(ds);
}
