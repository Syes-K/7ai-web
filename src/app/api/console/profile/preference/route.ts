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
  if (!hasChat && !hasVec) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "至少需要 preferredModelConfigId 或 preferredVectorModelConfigId 之一",
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

  await userRepo.save(row);

  const payload = await getConsoleProfileResponse(user.id);
  return NextResponse.json(
    { preference: payload.preference },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});
