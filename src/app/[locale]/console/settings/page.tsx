import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "page.console.settings" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

/** 与 `next.config` 重定向一致；保留本文件以防仅客户端路由时仍可落到 canonical。 */
export default async function ConsoleSettingsRedirectPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return null;
  }
  setRequestLocale(locale);
  redirect(`/${locale}/console/profile`);
}
