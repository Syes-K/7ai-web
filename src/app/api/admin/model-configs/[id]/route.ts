import { NextResponse } from "next/server";
import { CONSOLE_MODEL_NAME_MAX_LENGTH, type ModelConfigTag } from "@/common/constants";
import { ErrorCode, HttpStatus, ModelConfigVisibility } from "@/common/enums";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { withAdminApi } from "@/server/auth/with-admin-api";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { getDataSource } from "@/server/db/data-source";
import { User } from "@/server/db/entities/User";
import { UserModelConfig } from "@/server/db/entities/UserModelConfig";
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

async function findPublicById(id: string): Promise<UserModelConfig | null> {
  const ds = await getDataSource();
  return ds.getRepository(UserModelConfig).findOne({
    where: { id, visibility: ModelConfigVisibility.Public },
  });
}

/**
 * GET：公有模型详情。
 */
export const GET = withApiWrapper([withAdminApi], async (_admin, _request, ctx) => {
  const { id } = await ctx.params;
  if (!id || typeof id !== "string") {
    return jsonError(ErrorCode.VALIDATION_ERROR, "id 无效", HttpStatus.BAD_REQUEST);
  }

  const row = await findPublicById(id);
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
});

/**
 * PATCH：更新公有模型。
 */
export const PATCH = withApiWrapper([withAdminApi], async (_admin, request, ctx) => {
  const { id } = await ctx.params;
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
  const row = await findPublicById(id);
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
    const name = typeof body.modelName === "string" ? body.modelName.trim() : "";
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
              module: "admin.model-configs",
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
});

/**
 * DELETE：删除公有模型，并清空全站用户对该 id 的偏好指针。
 */
export const DELETE = withApiWrapper([withAdminApi], async (_admin, _request, ctx) => {
  const { id } = await ctx.params;
  if (!id || typeof id !== "string") {
    return jsonError(ErrorCode.VALIDATION_ERROR, "id 无效", HttpStatus.BAD_REQUEST);
  }

  const ds = await getDataSource();
  const row = await findPublicById(id);
  if (!row) {
    return jsonError(
      ErrorCode.MODEL_CONFIG_NOT_FOUND,
      "模型配置不存在",
      HttpStatus.NOT_FOUND,
    );
  }

  await ds.transaction(async (em) => {
    await em.getRepository(UserModelConfig).delete({
      id,
      visibility: ModelConfigVisibility.Public,
    });
    await em
      .createQueryBuilder()
      .update(User)
      .set({ preferredModelConfigId: null })
      .where("preferredModelConfigId = :cid", { cid: id })
      .execute();
    await em
      .createQueryBuilder()
      .update(User)
      .set({ preferredVectorModelConfigId: null })
      .where("preferredVectorModelConfigId = :cid", { cid: id })
      .execute();
  });

  return new NextResponse(null, { status: HttpStatus.NO_CONTENT });
});
