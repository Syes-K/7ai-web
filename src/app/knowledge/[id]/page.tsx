import { notFound, redirect } from "next/navigation";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { getDataSource } from "@/server/db/data-source";
import { KnowledgeBase } from "@/server/db/entities/KnowledgeBase";
import { getRequestUserContext } from "@/server/auth/request-user-context";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function KnowledgePreviewPage({ params }: PageProps) {
  const { id } = await params;
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    redirect(`/login?redirect=${encodeURIComponent(`/knowledge/${id}`)}`);
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
