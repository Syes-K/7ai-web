"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import dayjs from "dayjs";
import { MessageRole } from "@/common/enums";
import {
  AssistantOutputRenderer,
  assistantPayloadFromContent,
} from "./assistant-output";
import { confirm } from "@/components/ui/confirm";
import { ModalShell } from "@/components/ui/modal-shell";
import {
  IconClear,
  IconConfig,
  IconDots,
  IconEmptyState,
  IconMenu,
  IconPlus,
  IconSend,
  IconTrash,
} from "@/components/ui/icons";
import {
  ChatApiError,
  clearMessages,
  createConversation,
  deleteConversation,
  fetchAssistantsForPicker,
  fetchConversations,
  fetchMessages,
  sendMessageStream,
  type ConversationListItem,
  type CreatedConversation,
  type MessageRow,
} from "./chat-api";
import { BrandMark } from "@/components/brand/BrandMark";
import type { AssistantListItem } from "@/common/types";

/** 侧栏宽度：原 300px 缩小 30% */
const SIDEBAR_WIDTH = "lg:w-[210px]";
const DRAWER_WIDTH = "w-[min(100vw,252px)]";

function conversationToListItem(c: CreatedConversation["conversation"]): ConversationListItem {
  return {
    id: c.id,
    title: c.title,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    preview: null,
    messageCount: c.messageCount,
    lastActivityAt: c.lastActivityAt,
    assistant: c.assistant,
    assistantUnavailable: c.assistantUnavailable,
  };
}

/** 侧栏「最后一次沟通」：YYYY-MM-DD HH:mm（24h） */
function formatLastCommunicationAt(iso: string): string {
  return dayjs(iso).format("YYYY-MM-DD HH:mm");
}

