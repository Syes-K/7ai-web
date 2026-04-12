import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  CONSOLE_MODEL_LIST_DEFAULT_PAGE,
  CONSOLE_MODEL_LIST_DEFAULT_PAGE_SIZE,
  CONSOLE_MODEL_LIST_MAX_PAGE_SIZE,
  CONSOLE_MODEL_NAME_MAX_LENGTH,
} from "@/common/constants";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { getCurrentUser } from "@/server/auth/session-user";
import { getDataSource } from "@/server/db/data-source";
import { UserModelConfig } from "@/server/db/entities/UserModelConfig";
import { encryptApiKey } from "@/server/model-config/api-key-crypto";
import { parseModelProvider } from "@/server/model-config/parse-provider";
import { userModelConfigToListItem } from "@/server/model-config/user-model-config-dto";

export const runtime = "nodejs";

function parsePage(s: string | null, fallback: number): number | null {
  if (s === null || s === "") {
    return fallback;
  }
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n) || n < 1) {
    return null;
  }
  return n;
}

function parsePageSize(s: string | null): number | null {
  if (s === null || s === "") {
    return CONSOLE_MODEL_LIST_DEFAULT_PAGE_SIZE;
  }
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n) || n < 1 || n > CONSOLE_MODEL_LIST_MAX_PAGE_SIZE) {
    return null;
  }
  return n;
}

/**
 * GET：分页列出当前用户的模型配置。
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }

  const url = new URL(request.url);
  const page = parsePage(
    url.searchParams.get("page"),
    CONSOLE_MODEL_LIST_DEFAULT_PAGE,
  );
  const pageSize = parsePageSize(url.searchParams.get("pageSize"));
  if (page === null || pageSize === null) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      `分页参数非法：page 须为 ≥1 的整数，pageSize 须为 1–${CONSOLE_MODEL_LIST_MAX_PAGE_SIZE} 的整数`,
      HttpStatus.BAD_REQUEST,
    );
  }

  const ds = await getDataSource();
  const repo = ds.getRepository(UserModelConfig);
  const total = await repo.count({ where: { userId: user.id } });
  const rows = await repo.find({
    where: { userId: user.id },
    order: { updatedAt: "DESC", id: "DESC" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const items = rows.map((row) => userModelConfigToListItem(row));

  return NextResponse.json(
    { items, total, page, pageSize },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
}

type PostBody = {
  provider?: unknown;
  modelName?: unknown;
  apiKey?: unknown;
};

/**
 * POST：新建模型配置。
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return jsonError(ErrorCode.VALIDATION_ERROR, "请求体须为 JSON", HttpStatus.BAD_REQUEST);
  }

  const details: JsonErrorDetail[] = [];
  const provider = parseModelProvider(body.provider);
  if (!provider) {
    details.push({ field: "provider", message: "须为 ALYUN、GLM、DEEPSEEK 之一" });
  }

  const modelNameRaw = typeof body.modelName === "string" ? body.modelName.trim() : "";
  if (!modelNameRaw) {
    details.push({ field: "modelName", message: "不能为空" });
  } else if (modelNameRaw.length > CONSOLE_MODEL_NAME_MAX_LENGTH) {
    details.push({
      field: "modelName",
      message: `长度不能超过 ${CONSOLE_MODEL_NAME_MAX_LENGTH}`,
    });
  }

  const apiKeyRaw = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  if (!apiKeyRaw) {
    details.push({ field: "apiKey", message: "不能为空" });
  }

  if (details.length > 0) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "请求参数不合法",
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    );
  }

  let cipher: string;
  try {
    cipher = encryptApiKey(apiKeyRaw);
  } catch (e) {
    console.error(
      JSON.stringify({
        module: "console.models",
        action: "post_encrypt_failed",
        message: e instanceof Error ? e.message : String(e),
      }),
    );
    return jsonError(
      ErrorCode.INTERNAL_ERROR,
      "服务端配置异常，无法保存密钥",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  const row = repoNewRow(user.id, provider!, modelNameRaw, cipher);
  try {
    const ds = await getDataSource();
    await ds.getRepository(UserModelConfig).save(row);
  } catch (e) {
    console.error(
      JSON.stringify({
        module: "console.models",
        action: "post_save_failed",
        message: e instanceof Error ? e.message : String(e),
      }),
    );
    return jsonError(
      ErrorCode.INTERNAL_ERROR,
      "保存失败，请稍后重试",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  return NextResponse.json(
    { item: userModelConfigToListItem(row) },
    {
      status: HttpStatus.CREATED,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    },
  );
}

function repoNewRow(
  userId: string,
  provider: string,
  modelName: string,
  apiKeyCipher: string,
): UserModelConfig {
  const row = new UserModelConfig();
  row.id = uuidv4();
  row.userId = userId;
  row.provider = provider;
  row.modelName = modelName;
  row.apiKeyCipher = apiKeyCipher;
  return row;
}
