import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getDataSource } from "@/server/db/data-source";
import { KnowledgeBase } from "@/server/db/entities/KnowledgeBase";
import { getRequestUserContext } from "@/server/auth/request-user-context";

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
    <main className="min-h-screen bg-[#0b1020] px-4 py-6 text-white md:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/console/knowledge"
          className="mb-4 inline-flex items-center gap-1 text-sm text-white/60 hover:text-cyan-300"
        >
          <ArrowLeftOutlined className="text-xs" />
          {t("backToKnowledgeBases")}
        </Link>

        <header className="mb-4">
          <h1 className="text-lg font-medium text-white/90">{kb.name}</h1>
          {kb.description ? (
            <p className="mt-1 text-sm text-white/65">{kb.description}</p>
          ) : null}
        </header>

        <section className="rounded-lg border border-white/10 bg-black/20 p-4">
          {kb.contentFormat === "markdown" ? (
            <MarkdownRenderer
              body={kb.content}
              variant="console"
              className="text-[14px] leading-6"
            />
          ) : (
            <div className="whitespace-pre-wrap break-words text-[14px] leading-6 text-white/85">
              {kb.content}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
