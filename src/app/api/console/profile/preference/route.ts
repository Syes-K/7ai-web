import { NextResponse } from "next/server";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { getConsoleProfileResponse } from "@/server/console-profile/get-console-profile";
import { getDataSource } from "@/server/db/data-source";
import { User } from "@/server/db/entities/User";
import { findModelConfigUsableByUser } from "@/server/model-config/find-usable-config";
import { withApiWrapper } from "@/server/http/with-api-wrapper";

export const runtime = "nodejs";

type PatchBody = {
  preferredModelConfigId?: unknown;
  preferredVectorModelConfigId?: unknown;
  preferredKnowledgeTopK?: unknown;
  preferredKnowledgeThreshold?: unknown;
  preferredKnowledgeChunkSize?: unknown;
  preferredKnowledgeChunkOverlap?: unknown;
};

async function applyModelPrefPointer(
  ds: Awaited<ReturnType<typeof getDataSource>>,
  userId: string,
  raw: unknown,
  field: "preferredModelConfigId" | "preferredVectorModelConfigId",
  row: User,
): Promise<NextResponse | null> {
  if (raw === null) {
    row[field] = null;
    return null;
  }
  if (typeof raw !== "string" || raw.trim() === "") {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      `${field} 须为非空字符串或 null`,
      HttpStatus.BAD_REQUEST,
    );
  }
  const id = raw.trim();
  const cfg = await findModelConfigUsableByUser(ds, id, userId);
  if (!cfg) {
    return jsonError(
      ErrorCode.MODEL_CONFIG_NOT_FOUND,
      "模型配置不存在",
      HttpStatus.NOT_FOUND,
    );
  }
  row[field] = id;
  return null;
}

/**
 * PATCH：设置对话模型 / 向量模型默认偏好指针（可清空）；可只更新其中一项。
 */
export const PATCH = withApiWrapper(async (request: Request) => {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return jsonError(ErrorCode.VALIDATION_ERROR, "请求体须为 JSON", HttpStatus.BAD_REQUEST);
  }

  const hasChat = Object.prototype.hasOwnProperty.call(body, "preferredModelConfigId");
  const hasVec = Object.prototype.hasOwnProperty.call(body, "preferredVectorModelConfigId");
  const hasTopK = Object.prototype.hasOwnProperty.call(body, "preferredKnowledgeTopK");
  const hasThreshold = Object.prototype.hasOwnProperty.call(body, "preferredKnowledgeThreshold");
  const hasChunkSize = Object.prototype.hasOwnProperty.call(body, "preferredKnowledgeChunkSize");
  const hasChunkOverlap = Object.prototype.hasOwnProperty.call(body, "preferredKnowledgeChunkOverlap");
  if (!hasChat && !hasVec && !hasTopK && !hasThreshold && !hasChunkSize && !hasChunkOverlap) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "至少需要一个偏好字段",
      HttpStatus.BAD_REQUEST,
    );
  }

  const ds = await getDataSource();
  const userRepo = ds.getRepository(User);
  const row = await userRepo.findOne({ where: { id: user.id } });
  if (!row) {
    return jsonError(ErrorCode.INTERNAL_ERROR, "用户不存在", HttpStatus.INTERNAL_SERVER_ERROR);
  }

  if (hasChat) {
    const err = await applyModelPrefPointer(
      ds,
      user.id,
      body.preferredModelConfigId,
      "preferredModelConfigId",
      row,
    );
    if (err) return err;
  }

  if (hasVec) {
    const err = await applyModelPrefPointer(
      ds,
      user.id,
      body.preferredVectorModelConfigId,
      "preferredVectorModelConfigId",
      row,
    );
    if (err) return err;
  }

  if (hasTopK) {
    if (body.preferredKnowledgeTopK === null) {
      row.preferredKnowledgeTopK = null;
    } else {
      const n = typeof body.preferredKnowledgeTopK === "number"
        ? body.preferredKnowledgeTopK
        : Number(body.preferredKnowledgeTopK);
      const v = Number.isFinite(n) ? Math.floor(n) : NaN;
      if (!Number.isFinite(v) || v < 1 || v > 20) {
        return jsonError(
          ErrorCode.VALIDATION_ERROR,
          "preferredKnowledgeTopK 须为 1-20 的整数或 null",
          HttpStatus.BAD_REQUEST,
        );
      }
      row.preferredKnowledgeTopK = v;
    }
  }

  if (hasThreshold) {
    if (body.preferredKnowledgeThreshold === null) {
      row.preferredKnowledgeThreshold = null;
    } else {
      const n = typeof body.preferredKnowledgeThreshold === "number"
        ? body.preferredKnowledgeThreshold
        : Number(body.preferredKnowledgeThreshold);
      if (!Number.isFinite(n) || n < 0 || n > 1) {
        return jsonError(
          ErrorCode.VALIDATION_ERROR,
          "preferredKnowledgeThreshold 须为 0-1 的数字或 null",
          HttpStatus.BAD_REQUEST,
        );
      }
      row.preferredKnowledgeThreshold = n;
    }
  }

  if (hasChunkSize) {
    if (body.preferredKnowledgeChunkSize === null) {
      row.preferredKnowledgeChunkSize = null;
    } else {
      const n = typeof body.preferredKnowledgeChunkSize === "number"
        ? body.preferredKnowledgeChunkSize
        : Number(body.preferredKnowledgeChunkSize);
      const v = Number.isFinite(n) ? Math.floor(n) : NaN;
      if (!Number.isFinite(v) || v < 200 || v > 4000) {
        return jsonError(
          ErrorCode.VALIDATION_ERROR,
          "preferredKnowledgeChunkSize 须为 200-4000 的整数或 null",
          HttpStatus.BAD_REQUEST,
        );
      }
      row.preferredKnowledgeChunkSize = v;
    }
  }

  if (hasChunkOverlap) {
    if (body.preferredKnowledgeChunkOverlap === null) {
      row.preferredKnowledgeChunkOverlap = null;
    } else {
      const n = typeof body.preferredKnowledgeChunkOverlap === "number"
        ? body.preferredKnowledgeChunkOverlap
        : Number(body.preferredKnowledgeChunkOverlap);
      const v = Number.isFinite(n) ? Math.floor(n) : NaN;
      if (!Number.isFinite(v) || v < 0 || v > 1000) {
        return jsonError(
          ErrorCode.VALIDATION_ERROR,
          "preferredKnowledgeChunkOverlap 须为 0-1000 的整数或 null",
          HttpStatus.BAD_REQUEST,
        );
      }
      row.preferredKnowledgeChunkOverlap = v;
    }
  }

  await userRepo.save(row);

  const payload = await getConsoleProfileResponse(user.id);
  return NextResponse.json(
    { preference: payload.preference },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});
