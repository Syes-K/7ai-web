import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  MIDDLEWARE_API_RATE_LIMIT,
  MIDDLEWARE_API_RATE_WINDOW_MS,
  MIDDLEWARE_TOTAL_RATE_LIMIT,
  MIDDLEWARE_TOTAL_RATE_WINDOW_MS,
  SESSION_COOKIE,
} from "@/common/constants";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { allowRate, clientIp } from "@/common/utils/rate-limit";
import { jsonError } from "@/server/http/json-response";

const AUTH_API_PREFIX = "/api/auth/";

/**
 * 无会话 Cookie 时拦截受保护路由（完整校验在页面/API 层）。
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 整个站点统一限流。
  const totalAllowed = allowRate(
    "site",
    MIDDLEWARE_TOTAL_RATE_LIMIT,
    MIDDLEWARE_TOTAL_RATE_WINDOW_MS,
  );
  if (!totalAllowed) {
    return jsonError(
      ErrorCode.RATE_LIMITED,
      "站点访问过于频繁，请稍后再试",
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  // 统一接口级限流(IP 级)。
  const ip = clientIp(request);
  const allowed = allowRate(
    `${pathname}:${ip}`,
    MIDDLEWARE_API_RATE_LIMIT,
    MIDDLEWARE_API_RATE_WINDOW_MS,
  );
  if (!allowed) {
    return jsonError(
      ErrorCode.RATE_LIMITED,
      "请求过于频繁，请稍后再试",
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  // 认证 API 只做限流，不做会话重定向（登录/注册/验证码等必须可匿名访问）。
  if (pathname.startsWith(AUTH_API_PREFIX)) {
    return NextResponse.next();
  }

  const sid = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sid) {
    const login = new URL("/login", request.url);
    login.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/chat",
    "/chat/:path*",
    "/console",
    "/console/:path*",
    "/api/auth/:path*",
  ],
};
