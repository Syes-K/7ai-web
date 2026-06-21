import enApiMessage from "../../../messages/en/api/message.json";
import zhApiMessage from "../../../messages/zh/api/message.json";
import { CHAT_DEFAULT_CONVERSATION_TITLE } from "@/common/constants";

type DetailKey =
  | "kbMatchedBases"
  | "kbMatchedChunks"
  | "mcpNote"
  | "mcpNoAssistantBody"
  | "mcpNotMountedBody"
  | "mcpMounted"
  | "mcpTools"
  | "mcpLoadFailedTitle"
  | "mcpRoundCalls"
  | "mcpNoTools"
  | "mcpNoToolCalls"
  | "mcpUnknownError"
  | "skillsNote"
  | "skillsNoAssistantBody"
  | "skillsNotMountedBody"
  | "skillsMountedTitle"
  | "skillsLoadedTitle"
  | "skillsSkippedTitle"
  | "skillsMergedTitle"
  | "skillsReadTitle"
  | "skillsScriptRunTitle"
  | "skillsIntentFailedBody";

type ChatTranslator = (key: string, values?: Record<string, string | number>) => string;

const DETAIL_I18N_PREFIX = "turn.detail.";

const DETAIL_KEYS: DetailKey[] = [
  "kbMatchedBases",
  "kbMatchedChunks",
  "mcpNote",
  "mcpNoAssistantBody",
  "mcpNotMountedBody",
  "mcpMounted",
  "mcpTools",
  "mcpLoadFailedTitle",
  "mcpRoundCalls",
  "mcpNoTools",
  "mcpNoToolCalls",
  "mcpUnknownError",
  "skillsNote",
  "skillsNoAssistantBody",
  "skillsNotMountedBody",
  "skillsMountedTitle",
  "skillsLoadedTitle",
  "skillsSkippedTitle",
  "skillsMergedTitle",
  "skillsReadTitle",
  "skillsScriptRunTitle",
  "skillsIntentFailedBody",
];

/** 各 locale 已写入 DB 的详情标题/正文 → 语义 key（兼容历史硬编码中文）。 */
const LEGACY_DETAIL_STRING_TO_KEY = new Map<string, DetailKey>();

for (const key of DETAIL_KEYS) {
  const enTitle = enApiMessage.turnSafe.detail[key];
  const zhTitle = zhApiMessage.turnSafe.detail[key];
  LEGACY_DETAIL_STRING_TO_KEY.set(enTitle, key);
  LEGACY_DETAIL_STRING_TO_KEY.set(zhTitle, key);
}

