/**
 * 对话页与 `/api/chat/*` 的 fetch 封装（携带 Cookie）。
 */

import type { AssistantListItem } from "@/common/types";

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

/** 与会话绑定的助手快照（API 字段 assistant） */
export type ChatConversationAssistant = {
  id: string;
  name: string;
  icon: string | null;
};

export type ConversationListItem = {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  /** 已废弃展示，服务端恒为 null */
  preview: string | null;
  messageCount: number;
  lastActivityAt: string;
  assistant: ChatConversationAssistant | null;
  assistantUnavailable?: boolean;
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
    lastActivityAt: string;
    assistant: ChatConversationAssistant | null;
    assistantUnavailable?: boolean;
  };
};

export type CreateConversationOptions = {
  title?: string | null;
  /** 传入则绑定该助手并注入开场消息；省略为普通对话 */
  assistantId?: string | null;
};

export async function createConversation(
  options?: CreateConversationOptions | string | null,
): Promise<CreatedConversation> {
  const opts: CreateConversationOptions =
    typeof options === "string" || options === null || options === undefined
      ? { title: typeof options === "string" ? options : undefined }
      : options;
  const body: Record<string, unknown> = {};
  if (opts.title != null) {
    body.title = opts.title;
  }
  if (opts.assistantId != null && opts.assistantId !== undefined) {
    body.assistantId = opts.assistantId;
  }
  const res = await fetch("/api/chat/conversations", {
    method: "POST",
    credentials: "include",
    headers: JSON_HDR,
    body: JSON.stringify(body),
  });
  return parseResponse<CreatedConversation>(res);
}

/** 新建对话选助手：拉取与控制台一致的可见列表 */
export async function fetchAssistantsForPicker(): Promise<AssistantListItem[]> {
  const res = await fetch("/api/console/assistants?page=1&pageSize=100", {
    credentials: "include",
  });
  const data = await parseResponse<{ items: AssistantListItem[] }>(res);
  return data.items;
}

export type MessageRow = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  turnId?: string | null;
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

export type TurnsResponse = {
  items: TurnSnapshotPayload[];
};

