import { MoreThanOrEqual } from "typeorm";
import { getDataSource } from "@/server/db/data-source";
import { SkillScriptRun } from "@/server/db/entities/SkillScriptRun";
import { getSkillScriptMaxRunsPerUserDay } from "@/server/skill/skill-script-env";

/** UTC 自然日零点，用于日配额 COUNT。 */
export function startOfDayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** 统计用户当日已 spawn 的脚本次数（UTC 日界）。 */
export async function countUserScriptRunsToday(userId: string): Promise<number> {
  const ds = await getDataSource();
  return ds.getRepository(SkillScriptRun).count({
    where: {
      userId,
      createdAt: MoreThanOrEqual(startOfDayUtc()),
    } as any,
  });
}

export async function isDailyScriptRunQuotaExceeded(userId: string): Promise<boolean> {
  const count = await countUserScriptRunsToday(userId);
  return count >= getSkillScriptMaxRunsPerUserDay();
}
