import { ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import type { AppLocale } from "@/common/constants/i18n";
import { localeToHtmlLang } from "@/common/constants/i18n";
import { LocaleHtmlLang } from "@/components/i18n/LocaleHtmlLang";
import { routing } from "@/i18n/routing";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const appLocale = locale as AppLocale;
  const antdLocale = appLocale === "zh" ? zhCN : enUS;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ConfigProvider locale={antdLocale}>
        <LocaleHtmlLang lang={localeToHtmlLang(appLocale)} />
        {children}
      </ConfigProvider>
    </NextIntlClientProvider>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
