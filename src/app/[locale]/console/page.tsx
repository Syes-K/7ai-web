import { redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ notice?: string | string[] }>;
};

/**
 * 控制台根路径：进入默认模块「个人信息」；保留 `notice` 等查询（如从管理后台无权跳转）。
 */
export default async function ConsolePage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return null;
  }
  const sp = await searchParams;
  const notice = sp.notice;
  const noticeVal = Array.isArray(notice) ? notice[0] : notice;
  const suffix =
    noticeVal != null && noticeVal !== ""
      ? `?notice=${encodeURIComponent(noticeVal)}`
      : "";
  redirect(`/${locale}/console/profile${suffix}`);
}
