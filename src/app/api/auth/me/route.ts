import { NextResponse } from "next/server";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { toPublicUser } from "@/server/auth/user-dto";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";

export const runtime = "nodejs";

/**
 * GET /api/auth/me — 当前登录用户
 */
export async function GET() {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;
  return NextResponse.json(
    { user: toPublicUser(user) },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
}
