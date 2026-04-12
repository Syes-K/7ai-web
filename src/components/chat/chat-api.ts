/**
 * 对话页与 `/api/chat/*` 的 fetch 封装（携带 Cookie）。
 */

const JSON_HDR = { "Content-Type": "application/json; charset=utf-8" };

export class ChatApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ChatApiError";
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const data = (await res.json()) as
    | T
    | { error?: { code?: string; message?: string } };
  if (!res.ok) {
    const err = data as { error?: { code?: string; message?: string } };
    throw new ChatApiError(
      err.error?.message ?? res.statusText,
      res.status,
      err.error?.code,
    );
  }
  return data as T;
}

export type ConversationListItem = {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  preview: string | null;
  messageCount: number;
};

export type ConversationListResponse = {
  items: ConversationListItem[];
  nextCursor: string | null;
};

export async function fetchConversations(cursor?: string | null): Promise<ConversationListResponse> {
  const q = new URLSearchParams();
  q.set("limit", "50");
  if (cursor) {
    q.set("cursor", cursor);
  }
  const res = await fetch(`/api/chat/conversations?${q.toString()}`, {
    credentials: "include",
  });
  return parseResponse<ConversationListResponse>(res);
}

export type CreatedConversation = {
  conversation: {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
  };
};

export async function createConversation(title?: string | null): Promise<CreatedConversation> {
  const res = await fetch("/api/chat/conversations", {
    method: "POST",
    credentials: "include",
    headers: JSON_HDR,
    body: JSON.stringify(title != null ? { title } : {}),
  });
  return parseResponse<CreatedConversation>(res);
}

export type MessageRow = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

export type MessagesResponse = {
  items: MessageRow[];
  nextCursor: string | null;
};

export async function fetchMessages(
  conversationId: string,
  cursor?: string | null,
): Promise<MessagesResponse> {
  const q = new URLSearchParams();
  q.set("limit", "100");
  if (cursor) {
    q.set("cursor", cursor);
  }
  const res = await fetch(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages?${q.toString()}`,
    { credentials: "include" },
  );
  return parseResponse<MessagesResponse>(res);
}

export type SendMessageResponse = {
  userMessage: MessageRow;
  assistantMessage: MessageRow;
  conversation: { id: string; title: string; updatedAt: string };
};

/** 流式结束事件：助手消息 + 会话摘要 */
export type StreamAssistantDonePayload = MessageRow & {
  conversation: { id: string; title: string; updatedAt: string };
};

export type MessageStreamHandlers = {
  onUserMessage: (m: MessageRow) => void;
  onDelta: (text: string) => void;
  onDone: (payload: StreamAssistantDonePayload) => void;
  onError: (message: string, code?: string) => void;
};

function dispatchSseFrame(frame: string, handlers: MessageStreamHandlers): void {
  let eventName = "";
  const dataParts: string[] = [];
  for (const line of frame.split("\n")) {
    const normalized = line.replace(/\r$/, "");
    if (normalized.startsWith("event:")) {
      eventName = normalized.slice(6).trim();
    } else if (normalized.startsWith("data:")) {
      dataParts.push(normalized.slice(5).trimStart());
    }
  }
  const dataStr = dataParts.join("\n");
  if (!dataStr) {
    return;
  }
  let data: unknown;
  try {
    data = JSON.parse(dataStr) as Record<string, unknown>;
  } catch {
    return;
  }

  switch (eventName) {
    case "user_message":
      handlers.onUserMessage(data as MessageRow);
      break;
    case "assistant_delta": {
      const t = (data as { text?: string }).text;
      if (typeof t === "string" && t.length > 0) {
        handlers.onDelta(t);
      }
      break;
    }
    case "assistant_done":
      handlers.onDone(data as StreamAssistantDonePayload);
      break;
    case "error": {
      const err = data as { code?: string; message?: string };
      handlers.onError(err.message ?? "未知错误", err.code);
      break;
    }
    default:
      break;
  }
}

/** 从 buffer 中切出完整 SSE 帧（以空行分隔），返回未处理完的尾部 */
function drainSseFrames(buffer: string, handlers: MessageStreamHandlers): string {
  let rest = buffer;
  let sep: number;
  while ((sep = rest.indexOf("\n\n")) !== -1) {
    const frame = rest.slice(0, sep);
    rest = rest.slice(sep + 2);
    if (frame.trim()) {
      dispatchSseFrame(frame, handlers);
    }
  }
  return rest;
}

/**
 * POST 流式对话：解析 SSE（event + data JSON），失败时按 JSON 错误体抛出。
 */
export async function sendMessageStream(
  conversationId: string,
  content: string,
  handlers: MessageStreamHandlers,
): Promise<void> {
  const res = await fetch(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      credentials: "include",
      headers: JSON_HDR,
      body: JSON.stringify({ content, stream: true }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    try {
      const j = JSON.parse(text) as { error?: { code?: string; message?: string } };
      throw new ChatApiError(
        j.error?.message ?? res.statusText,
        res.status,
        j.error?.code,
      );
    } catch (e) {
      if (e instanceof ChatApiError) {
        throw e;
      }
      throw new ChatApiError(text || res.statusText, res.status);
    }
  }

  if (!res.body) {
    throw new Error("响应无 body");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (value) {
      buffer += decoder.decode(value, { stream: true });
    }
    buffer = drainSseFrames(buffer, handlers);
    if (done) {
      buffer += decoder.decode(new Uint8Array(), { stream: false });
      buffer = drainSseFrames(buffer, handlers);
      if (buffer.trim()) {
        dispatchSseFrame(buffer.trim(), handlers);
      }
      break;
    }
  }
}

export type ClearMessagesResponse = {
  conversation: {
    id: string;
    title: string;
    updatedAt: string;
    messageCount: number;
  };
  deletedCount: number;
};

export async function clearMessages(conversationId: string): Promise<ClearMessagesResponse> {
  const res = await fetch(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );
  return parseResponse<ClearMessagesResponse>(res);
}

/** 删除整条会话及下属消息 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const res = await fetch(`/api/chat/conversations/${encodeURIComponent(conversationId)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text();
    try {
      const j = JSON.parse(text) as { error?: { code?: string; message?: string } };
      throw new ChatApiError(j.error?.message ?? res.statusText, res.status, j.error?.code);
    } catch (e) {
      if (e instanceof ChatApiError) {
        throw e;
      }
      throw new ChatApiError(text || res.statusText, res.status);
    }
  }
}
