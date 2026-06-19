import type { UserSkillConfig } from "@/server/db/entities/UserSkillConfig";
import type { PackFileAggregate } from "@/server/skill/pack-files";

export type SkillConfigListItemJson = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  fileCount: number;
  hasScripts: boolean;
  createdAt: string;
  updatedAt: string;
  referencedAssistantCount: number;
};

export function userSkillConfigToListItemJson(
  row: UserSkillConfig,
  referencedAssistantCount: number,
  aggregate?: PackFileAggregate,
): SkillConfigListItemJson {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    enabled: row.enabled,
    fileCount: aggregate?.fileCount ?? 0,
    hasScripts: aggregate?.hasScripts ?? false,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    referencedAssistantCount,
  };
}

export type SkillConfigDetailItemJson = SkillConfigListItemJson;

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
};

export type SkillPackImportSummaryJson = {
  importedFileCount: number;
  skippedFileCount: number;
  skipped: Array<{ path: string; reason: string }>;
  totalBytes: number;
  hasScripts: boolean;
};

export type SkillPackImportResponseJson = {
  item: SkillConfigListItemJson;
  importSummary: SkillPackImportSummaryJson;
};
