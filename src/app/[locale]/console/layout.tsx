import { AntdRegistry } from "@ant-design/nextjs-registry";
import { redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { userDisplayLabel } from "@/common/utils/user-display-label";
import { routing } from "@/i18n/routing";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import ConsoleShell from "./ConsoleShell";

/**
 * 用户控制台：服务端会话校验 + ProLayout 深色壳层。
 */
export default async function ConsoleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return null;
  }
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    redirect(`/${locale}/login?redirect=/${locale}/console/profile`);
  }
  const displayName = userDisplayLabel(reqCtx.user);
  return (
    <AntdRegistry>
      <ConsoleShell displayName={displayName}>{children}</ConsoleShell>
    </AntdRegistry>
  );
}
