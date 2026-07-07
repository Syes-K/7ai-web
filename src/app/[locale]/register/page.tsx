import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "page.register" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default async function RegisterPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const t = await getTranslations("page.register");

  return (
    <AuthShell namespace="page.register" title={t("shell.title")}>
      <Suspense
        fallback={
          <p className="text-center text-sm text-[#9AA3B2]">{t("shell.loading")}</p>
        }
      >
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
