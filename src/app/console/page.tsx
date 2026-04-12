import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ notice?: string | string[] }>;
};

/**
 * 控制台根路径：进入默认模块「个人信息」；保留 `notice` 等查询（如从管理后台无权跳转）。
 */
export default async function ConsolePage({ searchParams }: Props) {
  const sp = await searchParams;
  const notice = sp.notice;
  const noticeVal = Array.isArray(notice) ? notice[0] : notice;
  const suffix =
    noticeVal != null && noticeVal !== ""
      ? `?notice=${encodeURIComponent(noticeVal)}`
      : "";
  redirect(`/console/profile${suffix}`);
}
