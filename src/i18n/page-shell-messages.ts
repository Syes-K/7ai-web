import type { AppLocale } from "@/common/constants/i18n";
import enShell from "../../messages/en/page/shell.json";
import zhShell from "../../messages/zh/page/shell.json";

export type PageShellMessages = typeof enShell;

export function getPageShellMessages(locale: AppLocale): PageShellMessages {
  return locale === "zh" ? zhShell : enShell;
}
