/** 意图路由未选用技能包时的结构化原因码（展示走 i18n）。 */
export enum SkillPackSkipReasonCode {
  Unrelated = "unrelated",
  LowConfidence = "low_confidence",
  UserSmallTalk = "user_small_talk",
  DuplicateCoverage = "duplicate_coverage",
  Other = "other",
}

/** 校验 LLM 输出的 reason 是否为合法 code；非法则丢弃。 */
export function parseSkillPackSkipReasonCode(raw: unknown): SkillPackSkipReasonCode | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  return (Object.values(SkillPackSkipReasonCode) as string[]).includes(v)
    ? (v as SkillPackSkipReasonCode)
    : null;
}
