import { NextResponse } from "next/server";
import { ErrorCode, HttpStatus, UserStatus } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";
import { withAdminApi } from "@/server/auth/with-admin-api";
import { getDataSource } from "@/server/db/data-source";
import { User } from "@/server/db/entities/User";
import { userToAdminRow } from "@/server/user-admin/map-to-dto";

export const runtime = "nodejs";

const ALLOWED_STATUS = new Set<string>([
  UserStatus.Active,
  UserStatus.Disabled,
]);

type PatchBody = {
  status?: unknown;
};

/**
 * PATCH：变更用户 status（启用/停用）。
 */
export const PATCH = withAdminApi(async (admin, request, ctx) => {
  const { id } = await ctx.params;
  const userId = Array.isArray(id) ? id[0] : id;
  if (!userId || typeof userId !== "string") {
    return jsonError(ErrorCode.VALIDATION_ERROR, "用户 id 无效", HttpStatus.BAD_REQUEST);
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return jsonError(ErrorCode.VALIDATION_ERROR, "请求体须为 JSON", HttpStatus.BAD_REQUEST);
  }

  const status = body.status;
  if (typeof status !== "string" || !ALLOWED_STATUS.has(status)) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      `status 须为 ${UserStatus.Active} 或 ${UserStatus.Disabled}`,
      HttpStatus.BAD_REQUEST,
    );
  }

  if (admin.id === userId) {
    return jsonError(
      ErrorCode.FORBIDDEN,
      "不能对自己执行停用等账号状态变更，请使用其他管理员账号或用户自助流程",
      HttpStatus.FORBIDDEN,
    );
  }

  const ds = await getDataSource();
  const repo = ds.getRepository(User);
  const target = await repo.findOne({ where: { id: userId } });
  if (!target) {
    return jsonError(ErrorCode.USER_NOT_FOUND, "用户不存在", HttpStatus.NOT_FOUND);
  }

  const operatorEmail = admin.email.trim().toLowerCase();
  target.status = status;
  await repo.save(target);

  console.info(
    JSON.stringify({
      module: "admin.users",
      action: "patch_status",
      operator: operatorEmail,
      targetUserId: userId,
      newStatus: status,
    }),
  );

  return NextResponse.json(userToAdminRow(target), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
});
