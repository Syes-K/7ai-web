import type { SkillsTurnUiSnapshot } from "@/common/types/skill-turn";

/**
 * 将 0.1.19 legacy `merged[]` 快照归一化为 0.1.20 的 mounted/loaded 结构。
 */
export function normalizeSkillsTurnUi(raw: SkillsTurnUiSnapshot): SkillsTurnUiSnapshot {
  if (raw.mounted?.length) {
    return {
      ...raw,
      mounted: raw.mounted ?? [],
      loaded: raw.loaded ?? [],
      skipped: raw.skipped ?? [],
    };
  }
  if (raw.merged?.length) {
    return {
      ...raw,
      mounted: raw.merged,
      loaded: raw.merged,
      skipped: [],
      skippedCount: 0,
    };
  }
  return {
    ...raw,
    mounted: raw.mounted ?? [],
    loaded: raw.loaded ?? [],
    skipped: raw.skipped ?? [],
  };
}
