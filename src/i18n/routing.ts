import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/common/constants/i18n";

export const routing = defineRouting({
  locales: [...SUPPORTED_LOCALES],
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "always",
  /** 不根据浏览器 Accept-Language 推断；无 cookie 时用 defaultLocale（en） */
  localeDetection: false,
});
