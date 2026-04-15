import { NextResponse } from "next/server";
import { DEFAULT_CONVERSATION_SUMMARY_CONFIG } from "@/common/constants/defaultConversationSummaryConfig";
import {
  CONVERSATION_SUMMARY_KEEP_MESSAGES_MAX,
  CONVERSATION_SUMMARY_KEEP_TOKENS_MAX,
  CONVERSATION_SUMMARY_MIN_RECENT_MESSAGES_MAX,
  CONVERSATION_SUMMARY_MAX_CHARS_MAX,
  CONVERSATION_SUMMARY_TRIGGER_MESSAGES_MAX,
  CONVERSATION_SUMMARY_TRIGGER_TOKENS_MAX,
} from "@/common/constants";
import { ErrorCode, HttpStatus } from "@/common/enums";
import type { ConversationSummaryConfig } from "@/common/types";
import { withAdminApi } from "@/server/auth/with-admin-api";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { mergeConversationSummaryConfigFromFile } from "@/server/conversation-summary-config/merge";
import {
  readConversationSummaryConfigFile,
  writeConversationSummaryConfigAtomic,
} from "@/server/conversation-summary-config/io";

export const runtime = "nodejs";

export const GET = withAdminApi(async () => {
  let raw: string | null;
  try {
    const r = await readConversationSummaryConfigFile();
    raw = r.raw;
  } catch {
    return jsonError(
      ErrorCode.INTERNAL_ERROR,
      "读取对话摘要配置失败",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
  const { config, fileState } = mergeConversationSummaryConfigFromFile(raw);
  return NextResponse.json(
    {
      config,
      fileState,
      fileHint:
        fileState === "invalid_json"
          ? "conversationSummaryConfig.json 无法解析，已回退默认配置；保存后将覆盖为合法 JSON。"
          : undefined,
    },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

type PutBody = { config?: unknown };

const SUMMARY_DEFAULTS = DEFAULT_CONVERSATION_SUMMARY_CONFIG;

function intField(
  v: unknown,
  min: number,
  max: number,
  field: string,
): true | JsonErrorDetail {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
    return { field, message: `须为 ${min}~${max} 的整数` };
  }
  return true;
}

/** 未传则回落为默认值；传了则必须在范围内（用于当前 mode 未激活的一组字段）。 */
function optionalIntOrDefault(
  v: unknown,
  min: number,
  max: number,
  field: string,
  defaultVal: number,
): { ok: true; value: number } | { ok: false; detail: JsonErrorDetail } {
  if (v === undefined || v === null) {
    return { ok: true, value: defaultVal };
  }
  const r = intField(v, min, max, field);
  if (r !== true) {
    return { ok: false, detail: r };
  }
  return { ok: true, value: v as number };
}

function validateConfig(input: unknown): { ok: true; value: ConversationSummaryConfig } | {
  ok: false;
  details: JsonErrorDetail[];
} {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, details: [{ field: "config", message: "须为对象" }] };
  }
  const cfg = input as Record<string, unknown>;
  const details: JsonErrorDetail[] = [];

  const allowed = new Set([
    "enabled",
    "maxChars",
    "mode",
    "summaryTriggerTokens",
    "summaryKeepTokens",
    "summaryTriggerMessages",
    "summaryKeepMessages",
    "summaryMinRecentMessages",
  ]);
  for (const k of Object.keys(cfg)) {
    if (!allowed.has(k)) {
      details.push({ field: `config.${k}`, message: "不支持的字段" });
    }
  }

  if (typeof cfg.enabled !== "boolean") {
    details.push({ field: "config.enabled", message: "须为 boolean" });
  }
  if (
    typeof cfg.maxChars !== "number" ||
    !Number.isInteger(cfg.maxChars) ||
    cfg.maxChars < 1 ||
    cfg.maxChars > CONVERSATION_SUMMARY_MAX_CHARS_MAX
  ) {
    details.push({
      field: "config.maxChars",
      message: `须为 1~${CONVERSATION_SUMMARY_MAX_CHARS_MAX} 的整数`,
    });
  }
  if (cfg.mode !== "tokens" && cfg.mode !== "messages") {
    details.push({
      field: "config.mode",
      message: "须为 tokens 或 messages",
    });
  }
  if (details.length > 0) {
    return { ok: false, details };
  }

  const mode = cfg.mode as "tokens" | "messages";

  let summaryTriggerTokens: number;
  let summaryKeepTokens: number;
  let summaryTriggerMessages: number;
  let summaryKeepMessages: number;
  let summaryMinRecentMessages: number;

  if (mode === "tokens") {
    const t1 = intField(
      cfg.summaryTriggerTokens,
      1,
      CONVERSATION_SUMMARY_TRIGGER_TOKENS_MAX,
      "config.summaryTriggerTokens",
    );
    if (t1 !== true) {
      details.push(t1);
    }
    const t2 = intField(
      cfg.summaryKeepTokens,
      1,
      CONVERSATION_SUMMARY_KEEP_TOKENS_MAX,
      "config.summaryKeepTokens",
    );
    if (t2 !== true) {
      details.push(t2);
    }
    const m1 = optionalIntOrDefault(
      cfg.summaryTriggerMessages,
      1,
      CONVERSATION_SUMMARY_TRIGGER_MESSAGES_MAX,
      "config.summaryTriggerMessages",
      SUMMARY_DEFAULTS.summaryTriggerMessages,
    );
    if (!m1.ok) {
      details.push(m1.detail);
    }
    const m2 = optionalIntOrDefault(
      cfg.summaryKeepMessages,
      1,
      CONVERSATION_SUMMARY_KEEP_MESSAGES_MAX,
      "config.summaryKeepMessages",
      SUMMARY_DEFAULTS.summaryKeepMessages,
    );
    if (!m2.ok) {
      details.push(m2.detail);
    }
    if (details.length > 0) {
      return { ok: false, details };
    }
    summaryTriggerTokens = cfg.summaryTriggerTokens as number;
    summaryKeepTokens = cfg.summaryKeepTokens as number;
    summaryTriggerMessages = m1.ok ? m1.value : SUMMARY_DEFAULTS.summaryTriggerMessages;
    summaryKeepMessages = m2.ok ? m2.value : SUMMARY_DEFAULTS.summaryKeepMessages;
    const minRecent = optionalIntOrDefault(
      cfg.summaryMinRecentMessages,
      1,
      CONVERSATION_SUMMARY_MIN_RECENT_MESSAGES_MAX,
      "config.summaryMinRecentMessages",
      SUMMARY_DEFAULTS.summaryMinRecentMessages,
    );
    if (!minRecent.ok) {
      details.push(minRecent.detail);
      return { ok: false, details };
    }
    summaryMinRecentMessages = minRecent.value;
  } else {
    const m1 = intField(
      cfg.summaryTriggerMessages,
      1,
      CONVERSATION_SUMMARY_TRIGGER_MESSAGES_MAX,
      "config.summaryTriggerMessages",
    );
    if (m1 !== true) {
      details.push(m1);
    }
    const m2 = intField(
      cfg.summaryKeepMessages,
      1,
      CONVERSATION_SUMMARY_KEEP_MESSAGES_MAX,
      "config.summaryKeepMessages",
    );
    if (m2 !== true) {
      details.push(m2);
    }
    const t1 = optionalIntOrDefault(
      cfg.summaryTriggerTokens,
      1,
      CONVERSATION_SUMMARY_TRIGGER_TOKENS_MAX,
      "config.summaryTriggerTokens",
      SUMMARY_DEFAULTS.summaryTriggerTokens,
    );
    if (!t1.ok) {
      details.push(t1.detail);
    }
    const t2 = optionalIntOrDefault(
      cfg.summaryKeepTokens,
      1,
      CONVERSATION_SUMMARY_KEEP_TOKENS_MAX,
      "config.summaryKeepTokens",
      SUMMARY_DEFAULTS.summaryKeepTokens,
    );
    if (!t2.ok) {
      details.push(t2.detail);
    }
    if (details.length > 0) {
      return { ok: false, details };
    }
    summaryTriggerMessages = cfg.summaryTriggerMessages as number;
    summaryKeepMessages = cfg.summaryKeepMessages as number;
    summaryTriggerTokens = t1.ok ? t1.value : SUMMARY_DEFAULTS.summaryTriggerTokens;
    summaryKeepTokens = t2.ok ? t2.value : SUMMARY_DEFAULTS.summaryKeepTokens;
    const minRecent = optionalIntOrDefault(
      cfg.summaryMinRecentMessages,
      1,
      CONVERSATION_SUMMARY_MIN_RECENT_MESSAGES_MAX,
      "config.summaryMinRecentMessages",
      SUMMARY_DEFAULTS.summaryMinRecentMessages,
    );
    if (!minRecent.ok) {
      details.push(minRecent.detail);
      return { ok: false, details };
    }
    summaryMinRecentMessages = minRecent.value;
  }

  return {
    ok: true,
    value: {
      enabled: cfg.enabled as boolean,
      maxChars: cfg.maxChars as number,
      mode,
      summaryTriggerTokens,
      summaryKeepTokens,
      summaryTriggerMessages,
      summaryKeepMessages,
      summaryMinRecentMessages,
    },
  };
}

export const PUT = withAdminApi(async (_user, request) => {
  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return jsonError(ErrorCode.VALIDATION_ERROR, "请求体不是合法 JSON", HttpStatus.BAD_REQUEST);
  }

  const val = validateConfig(body.config);
  if (!val.ok) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "校验失败",
      HttpStatus.BAD_REQUEST,
      val.details,
    );
  }

  const jsonString = `${JSON.stringify(val.value, null, 2)}\n`;
  try {
    await writeConversationSummaryConfigAtomic(jsonString);
  } catch {
    return jsonError(ErrorCode.INTERNAL_ERROR, "保存失败", HttpStatus.INTERNAL_SERVER_ERROR);
  }

  let rawAfter: string | null;
  try {
    rawAfter = (await readConversationSummaryConfigFile()).raw;
  } catch {
    return jsonError(
      ErrorCode.INTERNAL_ERROR,
      "写入后读取验证失败",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  const { config, fileState } = mergeConversationSummaryConfigFromFile(rawAfter);
  return NextResponse.json(
    {
      config,
      fileState,
    },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});