/** 历史硬编码中文标题（未走 i18n 写入前）。 */
LEGACY_DETAIL_STRING_TO_KEY.set("命中知识库", "kbMatchedBases");
LEGACY_DETAIL_STRING_TO_KEY.set("命中片段", "kbMatchedChunks");
LEGACY_DETAIL_STRING_TO_KEY.set("说明", "mcpNote");
LEGACY_DETAIL_STRING_TO_KEY.set("已挂载 MCP", "mcpMounted");
LEGACY_DETAIL_STRING_TO_KEY.set("本轮工具调用", "mcpRoundCalls");
LEGACY_DETAIL_STRING_TO_KEY.set("（list_tools 未返回可用工具）", "mcpNoTools");
LEGACY_DETAIL_STRING_TO_KEY.set("未触发工具调用", "mcpNoToolCalls");
LEGACY_DETAIL_STRING_TO_KEY.set("未知错误", "mcpUnknownError");
LEGACY_DETAIL_STRING_TO_KEY.set(
  "当前会话未绑定助手，本轮未启用 MCP 工具。",
  "mcpNoAssistantBody",
);
LEGACY_DETAIL_STRING_TO_KEY.set(
  "助手侧未挂载 MCP 配置，或配置已禁用。",
  "mcpNotMountedBody",
);
LEGACY_DETAIL_STRING_TO_KEY.set("已合并技能包", "skillsLoadedTitle");
LEGACY_DETAIL_STRING_TO_KEY.set("Merged Skill Packs", "skillsLoadedTitle");
LEGACY_DETAIL_STRING_TO_KEY.set("已加载技能包", "skillsLoadedTitle");
LEGACY_DETAIL_STRING_TO_KEY.set("Loaded Skill Packs", "skillsLoadedTitle");
LEGACY_DETAIL_STRING_TO_KEY.set("已挂载", "skillsMountedTitle");
LEGACY_DETAIL_STRING_TO_KEY.set("Mounted Skill Packs", "skillsMountedTitle");
LEGACY_DETAIL_STRING_TO_KEY.set("未选用", "skillsSkippedTitle");
LEGACY_DETAIL_STRING_TO_KEY.set("Not selected this turn", "skillsSkippedTitle");
LEGACY_DETAIL_STRING_TO_KEY.set("已读取文件", "skillsReadTitle");
LEGACY_DETAIL_STRING_TO_KEY.set("Files read", "skillsReadTitle");
LEGACY_DETAIL_STRING_TO_KEY.set("已运行脚本", "skillsScriptRunTitle");
LEGACY_DETAIL_STRING_TO_KEY.set("Scripts run", "skillsScriptRunTitle");
LEGACY_DETAIL_STRING_TO_KEY.set(
  "当前会话未绑定助手，本轮未加载技能包。",
  "skillsNoAssistantBody",
);
LEGACY_DETAIL_STRING_TO_KEY.set(
  "助手未挂载可用技能包，或技能包已停用。",
  "skillsNotMountedBody",
);

const SKIP_REASON_LEGACY_TO_CODE: Record<string, string> = {
  [enApiMessage.turnSafe.detail.skillsSkipReason.unrelated]: "unrelated",
  [zhApiMessage.turnSafe.detail.skillsSkipReason.unrelated]: "unrelated",
  [enApiMessage.turnSafe.detail.skillsSkipReason.low_confidence]: "low_confidence",
  [zhApiMessage.turnSafe.detail.skillsSkipReason.low_confidence]: "low_confidence",
  [enApiMessage.turnSafe.detail.skillsSkipReason.user_small_talk]: "user_small_talk",
  [zhApiMessage.turnSafe.detail.skillsSkipReason.user_small_talk]: "user_small_talk",
  [enApiMessage.turnSafe.detail.skillsSkipReason.duplicate_coverage]: "duplicate_coverage",
  [zhApiMessage.turnSafe.detail.skillsSkipReason.duplicate_coverage]: "duplicate_coverage",
  [enApiMessage.turnSafe.detail.skillsSkipReason.other]: "other",
  [zhApiMessage.turnSafe.detail.skillsSkipReason.other]: "other",
  "与当前问题无关": "unrelated",
  "本轮不需要": "low_confidence",
  "寒暄闲聊": "user_small_talk",
  "已由其他包覆盖": "duplicate_coverage",
  "未选用": "other",
  "not relevant to this question": "unrelated",
  "not needed this turn": "low_confidence",
  "small talk": "user_small_talk",
  "already covered by another pack": "duplicate_coverage",
};

