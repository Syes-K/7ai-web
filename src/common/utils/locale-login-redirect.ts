/**
 * 构建带 locale 前缀的登录跳转 URL（redirect 参数含完整路径）。
 */
export function buildLocaleLoginRedirect(
  locale: string,
  returnPath: string,
  search = "",
): string {
  const full = `${returnPath}${search}`;
  return `/${locale}/login?redirect=${encodeURIComponent(full)}`;
}

/** 401 时整页跳转到登录页 */
export function redirectToLocaleLogin(
  locale: string,
  returnPath: string,
  search = "",
): void {
  window.location.href = buildLocaleLoginRedirect(locale, returnPath, search);
}
