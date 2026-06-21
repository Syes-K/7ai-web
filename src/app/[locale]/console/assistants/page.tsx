import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { isAdmin } from "@/server/auth/admin";
import AssistantsClient from "./AssistantsClient";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "page.console.assistants" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

/** 助手管理：列表、新建/编辑个人助手、KB/MCP 关联 */
export default async function AssistantsPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const admin = await isAdmin();
  return <AssistantsClient isAdmin={admin} />;
}
