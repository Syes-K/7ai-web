import enApiMessage from "../../../messages/en/api/message.json";
import zhApiMessage from "../../../messages/zh/api/message.json";
import type { SkillsTurnUiSnapshot } from "@/common/types/skill-turn";
import { normalizeSkillsTurnUi } from "@/common/utils/normalize-skills-turn-ui";

/** C1b safeMessage 稳定 i18n key（与 messages 下 api/message.json turnSafe 对齐）。 */
export type TurnSafeMessageKey =
  | "turnSafe.kbMiss"
  | "turnSafe.mcpNoAssistant"
  | "turnSafe.mcpNotMounted"
  | "turnSafe.mcpDisabled"
  | "turnSafe.skillsNoAssistant"
  | "turnSafe.skillsLoadSkipped"
  | "turnSafe.skillsNotMounted"
  | "turnSafe.skillsSelectionFailed"
  | "turnSafe.skillsMountedNotSelected"
  | "turnSafe.skillsLoaded"
  | "turnSafe.skillsLoadedWithRead"
  | "turnSafe.skillsLoadedWithRun"
  | "turnSafe.skillsLoadedWithReadAndRun";

function localeMarkerSet(...values: string[]): ReadonlySet<string> {
  return new Set(values.filter((v) => v.length > 0));
}

/** 各 locale 已写入 DB 的 safeMessage 文案集合（用于隐藏/匹配逻辑）。 */
export const TURN_SAFE_KB_MISS_MARKERS = localeMarkerSet(
  enApiMessage.turnSafe.kbMiss,
  zhApiMessage.turnSafe.kbMiss,
);

export const TURN_SAFE_MCP_NO_ASSISTANT_MARKERS = localeMarkerSet(
  enApiMessage.turnSafe.mcpNoAssistant,
  zhApiMessage.turnSafe.mcpNoAssistant,
);

export const TURN_SAFE_MCP_NOT_MOUNTED_MARKERS = localeMarkerSet(
  enApiMessage.turnSafe.mcpNotMounted,
  zhApiMessage.turnSafe.mcpNotMounted,
);

export const TURN_SAFE_SKILLS_NOT_MOUNTED_MARKERS = localeMarkerSet(
  enApiMessage.turnSafe.skillsNotMounted,
  zhApiMessage.turnSafe.skillsNotMounted,
);

/** MCP 详情块历史数据可能为另一 locale，展示层会映射为当前语言 */
export const MCP_DISABLED_MARKERS = ["未启用 MCP", "MCP not enabled"] as const;

/** legacy safeMessage 英文文案 → key 映射（历史 Turn GET 重放 fallback）。 */
export const LEGACY_SKILLS_SAFE_MESSAGE_TO_KEY: ReadonlyArray<{
  pattern: RegExp;
  key: TurnSafeMessageKey;
}> = [
  { pattern: /no assistant bound/i, key: "turnSafe.skillsNoAssistant" },
  { pattern: /could not be loaded/i, key: "turnSafe.skillsLoadSkipped" },
  { pattern: /no skill packs mounted/i, key: "turnSafe.skillsNotMounted" },
  { pattern: /selection unavailable/i, key: "turnSafe.skillsSelectionFailed" },
  { pattern: /none selected this turn/i, key: "turnSafe.skillsMountedNotSelected" },
  { pattern: /read .* file/i, key: "turnSafe.skillsLoadedWithRead" },
  { pattern: /ran .* script/i, key: "turnSafe.skillsLoadedWithRun" },
  { pattern: /loaded .* skill pack/i, key: "turnSafe.skillsLoaded" },
];

const PARAM_KEYS = new Set<TurnSafeMessageKey>([
  "turnSafe.skillsLoaded",
  "turnSafe.skillsLoadedWithRead",
  "turnSafe.skillsLoadedWithRun",
  "turnSafe.skillsLoadedWithReadAndRun",
  "turnSafe.skillsMountedNotSelected",
]);

/**
 * 由 Skills 快照解析 C1b safeMessageKey（与 skillsSafeMessage 逻辑同源）。
 * 前端可在仅有 legacy safeMessage 时用 {@link LEGACY_SKILLS_SAFE_MESSAGE_TO_KEY} 回退。
 */
