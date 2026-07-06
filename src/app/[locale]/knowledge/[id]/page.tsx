import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound, redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getDataSource } from "@/server/db/data-source";
import { KnowledgeBase } from "@/server/db/entities/KnowledgeBase";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import KnowledgePreviewClient from "./KnowledgePreviewClient";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "page.knowledge" });

  let kbName: string | null = null;
  try {
    const reqCtx = await getRequestUserContext();
    if (reqCtx) {
      const ds = await getDataSource();
      const kb = await ds.getRepository(KnowledgeBase).findOne({
        where: { id, userId: reqCtx.user.id },
        select: ["name"],
      });
      kbName = kb?.name ?? null;
    }
  } catch {
    /* metadata 预读失败时回退 */
  }

  return {
    title: kbName
      ? t("meta.title", { name: kbName })
      : t("meta.titleFallback"),
    description: t("meta.description"),
  };
}

/** 知识库预览：只读内容页，极简壳层 + locale 感知鉴权 */
export default async function KnowledgePreviewPage({ params }: PageProps) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "page.knowledge" });
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    redirect(
      `/${locale}/login?redirect=${encodeURIComponent(`/${locale}/knowledge/${id}`)}`,
    );
  }

  const ds = await getDataSource();
  const repo = ds.getRepository(KnowledgeBase);
  const kb = await repo.findOne({ where: { id, userId: reqCtx.user.id } });
  if (!kb) {
    notFound();
  }

  return (
    <KnowledgePreviewClient
      name={kb.name}
      description={kb.description}
      content={kb.content}
      contentFormat={kb.contentFormat}
      backLabel={t("backToKnowledgeBases")}
    />
  );
}
