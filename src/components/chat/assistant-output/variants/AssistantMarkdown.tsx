"use client";

import { AssistantText } from "./AssistantText";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";

type Props = {
  body: string;
  streaming?: boolean;
};

export function AssistantMarkdown({ body, streaming }: Props) {
  if (streaming && body.trim() === "") {
    return <AssistantText body={body} streaming={streaming} />;
  }

  return <MarkdownRenderer body={body} variant="chat" />;
}
