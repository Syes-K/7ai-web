/**
 * 助手侧输出类型：与服务端消息协议对齐后扩展（如流式 MD、交互确认、表单 JSON 等）。
 * 当前持久化层仅存 `content` 字符串时，默认按 text 渲染。
 */

export type AssistantOutputType = "text" | "markdown";

/** 纯文本 / 流式文本（默认） */
export type AssistantTextPayload = {
  type: "text";
  body: string;
  streaming?: boolean;
};

/** Markdown（协议就绪后由服务端标注 type，前端再接 MD 渲染器） */
export type AssistantMarkdownPayload = {
  type: "markdown";
  body: string;
  streaming?: boolean;
};

/** 联合类型：新增变体时在此追加并在 AssistantOutputRenderer 中分支 */
export type AssistantOutputPayload = AssistantTextPayload | AssistantMarkdownPayload;

/** 由单条消息的 content 解析负载；暂无元数据时一律视为 text */
export function assistantPayloadFromContent(
  content: string,
  options?: { streaming?: boolean; preferMarkdown?: boolean },
): AssistantOutputPayload {
  const streaming = options?.streaming;
  if (options?.preferMarkdown) {
    return { type: "markdown", body: content, streaming };
  }
  return { type: "markdown", body: content, streaming };
  // return { type: "text", body: content, streaming };
}
