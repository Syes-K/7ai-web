"use client";

import { AssistantText } from "./AssistantText";

type Props = {
  body: string;
  streaming?: boolean;
};

/**
 * Markdown 输出占位：协议支持后在此接入 MD 渲染（如 react-markdown）；
 * 当前与纯文本一致，避免破坏现有流式体验。
 */
export function AssistantMarkdown({ body, streaming }: Props) {
  return <AssistantText body={body} streaming={streaming} />;
}