export async function fetchTurns(conversationId: string): Promise<TurnsResponse> {
  const res = await fetch(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/turns`,
    { credentials: "include" },
  );
  const parsed = await parseResponse<TurnsResponse>(res);
  parsed.items = parsed.items.map(normalizeTurnSnapshotPayload);
  return parsed;
}

export type SendMessageResponse = {
  userMessage: MessageRow;
  assistantMessage: MessageRow;
  turn?: TurnSnapshotPayload;
  conversation: { id: string; title: string; updatedAt: string };
};

/** 流式结束事件：助手消息 + 会话摘要 */
export type StreamAssistantDonePayload = MessageRow & {
  conversation: { id: string; title: string; updatedAt: string };
};

export type TurnStepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "interrupted";

export type TurnInterruptionReason =
  | "user_cancelled"
  | "network_disconnected"
  | "server_timeout"
  | "unknown";

export type TurnMainStage = "A" | "B" | "C" | "D" | "E" | "F";

export type TurnStep = {
  stepKey: string;
  mainStage: TurnMainStage;
  subStage: string;
  status: TurnStepStatus;
  reasonTag: string | null;
  safeMessage: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  error: { code: string; message: string } | null;
  details?: Array<{ title: string; content: string }>;
  seq: number;
};

export type TurnReasoningPayload = {
  visibilityLevel: 0;
  status: "not_triggered" | "running" | "completed" | "failed" | "interrupted";
  safeSummary: string | null;
};

export type TurnSnapshotPayload = {
  turnId: string;
  userMessageId?: string | null;
  assistantMessageId?: string | null;
  finalStatus: "completed" | "failed" | "interrupted";
  interruptionReason: TurnInterruptionReason | null;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number | null;
  steps: {
    version: "0.1.8";
    frozen: boolean;
    mainStages: Array<{ stage: TurnMainStage; status: TurnStepStatus }>;
    subSteps: TurnStep[];
    reasoning: TurnReasoningPayload;
  };
  reasoning: TurnReasoningPayload;
};

export type StreamTurnStartedPayload = {
  turnId: string;
  conversationId: string;
  steps?: TurnSnapshotPayload["steps"];
};

export type StreamTurnStepDeltaPayload = {
  turnId: string;
  seq: number;
  step: TurnStep;
  snapshot: TurnSnapshotPayload["steps"];
};

export type MessageStreamHandlers = {
  onUserMessage: (m: MessageRow) => void;
  onDelta: (text: string) => void;
  onDone: (payload: StreamAssistantDonePayload) => void;
  onError: (message: string, code?: string) => void;
  onTurnStarted?: (payload: StreamTurnStartedPayload) => void;
  onTurnStepDelta?: (payload: StreamTurnStepDeltaPayload) => void;
  onTurnCompleted?: (payload: TurnSnapshotPayload) => void;
  onTurnFailed?: (payload: TurnSnapshotPayload) => void;
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
    case "turn_started":
      handlers.onTurnStarted?.(data as StreamTurnStartedPayload);
      break;
    case "turn_step_delta":
      handlers.onTurnStepDelta?.(data as StreamTurnStepDeltaPayload);
      break;
    case "turn_completed":
      handlers.onTurnCompleted?.(normalizeTurnSnapshotPayload(data));
      break;
    case "turn_failed":
      handlers.onTurnFailed?.(normalizeTurnSnapshotPayload(data));
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
  options?: { retryUserMessageId?: string | null },
): Promise<void> {
  const res = await fetch(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      credentials: "include",
      headers: JSON_HDR,
      body: JSON.stringify({
        content,
        stream: true,
        retryUserMessageId: options?.retryUserMessageId ?? null,
      }),
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

/**
 * 将 subStep 上的 details 规范为对象数组。
 * 若仅 `Array.isArray` 判断，会把「JSON 字符串形式存库的 details」误写成 []，导致刷新后前端无分段。
 */
function coerceStepDetailsArray(raw: unknown): Array<{ title: string; content: string }> {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw as Array<{ title: string; content: string }>;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      if (Array.isArray(p)) return p as Array<{ title: string; content: string }>;
      if (p != null && typeof p === "object" && !Array.isArray(p)) {
        const o = p as Record<string, unknown>;
        if ("title" in o || "content" in o || "Title" in o || "Content" in o) {
          return [p as { title: string; content: string }];
        }
      }
      return [];
    } catch {
      return [];
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if ("title" in o || "content" in o || "Title" in o || "Content" in o) {
      return [raw as { title: string; content: string }];
    }
    /** 类数组对象 `{0:{...},1:{...}}` 等，与 `stepDetailsToBlocks` 对齐 */
    const vals = Object.values(o);
    if (
      vals.length > 0 &&
      vals.every((v) => v != null && typeof v === "object")
    ) {
      return vals.flatMap((v) => coerceStepDetailsArray(v));
    }
  }
  return [];
}

/** 保证每条 subStep 带上 `details` 数组，兼容 `Details`、JSON 字符串等。 */
function normalizeSubStepsForPayload(raw: unknown): TurnSnapshotPayload["steps"]["subSteps"] {
  if (!Array.isArray(raw)) return [];
  return raw.map((step) => {
    if (step == null || typeof step !== "object") return step as TurnSnapshotPayload["steps"]["subSteps"][number];
    const s = step as Record<string, unknown>;
    const dRaw = s.details ?? s.Details;
    const details = coerceStepDetailsArray(dRaw);
    return {
      ...s,
      details,
    } as TurnSnapshotPayload["steps"]["subSteps"][number];
  });
}

/** 规范化每条 subStep 的 `details`，供 REST、SSE 与 UI 共用。 */
export function finalizeStepsSnapshotForClient(
  steps: TurnSnapshotPayload["steps"],
): TurnSnapshotPayload["steps"] {
  return {
    ...steps,
    subSteps: normalizeSubStepsForPayload(steps.subSteps),
  };
}

function normalizeTurnSnapshotPayload(raw: unknown): TurnSnapshotPayload {
  const input = (raw ?? {}) as Record<string, unknown>;
  const steps = (input.steps ?? {}) as TurnSnapshotPayload["steps"];
  const reasoningRaw = (input.reasoning ?? steps?.reasoning ?? {}) as Partial<TurnReasoningPayload>;
  const reasoning: TurnReasoningPayload = {
    visibilityLevel: 0,
    status: reasoningRaw.status ?? "not_triggered",
    safeSummary: reasoningRaw.safeSummary ?? null,
  };
  return {
    turnId: String(input.turnId ?? input.id ?? ""),
    userMessageId: typeof input.userMessageId === "string" ? input.userMessageId : null,
    assistantMessageId: typeof input.assistantMessageId === "string" ? input.assistantMessageId : null,
    finalStatus: (input.finalStatus as TurnSnapshotPayload["finalStatus"]) ?? "failed",
    interruptionReason: (input.interruptionReason as TurnInterruptionReason | null) ?? null,
    startedAt: typeof input.startedAt === "string" ? input.startedAt : undefined,
    endedAt: typeof input.endedAt === "string" ? input.endedAt : undefined,
    durationMs: typeof input.durationMs === "number" ? input.durationMs : null,
    steps: finalizeStepsSnapshotForClient({
      version: steps?.version ?? "0.1.8",
      frozen: Boolean(steps?.frozen),
      mainStages: Array.isArray(steps?.mainStages) ? steps.mainStages : [],
      subSteps: Array.isArray(steps?.subSteps) ? steps.subSteps : [],
      reasoning: {
        visibilityLevel: 0,
        status: steps?.reasoning?.status ?? reasoning.status,
        safeSummary: steps?.reasoning?.safeSummary ?? reasoning.safeSummary,
      },
    }),
    reasoning,
  };
}

/** 非流式发送：返回完整 turn 快照（若后端提供） */
export async function sendMessage(
  conversationId: string,
  content: string,
  options?: { retryUserMessageId?: string | null },
): Promise<SendMessageResponse> {
  const res = await fetch(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      credentials: "include",
      headers: JSON_HDR,
      body: JSON.stringify({
        content,
        stream: false,
        retryUserMessageId: options?.retryUserMessageId ?? null,
      }),
    },
  );
  const parsed = await parseResponse<SendMessageResponse>(res);
  if (parsed.turn) {
    parsed.turn = normalizeTurnSnapshotPayload(parsed.turn);
  }
  return parsed;
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