function localizeDetailLine(line: string, t: ChatTranslator): string {
  const trimmed = line.trim();
  if (!trimmed) return line;

  const loadedNameEn = enApiMessage.turnSafe.detail.skillsLoadedNameLine.replace("{name}", "(.+)");
  const loadedNameZh = zhApiMessage.turnSafe.detail.skillsLoadedNameLine.replace("{name}", "(.+)");
  const loadedMatch =
    trimmed.match(new RegExp(`^${loadedNameEn}$`)) ??
    trimmed.match(new RegExp(`^${loadedNameZh}$`)) ??
    trimmed.match(/^·\s*(.+)$/);
  if (loadedMatch?.[1]) {
    return t("turn.detail.skillsLoadedNameLine", { name: loadedMatch[1].trim() });
  }

  const skippedParts = trimmed.split(/\s*—\s*|\s+-\s+/);
  if (skippedParts.length >= 1) {
    const namePart = skippedParts[0]!.replace(/^·\s*/, "").trim();
    const reasonPart = skippedParts[1]?.trim();
    if (namePart && reasonPart) {
      const code = SKIP_REASON_LEGACY_TO_CODE[reasonPart];
      const reasonLabel = code
        ? t(`turn.detail.skillsSkipReason.${code}`)
        : reasonPart;
      return t("turn.detail.skillsSkippedLine", { name: namePart, reason: reasonLabel });
    }
    if (namePart.startsWith("·")) {
      return t("turn.detail.skillsSkippedLineNoReason", {
        name: namePart.replace(/^·\s*/, "").trim(),
      });
    }
  }

  const readColon = trimmed.match(/^·\s*(.+?)[:：]\s*(.+)$/);
  if (readColon && !readColon[2]!.includes("退出码") && !readColon[2]!.includes("exit")) {
    return t("turn.detail.skillsReadLine", {
      packName: readColon[1]!.trim(),
      path: readColon[2]!.trim(),
    });
  }

  const runMatch =
    trimmed.match(/^·\s*(.+?)[:：]\s*(.+?)\s*[（(]退出码\s*(\d+)[）)]$/) ??
    trimmed.match(/^·\s*(.+?):\s*(.+?)\s*\(exit\s*(\d+)\)$/i);
  if (runMatch) {
    return t("turn.detail.skillsScriptRunLine", {
      packName: runMatch[1]!.trim(),
      path: runMatch[2]!.trim(),
      exitCode: runMatch[3]!,
    });
  }

  return localizeDetailString(trimmed, t);
}

function localizeDetailContent(content: string, t: ChatTranslator): string {
  if (!content.includes("\n")) {
    return localizeDetailLine(content, t);
  }
  return content
    .split("\n")
    .map((line) => localizeDetailLine(line, t))
    .join("\n");
}

const MCP_TOOLS_PREFIXES = ["Tools · ", "工具 · "] as const;
const MCP_LOAD_FAILED_PREFIXES = ["Load failed · ", "加载失败 · "] as const;

function resolveDetailKey(text: string): { key: DetailKey; name?: string } | null {
  const direct = LEGACY_DETAIL_STRING_TO_KEY.get(text);
  if (direct) {
    return { key: direct };
  }
  for (const prefix of MCP_TOOLS_PREFIXES) {
    if (text.startsWith(prefix)) {
      return { key: "mcpTools", name: text.slice(prefix.length) };
    }
  }
  for (const prefix of MCP_LOAD_FAILED_PREFIXES) {
    if (text.startsWith(prefix)) {
      return { key: "mcpLoadFailedTitle", name: text.slice(prefix.length) };
    }
  }
  return null;
}

function localizeDetailString(text: string, t: ChatTranslator): string {
  const resolved = resolveDetailKey(text);
  if (!resolved) {
    return text;
  }
  const i18nKey = `${DETAIL_I18N_PREFIX}${resolved.key}`;
  if (resolved.name != null) {
    return t(i18nKey, { name: resolved.name });
  }
  return t(i18nKey);
}

/** 将 turn 详情块标题/正文映射为当前 UI locale（兼容 DB 中历史中文）。 */
export function localizeDetailBlock(
  block: { title: string; content: string },
  t: ChatTranslator,
): { title: string; content: string } {
  return {
    title: localizeDetailString(block.title, t),
    content: localizeDetailContent(block.content, t),
  };
}

const DEFAULT_CONVERSATION_TITLES = new Set([
  CHAT_DEFAULT_CONVERSATION_TITLE,
  "New chat",
  "新对话",
]);

/** 侧栏会话标题：默认标题按当前 locale 展示。 */
export function localizeConversationTitle(title: string, t: ChatTranslator): string {
  if (DEFAULT_CONVERSATION_TITLES.has(title)) {
    return t("messages.defaultConversationTitle");
  }
  return title;
}
