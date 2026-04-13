import { userDisplayLabel } from "@/common/utils/user-display-label";
import { ChatWorkspace } from "@/components/chat/ChatWorkspace";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { shouldShowFreeOrSharedChatModelHint } from "@/server/chat/chat-model-ui-hint";
import { redirect } from "next/navigation";

/**
 * 对话页：客户端工作台（会话列表、消息、新建/清空）；布局鉴权见 layout。
 */
export default async function ChatPage() {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    redirect("/login?redirect=/chat");
  }
  const { user } = reqCtx;
  const freeTierAssistantHint = await shouldShowFreeOrSharedChatModelHint(user.id);
  return (
    <ChatWorkspace userLabel={userDisplayLabel(user)} freeTierAssistantHint={freeTierAssistantHint} />
  );
}
