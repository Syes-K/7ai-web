import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";
import { getCurrentUser } from "./session-user";

/** 只读账号写操作白名单：登录/登出不受拦截 */
const READ_ONLY_BYPASS_PATHS = new Set<string>([
  "/api/auth/login",
  "/api/auth/logout",
]);

/**
 * 统一拦截只读账号的写操作：仅允许 GET，请求方法其余一律拒绝。
 * 错误文案随请求 locale 双语返回（经 withApiWrapper 包裹的全部写 API）。
 */
export function withReadOnlyApi<H extends (...args: any[]) => Promise<Response> | Response>(
  handler: H,
): H {
  return (async (...args: Parameters<H>) => {
    const req = args[0] as unknown;
    if (!(req instanceof Request)) {
      return handler(...args);
    }
    if (req.method === "GET") {
      return handler(...args);
    }
    const pathname = new URL(req.url).pathname;
    if (READ_ONLY_BYPASS_PATHS.has(pathname)) {
      return handler(...args);
    }
    const user = await getCurrentUser();
    if (user?.readOnly) {
      const locale = resolveRequestLocale(req);
      return jsonError(
        ErrorCode.FORBIDDEN,
        tApiMessage(locale, "readOnlyAccountBlocked"),
        HttpStatus.FORBIDDEN,
      );
    }
    return handler(...args);
  }) as H;
}
