import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import type { AppLocale } from "@/common/constants/i18n";

export function getAntdLocale(locale: AppLocale) {
  return locale === "zh" ? zhCN : enUS;
}

export function getDayjsLocaleName(locale: AppLocale): string {
  return locale === "zh" ? "zh-cn" : "en";
}
