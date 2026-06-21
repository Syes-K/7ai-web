import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound, redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { isAdmin } from "@/server/auth/admin";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "page.admin.skills" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

/**
 * 控制台 Skills 已退场：admin 重定向至管理后台，普通用户 404。
 */
export default async function ConsoleSkillsRetiredPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  if (await isAdmin()) {
    redirect(`/${locale}/admin/skills`);
  }
  notFound();
}
