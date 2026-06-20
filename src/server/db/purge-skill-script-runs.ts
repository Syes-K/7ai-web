import type { DataSource } from "typeorm";
import { LessThan } from "typeorm";
import { SkillScriptRun } from "@/server/db/entities/SkillScriptRun";

const RETENTION_DAYS = 90;

/** 启动时清理超过 90 天的脚本执行审计记录。 */
export async function purgeOldSkillScriptRuns(ds: DataSource): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await ds.getRepository(SkillScriptRun).delete({
    createdAt: LessThan(cutoff),
  } as any);
}
