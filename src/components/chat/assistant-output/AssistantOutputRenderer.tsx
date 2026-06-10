"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { AssistantOutputPayload } from "./types";
import { AssistantMarkdown } from "./variants/AssistantMarkdown";
import { AssistantText } from "./variants/AssistantText";

type Props = {
  payload: AssistantOutputPayload;
};

/**
 * 按助手输出类型选择组件；新增类型时在此增加 case 并实现对应 variants/* 组件。
 */
export function AssistantOutputRenderer({ payload }: Props) {
  const t = useTranslations("page.chat.output");
  let content: ReactNode;
  switch (payload.type) {
    case "text":
      content = <AssistantText body={payload.body} streaming={payload.streaming} />;
      break;
    case "markdown":
      content = <AssistantMarkdown body={payload.body} streaming={payload.streaming} />;
      break;
    default: {
      const _exhaustive: never = payload;
      return _exhaustive;
    }
  }

  return (
    <div className="space-y-2">
      {content}
      <p className="text-[11px] leading-relaxed text-zinc-500">{t("disclaimer")}</p>
    </div>
  );
}
