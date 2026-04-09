import { ChatShellPlaceholder } from "@/components/placeholders/ChatShellPlaceholder";
import { EmptyStateCard } from "@/components/placeholders/EmptyStateCard";
import { PageShell } from "@/components/placeholders/PageShell";

/**
 * 对话页：默认 RSC，服务端渲染静态占位。
 */
export default function ChatPage() {
  return (
    <PageShell title="对话">
      <ChatShellPlaceholder />
      <EmptyStateCard>
        对话页占位中：消息交互与模型调用将在后续版本提供。
      </EmptyStateCard>
    </PageShell>
  );
}
