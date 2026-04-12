import { redirect } from "next/navigation";
import { getRequestUserContext } from "@/server/auth/request-user-context";

/**
 * 对话区：服务端会话校验；界面为纯 Tailwind 客户端组件。
 */
export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    redirect("/login?redirect=/chat");
  }
  return <>{children}</>;
}
