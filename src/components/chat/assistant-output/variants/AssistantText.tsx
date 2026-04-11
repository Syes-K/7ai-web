"use client";

type Props = {
  body: string;
  streaming?: boolean;
};

/**
 * 助手纯文本输出（含流式光标）。
 */
export function AssistantText({ body, streaming }: Props) {
  return (
    <div className="whitespace-pre-wrap break-words">
      {body}
      {streaming && (
        <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-fuchsia-400 align-middle" />
      )}
    </div>
  );
}
