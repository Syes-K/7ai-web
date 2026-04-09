import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session-user";
import { toPublicUser } from "@/server/auth/user-dto";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";

export const runtime = "nodejs";

/**
 * GET /api/auth/me — 当前登录用户
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  return NextResponse.json(
    { user: toPublicUser(user) },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
}
