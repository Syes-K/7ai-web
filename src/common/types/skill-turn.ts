import type { SkillPackSkipReasonCode } from "@/common/enums/skill-pack-skip-reason";

/** 对话 Turn 面板 Skills 步骤展示用 Pack 引用（结构化，不含 locale 文案）。 */
export type SkillPackUiRef = { id: string; name: string };

export type SkillPackSkippedRef = SkillPackUiRef & {
  /** 0.1.21+ 结构化 skip 原因；展示走 i18n */
  reasonCode?: SkillPackSkipReasonCode | null;
  /** @deprecated 0.1.21+ 新 Turn 不写；仅历史 Turn legacy */
  reason?: string;
};

/** P1 可选：C1b details 结构化行（新 Turn 双写 content + lines）。 */
export type TurnDetailLine =
  | { type: "loadedName"; name: string }
  | { type: "skipped"; name: string; reasonCode?: SkillPackSkipReasonCode }
  | { type: "read"; packName: string; path: string }
  | { type: "scriptRun"; packName: string; path: string; exitCode: string };

export type TurnDetailBlock = {
  title: string;
  content?: string;
  lines?: TurnDetailLine[];
};

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

/** C1b 子步骤快照字段（嵌于 stepsSnapshotJson）。 */
export type TurnSubStepSnapshot = {
  label?: string;
  status?: string;
  safeMessage?: string;
  /** 0.1.21+：稳定 i18n key，如 turnSafe.skillsLoaded */
  safeMessageKey?: string | null;
  details?: TurnDetailBlock[];
  reasonTag?: string;
};
