"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  type ComponentProps,
  type ComponentPropsWithoutRef,
} from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import { AssistantText } from "./AssistantText";
import "highlight.js/styles/github-dark.min.css";
import "./assistant-markdown-hljs.css";

type Props = {
  body: string;
  streaming?: boolean;
};

const ROOT_CLASS =
  "assistant-markdown min-w-0 w-full max-w-full break-words break-anywhere text-zinc-100";

/** 无语言标记的围栏也尝试高亮（模型常省略 ``` 后的语言 id） */
const rehypeHighlightOptions = { detect: true } as const;

const MD_COMPONENTS = {
  a: (props: ComponentPropsWithoutRef<"a">) => (
    <a {...props} className="text-fuchsia-300 underline hover:text-fuchsia-200" />
  ),
  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      {...props}
      className="my-3 border-l-4 border-zinc-600 pl-3 text-zinc-300"
    />
  ),
  h1: (props: ComponentPropsWithoutRef<"h1">) => (
    <h1 {...props} className="mb-3 mt-5 text-2xl font-semibold" />
  ),
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2 {...props} className="mb-2 mt-4 text-xl font-semibold" />
  ),
  h3: (props: ComponentPropsWithoutRef<"h3">) => (
    <h3 {...props} className="mb-2 mt-3 text-lg font-semibold" />
  ),
  hr: (props: ComponentPropsWithoutRef<"hr">) => (
    <hr {...props} className="my-4 border-zinc-700" />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => <p {...props} className="my-2" />,
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul {...props} className="my-2 list-disc pl-6" />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol {...props} className="my-2 list-decimal pl-6" />
  ),
  li: (props: ComponentPropsWithoutRef<"li">) => <li {...props} className="my-1" />,
  strong: (props: ComponentPropsWithoutRef<"strong">) => (
    <strong {...props} className="font-semibold" />
  ),
  table: (props: ComponentPropsWithoutRef<"table">) => (
    <table
      {...props}
      className="my-3 w-full max-w-full table-fixed border-collapse"
    />
  ),
  th: (props: ComponentPropsWithoutRef<"th">) => (
    <th
      {...props}
      className="break-words border border-zinc-700 bg-zinc-800/70 px-3 py-2 text-left"
    />
  ),
  td: (props: ComponentPropsWithoutRef<"td">) => (
    <td {...props} className="break-words border border-zinc-700 px-3 py-2" />
  ),
  pre: (props: ComponentPropsWithoutRef<"pre">) => {
    const { children, ...rest } = props;
    const normalized = Children.map(children, (child) => {
      if (!isValidElement<{ className?: string }>(child) || child.type !== "code") {
        return child;
      }
      return cloneElement(child, {
        className: `${child.props.className ?? ""} __md-pre-code block min-w-0 w-full max-w-full rounded-none bg-transparent p-0`.trim(),
      });
    });

    return (
      <pre
        {...rest}
        className="my-3 box-border w-full min-w-0 max-w-full overflow-x-auto rounded-lg bg-zinc-900/80 p-3 font-mono"
      >
        {normalized}
      </pre>
    );
  },
  code: ({ className, children, ...props }: ComponentPropsWithoutRef<"code">) => {
    const isPreCode = className?.includes("__md-pre-code");
    return (
      <code
        {...props}
        className={
          isPreCode
            ? (className ?? "").replace("__md-pre-code", "").trim()
            : `${className ?? ""} rounded bg-zinc-800/70 py-0.5`.trim()
        }
      >
        {children}
      </code>
    );
  },
} satisfies NonNullable<ComponentProps<typeof ReactMarkdown>["components"]>;

export function AssistantMarkdown({ body, streaming }: Props) {
  if (streaming && body.trim() === "") {
    return <AssistantText body={body} streaming={streaming} />;
  }

  return (
    <div className={ROOT_CLASS}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, rehypeHighlightOptions]]}
        components={MD_COMPONENTS}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
