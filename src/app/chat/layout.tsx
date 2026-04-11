import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session-user";

/**
 * 对话区：服务端会话校验；界面为纯 Tailwind 客户端组件。
 */
export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirect=/chat");
  }
  return <>{children}</>;
}
