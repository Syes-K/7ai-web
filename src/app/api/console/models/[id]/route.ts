import { NextResponse } from "next/server";
import { CONSOLE_MODEL_NAME_MAX_LENGTH } from "@/common/constants";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { getCurrentUser } from "@/server/auth/session-user";
import { getDataSource } from "@/server/db/data-source";
import { UserModelConfig } from "@/server/db/entities/UserModelConfig";
import { encryptApiKey } from "@/server/model-config/api-key-crypto";
import { parseModelProvider } from "@/server/model-config/parse-provider";
import { userModelConfigToListItem } from "@/server/model-config/user-model-config-dto";

export const runtime = "nodejs";

type PatchBody = {
  provider?: unknown;
  modelName?: unknown;
  apiKey?: unknown;
};

async function findOwned(userId: string, id: string): Promise<UserModelConfig | null> {
  const ds = await getDataSource();
  return ds.getRepository(UserModelConfig).findOne({ where: { id, userId } });
}

/**
 * GET：单条详情（仅掩码密钥）。
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }

  const { id } = await context.params;
  if (!id || typeof id !== "string") {
    return jsonError(ErrorCode.VALIDATION_ERROR, "id 无效", HttpStatus.BAD_REQUEST);
  }

  const row = await findOwned(user.id, id);
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
  const user = await getCurrentUser();
  if (!user) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }

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

  if (body.provider !== undefined) {
    const p = parseModelProvider(body.provider);
    if (!p) {
      details.push({ field: "provider", message: "须为 ALYUN、GLM、DEEPSEEK 之一" });
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
  const user = await getCurrentUser();
  if (!user) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }

  const { id } = await context.params;
  if (!id || typeof id !== "string") {
    return jsonError(ErrorCode.VALIDATION_ERROR, "id 无效", HttpStatus.BAD_REQUEST);
  }

  const ds = await getDataSource();
  const repo = ds.getRepository(UserModelConfig);
  const res = await repo.delete({ id, userId: user.id });
  if ((res.affected ?? 0) === 0) {
    return jsonError(
      ErrorCode.MODEL_CONFIG_NOT_FOUND,
      "模型配置不存在",
      HttpStatus.NOT_FOUND,
    );
  }

  return new NextResponse(null, { status: HttpStatus.NO_CONTENT });
}
