import type { AppLocale } from "@/common/constants/i18n";
import { getConsoleForbiddenUrl } from "@/common/utils/console-forbidden-url";
import { redirectToLocaleLogin } from "@/common/utils/locale-login-redirect";

/**
 * 管理后台客户端 API 401/403 统一跳转（locale 感知）。
 * @returns 已处理则 true，调用方应中止后续逻辑
 */
export function handleAdminApiAuthStatus(
  status: number,
  locale: string,
  returnPath: string,
): boolean {
  if (status === 401) {
    redirectToLocaleLogin(locale, returnPath);
    return true;
  }
  if (status === 403) {
    window.location.replace(getConsoleForbiddenUrl(locale as AppLocale));
    return true;
  }
  return false;
}
