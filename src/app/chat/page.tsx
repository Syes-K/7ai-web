import { userDisplayLabel } from "@/common/utils/user-display-label";
import { ChatWorkspace } from "@/components/chat/ChatWorkspace";
import { getCurrentUser } from "@/server/auth/session-user";
import { redirect } from "next/navigation";

/**
 * 对话页：客户端工作台（会话列表、消息、新建/清空）；布局鉴权见 layout。
 */
export default async function ChatPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirect=/chat");
  }
  return <ChatWorkspace userLabel={userDisplayLabel(user)} />;
}
