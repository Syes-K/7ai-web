import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";
import { withAdminApi } from "@/server/auth/with-admin-api";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { getDataSource } from "@/server/db/data-source";
import { User } from "@/server/db/entities/User";
import { hashPassword } from "@/server/auth/password";
import { allowRate, clientIp } from "@/common/utils";
import { userToAdminRow } from "@/server/user-admin/map-to-dto";

export const runtime = "nodejs";

/** 生成一次性临时密码（长度 ≥ 12，可打印字符）。 */
function generateTemporaryPassword(): string {
  return randomBytes(12).toString("hex");
}

/**
 * POST：重置目标用户密码（方案 A：仅本响应返回明文临时密码）。
 */
export const POST = withApiWrapper([withAdminApi], async (admin, request, ctx) => {
  const ip = clientIp(request);
  if (!allowRate(`admin-reset-password:${ip}`, 30, 60_000)) {
    return jsonError(
      ErrorCode.RATE_LIMITED,
      "请求过于频繁，请稍后再试",
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  const raw = await request.text();
  if (raw.trim()) {
    try {
      JSON.parse(raw);
    } catch {
      return jsonError(ErrorCode.VALIDATION_ERROR, "请求体须为 JSON", HttpStatus.BAD_REQUEST);
    }
  }

  const { id } = await ctx.params;
  const userId = Array.isArray(id) ? id[0] : id;
  if (!userId || typeof userId !== "string") {
    return jsonError(ErrorCode.VALIDATION_ERROR, "用户 id 无效", HttpStatus.BAD_REQUEST);
  }

  if (admin.id === userId) {
    return jsonError(
      ErrorCode.FORBIDDEN,
      "不能通过管理端重置当前登录账号的密码，请使用忘记密码等用户自助流程",
      HttpStatus.FORBIDDEN,
    );
  }

  const ds = await getDataSource();
  const repo = ds.getRepository(User);
  const target = await repo.findOne({ where: { id: userId } });
  if (!target) {
    return jsonError(ErrorCode.USER_NOT_FOUND, "用户不存在", HttpStatus.NOT_FOUND);
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  target.passwordHash = passwordHash;
  await repo.save(target);

  const operatorEmail = admin.email.trim().toLowerCase();
  console.info(
    JSON.stringify({
      module: "admin.users",
      action: "reset_password",
      operator: operatorEmail,
      targetUserId: userId,
    }),
  );

  const row = userToAdminRow(target);
  return NextResponse.json(
    {
      temporaryPassword,
      user: {
        id: row.id,
        email: row.email,
        nickName: row.nickName,
        status: row.status,
        updatedAt: row.updatedAt,
      },
    },
    {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    },
  );
});
