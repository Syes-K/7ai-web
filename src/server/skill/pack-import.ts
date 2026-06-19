import AdmZip from "adm-zip";
import { v4 as uuidv4 } from "uuid";
import type { DataSource } from "typeorm";
import {
  SKILL_CONFIG_MAX_PER_USER,
  SKILL_PACK_IMPORT_ZIP_MAX_BYTES,
  SKILL_PACK_MAX_FILES,
  SKILL_PACK_MAX_TOTAL_BYTES,
  SKILL_PACK_SKILL_MD_PATH,
} from "@/common/constants";
import { UserSkillConfig } from "@/server/db/entities/UserSkillConfig";
import {
  extractSkillMetadataFromFrontmatter,
  stripSkillMdFrontmatter,
} from "@/server/skill/pack-frontmatter";
import {
  hasScriptsPrefix,
  isHiddenOrCachePath,
  isPackFileExtensionAllowed,
  normalizePackFilePath,
} from "@/server/skill/pack-path";
import { insertPackFilesBulk } from "@/server/skill/pack-files";
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

/** 事务内创建 Pack + 批量插入 files。 */
export async function createPackFromImport(
  ds: DataSource,
  userId: string,
  name: string,
  description: string | null,
  entries: Array<{ path: string; content: string }>,
): Promise<ImportPackTransactionResult> {
  return ds.transaction(async (em) => {
    const pack = em.getRepository(UserSkillConfig).create({
      id: uuidv4(),
      userId,
      name,
      description,
      content: null,
      enabled: true,
    });
    await em.getRepository(UserSkillConfig).save(pack);
    await insertPackFilesBulk(em, userId, pack.id, entries);
    return { pack, importedFileCount: entries.length };
  });
}

export async function countUserPacks(ds: DataSource, userId: string): Promise<number> {
  return ds.getRepository(UserSkillConfig).count({ where: { userId } });
}
