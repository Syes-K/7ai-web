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
  | "skillsScriptRunTitle";

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
    content: localizeDetailString(block.content, t),
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
