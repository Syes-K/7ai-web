/** 对话 Turn 面板 Skills 步骤展示用 Pack 引用（结构化，不含 locale 文案）。 */
export type SkillPackUiRef = { id: string; name: string };

export type SkillPackSkippedRef = SkillPackUiRef & { reason?: string };

export type SkillsTurnUiSnapshot = {
  assistantMissing: boolean;
  loadFailed?: boolean;
  intentSource?: "always_load" | "intent_agent" | "failed_safe" | "skipped";
  /** 助手挂载且 enabled 的全部 Pack */
  mounted: SkillPackUiRef[];
  /** 本轮合并 SKILL.md 进 prompt 的 Pack */
  loaded: SkillPackUiRef[];
  /** 挂载但本轮未加载（最多 5 条入 details） */
  skipped?: SkillPackSkippedRef[];
  /** 未选用总数（含未展示 reason 的条目） */
  skippedCount?: number;
  readToolEnabled?: boolean;
  runToolEnabled?: boolean;
  readFileCount?: number;
  /** ≤5，格式 packName:path */
  readFileSamples?: string[];
  scriptRunCount?: number;
  /** ≤5，格式 packName:path:exitCode */
  scriptRunSamples?: string[];
  /** @deprecated 0.1.20+ 用 loaded；读历史时映射 */
  merged?: SkillPackUiRef[];
};

/** 单轮技能包选用结果（内部，可不持久化）。 */
export type SkillPackSelectionResult = {
  mountedRefs: Array<{ id: string }>;
  /** 工具白名单 = merge 成功后的 loaded Pack */
  selectedRefs: Array<{ id: string }>;
  mounted: SkillPackUiRef[];
  loaded: SkillPackUiRef[];
  skipped: SkillPackSkippedRef[];
  skippedCount: number;
  intentSource: "always_load" | "intent_agent" | "failed_safe" | "skipped";
  loadFailed: boolean;
};
