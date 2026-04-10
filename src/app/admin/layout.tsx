import { AntdRegistry } from "@ant-design/nextjs-registry";
import AdminShell from "./AdminShell";

/**
 * 管理后台：独立 Antd Registry + ProLayout 壳（CSR 会话校验在 AdminShell）。
 */
export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AntdRegistry>
      <AdminShell>{children}</AdminShell>
    </AntdRegistry>
  );
}
