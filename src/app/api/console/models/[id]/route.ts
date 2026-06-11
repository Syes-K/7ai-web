import { NextResponse } from "next/server";
import { CONSOLE_MODEL_NAME_MAX_LENGTH, type ModelConfigTag } from "@/common/constants";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { getDataSource } from "@/server/db/data-source";
import { User } from "@/server/db/entities/User";
import { UserModelConfig } from "@/server/db/entities/UserModelConfig";
import { findModelConfigUsableByUser } from "@/server/model-config/find-usable-config";
import { encryptApiKey } from "@/server/model-config/api-key-crypto";
import { parseModelProvider } from "@/server/model-config/parse-provider";
import {
  normalizeStoredModelTags,
  parseModelConfigTags,
} from "@/server/model-config/parse-model-tags";
import { userModelConfigToListItem } from "@/server/model-config/user-model-config-dto";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";
import { withApiWrapper } from "@/server/http/with-api-wrapper";

export const runtime = "nodejs";

type PatchBody = {
  provider?: unknown;
  modelName?: unknown;
  apiKey?: unknown;
  tags?: unknown;
};

/**
 * GET：单条详情（仅掩码密钥）；含本人私有与全站公有；错误 message 随 locale 双语。
 */
export const GET = withApiWrapper(async (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => {
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

  const { id } = await context.params;
  if (!id || typeof id !== "string") {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidId"),
      HttpStatus.BAD_REQUEST,
    );
  }

  const ds = await getDataSource();
  const row = await findModelConfigUsableByUser(ds, id, user.id);
  if (!row) {
    return jsonError(
      ErrorCode.MODEL_CONFIG_NOT_FOUND,
      tApiMessage(locale, "modelConfigNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }

  return NextResponse.json(userModelConfigToListItem(row), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
});

/**
 * PATCH：部分更新；`apiKey` 省略或 trim 后为空表示不修改密钥。
 */
export const PATCH = withApiWrapper(async (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => {
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

  const { id } = await context.params;
  if (!id || typeof id !== "string") {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidId"),
      HttpStatus.BAD_REQUEST,
    );
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidJson"),
      HttpStatus.BAD_REQUEST,
    );
  }

  const ds = await getDataSource();
  const repo = ds.getRepository(UserModelConfig);
  const row = await repo.findOne({ where: { id, userId: user.id } });
  if (!row) {
    return jsonError(
      ErrorCode.MODEL_CONFIG_NOT_FOUND,
      tApiMessage(locale, "modelConfigNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }

  const details: JsonErrorDetail[] = [];
  let nextProvider = row.provider;
  let nextModelName = row.modelName;
  let nextCipher = row.apiKeyCipher;
  let nextTags: ModelConfigTag[] = normalizeStoredModelTags(row.tags);

  if (body.provider !== undefined) {
    const p = parseModelProvider(body.provider);
    if (!p) {
      details.push({
        field: "provider",
        message: tApiMessage(locale, "validation.invalidModelProvider"),
      });
    } else {
      nextProvider = p;
    }
  }

  if (body.modelName !== undefined) {
    const name =
      typeof body.modelName === "string" ? body.modelName.trim() : "";
    if (!name) {
      details.push({ field: "modelName", message: tApiMessage(locale, "validation.required") });
    } else if (name.length > CONSOLE_MODEL_NAME_MAX_LENGTH) {
      details.push({
        field: "modelName",
        message: tApiMessage(locale, "validation.maxLength", {
          max: CONSOLE_MODEL_NAME_MAX_LENGTH,
        }),
      });
    } else {
      nextModelName = name;
    }
  }

  if (body.apiKey !== undefined) {
    if (typeof body.apiKey !== "string") {
      details.push({
        field: "apiKey",
        message: tApiMessage(locale, "validation.apiKeyStringRequired"),
      });
    } else {
      const trimmed = body.apiKey.trim();
      if (trimmed.length > 0) {
        try {
          nextCipher = encryptApiKey(trimmed);
        } catch (e) {
          console.error(
            JSON.stringify({
              module: "console.models",
              action: "patch_encrypt_failed",
              message: e instanceof Error ? e.message : String(e),
            }),
          );
          return jsonError(
            ErrorCode.INTERNAL_ERROR,
            tApiMessage(locale, "serverConfigCannotSaveSecrets"),
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      }
    }
  }

  if ("tags" in body) {
    const parsed = parseModelConfigTags(body.tags, locale);
    if (!parsed.ok) {
      details.push({ field: "tags", message: parsed.message });
    } else {
      nextTags = parsed.tags;
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

  row.provider = nextProvider;
  row.modelName = nextModelName;
  row.apiKeyCipher = nextCipher;
  row.tags = nextTags;
  await repo.save(row);

  return NextResponse.json(
    { item: userModelConfigToListItem(row) },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

/**
 * DELETE：物理删除当前用户名下配置。
 */
export const DELETE = withApiWrapper(async (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => {
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

  const { id } = await context.params;
  if (!id || typeof id !== "string") {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidId"),
      HttpStatus.BAD_REQUEST,
    );
  }

  const ds = await getDataSource();
  const cfgRepo = ds.getRepository(UserModelConfig);
  const row = await cfgRepo.findOne({ where: { id, userId: user.id } });
  if (!row) {
    return jsonError(
      ErrorCode.MODEL_CONFIG_NOT_FOUND,
      tApiMessage(locale, "modelConfigNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }

  await ds.transaction(async (em) => {
    await em.remove(row);
    const uRepo = em.getRepository(User);
    await uRepo.update(
      { id: user.id, preferredModelConfigId: id },
      { preferredModelConfigId: null },
    );
    await uRepo.update(
      { id: user.id, preferredVectorModelConfigId: id },
      { preferredVectorModelConfigId: null },
    );
  });

  return new NextResponse(null, { status: HttpStatus.NO_CONTENT });
});
