import { NextResponse } from "next/server";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { withAdminApi } from "@/server/auth/with-admin-api";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import {
  getAuthoritativePromptKeys,
  mergePromptConfigFromFile,
  mergedToApiItems,
} from "@/server/prompt-config/merge";
import {
  readPromptConfigFile,
  writePromptConfigAtomic,
} from "@/server/prompt-config/io";
import { validatePromptTemplate } from "@/common/prompt/validatePromptTemplate";
import { DEFAULT_PROMPT_CONFIG } from "@/common/constants/defautPromptConfig";
import type { PromptConfigKey } from "@/common/types";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";
import { mapPromptTemplateError } from "@/server/prompt-config/map-template-error";

export const runtime = "nodejs";

/**
 * GET：合并后的提示词配置 + 文件级状态（坏 JSON 时 `invalid_json`，供前端 Alert）。
 * Q2-B：仅返回 fileState，不再附带 fileHint 中文字符串。
 * PUT：整表保存各 key 的 value，name/desc 取保存前合并结果，写回 `data/promptConfig.json`。
 */

export const GET = withApiWrapper([withAdminApi], async (_user, request, _ctx) => {
  const locale = resolveRequestLocale(request);
  let raw: string | null;
  try {
    const r = await readPromptConfigFile();
    raw = r.raw;
  } catch {
    return jsonError(
      ErrorCode.INTERNAL_ERROR,
      tApiMessage(locale, "admin.readPromptConfigFailed"),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  const { merged, fileState } = mergePromptConfigFromFile(raw);

  return NextResponse.json(
    {
      items: mergedToApiItems(merged),
      fileState,
    },
    {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    },
  );
});

type PutBody = {
  items?: unknown;
};

export const PUT = withApiWrapper([withAdminApi], async (_user, request, _ctx) => {
  const locale = resolveRequestLocale(request);
  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidJson"),
      HttpStatus.BAD_REQUEST,
    );
  }

  const authKeys = getAuthoritativePromptKeys();
  const details: JsonErrorDetail[] = [];

  if (!body.items || !Array.isArray(body.items)) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.promptConfig.itemsRequired"),
      HttpStatus.BAD_REQUEST,
    );
  }

  const incoming = new Map<string, string>();
  for (let i = 0; i < body.items.length; i++) {
    const row = body.items[i];
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      details.push({
        field: `items[${i}]`,
        message: tApiMessage(locale, "validation.promptConfig.itemMustBeObject"),
      });
      continue;
    }
    const rec = row as Record<string, unknown>;
    if (typeof rec.key !== "string") {
      details.push({
        field: `items[${i}].key`,
        message: tApiMessage(locale, "validation.promptConfig.keyStringRequired"),
      });
      continue;
    }
    if (typeof rec.value !== "string") {
      details.push({
        field: `items[${i}].value`,
        message: tApiMessage(locale, "validation.promptConfig.valueStringRequired"),
      });
      continue;
    }
    if (Object.keys(rec).some((k) => k !== "key" && k !== "value")) {
      details.push({
        field: `items[${i}]`,
        message: tApiMessage(locale, "validation.promptConfig.onlyKeyValueAllowed"),
      });
      continue;
    }
    if (incoming.has(rec.key)) {
      details.push({
        field: `items[${i}].key`,
        message: tApiMessage(locale, "validation.promptConfig.duplicateKey"),
      });
      continue;
    }
    incoming.set(rec.key, rec.value);
  }

  if (details.length) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidParams"),
      HttpStatus.BAD_REQUEST,
      details,
    );
  }

  if (incoming.size !== authKeys.length) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.promptConfig.exactItemCount", {
        count: authKeys.length,
      }),
      HttpStatus.BAD_REQUEST,
    );
  }

  for (const k of authKeys) {
    if (!incoming.has(k)) {
      return jsonError(
        ErrorCode.VALIDATION_ERROR,
        tApiMessage(locale, "validation.promptConfig.missingKey", { key: k }),
        HttpStatus.BAD_REQUEST,
      );
    }
    const v = incoming.get(k)!;
    if (v.trim().length === 0) {
      const emptyMsg = tApiMessage(locale, "validation.promptConfig.valueRequired", { key: k });
      return jsonError(ErrorCode.VALIDATION_ERROR, emptyMsg, HttpStatus.BAD_REQUEST, [
        { field: k, message: tApiMessage(locale, "validation.promptConfig.valueEmpty") },
      ]);
    }
    const tmpl = validatePromptTemplate(v, DEFAULT_PROMPT_CONFIG[k].params ?? []);
    if (!tmpl.valid) {
      const tmplMsg = mapPromptTemplateError(locale, tmpl.code, tmpl.param);
      return jsonError(ErrorCode.VALIDATION_ERROR, tmplMsg, HttpStatus.BAD_REQUEST, [
        { field: k, message: tmplMsg },
      ]);
    }
  }

  for (const k of incoming.keys()) {
    if (!authKeys.includes(k as PromptConfigKey)) {
      return jsonError(
        ErrorCode.VALIDATION_ERROR,
        tApiMessage(locale, "validation.promptConfig.unknownKey", { key: k }),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  let raw: string | null;
  try {
    const r = await readPromptConfigFile();
    raw = r.raw;
  } catch {
    return jsonError(
      ErrorCode.INTERNAL_ERROR,
      tApiMessage(locale, "admin.readPromptConfigFailed"),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  const { merged: mergedBefore } = mergePromptConfigFromFile(raw);
  const toWrite: Record<string, { name: string; desc: string; value: string }> = {};
  for (const k of authKeys) {
    toWrite[k] = {
      name: mergedBefore[k].name,
      desc: mergedBefore[k].desc,
      value: incoming.get(k)!,
    };
  }

  const jsonString = `${JSON.stringify(toWrite, null, 2)}\n`;
  try {
    await writePromptConfigAtomic(jsonString);
  } catch {
    return jsonError(
      ErrorCode.INTERNAL_ERROR,
      tApiMessage(locale, "admin.saveFailedCheckPermissions"),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  let rawAfter: string | null;
  try {
    const r = await readPromptConfigFile();
    rawAfter = r.raw;
  } catch {
    return jsonError(
      ErrorCode.INTERNAL_ERROR,
      tApiMessage(locale, "admin.writeVerifyFailed"),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
  const { merged, fileState } = mergePromptConfigFromFile(rawAfter);

  return NextResponse.json(
    {
      items: mergedToApiItems(merged),
      fileState,
    },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});