export function resolveSkillsSafeMessageKey(ui: SkillsTurnUiSnapshot): TurnSafeMessageKey {
  const n = normalizeSkillsTurnUi(ui);
  if (n.assistantMissing) return "turnSafe.skillsNoAssistant";
  if (n.loadFailed) return "turnSafe.skillsLoadSkipped";
  if (n.mounted.length === 0) return "turnSafe.skillsNotMounted";
  const loadedCount = n.loaded.length;
  const readCount = n.readFileCount ?? 0;
  const runCount = n.scriptRunCount ?? 0;
  if (loadedCount === 0 && n.intentSource === "failed_safe") {
    return "turnSafe.skillsSelectionFailed";
  }
  if (loadedCount === 0) return "turnSafe.skillsMountedNotSelected";
  if (readCount > 0 && runCount > 0) return "turnSafe.skillsLoadedWithReadAndRun";
  if (readCount > 0) return "turnSafe.skillsLoadedWithRead";
  if (runCount > 0) return "turnSafe.skillsLoadedWithRun";
  return "turnSafe.skillsLoaded";
}

/** legacy safeMessage 文本推断 key；无法匹配时返回 null。 */
export function legacySkillsSafeMessageToKey(safeMessage: string): TurnSafeMessageKey | null {
  const t = safeMessage.trim();
  if (!t) return null;
  for (const { pattern, key } of LEGACY_SKILLS_SAFE_MESSAGE_TO_KEY) {
    if (pattern.test(t)) return key;
  }
  return null;
}

/** 判断 summary 是否匹配某组 locale 安全文案（含子串兼容）。 */
export function matchesTurnSafeMarker(text: string, markers: ReadonlySet<string>): boolean {
  const s = text.trim();
  if (!s) return false;
  if (markers.has(s)) return true;
  return [...markers].some((m) => s.includes(m));
}

/** 从 legacy safeMessage 粗提取插值（跨 locale 重放时缺参 fallback）。 */
function extractTurnSafeInterpolation(
  key: TurnSafeMessageKey,
  raw: string,
): Record<string, string | number> | undefined {
  const digits = [...raw.matchAll(/\d+/g)].map((m) => Number.parseInt(m[0]!, 10));
  if (digits.length === 0) return undefined;
  switch (key) {
    case "turnSafe.skillsLoaded":
    case "turnSafe.skillsMountedNotSelected":
      return { count: digits[0]!, mountedCount: digits[0]! };
    case "turnSafe.skillsLoadedWithRead":
      return { count: digits[0]!, readCount: digits[1] ?? digits[0]! };
    case "turnSafe.skillsLoadedWithRun":
      return { count: digits[0]!, runCount: digits[1] ?? digits[0]! };
    case "turnSafe.skillsLoadedWithReadAndRun":
      return {
        count: digits[0]!,
        readCount: digits[1] ?? 0,
        runCount: digits[2] ?? digits[1] ?? 0,
      };
    default:
      return undefined;
  }
}

type SafeMessageStep = {
  safeMessage?: string | null;
  safeMessageKey?: string | null;
};

/**
 * C1b 等步骤摘要：优先 safeMessageKey + tApi；legacy 文本回退 pattern 推断。
 */
export function localizeTurnSafeSummary(
  step: SafeMessageStep,
  tApi: (key: string, values?: Record<string, string | number>) => string,
): string | null {
  const raw = (step.safeMessage ?? "").trim();
  const explicitKey = step.safeMessageKey?.trim();
  const key =
    (explicitKey as TurnSafeMessageKey | undefined) ??
    (raw ? legacySkillsSafeMessageToKey(raw) : null);

  if (key) {
    const values = PARAM_KEYS.has(key) ? extractTurnSafeInterpolation(key, raw) : undefined;
    try {
      const localized = values ? tApi(key, values) : tApi(key);
      if (localized && localized !== key) return localized;
    } catch {
      // fall through
    }
  }
  return raw || null;
}
