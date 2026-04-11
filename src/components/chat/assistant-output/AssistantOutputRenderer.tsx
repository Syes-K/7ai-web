"use client";

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
  switch (payload.type) {
    case "text":
      return <AssistantText body={payload.body} streaming={payload.streaming} />;
    case "markdown":
      return <AssistantMarkdown body={payload.body} streaming={payload.streaming} />;
    default: {
      const _exhaustive: never = payload;
      return _exhaustive;
    }
  }
}
