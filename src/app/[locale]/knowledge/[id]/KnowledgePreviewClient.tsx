"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { Link } from "@/i18n/navigation";

type Props = {
  name: string;
  description: string | null;
  content: string;
  contentFormat: string;
  backLabel: string;
};

/** 知识库预览 UI：Client 边界，避免 RSC 直接加载 @ant-design/icons */
export default function KnowledgePreviewClient({
  name,
  description,
  content,
  contentFormat,
  backLabel,
}: Props) {
  return (
    <main className="min-h-screen bg-[#0b1020] px-4 py-6 text-white md:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/console/knowledge"
          className="mb-4 inline-flex items-center gap-1 text-sm text-white/60 hover:text-cyan-300"
        >
          <ArrowLeftOutlined className="text-xs" />
          {backLabel}
        </Link>

        <header className="mb-4">
          <h1 className="text-lg font-medium text-white/90">{name}</h1>
          {description ? (
            <p className="mt-1 text-sm text-white/65">{description}</p>
          ) : null}
        </header>

        <section className="rounded-lg border border-white/10 bg-black/20 p-4">
          {contentFormat === "markdown" ? (
            <MarkdownRenderer
              body={content}
              variant="console"
              className="text-[14px] leading-6"
            />
          ) : (
            <div className="whitespace-pre-wrap break-words text-[14px] leading-6 text-white/85">
              {content}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
