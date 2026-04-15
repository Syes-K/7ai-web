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
import { logger } from "@/server/logs";

const AUTH_API_PREFIX = "/api/auth/";

/**
 * 无会话 Cookie 时拦截受保护路由（完整校验在页面/API 层）。
 */
export function middleware(request: NextRequest) {
  const { pathname, search, origin, searchParams } = request.nextUrl;
  const timestamp = Date.now();
  logger.info("request.start", {
    datetime: timestamp,
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    session: request.cookies.get(SESSION_COOKIE)?.value,
    redirect: request.nextUrl.pathname.startsWith("/login"),
    origin,
    params: searchParams.toString(),
  });

  let res: any;

  // 整个站点统一限流。
  const totalAllowed = allowRate(
    "site",
    MIDDLEWARE_TOTAL_RATE_LIMIT,
    MIDDLEWARE_TOTAL_RATE_WINDOW_MS,
  );
  if (!totalAllowed) {
    res = jsonError(
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
    res = jsonError(
      ErrorCode.RATE_LIMITED,
      "请求过于频繁，请稍后再试",
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  // 认证 API 只做限流，不做会话重定向（登录/注册/验证码等必须可匿名访问）。
  if (pathname.startsWith(AUTH_API_PREFIX)) {
    res = NextResponse.next();
  }

  const sid = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sid) {
    // 管理端 / 控制台 API 保持 JSON 错误体，便于前端与脚本处理（页面路由仍走登录重定向）。
    if (pathname.startsWith("/api/admin") || pathname.startsWith("/api/console")) {
      res = jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("redirect", `${pathname}${search}`);
    res = NextResponse.redirect(login);
  }

  // 供 admin layout 在未登录（会话失效）时带回跳路径；仅页面路由需要。
  if (pathname.startsWith("/admin")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-admin-login-redirect", `${pathname}${search}`);
    res = NextResponse.next({ request: { headers: requestHeaders } });
  }

  res = NextResponse.next();
  logger.info("request.end", {
    datetime: Date.now(),
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    session: request.cookies.get(SESSION_COOKIE)?.value,
    redirect: request.nextUrl.pathname.startsWith("/login"),
    origin,
    params: searchParams.toString(),
    response: res,
  });
  return res;
}

export const config = {
  matcher: [
    "/chat",
    "/chat/:path*",
    "/console",
    "/console/:path*",
    "/admin",
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/console/:path*",
    "/api/auth/:path*",
  ],
};
