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
  requestUrl: string,
): string {
  const base = new URL(requestUrl);
  if (!redirectParam || redirectParam.trim() === "") {
    return `${base.origin}/`;
  }
  let pathPart = redirectParam.trim();
  try {
    if (pathPart.includes("://")) {
      const u = new URL(pathPart);
      if (u.origin !== base.origin) {
        return `${base.origin}/`;
      }
      pathPart = u.pathname + u.search;
    }
    if (!pathPart.startsWith("/")) {
      return `${base.origin}/`;
    }
    const pathOnly = pathPart.split("?")[0] ?? "/";
    if (!isAllowedRedirectPath(pathOnly)) {
      return `${base.origin}/`;
    }
    return `${base.origin}${pathPart.startsWith("/") ? pathPart : `/${pathPart}`}`;
  } catch {
    return `${base.origin}/`;
  }
}
