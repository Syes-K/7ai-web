import type { AppLocale } from "@/common/constants/i18n";

/** 非管理员访问 admin 时的控制台 forbidden 跳转 URL（供 Frontend 4 与客户端 403 处理导入）。 */
export function getConsoleForbiddenUrl(locale: AppLocale): string {
  return `/${locale}/console?notice=admin_forbidden`;
}
