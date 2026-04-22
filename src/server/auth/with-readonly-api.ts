import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";
import { getCurrentUser } from "./session-user";

const READ_ONLY_BLOCK_MESSAGE =
  "您访问的是测试账户，不能进行数据的修改和删除";
const READ_ONLY_BYPASS_PATHS = new Set<string>([
  "/api/auth/login",
  "/api/auth/logout",
]);

/**
 * 统一拦截只读账号的写操作：仅允许 GET，请求方法其余一律拒绝。
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
      return jsonError(ErrorCode.FORBIDDEN, READ_ONLY_BLOCK_MESSAGE, HttpStatus.FORBIDDEN);
    }
    return handler(...args);
  }) as H;
}
