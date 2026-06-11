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
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";
import { routing } from "@/i18n/routing";
import { isAppLocale, type AppLocale } from "@/common/constants/i18n";

const AUTH_API_PREFIX = "/api/auth/";
const intlMiddleware = createIntlMiddleware(routing);

/** 未接入 i18n 的应用路由首段（不加 locale 前缀）；chat/console/admin/knowledge 已迁至 /{locale}/… */
const KNOWN_APP_SEGMENTS = new Set([
  "api",
]);

function firstSegment(pathname: string): string | undefined {
  return pathname.split("/").filter(Boolean)[0];
}

/** 从 /{locale}/... 路径解析 locale；无有效前缀时返回 null */
function localeFromPathname(pathname: string): AppLocale | null {
  const seg = firstSegment(pathname);
  if (seg && isAppLocale(seg)) {
    return seg;
  }
  return null;
}

/** `/fr`、`/en-US` 等非法 locale 尝试 → 302 `/en` */
function isInvalidLocaleAttempt(pathname: string): boolean {
  // 旧版无 locale 前缀的 auth 路径由 handleLegacyAuthPageRedirect 处理，非非法 locale
  if (pathname === "/login" || pathname === "/register") {
    return false;
  }
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
  if (
    pathname.startsWith("/chat") ||
    pathname.startsWith("/console") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/knowledge") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/console") ||
    pathname.startsWith(AUTH_API_PREFIX)
  ) {
    return true;
  }
  // 0.1.15：locale 前缀 chat 页受保护
  if (/^\/(en|zh)\/chat(\/|$)/.test(pathname)) {
    return true;
  }
  // 0.1.16：locale 前缀 console 页受保护
  if (/^\/(en|zh)\/console(\/|$)/.test(pathname)) {
    return true;
  }
  // 0.1.17：locale 前缀 admin / knowledge 页受保护
  if (/^\/(en|zh)\/admin(\/|$)/.test(pathname)) {
    return true;
  }
  if (/^\/(en|zh)\/knowledge(\/|$)/.test(pathname)) {
    return true;
  }
  return false;
}

/** 旧版无 locale 前缀的 /login、/register → 302 /{locale}/login|register */
function handleLegacyAuthPageRedirect(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/login" || pathname === "/register") {
    const locale = resolveRequestLocale(request);
    const target = pathname === "/login" ? "login" : "register";
    const url = new URL(`/${locale}/${target}`, request.url);
    url.search = search;
    return NextResponse.redirect(url, 302);
  }
  return null;
}

/**
 * 旧版裸 /chat → 302 /{locale}/chat（优先于受保护逻辑，避免未登录直接进 login 而丢失 locale 前缀）。
 */
function handleLegacyChatRedirect(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/chat" || pathname.startsWith("/chat/")) {
    const locale = resolveRequestLocale(request);
    const suffix = pathname.slice("/chat".length);
    const url = new URL(`/${locale}/chat${suffix}`, request.url);
    url.search = search;
    return NextResponse.redirect(url, 302);
  }
  return null;
}

/**
 * 旧版裸 /console → 302 /{locale}/console（与 chat 并列，优先于受保护逻辑以保留 query 与 locale）。
 */
function handleLegacyConsoleRedirect(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/console" || pathname.startsWith("/console/")) {
    const locale = resolveRequestLocale(request);
    const suffix = pathname.slice("/console".length);
    const url = new URL(`/${locale}/console${suffix}`, request.url);
    url.search = search;
    return NextResponse.redirect(url, 302);
  }
  return null;
}

/**
 * 旧版裸 /admin → 302 /{locale}/admin（优先于受保护逻辑，保留 query 与 locale）。
 */
function handleLegacyAdminRedirect(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const locale = resolveRequestLocale(request);
    const suffix = pathname.slice("/admin".length);
    const url = new URL(`/${locale}/admin${suffix}`, request.url);
    url.search = search;
    return NextResponse.redirect(url, 302);
  }
  return null;
}

/**
 * 旧版裸 /knowledge → 302 /{locale}/knowledge（知识库预览等，与 admin 并列）。
 */
function handleLegacyKnowledgeRedirect(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/knowledge" || pathname.startsWith("/knowledge/")) {
    const locale = resolveRequestLocale(request);
    const suffix = pathname.slice("/knowledge".length);
    const url = new URL(`/${locale}/knowledge${suffix}`, request.url);
    url.search = search;
    return NextResponse.redirect(url, 302);
  }
  return null;
}

function handleProtectedRoute(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  // URL 已含 /en|zh 时优先用路径 segment，与 redirect 参数保持一致
  const locale = localeFromPathname(pathname) ?? resolveRequestLocale(request);

  const totalAllowed = allowRate(
    "site",
    MIDDLEWARE_TOTAL_RATE_LIMIT,
    MIDDLEWARE_TOTAL_RATE_WINDOW_MS,
  );
  if (!totalAllowed) {
    return jsonError(
      ErrorCode.RATE_LIMITED,
      tApiMessage(locale, "rateLimitedSite"),
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
      tApiMessage(locale, "rateLimited"),
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  if (pathname.startsWith(AUTH_API_PREFIX)) {
    return NextResponse.next();
  }

  const sid = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sid) {
    if (pathname.startsWith("/api/admin") || pathname.startsWith("/api/console")) {
      return jsonError(
        ErrorCode.UNAUTHORIZED,
        tApiMessage(locale, "unauthorized"),
        HttpStatus.UNAUTHORIZED,
      );
    }
    const login = new URL(`/${locale}/login`, request.url);
    login.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

/**
 * i18n + 受保护路由合并 middleware：非法 locale 兜底 → 旧 auth/chat/console/admin/knowledge 302 → 受保护路径 → next-intl。
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isInvalidLocaleAttempt(pathname)) {
    return NextResponse.redirect(new URL("/en", request.url), 302);
  }

  const legacyAuth = handleLegacyAuthPageRedirect(request);
  if (legacyAuth) {
    return legacyAuth;
  }

  const legacyChat = handleLegacyChatRedirect(request);
  if (legacyChat) {
    return legacyChat;
  }

  const legacyConsole = handleLegacyConsoleRedirect(request);
  if (legacyConsole) {
    return legacyConsole;
  }

  const legacyAdmin = handleLegacyAdminRedirect(request);
  if (legacyAdmin) {
    return legacyAdmin;
  }

  const legacyKnowledge = handleLegacyKnowledgeRedirect(request);
  if (legacyKnowledge) {
    return legacyKnowledge;
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
    "/login",
    "/register",
    "/chat",
    "/chat/:path*",
    "/console",
    "/console/:path*",
    "/admin",
    "/admin/:path*",
    "/knowledge",
    "/knowledge/:path*",
    "/api/admin/:path*",
    "/api/console/:path*",
    "/api/auth/:path*",
    "/((?!api|_next|_vercel|chat|console|admin|knowledge|.*\\..*)[^/]+)",
  ],
};
