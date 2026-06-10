import { ConfigProvider } from "antd";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import type { AppLocale } from "@/common/constants/i18n";
import { localeToHtmlLang } from "@/common/constants/i18n";
import { getAntdLocale } from "@/common/utils/antd-locale";
import { DayjsLocaleSync } from "@/components/i18n/DayjsLocaleSync";
import { LocaleHtmlLang } from "@/components/i18n/LocaleHtmlLang";
import { ConfirmProvider } from "@/components/ui/confirm";
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

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ConfigProvider locale={getAntdLocale(appLocale)}>
        <ConfirmProvider>
          <DayjsLocaleSync locale={appLocale} />
          <LocaleHtmlLang lang={localeToHtmlLang(appLocale)} />
          {children}
        </ConfirmProvider>
      </ConfigProvider>
    </NextIntlClientProvider>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
