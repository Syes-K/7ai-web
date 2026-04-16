/**
 * 登录/注册成功后的 redirect：仅允许本站 path 且落在白名单（含 `/admin/**` 管理后台）。
 */
const ALLOWED_EXACT = new Set(["/", "/chat", "/console", "/admin"]);

function isAllowedRedirectPath(pathOnly: string): boolean {
  if (ALLOWED_EXACT.has(pathOnly)) return true;
  if (pathOnly.startsWith("/admin/")) {
    return !pathOnly.includes("..");
  }
  return false;
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
