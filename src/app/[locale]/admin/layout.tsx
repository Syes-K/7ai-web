import { AntdRegistry } from "@ant-design/nextjs-registry";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getConsoleForbiddenUrl } from "@/common/utils/console-forbidden-url";
import type { AppLocale } from "@/common/constants/i18n";
import { userDisplayLabel } from "@/common/utils/user-display-label";
import { routing } from "@/i18n/routing";
import { gateAdminPageAccess } from "@/server/auth/admin";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import AdminShell from "./AdminShell";
import { AdminSessionProvider } from "./AdminSessionContext";

/**
 * 管理后台：服务端 gateAdminPageAccess + ProLayout 深色壳层。
 */
export default async function AdminLayout({
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

  const access = await gateAdminPageAccess();
  if (access === "login") {
    const h = await headers();
    const pathname =
      h.get("x-pathname") ??
      h.get("x-invoke-path") ??
      `/${locale}/admin/config`;
    const search = h.get("x-search") ?? "";
    redirect(
      `/${locale}/login?redirect=${encodeURIComponent(`${pathname}${search}`)}`,
    );
  }
  if (access === "forbidden") {
    redirect(getConsoleForbiddenUrl(locale as AppLocale));
  }

  const reqCtx = await getRequestUserContext();
  const displayName = userDisplayLabel(reqCtx!.user);

  return (
    <AntdRegistry>
      <AdminSessionProvider userId={reqCtx!.user.id}>
        <AdminShell displayName={displayName}>{children}</AdminShell>
      </AdminSessionProvider>
    </AntdRegistry>
  );
}
