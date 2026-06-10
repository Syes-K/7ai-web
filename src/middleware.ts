import createIntlMiddleware from "next-intl/middleware";
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
import { routing } from "@/i18n/routing";

const AUTH_API_PREFIX = "/api/auth/";
const intlMiddleware = createIntlMiddleware(routing);

/** 未接入 i18n 的应用路由首段（不加 locale 前缀） */
const KNOWN_APP_SEGMENTS = new Set([
  "chat",
  "console",
  "login",
  "admin",
  "register",
  "knowledge",
  "api",
]);

function firstSegment(pathname: string): string | undefined {
  return pathname.split("/").filter(Boolean)[0];
}

/** `/fr`、`/en-US` 等非法 locale 尝试 → 302 `/en` */
function isInvalidLocaleAttempt(pathname: string): boolean {
  const seg = firstSegment(pathname);
  if (!seg) {
    return false;
  }
  if (seg === "en" || seg === "zh") {
    return false;
  }
  if (KNOWN_APP_SEGMENTS.has(seg)) {
    return false;
  }
  return true;
}

function isI18nPath(pathname: string): boolean {
  if (pathname === "/") {
    return true;
  }
  const seg = firstSegment(pathname);
  return seg === "en" || seg === "zh";
}

function isProtectedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/chat") ||
    pathname.startsWith("/console") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/console") ||
    pathname.startsWith(AUTH_API_PREFIX)
  );
}

function handleProtectedRoute(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

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

  if (pathname.startsWith(AUTH_API_PREFIX)) {
    return NextResponse.next();
  }

  const sid = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sid) {
    if (pathname.startsWith("/api/admin") || pathname.startsWith("/api/console")) {
      return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  if (pathname.startsWith("/admin")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-admin-login-redirect", `${pathname}${search}`);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

/**
 * i18n + 受保护路由合并 middleware：先非法 locale 兜底，再 auth，再 next-intl。
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isInvalidLocaleAttempt(pathname)) {
    return NextResponse.redirect(new URL("/en", request.url), 302);
  }

  if (isProtectedPath(pathname)) {
    return handleProtectedRoute(request);
  }

  if (isI18nPath(pathname)) {
    return intlMiddleware(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/(en|zh)",
    "/(en|zh)/:path*",
    "/chat",
    "/chat/:path*",
    "/console",
    "/console/:path*",
    "/admin",
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/console/:path*",
    "/api/auth/:path*",
    "/((?!api|_next|_vercel|chat|console|login|admin|register|knowledge|.*\\..*)[^/]+)",
  ],
};
