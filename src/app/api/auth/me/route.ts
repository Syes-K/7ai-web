import { NextResponse } from "next/server";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { toPublicUser } from "@/server/auth/user-dto";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";

export const runtime = "nodejs";

/**
 * GET /api/auth/me — 当前登录用户
 */
export const GET = withApiWrapper(async (req: Request) => {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(
      ErrorCode.UNAUTHORIZED,
      tApiMessage(resolveRequestLocale(req), "unauthorized"),
      HttpStatus.UNAUTHORIZED,
    );
  }
  const { user } = reqCtx;
  return NextResponse.json(
    { user: toPublicUser(user) },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});
