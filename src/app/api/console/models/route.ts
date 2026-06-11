import { NextResponse } from "next/server";
import {
  CONSOLE_MODEL_LIST_DEFAULT_PAGE,
  CONSOLE_MODEL_LIST_DEFAULT_PAGE_SIZE,
  CONSOLE_MODEL_LIST_MAX_PAGE_SIZE,
  CONSOLE_MODEL_NAME_MAX_LENGTH,
  type ModelConfigTag,
} from "@/common/constants";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { ModelConfigVisibility } from "@/common/enums";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { getDataSource } from "@/server/db/data-source";
import { UserModelConfig } from "@/server/db/entities/UserModelConfig";
import { encryptApiKey } from "@/server/model-config/api-key-crypto";
import { parseModelProvider } from "@/server/model-config/parse-provider";
import { createUserModelConfigRow } from "@/server/model-config/create-model-config";
import { parseModelConfigTags } from "@/server/model-config/parse-model-tags";
import { userModelConfigToListItem } from "@/server/model-config/user-model-config-dto";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";
import { withApiWrapper } from "@/server/http/with-api-wrapper";

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
 * GET：分页列出当前用户的模型配置；错误 message 随 locale 双语。
 */
export const GET = withApiWrapper(async (request: Request) => {
  const locale = resolveRequestLocale(request);
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(
      ErrorCode.UNAUTHORIZED,
      tApiMessage(locale, "unauthorized"),
      HttpStatus.UNAUTHORIZED,
    );
  }
  const { user } = reqCtx;

  const url = new URL(request.url);
  const page = parsePage(
    url.searchParams.get("page"),
    CONSOLE_MODEL_LIST_DEFAULT_PAGE,
  );
  const pageSize = parsePageSize(url.searchParams.get("pageSize"));
  if (page === null || pageSize === null) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.paginationParamsInvalid", {
        maxPageSize: CONSOLE_MODEL_LIST_MAX_PAGE_SIZE,
      }),
      HttpStatus.BAD_REQUEST,
    );
  }

  const ds = await getDataSource();
  const repo = ds.getRepository(UserModelConfig);
  const qb = repo
    .createQueryBuilder("c")
    .where("(c.visibility = :pub OR c.userId = :uid)", {
      pub: ModelConfigVisibility.Public,
      uid: user.id,
    });
  const total = await qb.clone().getCount();
  const rows = await qb
    .orderBy("c.updatedAt", "DESC")
    .addOrderBy("c.id", "DESC")
    .skip((page - 1) * pageSize)
    .take(pageSize)
    .getMany();

  const items = rows.map((row) => userModelConfigToListItem(row));

  return NextResponse.json(
    { items, total, page, pageSize },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

type PostBody = {
  provider?: unknown;
  modelName?: unknown;
  apiKey?: unknown;
  tags?: unknown;
};

/**
 * POST：新建模型配置；错误 message 随 locale 双语。
 */
export const POST = withApiWrapper(async (request: Request) => {
  const locale = resolveRequestLocale(request);
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(
      ErrorCode.UNAUTHORIZED,
      tApiMessage(locale, "unauthorized"),
      HttpStatus.UNAUTHORIZED,
    );
  }
  const { user } = reqCtx;

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidJson"),
      HttpStatus.BAD_REQUEST,
    );
  }

  const details: JsonErrorDetail[] = [];
  const provider = parseModelProvider(body.provider);
  if (!provider) {
    details.push({
      field: "provider",
      message: tApiMessage(locale, "validation.invalidModelProvider"),
    });
  }

  const modelNameRaw = typeof body.modelName === "string" ? body.modelName.trim() : "";
  if (!modelNameRaw) {
    details.push({ field: "modelName", message: tApiMessage(locale, "validation.required") });
  } else if (modelNameRaw.length > CONSOLE_MODEL_NAME_MAX_LENGTH) {
    details.push({
      field: "modelName",
      message: tApiMessage(locale, "validation.maxLength", {
        max: CONSOLE_MODEL_NAME_MAX_LENGTH,
      }),
    });
  }

  const apiKeyRaw = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  if (!apiKeyRaw) {
    details.push({ field: "apiKey", message: tApiMessage(locale, "validation.apiKeyRequired") });
  }

  let tagsToSave: ModelConfigTag[] = [];
  if (body.tags !== undefined) {
    const parsed = parseModelConfigTags(body.tags, locale);
    if (!parsed.ok) {
      details.push({ field: "tags", message: parsed.message });
    } else {
      tagsToSave = parsed.tags;
    }
  }

  if (details.length > 0) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidParams"),
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
      tApiMessage(locale, "serverConfigCannotSaveSecrets"),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  const row = createUserModelConfigRow(
    user.id,
    provider!,
    modelNameRaw,
    cipher,
    ModelConfigVisibility.Private,
    tagsToSave,
  );
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
      tApiMessage(locale, "saveFailedRetry"),
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
});
