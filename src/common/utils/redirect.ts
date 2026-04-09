/**
 * 登录/注册成功后的 redirect：仅允许本站 path 且落在白名单。
 */
const ALLOWED_PATHS = new Set(["/", "/chat", "/console"]);

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
    if (!ALLOWED_PATHS.has(pathOnly)) {
      return `${base.origin}/`;
    }
    return `${base.origin}${pathPart.startsWith("/") ? pathPart : `/${pathPart}`}`;
  } catch {
    return `${base.origin}/`;
  }
}
