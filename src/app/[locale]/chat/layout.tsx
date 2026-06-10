import { redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { getRequestUserContext } from "@/server/auth/request-user-context";

/**
 * 对话区：服务端会话校验；界面为纯 Tailwind 客户端组件。
 */
export default async function ChatLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return null;
  }
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    redirect(`/${locale}/login?redirect=/${locale}/chat`);
  }
  return <>{children}</>;
}
