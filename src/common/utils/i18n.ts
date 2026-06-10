/**
 * 服务端 / middleware 共用的 locale 解析纯函数。
 * 与 next-intl URL 前缀检测不同：API 与 middleware 错误响应无 `/{locale}` 路径段，
 * 故通过 Cookie `NEXT_LOCALE` 推断语言；无 cookie 时用 DEFAULT_LOCALE（en）。
 */
import {
  DEFAULT_LOCALE,
  isAppLocale,
  type AppLocale,
} from "@/common/constants/i18n";

/**
 * 从 Accept-Language 请求头解析站点 locale。
 * 规则：取首个 language tag 的主段，以 zh 开头 → zh，否则 → en。
 */
export function localeFromAcceptLanguage(header: string | null): AppLocale {
  if (!header?.trim()) {
    return DEFAULT_LOCALE;
  }
  const first = header.split(",")[0]?.trim().split(";")[0]?.trim();
  if (!first) {
    return DEFAULT_LOCALE;
  }
  const primary = first.split("-")[0]?.toLowerCase();
  return primary?.startsWith("zh") ? "zh" : "en";
}

/**
 * 从 cookie 解析 AppLocale；无有效 cookie 时返回 DEFAULT_LOCALE（en）。
 * `acceptLanguage` 保留入参以兼容调用方，当前不参与推断。
 */
export function resolveLocaleFromCookieAndHeader(
  cookieValue: string | undefined,
  _acceptLanguage: string | null,
): AppLocale {
  const trimmed = cookieValue?.trim();
  if (trimmed && isAppLocale(trimmed)) {
    return trimmed;
  }
  return DEFAULT_LOCALE;
}
