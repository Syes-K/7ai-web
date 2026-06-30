import { isAppLocale } from "@/common/constants/i18n";

/**
 * 登录/注册成功后的 redirect：仅允许本站 path 且落在白名单（含 locale 前缀与 /admin/**）。
 */

const ALLOWED_LEGACY_EXACT = new Set([
  "/",
  "/chat",
  "/console",
  "/admin",
  "/knowledge",
]);

/** 无 locale 前缀的旧路径：允许子路径 */
const ALLOWED_LEGACY_PREFIXES = ["/admin/", "/console/", "/chat/", "/knowledge/"];

/** /{locale}/... 中 locale 后的首段应用路由 */
const ALLOWED_LOCALE_SEGMENTS = new Set([
  "chat",
  "console",
  "admin",
  "knowledge",
  "login",
  "register",
]);

function stripLocalePrefix(pathOnly: string): { locale: string | null; rest: string } {
  const m = pathOnly.match(/^\/(en|zh)(\/.*)?$/);
  if (!m) {
    return { locale: null, rest: pathOnly };
  }
  const locale = m[1]!;
  if (!isAppLocale(locale)) {
    return { locale: null, rest: pathOnly };
  }
  const rest = m[2] ?? "";
  return { locale, rest: rest === "" ? "/" : rest };
}

function isAllowedLocaleRest(rest: string): boolean {
  if (rest === "/") {
    return true;
  }
  const seg = rest.split("/").filter(Boolean)[0];
  if (!seg) {
    return false;
  }
  return ALLOWED_LOCALE_SEGMENTS.has(seg);
}

function isAllowedRedirectPath(pathOnly: string): boolean {
  if (pathOnly.includes("..")) {
    return false;
  }

  const { locale, rest } = stripLocalePrefix(pathOnly);
  if (locale) {
    return isAllowedLocaleRest(rest);
  }

  if (ALLOWED_LEGACY_EXACT.has(pathOnly)) {
    return true;
  }
  return ALLOWED_LEGACY_PREFIXES.some((prefix) => pathOnly.startsWith(prefix));
}

export function safeRedirectUrl(
  redirectParam: string | null | undefined,
  request: Request | string,
): string {
  const fallback = new URL(typeof request === "string" ? request : request.url);
  let baseOrigin = fallback.origin;
  if (typeof request !== "string") {
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost || request.headers.get("host")?.trim();
    const forwardedProto = request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim()
      .toLowerCase();
    const proto =
      forwardedProto && (forwardedProto === "http" || forwardedProto === "https")
        ? forwardedProto
        : fallback.protocol.replace(":", "");
    if (host) {
      baseOrigin = `${proto}://${host}`;
    }
  }
  if (!redirectParam || redirectParam.trim() === "") {
    return `${baseOrigin}/`;
  }
  let pathPart = redirectParam.trim();
  try {
    if (pathPart.includes("://")) {
      const u = new URL(pathPart);
      if (u.origin !== baseOrigin) {
        return `${baseOrigin}/`;
      }
      pathPart = u.pathname + u.search;
    }
    if (!pathPart.startsWith("/")) {
      return `${baseOrigin}/`;
    }
    const pathOnly = pathPart.split("?")[0] ?? "/";
    if (!isAllowedRedirectPath(pathOnly)) {
      return `${baseOrigin}/`;
    }
    return `${baseOrigin}${pathPart.startsWith("/") ? pathPart : `/${pathPart}`}`;
  } catch {
    return `${baseOrigin}/`;
  }
}

/** API 返回的 redirectUrl → 客户端可用的同源 path（含 search） */
export function authRedirectPathForClient(
  redirectUrl: string | null | undefined,
  fallback = "/",
): string {
  const raw = redirectUrl?.trim() || fallback;
  try {
    if (raw.includes("://")) {
      const u = new URL(raw);
      if (typeof window !== "undefined" && u.origin !== window.location.origin) {
        return fallback;
      }
      return u.pathname + u.search || fallback;
    }
    return raw.startsWith("/") ? raw : `/${raw}`;
  } catch {
    return fallback;
  }
}
