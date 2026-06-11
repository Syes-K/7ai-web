import { NextResponse } from "next/server";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { getConsoleProfileResponse } from "@/server/console-profile/get-console-profile";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";
import { withApiWrapper } from "@/server/http/with-api-wrapper";

export const runtime = "nodejs";

/**
 * GET：聚合个人信息与默认模型偏好（供 /console/profile）；错误 message 随 locale 双语。
 */
export const GET = withApiWrapper(async (request: Request) => {
  const locale = resolveRequestLocale(request);
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(
      ErrorCode.UNAUTHORIZED,
      tApiMessage(locale, "unauthorized"),
      HttpStatus.UNAUTHORIZED,
    );
  }
  const { user } = reqCtx;

  try {
    const payload = await getConsoleProfileResponse(user.id);
    return NextResponse.json(payload, {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch {
    return jsonError(
      ErrorCode.INTERNAL_ERROR,
      tApiMessage(locale, "loadFailed"),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
});
