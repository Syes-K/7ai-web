import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session-user";

/**
 * 对话区：除 middleware 外再做服务端会话校验，避免过期 Cookie。
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
