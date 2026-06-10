import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { userDisplayLabel } from "@/common/utils/user-display-label";
import { ChatWorkspace } from "@/components/chat/ChatWorkspace";
import { routing } from "@/i18n/routing";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { shouldShowFreeOrSharedChatModelHint } from "@/server/chat/chat-model-ui-hint";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "page.chat" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

/**
 * 对话页：客户端工作台（会话列表、消息、新建/清空）；布局鉴权见 layout。
 */
export default async function ChatPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    redirect(`/${locale}/login?redirect=/${locale}/chat`);
  }
  const { user } = reqCtx;
  const freeTierAssistantHint = await shouldShowFreeOrSharedChatModelHint(user.id);
  return (
    <ChatWorkspace
      userLabel={userDisplayLabel(user)}
      freeTierAssistantHint={freeTierAssistantHint}
      readOnly={Boolean(user.readOnly)}
    />
  );
}
