import { DEFAULT_CONVERSATION_SUMMARY_CONFIG } from "@/common/constants/defaultConversationSummaryConfig";
import type {
  ConversationSummaryConfig,
  ConversationSummaryConfigFileState,
} from "@/common/types";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parsePositiveInt(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isInteger(v) || v <= 0) {
    return null;
  }
  return v;
}

function parseMode(v: unknown): "tokens" | "messages" | null {
  if (v === "tokens" || v === "messages") {
    return v;
  }
  return null;
}

export function mergeConversationSummaryConfigFromFile(fileRaw: string | null): {
  config: ConversationSummaryConfig;
  fileState: ConversationSummaryConfigFileState;
} {
  if (fileRaw === null) {
    return { config: { ...DEFAULT_CONVERSATION_SUMMARY_CONFIG }, fileState: "missing" };
  }

  let obj: unknown;
  try {
    obj = JSON.parse(fileRaw);
  } catch {
    return { config: { ...DEFAULT_CONVERSATION_SUMMARY_CONFIG }, fileState: "invalid_json" };
  }

  if (!isPlainObject(obj)) {
    return { config: { ...DEFAULT_CONVERSATION_SUMMARY_CONFIG }, fileState: "invalid_json" };
  }

  const enabled =
    typeof obj.enabled === "boolean"
      ? obj.enabled
      : DEFAULT_CONVERSATION_SUMMARY_CONFIG.enabled;
  const maxChars = parsePositiveInt(obj.maxChars) ?? DEFAULT_CONVERSATION_SUMMARY_CONFIG.maxChars;
  const mode = parseMode(obj.mode) ?? DEFAULT_CONVERSATION_SUMMARY_CONFIG.mode;
  const summaryTriggerTokens =
    parsePositiveInt(obj.summaryTriggerTokens) ??
    DEFAULT_CONVERSATION_SUMMARY_CONFIG.summaryTriggerTokens;
  const summaryKeepTokens =
    parsePositiveInt(obj.summaryKeepTokens) ?? DEFAULT_CONVERSATION_SUMMARY_CONFIG.summaryKeepTokens;
  const summaryTriggerMessages =
    parsePositiveInt(obj.summaryTriggerMessages) ??
    DEFAULT_CONVERSATION_SUMMARY_CONFIG.summaryTriggerMessages;
  const summaryKeepMessages =
    parsePositiveInt(obj.summaryKeepMessages) ??
    DEFAULT_CONVERSATION_SUMMARY_CONFIG.summaryKeepMessages;
  const summaryMinRecentMessages =
    parsePositiveInt(obj.summaryMinRecentMessages) ??
    DEFAULT_CONVERSATION_SUMMARY_CONFIG.summaryMinRecentMessages;

  return {
    config: {
      enabled,
      maxChars,
      mode,
      summaryTriggerTokens,
      summaryKeepTokens,
      summaryTriggerMessages,
      summaryKeepMessages,
      summaryMinRecentMessages,
    },
    fileState: "ok",
  };
}
