import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ProfilePageLoading } from "./ProfilePageLoading";

const ProfileClient = dynamic(() => import("./ProfileClient"), {
  loading: () => <ProfilePageLoading />,
});

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "page.console.profile" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

/** 账号与偏好：客户端 ProForm 编辑个人信息与默认模型偏好 */
export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  return <ProfileClient />;
}
