import { NextResponse } from "next/server";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { getConsoleProfileResponse } from "@/server/console-profile/get-console-profile";

export const runtime = "nodejs";

/**
 * GET：聚合个人信息与默认模型偏好（供 /console/profile）。
 */
export async function GET() {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  try {
    const payload = await getConsoleProfileResponse(user.id);
    return NextResponse.json(payload, {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch {
    return jsonError(ErrorCode.INTERNAL_ERROR, "加载失败", HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
