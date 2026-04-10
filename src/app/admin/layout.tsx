import { AntdRegistry } from "@ant-design/nextjs-registry";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { gateAdminPageAccess } from "@/server/auth/admin";
import AdminShell from "./AdminShell";

/**
 * 管理后台：服务端校验管理员（ADMIN_USER 白名单）+ 独立 Antd Registry + ProLayout 壳。
 */
export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const access = await gateAdminPageAccess();
  if (access === "login") {
    const h = await headers();
    const target = h.get("x-admin-login-redirect") ?? "/admin/config";
    redirect(`/login?redirect=${encodeURIComponent(target)}`);
  }
  if (access === "forbidden") {
    redirect("/console?notice=admin_forbidden");
  }

  return (
    <AntdRegistry>
      <AdminShell>{children}</AdminShell>
    </AntdRegistry>
  );
}
