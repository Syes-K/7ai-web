import { AntdRegistry } from "@ant-design/nextjs-registry";
import ConsoleShell from "./ConsoleShell";

/**
 * 用户控制台：与管理后台同源的 ProLayout + 深色主题；仅登录用户（middleware 会话）可进入。
 */
export default function ConsoleLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AntdRegistry>
      <ConsoleShell>{children}</ConsoleShell>
    </AntdRegistry>
  );
}
