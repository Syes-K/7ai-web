import type { UserSkillConfig } from "@/server/db/entities/UserSkillConfig";
import type { PackFileAggregate } from "@/server/skill/pack-files";

/** Admin 列表/详情项（无 referencedAssistantCount）。 */
export type AdminSkillPackListItemJson = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  alwaysLoad: boolean;
  fileCount: number;
  hasScripts: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Catalog 只读项（仅 enabled Pack；不含时间戳）。 */
export type SkillCatalogItemJson = {
  id: string;
  name: string;
  description: string | null;
  fileCount: number;
  hasScripts: boolean;
  alwaysLoad: boolean;
};

export function userSkillConfigToAdminListItemJson(
  row: UserSkillConfig,
  aggregate?: PackFileAggregate,
): AdminSkillPackListItemJson {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    enabled: row.enabled,
    alwaysLoad: row.alwaysLoad,
    fileCount: aggregate?.fileCount ?? 0,
    hasScripts: aggregate?.hasScripts ?? false,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function userSkillConfigToCatalogItemJson(
  row: UserSkillConfig,
  aggregate?: PackFileAggregate,
): SkillCatalogItemJson {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    fileCount: aggregate?.fileCount ?? 0,
    hasScripts: aggregate?.hasScripts ?? false,
    alwaysLoad: row.alwaysLoad,
  };
}

/** @deprecated 0.1.21 console 废弃；Admin 使用 AdminSkillPackListItemJson */
export type SkillConfigListItemJson = AdminSkillPackListItemJson & {
  referencedAssistantCount: number;
};

/** @deprecated 0.1.21 */
export function userSkillConfigToListItemJson(
  row: UserSkillConfig,
  referencedAssistantCount: number,
  aggregate?: PackFileAggregate,
): SkillConfigListItemJson {
  return {
    ...userSkillConfigToAdminListItemJson(row, aggregate),
    referencedAssistantCount,
  };
}

/** @deprecated 0.1.21 */
export type SkillConfigDetailItemJson = SkillConfigListItemJson;

/** @deprecated 0.1.21 */
export function userSkillConfigToDetailItemJson(
  row: UserSkillConfig,
  referencedAssistantCount: number,
  aggregate?: PackFileAggregate,
): SkillConfigDetailItemJson {
  return userSkillConfigToListItemJson(row, referencedAssistantCount, aggregate);
}

export type SkillPackFileMetaJson = {
  path: string;
  sizeBytes: number;
  updatedAt: string;
};

export type SkillPackFileContentJson = SkillPackFileMetaJson & {
  content: string;
  truncated?: boolean;
};

export type SkillPackImportSummaryJson = {
  importedFileCount: number;
  skippedFileCount: number;
  skipped: Array<{ path: string; reason: string }>;
  totalBytes: number;
  hasScripts: boolean;
};

export type SkillPackImportResponseJson = {
  item: AdminSkillPackListItemJson;
  importSummary: SkillPackImportSummaryJson;
};
