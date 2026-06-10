/** next-intl / middleware 使用的 locale Cookie 名称 */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** 站点支持的 locale 列表 */
export const SUPPORTED_LOCALES = ["en", "zh"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

/** 无 cookie / Accept-Language 时的默认 locale */
export const DEFAULT_LOCALE: AppLocale = "en";

export function localeToHtmlLang(locale: AppLocale): string {
  return locale === "zh" ? "zh-CN" : "en";
}

export function isAppLocale(value: string): value is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
