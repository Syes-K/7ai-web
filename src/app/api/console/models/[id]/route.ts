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

export const runtime = "nodejs";

type PatchBody = {
  provider?: unknown;
  modelName?: unknown;
  apiKey?: unknown;
  tags?: unknown;
};

/**
 * GET：单条详情（仅掩码密钥）；含本人私有与全站公有。
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  const { id } = await context.params;
  if (!id || typeof id !== "string") {
    return jsonError(ErrorCode.VALIDATION_ERROR, "id 无效", HttpStatus.BAD_REQUEST);
  }

  const ds = await getDataSource();
  const row = await findModelConfigUsableByUser(ds, id, user.id);
  if (!row) {
    return jsonError(
      ErrorCode.MODEL_CONFIG_NOT_FOUND,
      "模型配置不存在",
      HttpStatus.NOT_FOUND,
    );
  }

  return NextResponse.json(userModelConfigToListItem(row), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/**
 * PATCH：部分更新；`apiKey` 省略或 trim 后为空表示不修改密钥。
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  const { id } = await context.params;
  if (!id || typeof id !== "string") {
    return jsonError(ErrorCode.VALIDATION_ERROR, "id 无效", HttpStatus.BAD_REQUEST);
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return jsonError(ErrorCode.VALIDATION_ERROR, "请求体须为 JSON", HttpStatus.BAD_REQUEST);
  }

  const ds = await getDataSource();
  const repo = ds.getRepository(UserModelConfig);
  const row = await repo.findOne({ where: { id, userId: user.id } });
  if (!row) {
    return jsonError(
      ErrorCode.MODEL_CONFIG_NOT_FOUND,
      "模型配置不存在",
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
        message: "须为 ALYUN、GLM、DEEPSEEK、KIMI、SILICONFLOW 之一",
      });
    } else {
      nextProvider = p;
    }
  }

  if (body.modelName !== undefined) {
    const name =
      typeof body.modelName === "string" ? body.modelName.trim() : "";
    if (!name) {
      details.push({ field: "modelName", message: "不能为空" });
    } else if (name.length > CONSOLE_MODEL_NAME_MAX_LENGTH) {
      details.push({
        field: "modelName",
        message: `长度不能超过 ${CONSOLE_MODEL_NAME_MAX_LENGTH}`,
      });
    } else {
      nextModelName = name;
    }
  }

  if (body.apiKey !== undefined) {
    if (typeof body.apiKey !== "string") {
      details.push({ field: "apiKey", message: "须为字符串" });
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
            "服务端配置异常，无法保存密钥",
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      }
    }
  }

  if ("tags" in body) {
    const parsed = parseModelConfigTags(body.tags);
    if (!parsed.ok) {
      details.push({ field: "tags", message: parsed.message });
    } else {
      nextTags = parsed.tags;
    }
  }

  if (details.length > 0) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "请求参数不合法",
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
}

/**
 * DELETE：物理删除当前用户名下配置。
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  const { id } = await context.params;
  if (!id || typeof id !== "string") {
    return jsonError(ErrorCode.VALIDATION_ERROR, "id 无效", HttpStatus.BAD_REQUEST);
  }

  const ds = await getDataSource();
  const cfgRepo = ds.getRepository(UserModelConfig);
  const row = await cfgRepo.findOne({ where: { id, userId: user.id } });
  if (!row) {
    return jsonError(
      ErrorCode.MODEL_CONFIG_NOT_FOUND,
      "模型配置不存在",
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
}
