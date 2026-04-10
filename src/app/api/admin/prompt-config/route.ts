import { NextResponse } from "next/server";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { withAdminApi } from "@/server/auth/with-admin-api";
import {
  getAuthoritativePromptKeys,
  mergePromptConfigFromFile,
  mergedToApiItems,
} from "@/server/prompt-config/merge";
import {
  readPromptConfigFile,
  writePromptConfigAtomic,
} from "@/server/prompt-config/io";
import type { PromptConfigKey } from "@/common/types";

export const runtime = "nodejs";

/**
 * GET：合并后的提示词配置 + 文件级状态（坏 JSON 时 `invalid_json`，供前端 Alert）。
 * PUT：整表保存各 key 的 value，name/desc 取保存前合并结果，写回 `data/promptConfig.json`。
 */

export const GET = withAdminApi(async (_user, _request, _ctx) => {
  let raw: string | null;
  try {
    const r = await readPromptConfigFile();
    raw = r.raw;
  } catch {
    return jsonError(
      ErrorCode.INTERNAL_ERROR,
      "读取配置文件失败",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  const { merged, fileState } = mergePromptConfigFromFile(raw);
  const body: {
    items: ReturnType<typeof mergedToApiItems>;
    fileState: typeof fileState;
    fileHint?: string;
  } = {
    items: mergedToApiItems(merged),
    fileState,
  };
  if (fileState === "invalid_json") {
    body.fileHint =
      "promptConfig.json 无法解析为合法 JSON，已使用内置默认文案展示；保存后将覆盖为合法文件。";
  }

  return NextResponse.json(body, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
});

type PutBody = {
  items?: unknown;
};

export const PUT = withAdminApi(async (_user, request, _ctx) => {
  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return jsonError(ErrorCode.VALIDATION_ERROR, "请求体不是合法 JSON", HttpStatus.BAD_REQUEST);
  }

  const authKeys = getAuthoritativePromptKeys();
  const details: JsonErrorDetail[] = [];

  if (!body.items || !Array.isArray(body.items)) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "校验失败：items 须为非空数组",
      HttpStatus.BAD_REQUEST,
    );
  }

  const incoming = new Map<string, string>();
  for (let i = 0; i < body.items.length; i++) {
    const row = body.items[i];
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      details.push({ field: `items[${i}]`, message: "须为对象" });
      continue;
    }
    const rec = row as Record<string, unknown>;
    if (typeof rec.key !== "string") {
      details.push({ field: `items[${i}].key`, message: "须为字符串" });
      continue;
    }
    if (typeof rec.value !== "string") {
      details.push({ field: `items[${i}].value`, message: "须为字符串" });
      continue;
    }
    if (Object.keys(rec).some((k) => k !== "key" && k !== "value")) {
      details.push({ field: `items[${i}]`, message: "仅允许 key、value 字段" });
      continue;
    }
    if (incoming.has(rec.key)) {
      details.push({ field: `items[${i}].key`, message: "key 重复" });
      continue;
    }
    incoming.set(rec.key, rec.value);
  }

  if (details.length) {
    return jsonError(ErrorCode.VALIDATION_ERROR, "校验失败", HttpStatus.BAD_REQUEST, details);
  }

  if (incoming.size !== authKeys.length) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      `须恰好包含 ${authKeys.length} 个配置项`,
      HttpStatus.BAD_REQUEST,
    );
  }

  for (const k of authKeys) {
    if (!incoming.has(k)) {
      return jsonError(
        ErrorCode.VALIDATION_ERROR,
        `缺少配置项：${k}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const v = incoming.get(k)!;
    if (v.trim().length === 0) {
      return jsonError(
        ErrorCode.VALIDATION_ERROR,
        `${k} 的 value 不能为空`,
        HttpStatus.BAD_REQUEST,
        [{ field: k, message: "value 不能为空" }],
      );
    }
  }

  for (const k of incoming.keys()) {
    if (!authKeys.includes(k as PromptConfigKey)) {
      return jsonError(
        ErrorCode.VALIDATION_ERROR,
        `未知配置项：${k}`,
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
      "读取配置文件失败",
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
      "保存失败，请稍后重试或检查磁盘权限",
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
      "写入后读取验证失败",
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