function useIsLg() {
  const [lg, setLg] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setLg(mq.matches);
    const fn = () => setLg(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return lg;
}

function MessageBubble({
  row,
  streaming,
  userLabel,
  assistantBubbleLabel,
}: {
  row: MessageRow;
  streaming?: boolean;
  /** 当前登录用户展示名（昵称或邮箱前缀），仅用户气泡使用 */
  userLabel: string;
  /** 已绑定会话时展示「图标 + 助手名」，否则为「助手」 */
  assistantBubbleLabel?: string | null;
}) {
  const isUser = row.role === MessageRole.User;
  const userShown = userLabel.trim() || "用户";
  const assistantShown =
    !isUser && assistantBubbleLabel?.trim()
      ? assistantBubbleLabel.trim()
      : !isUser
        ? "助手"
        : "";
  return (
    <div className={`mb-3 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`min-w-0 max-w-[min(100%,720px)] rounded-xl border px-3 py-2.5 text-sm leading-relaxed shadow-lg ${isUser
          ? "border-cyan-500/35 bg-cyan-500/10 text-cyan-50"
          : "border-fuchsia-500/25 bg-zinc-900/90 text-zinc-100 shadow-[0_0_24px_-4px_rgba(217,70,239,0.15)]"
          }`}
      >
        <div
          className={`mb-1 font-mono text-[10px] tracking-wider ${isUser ? "text-cyan-400/75" : "text-zinc-400"}`}
        >
          {isUser ? userShown : assistantShown}
        </div>
        {isUser ? (
          <div className="whitespace-pre-wrap break-words">{row.content}</div>
        ) : (
          <AssistantOutputRenderer
            payload={assistantPayloadFromContent(row.content, { streaming })}
          />
        )}
      </div>
    </div>
  );
}

type Toast = { type: "ok" | "err"; text: string };

export function ChatWorkspace({
  userLabel,
  freeTierAssistantHint = false,
}: {
  userLabel: string;
  /** 服务端根据账号偏好判定：未选模型、或选用公有模型时为 true */
  freeTierAssistantHint?: boolean;
}) {
  /** 是否为桌面端 */
  const isDesktop = useIsLg();

  const [listLoading, setListLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messages, setMessages] = useState<MessageRow[]>([]);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const inputValue = selectedId ? (drafts[selectedId] ?? "") : "";
  const setInputValue = (v: string) => {
    if (!selectedId) {
      return;
    }
    setDrafts((prev) => ({ ...prev, [selectedId]: v }));
  };

  const [sending, setSending] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [streaming, setStreaming] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const sendInFlightRef = useRef(false);

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [pickerItems, setPickerItems] = useState<AssistantListItem[]>([]);
  const [pickerSelectedId, setPickerSelectedId] = useState<string | null>(null);
  const newChatDescId = useId();
  const skipNewChatRef = useRef<HTMLButtonElement>(null);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  const loadConversationList = useCallback(async () => {
    setListLoading(true);
    try {
      const { items } = await fetchConversations();
      setConversations(items);
      return items;
    } catch (e) {
      if (e instanceof ChatApiError && e.status === 401) {
        window.location.href = "/login?redirect=/chat";
        return [];
      }
      showToast({ type: "err", text: e instanceof Error ? e.message : "加载会话列表失败" });
      return [];
    } finally {
      setListLoading(false);
    }
  }, [showToast]);

  const loadMessagesFor = useCallback(
    async (conversationId: string) => {
      setMessagesLoading(true);
      try {
        const { items } = await fetchMessages(conversationId);
        setMessages(items);
        scrollToBottom();
      } catch (e) {
        showToast({ type: "err", text: e instanceof Error ? e.message : "加载消息失败" });
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    },
    [showToast, scrollToBottom],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setListLoading(true);
      try {
        let { items } = await fetchConversations();
        if (cancelled) {
          return;
        }
        if (items.length === 0) {
          const { conversation } = await createConversation();
          if (cancelled) {
            return;
          }
          items = [conversationToListItem(conversation)];
        }
        setConversations(items);
        const first = items[0].id;
        setSelectedId(first);
        setMessagesLoading(true);
        try {
          const { items: msgs } = await fetchMessages(first);
          if (cancelled) {
            return;
          }
          setMessages(msgs);
        } catch (e) {
          if (!cancelled) {
            showToast({ type: "err", text: e instanceof Error ? e.message : "加载消息失败" });
            setMessages([]);
          }
        } finally {
          if (!cancelled) {
            setMessagesLoading(false);
          }
        }
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ChatApiError && e.status === 401) {
            window.location.href = "/login?redirect=/chat";
          } else {
            showToast({ type: "err", text: e instanceof Error ? e.message : "加载会话列表失败" });
          }
        }
      } finally {
        if (!cancelled) {
          setListLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamText, scrollToBottom]);

  const handleSelectConversation = useCallback(
    async (id: string) => {
      setSelectedId(id);
      if (!isDesktop) {
        setDrawerOpen(false);
      }
      setStreaming(false);
      setStreamText("");
      await loadMessagesFor(id);
    },
    [isDesktop, loadMessagesFor],
  );

  const loadPickerAssistants = useCallback(async () => {
    setPickerError(null);
    setPickerLoading(true);
    try {
      const items = await fetchAssistantsForPicker();
      setPickerItems(items);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "加载助手列表失败";
      setPickerError(msg);
      setPickerItems([]);
    } finally {
      setPickerLoading(false);
    }
  }, []);

  const openNewChatModal = useCallback(() => {
    setPickerSelectedId(null);
    setPickerError(null);
    setNewChatOpen(true);
    void loadPickerAssistants();
  }, [loadPickerAssistants]);

  const finishCreateConversation = useCallback(
    async (opts?: { assistantId?: string | null }) => {
      try {
        const { conversation } = await createConversation(opts);
        setNewChatOpen(false);
        setSelectedId(conversation.id);
        setMessages([]);
        setStreaming(false);
        setStreamText("");
        await loadConversationList();
        await loadMessagesFor(conversation.id);
        if (!isDesktop) {
          setDrawerOpen(false);
        }
      } catch (e) {
        showToast({
          type: "err",
          text: e instanceof Error ? e.message : "创建会话失败",
        });
      }
    },
    [isDesktop, loadConversationList, loadMessagesFor, showToast],
  );

  const handleNewConversation = useCallback(() => {
    void openNewChatModal();
  }, [openNewChatModal]);

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      const ok = await confirm({
        title: "删除会话",
        content: "确定删除该会话？下属消息将一并删除且不可恢复。",
        okText: "删除",
        cancelText: "取消",
        okDanger: true,
      });
      if (!ok) {
        return;
      }
      try {
        await deleteConversation(id);
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        const nextList = conversations.filter((c) => c.id !== id);
        if (nextList.length === 0) {
          const { conversation } = await createConversation();
          const item = conversationToListItem(conversation);
          setConversations([item]);
          setSelectedId(item.id);
          setMessages([]);
          setStreaming(false);
          setStreamText("");
        } else {
          setConversations(nextList);
          if (selectedId === id) {
            const pick = nextList[0].id;
            setSelectedId(pick);
            await loadMessagesFor(pick);
          }
        }
      } catch (e) {
        showToast({ type: "err", text: e instanceof Error ? e.message : "删除失败" });
      }
    },
    [conversations, loadMessagesFor, selectedId, showToast],
  );

  const handleSend = async () => {
    if (!selectedId) {
      showToast({ type: "err", text: "请先新建或选择一个会话" });
      return;
    }
    if (sendInFlightRef.current) {
      return;
    }
    const text = [...inputValue.trim()].join("");
    if (!text) {
      showToast({ type: "err", text: "请输入内容" });
      return;
    }

    sendInFlightRef.current = true;
    setSending(true);
    setStreaming(true);
    setStreamText("");

    try {
      await sendMessageStream(selectedId, text, {
        onUserMessage: (u) => {
          setMessages((prev) => (prev.some((m) => m.id === u.id) ? prev : [...prev, u]));
          setDrafts((prev) => {
            const next = { ...prev };
            delete next[selectedId];
            return next;
          });
        },
        onDelta: (d) => {
          setStreamText((s) => s + d);
        },
        onDone: (p) => {
          setMessages((prev) =>
            prev.some((m) => m.id === p.id)
              ? prev
              : [
                  ...prev,
                  {
                    id: p.id,
                    role: p.role,
                    content: p.content,
                    createdAt: p.createdAt,
                  },
                ],
          );
          setStreamText("");
          setStreaming(false);
          void loadConversationList();
          scrollToBottom();
        },
        onError: async (msg) => {
          showToast({ type: "err", text: msg });
          setStreamText("");
          setStreaming(false);
          try {
            const { items } = await fetchMessages(selectedId);
            setMessages(items);
          } catch {
            /* 保持当前列表，避免失败后再报错 */
          }
        },
      });
    } catch (e) {
      showToast({ type: "err", text: e instanceof Error ? e.message : "发送失败" });
      setStreamText("");
      setStreaming(false);
      try {
        const { items } = await fetchMessages(selectedId);
        setMessages(items);
      } catch {
        /* 同上 */
      }
    } finally {
      sendInFlightRef.current = false;
      setSending(false);
      requestAnimationFrame(() => {
        composerRef.current?.focus();
      });
    }
  };

  const selectedConv = conversations.find((c) => c.id === selectedId) ?? null;
  /** 设计 §3.4：助手不可用时助手消息降级为泛化「助手」标签 */
  const assistantBubbleLabel =
    selectedConv?.assistant != null
      ? selectedConv.assistantUnavailable
        ? "助手"
        : `${selectedConv.assistant.icon ?? "🤖"} ${selectedConv.assistant.name}`
      : null;

  const handleClear = () => {
    if (!selectedId) {
      return;
    }
    void (async () => {
      const ok = await confirm({
        title: "清空消息",
        content:
          "将删除本会话中的全部消息，会话仍保留在列表中。清空后无法恢复已删内容，是否继续？",
        okText: "清空",
        cancelText: "取消",
        okDanger: true,
      });
      if (!ok) {
        return;
      }
      try {
        await clearMessages(selectedId);
        setMessages([]);
        setStreamText("");
        setStreaming(false);
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[selectedId];
          return next;
        });
        await loadConversationList();
      } catch (e) {
        showToast({ type: "err", text: e instanceof Error ? e.message : "清空失败" });
      }
    })();
  };

  const sidebarInner = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 p-2">
        <button
          type="button"
          onClick={() => void handleNewConversation()}
          title="新建对话"
          className="flex w-full items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-500/15 py-2.5 text-cyan-200 shadow-[0_0_20px_-6px_rgba(34,211,238,0.5)] transition hover:bg-cyan-500/25"
          aria-label="新建对话"
        >
          <IconPlus />
          <span className="text-sm ml-2">新建对话</span>
        </button>
      </div>
      <div className="chat-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4">
        {listLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-2 text-center font-mono text-xs text-zinc-500">暂无历史会话</p>
        ) : (
          <ul className="space-y-1.5">
            {conversations.map((item: ConversationListItem) => (
              <li
                key={item.id}
                className={`flex items-start rounded-lg transition ${item.id === selectedId
                  ? "bg-cyan-500/10 shadow-[inset_3px_0_0_0_rgba(34,211,238,0.8)]"
                  : "bg-zinc-900/40 hover:bg-zinc-900/70"
                  }`}
              >
                <button
                  type="button"
                  onClick={() => void handleSelectConversation(item.id)}
                  className="min-w-0 flex-1 px-2.5 py-2.5 text-left"
                >
                  {/* 层次：标题最亮 → 助手次弱 → 时间最弱；间距略松避免挤成一团 */}
                  <div className="flex min-w-0 flex-col">
                    <div className="truncate text-[13px] font-medium leading-snug tracking-tight text-zinc-50">
                      {item.title}
                    </div>
                    {item.assistant != null && (
                      <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11px] leading-snug text-zinc-500">
                        {item.assistantUnavailable ? (
                          <span className="truncate" title="助手不可用">
                            <span className="opacity-70" aria-hidden>
                              🤖
                            </span>
                            <span className="ml-1">助手不可用</span>
                          </span>
                        ) : (
                          <>
                            <span
                              className="flex h-4 w-4 shrink-0 items-center justify-center text-[13px] leading-none opacity-85"
                              aria-hidden
                            >
                              {item.assistant.icon ?? "🤖"}
                            </span>
                            <span className="min-w-0 truncate text-zinc-400">{item.assistant.name}</span>
                          </>
                        )}
                      </div>
                    )}
                    <div
                      className={`font-mono text-[10px] tabular-nums tracking-wide text-zinc-600 ${item.assistant != null ? "mt-2" : "mt-1.5"
                        }`}
                    >
                      {formatLastCommunicationAt(item.lastActivityAt ?? item.updatedAt)}
                    </div>
                  </div>
                </button>
                <div className="group/more relative flex shrink-0 self-start pr-1 pt-2">
                  <div className="relative flex h-7 w-7 items-center justify-center">
                    <span className="flex items-center justify-center text-zinc-500 transition group-hover/more:pointer-events-none group-hover/more:opacity-0">
                      <IconDots />
                    </span>
                    <button
                      type="button"
                      title="删除会话"
                      aria-label="删除会话"
                      className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md text-zinc-500 opacity-0 transition hover:bg-zinc-800/50 hover:text-rose-400/90 group-hover/more:pointer-events-auto group-hover/more:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteConversation(item.id);
                      }}
                    >
                      <IconClear />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#050508] text-zinc-200">
      {/* 赛博网格背景 */}
      <div
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(6,182,212,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.04)_1px,transparent_1px)] bg-[size:48px_48px] opacity-70"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,211,238,0.12),transparent)]"
        aria-hidden
      />

      {toast && (
        <div
          className={`chat-toast-enter fixed left-1/2 top-4 z-[60] rounded-lg border px-4 py-2 font-mono text-sm shadow-xl sm:top-6 ${toast.type === "ok"
            ? "border-emerald-500/40 bg-emerald-950/90 text-emerald-200"
            : "border-rose-500/40 bg-rose-950/90 text-rose-100"
            }`}
          role="status"
        >
          {toast.text}
        </div>
      )}

      <ModalShell
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        title="新建对话"
        titleId="chat-new-dialog-title"
        describedBy={newChatDescId}
        initialFocusRef={skipNewChatRef}
        footer={
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              ref={skipNewChatRef}
              type="button"
              onClick={() => void finishCreateConversation()}
              className="rounded-lg border border-zinc-600 bg-zinc-900/90 px-4 py-2 font-mono text-sm text-zinc-200 transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-0"
            >
              跳过 · 普通对话
            </button>
            <button
              type="button"
              disabled={pickerLoading || !pickerSelectedId}
              onClick={() => void finishCreateConversation({ assistantId: pickerSelectedId })}
              className="rounded-lg border border-cyan-500/40 bg-cyan-600/80 px-4 py-2 font-mono text-sm text-white shadow-lg transition hover:bg-cyan-500/85 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300/35 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-900/60 disabled:text-zinc-500 disabled:shadow-none"
            >
              开始对话
            </button>
          </div>
        }
      >
        <p id={newChatDescId} className="mt-3 text-sm leading-relaxed text-zinc-400">
          选择一个助手并开始对话，或跳过进入普通对话。
        </p>
        {pickerError && (
          <div
            className="mt-3 flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-950/35 px-3 py-2.5 text-sm leading-relaxed text-amber-100/95"
            role="alert"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 flex-1">{pickerError}</span>
              <button
                type="button"
                onClick={() => void loadPickerAssistants()}
                className="shrink-0 rounded-md border border-amber-500/35 bg-amber-950/50 px-2 py-1 font-mono text-xs text-amber-200 hover:bg-amber-900/45"
              >
                重试
              </button>
            </div>
          </div>
        )}
        <div className="mt-4 min-h-[12rem] max-h-[min(18rem,45vh)] overflow-y-auto rounded-lg border border-zinc-800/90 bg-black/35 p-1">
          {pickerLoading ? (
            <div className="flex min-h-[12rem] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
            </div>
          ) : pickerError ? (
            <p className="px-2 py-5 text-center text-sm text-zinc-500">
              无法加载助手列表，请重试或跳过进入普通对话。
            </p>
          ) : pickerItems.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-zinc-500">
              <p className="mb-2">暂无可选助手</p>
              <p className="mb-3 text-zinc-600">
                你可使用下方「跳过 · 普通对话」继续；也可前往控制台创建助手。
              </p>
              <Link
                href="/console/assistants"
                className="inline-block text-cyan-400/95 underline decoration-cyan-500/35 underline-offset-2 hover:text-cyan-300"
              >
                去助手管理创建
              </Link>
            </div>
          ) : (
            <div className="space-y-0.5">
              {pickerItems.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setPickerSelectedId(a.id)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition ${pickerSelectedId === a.id
                    ? "bg-cyan-500/12 text-cyan-50 ring-1 ring-cyan-500/35"
                    : "text-zinc-300 hover:bg-zinc-800/70"
                    }`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center text-base leading-none" aria-hidden>
                    {a.icon ?? "🤖"}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{a.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </ModalShell>

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4 lg:flex-row">
        {isDesktop ? (
          <aside
            className={`mb-0 flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-xl border border-cyan-500/20 bg-zinc-950/70 shadow-[0_0_40px_-12px_rgba(34,211,238,0.25)] lg:max-h-full ${SIDEBAR_WIDTH}`}
          >
            {sidebarInner}
          </aside>
        ) : (
          <div className="flex shrink-0 items-center justify-between gap-2 rounded-xl border border-cyan-500/20 bg-zinc-950/70 px-2 py-2">
            <button
              type="button"
              aria-label="打开对话历史"
              title="历史"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-600 bg-zinc-900 p-2 text-zinc-200"
            >
              <IconMenu />
            </button>
            <button
              type="button"
              title="新建对话"
              aria-label="新建对话"
              onClick={() => void handleNewConversation()}
              className="inline-flex items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-500/15 p-2 text-cyan-200"
            >
              <IconPlus />
            </button>
          </div>
        )}

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-fuchsia-500/15 bg-zinc-950/80 shadow-[0_0_48px_-16px_rgba(192,38,211,0.2)] lg:min-h-0">
          <div className="chat-header flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800/80 px-3 py-2">
            <div className="min-w-0 shrink">
              <BrandMark className="text-left text-sm" />
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <Link
                href="/console"
                title="控制台"
                aria-label="控制台"
                className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800/70 hover:text-cyan-200/90"
              >
                <IconConfig />
              </Link>
              <button
                type="button"
                title="清空当前对话内容"
                aria-label="清空当前对话内容"
                onClick={handleClear}
                disabled={!selectedId}
                className="inline-flex shrink-0 items-center justify-center rounded-lg p-2 text-rose-200/90 hover:bg-rose-950/35 disabled:opacity-40"
              >
                <IconTrash />
              </button>
            </div>
          </div>

          <div className="chat-scroll chat-messages-area min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-5">
            {selectedId && selectedConv?.assistantUnavailable && (
              <div
                className="mb-4 rounded-lg border border-amber-500/40 bg-amber-950/45 px-3 py-2.5 font-mono text-xs leading-relaxed text-amber-100/95 shadow-[0_0_20px_-8px_rgba(245,158,11,0.25)]"
                role="status"
              >
                该助手已无法使用，你可以继续对话或新建对话选用其他助手。
              </div>
            )}
            {!selectedId ? (
              <p className="text-center font-mono text-sm text-zinc-500">请新建对话或从侧栏选择历史</p>
            ) : messagesLoading ? (
              <div className="flex justify-center py-16">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-fuchsia-500/30 border-t-fuchsia-400" />
              </div>
            ) : messages.length === 0 && !streaming ? (
              <div className="flex flex-col items-center justify-center gap-5 px-4 py-12 text-center">
                <IconEmptyState />
                <BrandMark className="text-sm" />
                <p className="max-w-xs text-sm leading-relaxed text-zinc-500">
                  在下方输入框发送消息，即可开始对话
                </p>
              </div>
            ) : (
              <>
                {messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    row={m}
                    userLabel={userLabel}
                    assistantBubbleLabel={assistantBubbleLabel}
                  />
                ))}
                {streaming && (
                  <MessageBubble
                    row={{
                      id: "__stream__",
                      role: MessageRole.Assistant,
                      content: streamText,
                      createdAt: new Date().toISOString(),
                    }}
                    streaming
                    userLabel={userLabel}
                    assistantBubbleLabel={assistantBubbleLabel}
                  />
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          <div className="chat-composer shrink-0 border-t border-zinc-800/90 bg-zinc-950/90 p-3 sm:p-4">
            {freeTierAssistantHint && (
              <p
                className="mb-2 font-sans text-[11px] leading-snug text-amber-400/90"
                role="status"
              >
                当前为免费/共享接入，效果可能不稳定。可在
                <Link
                  href="/console/profile"
                  className="mx-0.5 font-medium text-amber-300/95 underline decoration-amber-500/50 underline-offset-2 hover:text-amber-200"
                >
                  个人偏好
                </Link>
                绑定自有密钥与模型，获得更稳定、更高质量的回答。
              </p>
            )}
            <div className="relative">
              <textarea
                ref={composerRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  selectedId ? "输入消息 — Enter 发送，Shift+Enter 换行" : "请先新建或选择会话"
                }
                disabled={!selectedId}
                rows={3}
                className="min-h-[78px] w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 pb-12 pr-12 font-mono text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50"
                aria-label="消息输入框"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
              />
              <button
                type="button"
                title={sending ? "传输中…" : "发送"}
                aria-label="发送"
                onClick={() => void handleSend()}
                disabled={!selectedId || sending}
                className="absolute bottom-2.5 right-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-400/50 bg-gradient-to-br from-cyan-600/40 to-fuchsia-600/30 p-0 text-cyan-50 shadow-[0_0_20px_-4px_rgba(34,211,238,0.5)] transition hover:from-cyan-500/50 hover:to-fuchsia-500/40 disabled:opacity-40"
              >
                {sending ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-200/30 border-t-cyan-100" />
                ) : (
                  <span
                    className="inline-block"
                    style={{
                      transform: "translate(1px, -1px) rotate(45deg)",
                    }}
                  >
                    <IconSend className="h-4 w-4" />
                  </span>
                )}
              </button>
            </div>
          </div>
        </main>
      </div>

      {!isDesktop && drawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="关闭"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className={`relative ml-0 flex h-[100dvh] max-h-[100dvh] min-h-0 ${DRAWER_WIDTH} flex-col border-r border-cyan-500/30 bg-zinc-950 shadow-2xl`}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-3">
              <span className="font-mono text-sm text-cyan-300">对话历史</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded px-2 py-1 font-mono text-xs text-zinc-400 hover:text-white"
              >
                关闭
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">{sidebarInner}</div>
          </div>
        </div>
      )}
    </div>
  );
}
