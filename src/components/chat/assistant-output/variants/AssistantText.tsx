"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  body: string;
  streaming?: boolean;
};

/** 首包未到达：提示文案轮换 + 跳点 */
function StreamingWaitBlock({ tips }: { tips: readonly string[] }) {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (tips.length <= 1) {
      return;
    }
    const id = window.setInterval(() => {
      setTipIndex((n) => (n + 1) % tips.length);
    }, 2800);
    return () => clearInterval(id);
  }, [tips.length]);

  const tip = tips[tipIndex] ?? tips[0] ?? "";

  return (
    <div
      className="flex flex-col gap-3 py-0.5"
      role="status"
      aria-live="polite"
      aria-label={tip}
    >
      <p key={tipIndex} className="chat-assistant-tip-fade text-sm leading-relaxed text-zinc-400">
        {tip}
      </p>
      <div className="flex items-center gap-1.5" aria-hidden>
        {[0, 1, 2].map((k) => (
          <span
            key={k}
            className="chat-assistant-wait-dot inline-block h-2 w-2 rounded-full bg-fuchsia-400/85"
          />
        ))}
      </div>
    </div>
  );
}

/** 流式输出中：渐变竖条光标 */
function StreamingCaret() {
  return (
    <span
      className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse rounded-sm bg-gradient-to-b from-fuchsia-300 to-fuchsia-500 align-middle shadow-[0_0_10px_rgba(217,70,239,0.4)] motion-reduce:shadow-none motion-reduce:animate-none"
      aria-hidden
    />
  );
}

/**
 * 助手纯文本输出（流式：首包前为等待态文案+动画，有内容后为正文+光标）。
 */
export function AssistantText({ body, streaming }: Props) {
  const t = useTranslations("page.chat");
  const tips = useMemo(() => {
    const raw = t.raw("assistantStreaming.waitTips");
    return Array.isArray(raw) ? (raw as string[]) : [];
  }, [t]);
  const waitingForFirstChunk = Boolean(streaming && body.trim() === "");

  if (waitingForFirstChunk) {
    return <StreamingWaitBlock tips={tips} />;
  }

  return (
    <div className="whitespace-pre-wrap break-words">
      {body}
      {streaming && <StreamingCaret />}
    </div>
  );
}
