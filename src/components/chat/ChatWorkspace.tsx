"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/home/LanguageSwitcher";
import { HEADER_ACTION_ICON_CLASS } from "@/components/layout/header-action-link";
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
  ChatNoResponseBodyError,
  clearMessages,
  createConversation,
  deleteConversation,
  fetchAssistantsForPicker,
  fetchConversations,
  fetchMessages,
  fetchTurns,
  finalizeStepsSnapshotForClient,
  sendMessage,
  sendMessageStream,
  type ConversationListItem,
  type CreatedConversation,
  type MessageRow,
  type StreamTurnStepDeltaPayload,
  type TurnInterruptionReason,
  type TurnSnapshotPayload,
  type TurnStepStatus,
} from "./chat-api";
import { BrandMark } from "@/components/brand/BrandMark";
import type { AssistantListItem } from "@/common/types";
import enApiMessage from "../../../messages/en/api/message.json";
import zhApiMessage from "../../../messages/zh/api/message.json";
import {
  localizeConversationTitle,
  localizeDetailBlock,
} from "@/common/chat/localize-turn-detail";

const TURN_SAFE_KB_MISS = new Set([
  enApiMessage.turnSafe.kbMiss,
  zhApiMessage.turnSafe.kbMiss,
]);
const TURN_SAFE_MCP_NO_ASSISTANT = new Set([
  enApiMessage.turnSafe.mcpNoAssistant,
  zhApiMessage.turnSafe.mcpNoAssistant,
]);
const TURN_SAFE_MCP_NOT_MOUNTED = new Set([
  enApiMessage.turnSafe.mcpNotMounted,
  zhApiMessage.turnSafe.mcpNotMounted,
]);
const TURN_SAFE_SKILLS_NOT_MOUNTED = new Set([
  enApiMessage.turnSafe.skillsNotMounted,
  zhApiMessage.turnSafe.skillsNotMounted,
]);
/** MCP 详情块历史数据可能为另一 locale，展示层会映射为当前语言 */
const MCP_DISABLED_MARKERS = ["未启用 MCP", "MCP not enabled"] as const;

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
  const t = useTranslations("page.chat");
  const isUser = row.role === MessageRole.User;
  const userShown = userLabel.trim() || t("messages.userFallback");
  const assistantShown =
    !isUser && assistantBubbleLabel?.trim()
      ? assistantBubbleLabel.trim()
      : !isUser
        ? t("messages.assistantFallback")
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

type TurnUiModel = {
  turnId: string;
  userMessageId?: string | null;
  assistantMessageId?: string | null;
  finalStatus: "completed" | "failed" | "interrupted" | "running";
  interruptionReason: TurnInterruptionReason | null;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number | null;
  steps: TurnSnapshotPayload["steps"];
  reasoning: TurnSnapshotPayload["reasoning"];
  sourceMode: "streaming" | "non_stream_snapshot";
  isSnapshotComplete: boolean;
};

type TurnStepLabels = {
  status: Record<TurnStepStatus, string>;
  reasoningStatus: Record<TurnUiModel["reasoning"]["status"], string>;
  interruption: Record<TurnInterruptionReason, string>;
  stage: {
    knowledge: string;
    mcp: string;
    skill: string;
    summary: string;
    reasoning: string;
    details: string;
    reasoningSummary: string;
  };
};

/**
 * Turn 步骤中的 `details` 经 JSON 后应为 `{ title, content }[]`。
 * 旧逻辑用 `title && content` 过滤会把 `content === ""`、`0` 等假值整块丢掉，导致 MCP/知识库展开无正文。
 */
function stepDetailsToBlocks(
  details: unknown,
  detailsLabel: string,
): Array<{ title: string; content: string }> {
  if (typeof details === "string") {
    try {
      return stepDetailsToBlocks(JSON.parse(details) as unknown, detailsLabel);
    } catch {
      return details.trim() ? [{ title: detailsLabel, content: details }] : [];
    }
  }
  /** 单条对象、或类数组对象 {0:{...},1:{...}} 在部分存储/反序列化路径下不是 Array，不能直接丢弃 */
  if (details != null && typeof details === "object" && !Array.isArray(details)) {
    const o = details as Record<string, unknown>;
    if ("title" in o || "Title" in o || "content" in o || "Content" in o) {
      return stepDetailsToBlocks([details], detailsLabel);
    }
    const vals = Object.values(o);
    if (
      vals.length > 0 &&
      vals.every((v) => v != null && typeof v === "object" && !Array.isArray(v))
    ) {
      return stepDetailsToBlocks(vals, detailsLabel);
    }
  }
  if (!Array.isArray(details)) return [];
  const out: Array<{ title: string; content: string }> = [];
  for (const raw of details) {
    if (typeof raw === "string") {
      if (raw.trim()) out.push({ title: detailsLabel, content: raw });
      continue;
    }
    if (raw == null || typeof raw !== "object") continue;
    const d = raw as Record<string, unknown>;
    const titleRaw = d.title ?? d.Title;
    const contentRaw = d.content ?? d.Content ?? d.detail ?? d.body;
    const title = typeof titleRaw === "string" ? titleRaw : titleRaw != null ? String(titleRaw) : "";
    const content =
      typeof contentRaw === "string" ? contentRaw : contentRaw != null ? String(contentRaw) : "";
    if (!title.trim() && content === "") continue;
    out.push({ title: title.trim() || detailsLabel, content });
  }
  return out;
}

function normalizeTurnFromSnapshot(
  payload: TurnSnapshotPayload,
  sourceMode: TurnUiModel["sourceMode"],
): TurnUiModel {
  const steps = finalizeStepsSnapshotForClient(payload.steps);
  const mainStages = Array.isArray(steps.mainStages) ? steps.mainStages : [];
  const subSteps = steps.subSteps;
  return {
    turnId: payload.turnId,
    userMessageId: payload.userMessageId ?? null,
    assistantMessageId: payload.assistantMessageId ?? null,
    finalStatus: payload.finalStatus,
    interruptionReason: payload.interruptionReason ?? null,
    startedAt: payload.startedAt,
    endedAt: payload.endedAt,
    durationMs: payload.durationMs ?? null,
    steps: {
      version: steps.version ?? "0.1.8",
      frozen: Boolean(steps.frozen),
      mainStages,
      subSteps,
      reasoning: steps.reasoning,
    },
    reasoning: payload.reasoning,
    sourceMode,
    isSnapshotComplete: mainStages.length > 0 && subSteps.length > 0,
  };
}

function turnModelFromDelta(started: { turnId: string; steps?: TurnSnapshotPayload["steps"] }): TurnUiModel {
  const base =
    started.steps ?? {
      version: "0.1.8",
      frozen: false,
      mainStages: [],
      subSteps: [],
      reasoning: { visibilityLevel: 0, status: "not_triggered", safeSummary: null },
    };
  const steps = finalizeStepsSnapshotForClient(base);
  return {
    turnId: started.turnId,
    userMessageId: null,
    assistantMessageId: null,
    finalStatus: "running",
    interruptionReason: null,
    steps,
    reasoning: steps.reasoning,
    sourceMode: "streaming",
    isSnapshotComplete: false,
  };
}

function applyTurnDelta(prev: TurnUiModel | null, payload: StreamTurnStepDeltaPayload): TurnUiModel {
  const next = prev?.turnId === payload.turnId ? prev : turnModelFromDelta({ turnId: payload.turnId });
  const snap = finalizeStepsSnapshotForClient(payload.snapshot);
  return {
    ...next,
    userMessageId: next.userMessageId ?? null,
    assistantMessageId: next.assistantMessageId ?? null,
    finalStatus: snap.frozen ? next.finalStatus : "running",
    steps: snap,
    reasoning: snap.reasoning,
    sourceMode: "streaming",
    isSnapshotComplete:
      Array.isArray(snap.mainStages) &&
      snap.mainStages.length > 0 &&
      Array.isArray(snap.subSteps) &&
      snap.subSteps.length > 0,
  };
}

function hasSucceededRetry(current: TurnUiModel, allTurns: Record<string, TurnUiModel>): boolean {
  if (!current.userMessageId) return false;
  const currentTs = Date.parse(current.startedAt ?? current.endedAt ?? "1970-01-01T00:00:00.000Z");
  return Object.values(allTurns).some((turn) => {
    if (turn.turnId === current.turnId) return false;
    if (turn.userMessageId !== current.userMessageId) return false;
    if (turn.finalStatus !== "completed") return false;
    const ts = Date.parse(turn.startedAt ?? turn.endedAt ?? "1970-01-01T00:00:00.000Z");
    return ts >= currentTs;
  });
}

/**
 * 拉取服务端消息后合并：若本轮仍在等待 `user_message` 事件，乐观用户消息不在服务端列表中，
 * 直接 `setMessages(items)` 会丢掉用户气泡与重试上下文。
 */
function mergeServerMessagesWithPendingLocal(
  prev: MessageRow[],
  serverItems: MessageRow[],
  pendingLocalId: string | null,
): MessageRow[] {
  if (!pendingLocalId) {
    return serverItems;
  }
  const local = prev.find((m) => m.id === pendingLocalId);
  if (!local || serverItems.some((m) => m.id === local.id)) {
    return serverItems;
  }
  const turnId = local.turnId ?? null;
  if (
    turnId &&
    serverItems.some((m) => m.turnId === turnId && m.role === MessageRole.User)
  ) {
    return serverItems;
  }
  const out = [...serverItems];
  if (turnId) {
    const assistantIdx = out.findIndex(
      (m) => m.turnId === turnId && m.role === MessageRole.Assistant,
    );
    if (assistantIdx !== -1) {
      out.splice(assistantIdx, 0, local);
      return out;
    }
  }
  const created = Date.parse(local.createdAt);
  const insertAt = out.findIndex((m) => Date.parse(m.createdAt) > created);
  if (insertAt === -1) {
    out.push(local);
  } else {
    out.splice(insertAt, 0, local);
  }
  return out;
}

function buildTurnProcessRows(turn: TurnUiModel, labels: TurnStepLabels): MessageRow[] {
  const rows: MessageRow[] = [];
  const statusTone = labels.status;
  const reasoningTone = labels.reasoningStatus;
  const compact = (text?: string | null) => {
    const t = (text ?? "").trim();
    if (!t) return "";
    return t.length > 80 ? `${t.slice(0, 80)}...` : t;
  };
  const addRow = (id: string, content: string, createdAt?: string | null) => {
    rows.push({
      id: `${turn.turnId}-${id}`,
      role: MessageRole.Assistant,
      content,
      createdAt: createdAt ?? turn.startedAt ?? new Date().toISOString(),
      turnId: turn.turnId,
    });
  };
  const stepByKey = new Map(turn.steps.subSteps.map((step) => [step.stepKey, step]));
  const knowledgeStep = stepByKey.get("C1");
  if (knowledgeStep) {
    addRow(
      "knowledge",
      `${labels.stage.knowledge} ${statusTone[knowledgeStep.status]}${compact(knowledgeStep.safeMessage) ? ` · ${compact(knowledgeStep.safeMessage)}` : ""}`,
      knowledgeStep.startedAt ?? knowledgeStep.endedAt,
    );
  }
  const skillsStep = stepByKey.get("C1b");
  if (skillsStep) {
    addRow(
      "skills",
      `${labels.stage.skill} ${statusTone[skillsStep.status]}${compact(skillsStep.safeMessage) ? ` · ${compact(skillsStep.safeMessage)}` : ""}`,
      skillsStep.startedAt ?? skillsStep.endedAt,
    );
  }
  const mcpStep = stepByKey.get("C2");
  if (mcpStep) {
    addRow(
      "mcp",
      `${labels.stage.mcp} ${statusTone[mcpStep.status]}${compact(mcpStep.safeMessage) ? ` · ${compact(mcpStep.safeMessage)}` : ""}`,
      mcpStep.startedAt ?? mcpStep.endedAt,
    );
  }
  const skillLegacyStep = turn.steps.subSteps.find(
    (step) => step.subStage.toLowerCase().includes("skill") && step.stepKey !== "C1b",
  );
  if (skillLegacyStep && !skillsStep) {
    addRow(
      "skills",
      `${labels.stage.skill} ${statusTone[skillLegacyStep.status]}${compact(skillLegacyStep.safeMessage) ? ` · ${compact(skillLegacyStep.safeMessage)}` : ""}`,
      skillLegacyStep.startedAt ?? skillLegacyStep.endedAt,
    );
  }
  const summaryStep = stepByKey.get("E1");
  if (summaryStep) {
    addRow(
      "summary",
      `${labels.stage.summary} ${statusTone[summaryStep.status]}${compact(summaryStep.safeMessage) ? ` · ${compact(summaryStep.safeMessage)}` : ""}`,
      summaryStep.startedAt ?? summaryStep.endedAt,
    );
  }
  addRow(
    "reasoning",
    `${labels.stage.reasoning} ${reasoningTone[turn.reasoning.status]}${compact(turn.reasoning.safeSummary) ? ` · ${compact(turn.reasoning.safeSummary)}` : ""}`,
    turn.endedAt ?? turn.startedAt,
  );
  return rows.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

type TurnStageItem = {
  key: string;
  /** 对应 `turn.steps.subSteps` 的 `stepKey`，用于刷新后从快照再解析一遍 `details` */
  sourceStepKey?: string | null;
  label: string;
  status: TurnStepStatus;
  summary: string | null;
  details: string[];
  detailBlocks: Array<{ title: string; content: string }>;
  startedAt: string | null;
  endedAt: string | null;
  order: number;
};

function shouldHideUnboundMcpStep(
  step: {
    safeMessage: string | null;
    details?: unknown;
  },
  detailsLabel: string,
): boolean {
  const summary = (step.safeMessage ?? "").trim();
  if (!summary) return false;
  if (
    TURN_SAFE_MCP_NO_ASSISTANT.has(summary) ||
    TURN_SAFE_MCP_NOT_MOUNTED.has(summary) ||
    [...TURN_SAFE_MCP_NO_ASSISTANT].some((s) => summary.includes(s)) ||
    [...TURN_SAFE_MCP_NOT_MOUNTED].some((s) => summary.includes(s))
  ) {
    return true;
  }
  const blocks = stepDetailsToBlocks(step.details, detailsLabel);
  if (
    blocks.length === 1 &&
    MCP_DISABLED_MARKERS.some(
      (marker) => summary.includes(marker) && blocks[0]?.content.includes(marker),
    )
  ) {
    return true;
  }
  return false;
}

function shouldHideUnboundKnowledgeStep(
  step: {
    safeMessage: string | null;
    details?: unknown;
  },
  detailsLabel: string,
): boolean {
  const summary = (step.safeMessage ?? "").trim();
  if (!TURN_SAFE_KB_MISS.has(summary)) return false;
  return stepDetailsToBlocks(step.details, detailsLabel).length === 0;
}

/** C1b：mounted=0 隐藏；无助手、已挂载未选用、已加载等场景展示。 */
function shouldHideUnboundSkillsStep(
  step: {
    safeMessage: string | null;
    details?: unknown;
  },
  detailsLabel: string,
): boolean {
  const summary = (step.safeMessage ?? "").trim();
  if (
    TURN_SAFE_SKILLS_NOT_MOUNTED.has(summary) ||
    [...TURN_SAFE_SKILLS_NOT_MOUNTED].some((s) => summary.includes(s))
  ) {
    return true;
  }
  if (!summary) {
    return stepDetailsToBlocks(step.details, detailsLabel).length === 0;
  }
  return false;
}

function buildTurnStageItems(turn: TurnUiModel, labels: TurnStepLabels): TurnStageItem[] {
  const items: TurnStageItem[] = [];

  /** 与旧 `push` 不同：只要 `details` 能解析出分段，就应展示，且避免误把上一行的 `items[items.length-1]` 当成当前步。 */
  const appendFromStep = (
    order: number,
    key: string,
    label: string,
    step: (typeof turn.steps.subSteps)[number],
    sourceStepKey: string,
  ) => {
    const summaryRaw = step.safeMessage ?? null;
    const blocks = stepDetailsToBlocks(step.details, labels.stage.details);
    const clean = [step.reasonTag, step.error?.message]
      .map((t) => (t ?? "").trim())
      .filter((t) => t.length > 0)
      // 知识库改为只展示命中结果，不展示「命中理由」字段。
      .filter((t, idx) => !(key === "knowledge" && idx === 0));
    // 子流程应展示自身状态，不应仅依赖 summary/details（例如 C2 pending/running）。
    const shouldRenderByStatus =
      step.status === "pending" ||
      step.status === "running" ||
      step.status === "completed" ||
      step.status === "failed" ||
      step.status === "interrupted";
    if (!shouldRenderByStatus && !summaryRaw?.trim() && clean.length === 0 && blocks.length === 0) return;
    items.push({
      key,
      sourceStepKey,
      label,
      status: step.status,
      summary: summaryRaw,
      details: clean,
      detailBlocks: blocks,
      startedAt: step.startedAt,
      endedAt: step.endedAt,
      order,
    });
  };

  const byKey = new Map(turn.steps.subSteps.map((s) => [s.stepKey, s]));
  const knowledge = byKey.get("C1");
  if (knowledge && !shouldHideUnboundKnowledgeStep(knowledge, labels.stage.details)) {
    appendFromStep(10, "knowledge", labels.stage.knowledge, knowledge, "C1");
  }
  const skills =
    byKey.get("C1b") ?? turn.steps.subSteps.find((s) => s.subStage === "skills_resolution");
  if (skills && !shouldHideUnboundSkillsStep(skills, labels.stage.details)) {
    appendFromStep(12, "skill", labels.stage.skill, skills, "C1b");
  }
  const mcp =
    byKey.get("C2") ?? turn.steps.subSteps.find((s) => s.subStage === "mcp_tools_resolution");
  if (mcp && !shouldHideUnboundMcpStep(mcp, labels.stage.details)) {
    appendFromStep(15, "mcp", labels.stage.mcp, mcp, "C2");
  }
  const skillLegacy = turn.steps.subSteps.find(
    (s) => s.subStage.toLowerCase().includes("skill") && s.stepKey !== "C1b",
  );
  if (skillLegacy && !byKey.get("C1b")) {
    appendFromStep(30, "skill", labels.stage.skill, skillLegacy, skillLegacy.stepKey);
  }
  const summaryStep = byKey.get("E1");
  if (summaryStep) {
    const summaryBlocks = stepDetailsToBlocks(summaryStep.details, labels.stage.details);
    const summaryHasContent =
      Boolean(summaryStep.safeMessage?.trim()) ||
      Boolean(summaryStep.reasonTag?.trim()) ||
      Boolean(summaryStep.error?.message?.trim()) ||
      summaryBlocks.length > 0;
    const summaryTriggered =
      summaryStep.status === "running" ||
      summaryStep.status === "completed" ||
      summaryStep.status === "failed" ||
      summaryStep.status === "interrupted";
    if (summaryTriggered || summaryHasContent) {
      appendFromStep(50, "summary", labels.stage.summary, summaryStep, "E1");
    }
  }
  const reasoningSummary = turn.reasoning.safeSummary?.trim() ?? "";
  const showReasoning =
    reasoningSummary.length > 0 ||
    turn.reasoning.status === "running" ||
    turn.reasoning.status === "failed" ||
    turn.reasoning.status === "interrupted";
  if (showReasoning) {
    const reasoningStatus: TurnStepStatus =
      turn.reasoning.status === "running"
        ? "running"
        : turn.reasoning.status === "completed"
          ? "completed"
          : turn.reasoning.status === "not_triggered"
            ? "skipped"
            : "failed";
    const statusLine = labels.reasoningStatus[turn.reasoning.status];
    const clean = [statusLine].map((t) => t.trim()).filter((t) => t.length > 0);
    const blocks = reasoningSummary
      ? [{ title: labels.stage.reasoningSummary, content: reasoningSummary }]
      : [];
    items.push({
      key: "reasoning",
      sourceStepKey: null,
      label: labels.stage.reasoning,
      status: reasoningStatus,
      summary: reasoningSummary || null,
      details: clean,
      detailBlocks: blocks,
      startedAt: turn.startedAt ?? null,
      endedAt: turn.endedAt ?? null,
      // 放在摘要之后，避免“摘要前先出现推理”造成理解混淆。
      order: 60,
    });
  }
  return items.sort((a, b) => a.order - b.order);
}

/**
 * 不用原生 &lt;details&gt;：在多层 overflow-y-auto + flex min-h-0 下，部分浏览器会出现点击无法展开或内容高度为 0。
 * 刷新后从 `/turns` 拉到的快照里，`details` 只在 `subSteps` 上；若仅依赖 build 时写入的 `detailBlocks`，可能为空导致无展开按钮。
 */
function resolveSubStepForStageItem(
  turn: TurnUiModel,
  item: TurnStageItem,
): (typeof turn.steps.subSteps)[number] | undefined {
  const sub = turn.steps.subSteps ?? [];
  if (item.sourceStepKey) {
    const byKey = sub.find((s) => s.stepKey === item.sourceStepKey);
    if (byKey) return byKey;
  }
  if (item.key === "mcp") {
    return sub.find((s) => s.subStage === "mcp_tools_resolution") ?? sub.find((s) => s.stepKey === "C2");
  }
  if (item.key === "knowledge") {
    return sub.find((s) => s.subStage === "knowledge_injection") ?? sub.find((s) => s.stepKey === "C1");
  }
  if (item.key === "skill") {
    return sub.find((s) => s.subStage === "skills_resolution") ?? sub.find((s) => s.stepKey === "C1b");
  }
  if (item.key === "summary") {
    return sub.find((s) => s.stepKey === "E1");
  }
  return undefined;
}

function TurnStageFold({ item, turn }: { item: TurnStageItem; turn: TurnUiModel }) {
  const t = useTranslations("page.chat");
  const [open, setOpen] = useState(false);
  const rawStep = resolveSubStepForStageItem(turn, item);
  const stepRecord = rawStep != null ? (rawStep as Record<string, unknown>) : undefined;
  const detailsRaw = stepRecord?.details ?? stepRecord?.Details;
  const detailsLabel = t("turn.stage.details");
  let fromSnapshot = stepDetailsToBlocks(detailsRaw, detailsLabel);
  /** 优先用当前 turn 快照解析结果（与 Network 一致）；build 阶段写入的 item 可能曾为空 */
  const detailBlocks =
    fromSnapshot.length > 0 ? fromSnapshot : item.detailBlocks;
  const localizedDetailBlocks = detailBlocks.map((block) => localizeDetailBlock(block, t));
  const hasBody =
    item.details.length > 0 ||
    detailBlocks.length > 0 ||
    Boolean(item.summary?.trim());
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/70">
      <button
        type="button"
        disabled={!hasBody}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-start justify-between gap-2 px-2.5 py-2 text-left text-xs text-zinc-200 ${
          hasBody ? "cursor-pointer hover:bg-zinc-800/50" : "cursor-default"
        }`}
        aria-expanded={hasBody ? open : undefined}
      >
        <span className="min-w-0 flex-1 break-words">
          {item.label} · {t(`turn.status.${item.status}`)}
          {item.status === "running" ? (
            <span
              className="ml-1 inline-block h-3 w-3 animate-spin rounded-full border border-cyan-400/50 border-t-cyan-300 align-[-1px]"
              aria-label="loading"
            />
          ) : null}
          {item.summary ? ` · ${item.summary}` : ""}
        </span>
        {hasBody ? (
          <span className="shrink-0 font-mono text-[10px] text-zinc-500" aria-hidden>
            {open ? "▼" : "▶"}
          </span>
        ) : null}
      </button>
      {open && hasBody ? (
        <div className="border-t border-zinc-800/90 px-2.5 pb-2.5 pt-2">
          {item.details.length > 0 ? (
            <ul className="mb-2 list-disc space-y-1 pl-5 text-xs text-zinc-400 last:mb-0">
              {item.details.map((d, i) => (
                <li key={`${item.key}-li-${i}`}>{d}</li>
              ))}
            </ul>
          ) : null}
          {localizedDetailBlocks.length > 0 ? (
            <div className="space-y-2">
              {localizedDetailBlocks.map((block, idx) => (
                <div
                  key={`${item.key}-block-${idx}`}
                  className="rounded border border-zinc-700/70 bg-zinc-900/60 px-2 py-1.5"
                >
                  <div className="text-[11px] font-medium text-zinc-300">{block.title}</div>
                  <pre className="mt-1 whitespace-pre-wrap break-words text-[11px] text-zinc-400">
                    {block.content}
                  </pre>
                </div>
              ))}
            </div>
          ) : null}
          {item.details.length === 0 && localizedDetailBlocks.length === 0 ? (
            <p className="text-xs leading-relaxed text-zinc-400">
              {item.summary?.trim() ? item.summary : t("turn.card.noStructuredDetails")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AssistantFlowCard({
  turn,
  assistantMessage,
  streamingText,
  assistantBubbleLabel,
  sending,
  onRetry,
  retryDisabledReason,
  dimmed,
}: {
  turn: TurnUiModel;
  assistantMessage: MessageRow | null;
  streamingText?: string;
  assistantBubbleLabel?: string | null;
  sending?: boolean;
  onRetry?: () => void;
  retryDisabledReason?: string | null;
  dimmed?: boolean;
}) {
  const t = useTranslations("page.chat");
  const turnLabels = useMemo(
    (): TurnStepLabels => ({
      status: {
        pending: t("turn.status.pending"),
        running: t("turn.status.running"),
        completed: t("turn.status.completed"),
        failed: t("turn.status.failed"),
        skipped: t("turn.status.skipped"),
        interrupted: t("turn.status.interrupted"),
      },
      reasoningStatus: {
        not_triggered: t("turn.reasoningStatus.not_triggered"),
        running: t("turn.reasoningStatus.running"),
        completed: t("turn.reasoningStatus.completed"),
        failed: t("turn.reasoningStatus.failed"),
        interrupted: t("turn.reasoningStatus.interrupted"),
      },
      interruption: {
        user_cancelled: t("turn.interruption.user_cancelled"),
        network_disconnected: t("turn.interruption.network_disconnected"),
        server_timeout: t("turn.interruption.server_timeout"),
        unknown: t("turn.interruption.unknown"),
      },
      stage: {
        knowledge: t("turn.stage.knowledge"),
        mcp: t("turn.stage.mcp"),
        skill: t("turn.stage.skill"),
        summary: t("turn.stage.summary"),
        reasoning: t("turn.stage.reasoning"),
        details: t("turn.stage.details"),
        reasoningSummary: t("turn.stage.reasoningSummary"),
      },
    }),
    [t],
  );
  const stageItems = buildTurnStageItems(turn, turnLabels);
  const statusText = t(`turn.card.status.${turn.finalStatus}`);
  const assistantShown =
    assistantBubbleLabel?.trim()
      ? assistantBubbleLabel.trim()
      : t("messages.assistantFallback");
  const d1 = turn.steps.subSteps.find((step) => step.stepKey === "D1");
  const failedReason =
    d1?.error?.message ??
    d1?.safeMessage ??
    (turn.finalStatus === "interrupted"
      ? turnLabels.interruption[turn.interruptionReason ?? "unknown"]
      : null);
  const fallbackFailureText =
    turn.finalStatus === "completed"
      ? ""
      : `${t("turn.card.failurePrefix")}${failedReason ?? t("turn.card.modelFallback")}`;
  const finalText = assistantMessage?.content ?? streamingText ?? fallbackFailureText;
  const finalStreaming = !assistantMessage && Boolean(streamingText);
  const isFailed = turn.finalStatus === "failed";
  const isInterrupted = turn.finalStatus === "interrupted";
  const wrapperClass = isFailed
    ? "border-rose-500/35 bg-rose-950/20 text-rose-50 shadow-[0_0_24px_-6px_rgba(244,63,94,0.25)]"
    : isInterrupted
      ? "border-amber-500/35 bg-amber-950/20 text-amber-50 shadow-[0_0_24px_-6px_rgba(245,158,11,0.2)]"
      : "border-fuchsia-500/25 bg-zinc-900/90 text-zinc-100 shadow-[0_0_24px_-4px_rgba(217,70,239,0.15)]";
  const dimmedClass = dimmed ? "opacity-55 saturate-50" : "";
  return (
    <div className="mb-4 flex justify-start">
      <div className={`min-w-0 max-w-[min(100%,720px)] rounded-xl border px-3 py-2.5 text-sm leading-relaxed ${wrapperClass} ${dimmedClass}`}>
        <div className="mb-1 font-mono text-[10px] tracking-wider text-zinc-400">{assistantShown}</div>
        <div className="mb-2 flex min-w-0 items-center gap-3 text-[11px] text-zinc-500">
          <span className="min-w-0 flex-1 truncate font-mono">
            Turn {turn.turnId.slice(0, 8)}
          </span>
          <span className="inline-flex shrink-0 items-center gap-2">
            {statusText}
            {turn.finalStatus === "running" ? (
              <span
                className="inline-block h-3 w-3 animate-spin rounded-full border border-cyan-400/50 border-t-cyan-300"
                aria-label="loading"
              />
            ) : null}
          </span>
        </div>
        {(isFailed || isInterrupted) && (onRetry || retryDisabledReason) ? (
          <div className="mb-2 flex items-center gap-2 rounded-md border border-zinc-700/70 bg-zinc-900/60 px-2.5 py-2 text-xs text-zinc-200">
            <span>
              {retryDisabledReason
                ? retryDisabledReason
                : isFailed
                  ? t("turn.card.retryHintFailed")
                  : t("turn.card.retryHintInterrupted")}
            </span>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                disabled={Boolean(sending)}
                className="ml-auto rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-cyan-200 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? t("turn.card.retrying") : t("turn.card.retry")}
              </button>
            ) : null}
          </div>
        ) : null}
      {stageItems.length > 0 ? (
        <div className="mb-2 space-y-2">
          {stageItems.map((item) => (
            <TurnStageFold key={item.key} item={item} turn={turn} />
          ))}
        </div>
      ) : null}
        {finalText ? (
          <AssistantOutputRenderer
            payload={assistantPayloadFromContent(finalText, { streaming: finalStreaming })}
          />
        ) : null}
      </div>
    </div>
  );
}

export function ChatWorkspace({
  userLabel,
  freeTierAssistantHint = false,
  readOnly = false,
}: {
  userLabel: string;
  /** 服务端根据账号偏好判定：未选模型、或选用公有模型时为 true */
  freeTierAssistantHint?: boolean;
  /** 只读账号仅可浏览，不允许发送消息 */
  readOnly?: boolean;
}) {
  const t = useTranslations("page.chat");
  const locale = useLocale();
  /** 是否为桌面端 */
  const isDesktop = useIsLg();

  const turnLabels = useMemo(
    (): TurnStepLabels => ({
      status: {
        pending: t("turn.status.pending"),
        running: t("turn.status.running"),
        completed: t("turn.status.completed"),
        failed: t("turn.status.failed"),
        skipped: t("turn.status.skipped"),
        interrupted: t("turn.status.interrupted"),
      },
      reasoningStatus: {
        not_triggered: t("turn.reasoningStatus.not_triggered"),
        running: t("turn.reasoningStatus.running"),
        completed: t("turn.reasoningStatus.completed"),
        failed: t("turn.reasoningStatus.failed"),
        interrupted: t("turn.reasoningStatus.interrupted"),
      },
      interruption: {
        user_cancelled: t("turn.interruption.user_cancelled"),
        network_disconnected: t("turn.interruption.network_disconnected"),
        server_timeout: t("turn.interruption.server_timeout"),
        unknown: t("turn.interruption.unknown"),
      },
      stage: {
        knowledge: t("turn.stage.knowledge"),
        mcp: t("turn.stage.mcp"),
        skill: t("turn.stage.skill"),
        summary: t("turn.stage.summary"),
        reasoning: t("turn.stage.reasoning"),
        details: t("turn.stage.details"),
        reasoningSummary: t("turn.stage.reasoningSummary"),
      },
    }),
    [t],
  );

  const loginRedirect = encodeURIComponent(`/${locale}/chat`);
  const loginUrl = `/${locale}/login?redirect=${loginRedirect}`;

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
  const [turnState, setTurnState] = useState<TurnUiModel | null>(null);
  const [turnHistoryMap, setTurnHistoryMap] = useState<Record<string, TurnUiModel>>({});

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const sendInFlightRef = useRef(false);
  /** 中文等 IME 组字过程中为 true，避免 Enter 误触发送 */
  const imeComposingRef = useRef(false);
  const pendingLocalUserMessageIdRef = useRef<string | null>(null);

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
        window.location.href = loginUrl;
        return [];
      }
      showToast({
        type: "err",
        text: e instanceof Error ? e.message : t("toast.loadConversationsFailed"),
      });
      return [];
    } finally {
      setListLoading(false);
    }
  }, [loginUrl, showToast, t]);

  const loadMessagesFor = useCallback(
    async (conversationId: string) => {
      setMessagesLoading(true);
      try {
        const [{ items }, turnsResp] = await Promise.all([
          fetchMessages(conversationId),
          fetchTurns(conversationId),
        ]);
        setMessages(items);
        const map: Record<string, TurnUiModel> = {};
        for (const turn of turnsResp.items) {
          map[turn.turnId] = normalizeTurnFromSnapshot(turn, "non_stream_snapshot");
        }
        setTurnHistoryMap(map);
        scrollToBottom();
      } catch (e) {
        showToast({
          type: "err",
          text: e instanceof Error ? e.message : t("toast.loadMessagesFailed"),
        });
        setMessages([]);
        setTurnHistoryMap({});
      } finally {
        setMessagesLoading(false);
      }
    },
    [showToast, scrollToBottom, t],
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
          const [{ items: msgs }, turnsResp] = await Promise.all([
            fetchMessages(first),
            fetchTurns(first),
          ]);
          if (cancelled) {
            return;
          }
          setMessages(msgs);
          const map: Record<string, TurnUiModel> = {};
          for (const turn of turnsResp.items) {
            map[turn.turnId] = normalizeTurnFromSnapshot(turn, "non_stream_snapshot");
          }
          setTurnHistoryMap(map);
        } catch (e) {
          if (!cancelled) {
            showToast({
              type: "err",
              text: e instanceof Error ? e.message : t("toast.loadMessagesFailed"),
            });
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
            window.location.href = loginUrl;
          } else {
            showToast({
              type: "err",
              text: e instanceof Error ? e.message : t("toast.loadConversationsFailed"),
            });
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
  }, [loginUrl, showToast, t]);

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
      setTurnState(null);
      setTurnHistoryMap({});
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
      const msg = e instanceof Error ? e.message : t("toast.loadAssistantsFailed");
      setPickerError(msg);
      setPickerItems([]);
    } finally {
      setPickerLoading(false);
    }
  }, [t]);

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
        setTurnState(null);
        setTurnHistoryMap({});
        await loadConversationList();
        await loadMessagesFor(conversation.id);
        if (!isDesktop) {
          setDrawerOpen(false);
        }
      } catch (e) {
        showToast({
          type: "err",
          text: e instanceof Error ? e.message : t("toast.createConversationFailed"),
        });
      }
    },
    [isDesktop, loadConversationList, loadMessagesFor, showToast, t],
  );

  const handleNewConversation = useCallback(() => {
    void openNewChatModal();
  }, [openNewChatModal]);

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      const ok = await confirm({
        title: t("confirm.deleteConversation.title"),
        content: t("confirm.deleteConversation.content"),
        okText: t("confirm.deleteConversation.ok"),
        cancelText: t("confirm.deleteConversation.cancel"),
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
          setTurnState(null);
        } else {
          setConversations(nextList);
          if (selectedId === id) {
            const pick = nextList[0].id;
            setSelectedId(pick);
            await loadMessagesFor(pick);
          }
        }
      } catch (e) {
        showToast({
          type: "err",
          text: e instanceof Error ? e.message : t("toast.deleteFailed"),
        });
      }
    },
    [conversations, loadMessagesFor, selectedId, showToast, t],
  );

  const sendText = async (
    text: string,
    options?: { retryUserMessageId?: string | null; appendUserMessage?: boolean },
  ) => {
    if (readOnly) {
      showToast({ type: "err", text: t("errors.readOnlyBlocked") });
      return;
    }
    if (!selectedId) {
      showToast({ type: "err", text: t("errors.noSession") });
      return;
    }
    if (sendInFlightRef.current) {
      return;
    }
    const conversationId = selectedId;

    const appendUserMessage = options?.appendUserMessage !== false;
    sendInFlightRef.current = true;
    setSending(true);
    setStreaming(true);
    setStreamText("");
    setTurnState(null);
    if (appendUserMessage) {
      const localUserMessageId = `__local_user__${Date.now()}`;
      pendingLocalUserMessageIdRef.current = localUserMessageId;
      setMessages((prev) => [
        ...prev,
        {
          id: localUserMessageId,
          role: MessageRole.User,
          content: text,
          createdAt: new Date().toISOString(),
        },
      ]);
    } else {
      pendingLocalUserMessageIdRef.current = null;
    }
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });

    try {
      await sendMessageStream(
        conversationId,
        text,
        {
        onUserMessage: (u) => {
          setMessages((prev) => {
            let next = pendingLocalUserMessageIdRef.current
              ? prev.filter((m) => m.id !== pendingLocalUserMessageIdRef.current)
              : prev;
            if (u.role === MessageRole.User) {
              const trimmed = u.content.trim();
              next = next.filter(
                (m) =>
                  !(
                    m.id.startsWith("__local_user__") &&
                    m.content.trim() === trimmed &&
                    m.id !== u.id
                  ),
              );
            }
            return next.some((m) => m.id === u.id) ? next : [...next, u];
          });
          pendingLocalUserMessageIdRef.current = null;
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
                      turnId: p.turnId ?? null,
                  },
                ],
          );
          setStreamText("");
          setStreaming(false);
          void loadConversationList();
          scrollToBottom();
        },
        onTurnStarted: (payload) => {
          setTurnState(turnModelFromDelta(payload));
          const tid = payload.turnId;
          const lid = pendingLocalUserMessageIdRef.current;
          if (tid && lid) {
            setMessages((prev) => prev.map((m) => (m.id === lid ? { ...m, turnId: tid } : m)));
          }
        },
        onTurnStepDelta: (payload) => {
          setTurnState((prev) => applyTurnDelta(prev, payload));
        },
        onTurnCompleted: (payload) => {
          const nextTurn = normalizeTurnFromSnapshot(payload, "streaming");
          setTurnState(nextTurn);
          setTurnHistoryMap((prev) => ({ ...prev, [nextTurn.turnId]: nextTurn }));
          setStreaming(false);
        },
        onTurnFailed: (payload) => {
          const nextTurn = normalizeTurnFromSnapshot(payload, "streaming");
          setTurnState(nextTurn);
          setTurnHistoryMap((prev) => ({ ...prev, [nextTurn.turnId]: nextTurn }));
          const tid = nextTurn.turnId;
          const lid = pendingLocalUserMessageIdRef.current;
          if (tid && lid) {
            setMessages((prev) =>
              prev.map((m) => (m.id === lid && !m.turnId ? { ...m, turnId: tid } : m)),
            );
          }
          setStreaming(false);
        },
        onError: async (msg) => {
          setStreamText("");
          setStreaming(false);
          const errText = msg.trim() || t("errors.sseUnknown");
          try {
            const pendingId = pendingLocalUserMessageIdRef.current;
            const [{ items }, turnsResp] = await Promise.all([
              fetchMessages(conversationId),
              fetchTurns(conversationId),
            ]);
            setMessages((prev) => mergeServerMessagesWithPendingLocal(prev, items, pendingId));
            const map: Record<string, TurnUiModel> = {};
            for (const turn of turnsResp.items) {
              map[turn.turnId] = normalizeTurnFromSnapshot(turn, "non_stream_snapshot");
            }
            setTurnHistoryMap(map);
          } catch {
            const errMsgId = `__assistant_error__${Date.now()}`;
            setMessages((prev) => [
              ...prev,
              {
                id: errMsgId,
                role: MessageRole.Assistant,
                content: `${t("turn.card.failurePrefix")}${errText}`,
                createdAt: new Date().toISOString(),
              },
            ]);
          }
        },
        },
        { retryUserMessageId: options?.retryUserMessageId ?? null },
      );
    } catch (e) {
      if (e instanceof ChatNoResponseBodyError) {
        try {
          const fallback = await sendMessage(conversationId, text, {
            retryUserMessageId: options?.retryUserMessageId ?? null,
          });
          setMessages((prev) =>
            pendingLocalUserMessageIdRef.current
              ? prev.filter((m) => m.id !== pendingLocalUserMessageIdRef.current)
              : prev,
          );
          pendingLocalUserMessageIdRef.current = null;
          setMessages((prev) => {
            const next = [...prev];
            if (!next.some((m) => m.id === fallback.userMessage.id)) {
              next.push(fallback.userMessage);
            }
            if (!next.some((m) => m.id === fallback.assistantMessage.id)) {
              next.push(fallback.assistantMessage);
            }
            return next;
          });
          if (fallback.turn) {
            const nextTurn = normalizeTurnFromSnapshot(fallback.turn, "non_stream_snapshot");
            setTurnState(nextTurn);
            setTurnHistoryMap((prev) => ({ ...prev, [nextTurn.turnId]: nextTurn }));
          }
          setStreamText("");
          setStreaming(false);
          void loadConversationList();
        } catch (fallbackErr) {
          const fallbackMsg =
            fallbackErr instanceof Error ? fallbackErr.message : t("toast.sendFailed");
          setMessages((prev) => [
            ...prev,
            {
              id: `__assistant_error__${Date.now()}`,
              role: MessageRole.Assistant,
              content: `${t("turn.card.failurePrefix")}${fallbackMsg}`,
              createdAt: new Date().toISOString(),
            },
          ]);
        }
      } else {
        setStreamText("");
        setStreaming(false);
        const errMsg = e instanceof Error ? e.message : t("toast.sendFailed");
        try {
          const pendingId = pendingLocalUserMessageIdRef.current;
          const [{ items }, turnsResp] = await Promise.all([
            fetchMessages(conversationId),
            fetchTurns(conversationId),
          ]);
          setMessages((prev) => mergeServerMessagesWithPendingLocal(prev, items, pendingId));
          const map: Record<string, TurnUiModel> = {};
          for (const turn of turnsResp.items) {
            map[turn.turnId] = normalizeTurnFromSnapshot(turn, "non_stream_snapshot");
          }
          setTurnHistoryMap(map);
        } catch {
          showToast({ type: "err", text: errMsg });
        }
      }
    } finally {
      sendInFlightRef.current = false;
      setSending(false);
      requestAnimationFrame(() => {
        composerRef.current?.focus();
      });
    }
  };

  const handleSend = async () => {
    const text = [...inputValue.trim()].join("");
    if (!text) {
      showToast({ type: "err", text: t("errors.emptyInput") });
      return;
    }
    await sendText(text);
  };

  const selectedConv = conversations.find((c) => c.id === selectedId) ?? null;
  /** 设计 §3.4：助手不可用时助手消息降级为泛化「助手」标签 */
  const assistantBubbleLabel =
    selectedConv?.assistant != null
      ? selectedConv.assistantUnavailable
        ? t("messages.assistantFallback")
        : `${selectedConv.assistant.icon ?? "🤖"} ${selectedConv.assistant.name}`
      : null;
  const turnStatusLine = useMemo(() => {
    if (!turnState) {
      return "";
    }
    if (turnState.finalStatus === "running") {
      const runningStep = turnState.steps.subSteps.find((item) => item.status === "running");
      if (runningStep) {
        return t("turn.a11y.currentStep", {
          stepKey: runningStep.stepKey,
          status: turnLabels.status.running,
        });
      }
      return t("turn.a11y.currentTurnRunning", { status: turnLabels.status.running });
    }
    if (turnState.finalStatus === "interrupted") {
      const reason = turnState.interruptionReason ?? "unknown";
      return turnLabels.interruption[reason];
    }
    if (turnState.finalStatus === "completed") {
      return t("turn.a11y.currentTurnCompleted");
    }
    return t("turn.a11y.currentTurnFailed");
  }, [turnState, turnLabels, t]);

  const handleClear = () => {
    if (!selectedId) {
      return;
    }
    void (async () => {
      const ok = await confirm({
        title: t("confirm.clearMessages.title"),
        content: t("confirm.clearMessages.content"),
        okText: t("confirm.clearMessages.ok"),
        cancelText: t("confirm.clearMessages.cancel"),
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
        setTurnState(null);
        setTurnHistoryMap({});
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[selectedId];
          return next;
        });
        await loadConversationList();
      } catch (e) {
        showToast({
          type: "err",
          text: e instanceof Error ? e.message : t("toast.clearFailed"),
        });
      }
    })();
  };

  const sidebarInner = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 p-2">
        <button
          type="button"
          onClick={() => void handleNewConversation()}
          title={t("sidebar.newChat.title")}
          className="flex w-full items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-500/15 py-2.5 text-cyan-200 shadow-[0_0_20px_-6px_rgba(34,211,238,0.5)] transition hover:bg-cyan-500/25"
          aria-label={t("sidebar.newChat.ariaLabel")}
        >
          <IconPlus />
          <span className="text-sm ml-2">{t("sidebar.newChat.label")}</span>
        </button>
      </div>
      <div className="chat-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4">
        {listLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-2 text-center font-mono text-xs text-zinc-500">{t("sidebar.empty")}</p>
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
                      {localizeConversationTitle(item.title, t)}
                    </div>
                    {item.assistant != null && (
                      <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11px] leading-snug text-zinc-500">
                        {item.assistantUnavailable ? (
                          <span className="truncate" title={t("sidebar.assistantUnavailableTitle")}>
                            <span className="opacity-70" aria-hidden>
                              🤖
                            </span>
                            <span className="ml-1">{t("sidebar.assistantUnavailable")}</span>
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
                      title={t("sidebar.deleteConversation.title")}
                      aria-label={t("sidebar.deleteConversation.ariaLabel")}
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
        title={
          <span className="flex w-full min-w-0 items-center justify-between gap-3">
            <span className="truncate">{t("newChat.title")}</span>
            <Link
              href="/console/assistants"
              onClick={() => setNewChatOpen(false)}
              className="shrink-0 font-mono text-xs font-normal text-cyan-400/90 underline decoration-cyan-500/35 underline-offset-[3px] transition hover:text-cyan-300"
            >
              {t("newChat.createAssistant")}
            </Link>
          </span>
        }
        titleId="chat-new-dialog-title"
        describedBy={newChatDescId}
        initialFocusRef={skipNewChatRef}
        panelClassName="flex max-h-[min(92dvh,720px)] flex-col overflow-hidden"
        bodyClassName="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden"
        footer={
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              ref={skipNewChatRef}
              type="button"
              onClick={() => void finishCreateConversation()}
              className="rounded-lg border border-zinc-600 bg-zinc-900/90 px-4 py-2 font-mono text-sm text-zinc-200 transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-0"
            >
              {t("newChat.skipGeneral")}
            </button>
            <button
              type="button"
              disabled={pickerLoading || !pickerSelectedId}
              onClick={() => void finishCreateConversation({ assistantId: pickerSelectedId })}
              className="rounded-lg border border-cyan-500/40 bg-cyan-600/80 px-4 py-2 font-mono text-sm text-white shadow-lg transition hover:bg-cyan-500/85 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300/35 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-900/60 disabled:text-zinc-500 disabled:shadow-none"
            >
              {t("newChat.start")}
            </button>
          </div>
        }
      >
        <p id={newChatDescId} className="shrink-0 text-sm leading-relaxed text-zinc-400">
          {t("newChat.description")}
        </p>
        {pickerError && (
          <div
            className="flex shrink-0 flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-950/35 px-3 py-2.5 text-sm leading-relaxed text-amber-100/95"
            role="alert"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 flex-1">{pickerError}</span>
              <button
                type="button"
                onClick={() => void loadPickerAssistants()}
                className="shrink-0 rounded-md border border-amber-500/35 bg-amber-950/50 px-2 py-1 font-mono text-xs text-amber-200 hover:bg-amber-900/45"
              >
                {t("newChat.retry")}
              </button>
            </div>
          </div>
        )}
        <div className="max-h-[min(16.75rem,42vh)] min-h-0 overflow-y-auto overscroll-y-contain rounded-lg border border-zinc-800/90 bg-black/35 p-1">
          {pickerLoading ? (
            <div className="flex min-h-[10rem] items-center justify-center py-6">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
            </div>
          ) : pickerError ? (
            <p className="px-2 py-5 text-center text-sm text-zinc-500">
              {t("newChat.loadFailedInline")}
            </p>
          ) : pickerItems.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-zinc-500">
              <p className="mb-2">{t("newChat.emptyTitle")}</p>
              <p className="mb-3 text-zinc-600">{t("newChat.emptyHint")}</p>
              <Link
                href="/console/assistants"
                onClick={() => setNewChatOpen(false)}
                className="inline-block text-cyan-400/95 underline decoration-cyan-500/35 underline-offset-2 hover:text-cyan-300"
              >
                {t("newChat.goToAssistants")}
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
              aria-label={t("sidebar.drawer.openHistory.title")}
              title={t("sidebar.drawer.openHistory.label")}
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-600 bg-zinc-900 p-2 text-zinc-200"
            >
              <IconMenu />
            </button>
            <button
              type="button"
              title={t("sidebar.newChat.title")}
              aria-label={t("sidebar.newChat.ariaLabel")}
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
            <div className="flex shrink-0 items-center gap-1">
              <LanguageSwitcher namespace="page.chat" variant="shell" />
              <Link
                href="/console/profile"
                title={t("header.console.title")}
                aria-label={t("header.console.ariaLabel")}
                className={`${HEADER_ACTION_ICON_CLASS} text-zinc-400 hover:text-cyan-200/90`}
              >
                <IconConfig />
              </Link>
              <button
                type="button"
                title={t("header.clearMessages.title")}
                aria-label={t("header.clearMessages.ariaLabel")}
                onClick={handleClear}
                disabled={!selectedId}
                className={`${HEADER_ACTION_ICON_CLASS} text-rose-200/90 hover:bg-rose-950/35 disabled:opacity-40`}
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
                {t("messages.assistantUnavailableBanner")}
              </div>
            )}
            {!selectedId ? (
              <p className="text-center font-mono text-sm text-zinc-500">{t("messages.emptySelect")}</p>
            ) : messagesLoading ? (
              <div className="flex justify-center py-16">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-fuchsia-500/30 border-t-fuchsia-400" />
              </div>
            ) : messages.length === 0 && !streaming ? (
              <div className="flex flex-col items-center justify-center gap-5 px-4 py-12 text-center">
                <IconEmptyState />
                <BrandMark className="text-sm" />
                <p className="max-w-xs text-sm leading-relaxed text-zinc-500">
                  {t("messages.emptyThread")}
                </p>
              </div>
            ) : (
              <>
                <div className="sr-only" aria-live="polite">
                  {turnStatusLine}
                </div>
                {(() => {
                  const renderedTurnIds = new Set<string>();
                  const byTurn: Record<string, { user: MessageRow | null; assistant: MessageRow | null }> = {};
                  for (const msg of messages) {
                    if (!msg.turnId) continue;
                    if (!byTurn[msg.turnId]) {
                      byTurn[msg.turnId] = { user: null, assistant: null };
                    }
                    if (msg.role === MessageRole.User) {
                      byTurn[msg.turnId].user = msg;
                    } else if (msg.role === MessageRole.Assistant) {
                      byTurn[msg.turnId].assistant = msg;
                    }
                  }
                  const nodes: ReactNode[] = [];
                  for (const msg of messages) {
                    if (!msg.turnId) {
                      if (
                        msg.id.startsWith("__local_user__") &&
                        messages.some(
                          (m) =>
                            m.turnId &&
                            m.role === MessageRole.User &&
                            m.content.trim() === msg.content.trim(),
                        )
                      ) {
                        continue;
                      }
                      nodes.push(
                        <MessageBubble
                          key={msg.id}
                          row={msg}
                          userLabel={userLabel}
                          assistantBubbleLabel={assistantBubbleLabel}
                        />,
                      );
                      continue;
                    }
                    const turn = turnHistoryMap[msg.turnId];
                    if (!turn || renderedTurnIds.has(msg.turnId)) {
                      continue;
                    }
                    const pair = byTurn[msg.turnId];
                    const hasAssistant = Boolean(pair?.assistant);
                    // 有 assistant 消息时，以 assistant 行为锚点渲染整轮；
                    // 无 assistant（如模型失败）时，以 user 行为锚点也要渲染整轮。
                    if (hasAssistant && msg.role !== MessageRole.Assistant) {
                      continue;
                    }
                    if (!hasAssistant && msg.role !== MessageRole.User) {
                      continue;
                    }
                    renderedTurnIds.add(msg.turnId);
                    nodes.push(
                      <div key={`turn-card-${msg.turnId}`}>
                        {pair?.user ? (
                          <MessageBubble
                            key={pair.user.id}
                            row={pair.user}
                            userLabel={userLabel}
                            assistantBubbleLabel={assistantBubbleLabel}
                          />
                        ) : null}
                        <AssistantFlowCard
                          turn={turn}
                          assistantMessage={pair?.assistant ?? null}
                          assistantBubbleLabel={assistantBubbleLabel}
                          sending={sending}
                          retryDisabledReason={
                            hasSucceededRetry(turn, turnHistoryMap)
                              ? t("turn.card.retrySucceeded")
                              : null
                          }
                          dimmed={hasSucceededRetry(turn, turnHistoryMap)}
                          onRetry={
                            pair?.user?.content && !hasSucceededRetry(turn, turnHistoryMap)
                              ? () => {
                                  const u = pair.user!;
                                  void sendText(u.content, {
                                    retryUserMessageId: u.id.startsWith("__local_user__")
                                      ? null
                                      : u.id,
                                    appendUserMessage: false,
                                  });
                                }
                              : undefined
                          }
                        />
                      </div>,
                    );
                  }
                  if (turnState && (sending || streaming)) {
                    const pendingPair =
                      (turnState.turnId && byTurn[turnState.turnId]) || { user: null, assistant: null };
                    nodes.push(
                      <div key={`turn-card-streaming-${turnState.turnId}`}>
                        {pendingPair.user ? (
                          <MessageBubble
                            key={pendingPair.user.id}
                            row={pendingPair.user}
                            userLabel={userLabel}
                            assistantBubbleLabel={assistantBubbleLabel}
                          />
                        ) : null}
                        <AssistantFlowCard
                          turn={turnState}
                          assistantMessage={pendingPair.assistant}
                          streamingText={streaming ? streamText : undefined}
                          assistantBubbleLabel={assistantBubbleLabel}
                          sending={sending}
                          retryDisabledReason={
                            hasSucceededRetry(turnState, turnHistoryMap)
                              ? t("turn.card.retrySucceeded")
                              : null
                          }
                          dimmed={hasSucceededRetry(turnState, turnHistoryMap)}
                          onRetry={
                            pendingPair.user?.content && !hasSucceededRetry(turnState, turnHistoryMap)
                              ? () => {
                                  const u = pendingPair.user!;
                                  void sendText(u.content, {
                                    retryUserMessageId: u.id.startsWith("__local_user__")
                                      ? null
                                      : u.id,
                                    appendUserMessage: false,
                                  });
                                }
                              : undefined
                          }
                        />
                      </div>,
                    );
                  }
                  return nodes;
                })()}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          <div className="chat-composer shrink-0 border-t border-zinc-800/90 bg-zinc-950/90 px-3 pt-3 pb-1 sm:px-4 sm:pt-4 sm:pb-1">
            {freeTierAssistantHint && (
              <p
                className="mb-2 font-sans text-[11px] leading-snug text-amber-400/90"
                role="status"
              >
                {t("freeTierHint.beforeLink")}
                <Link
                  href="/console/profile"
                  className="mx-0.5 font-medium text-amber-300/95 underline decoration-amber-500/50 underline-offset-2 hover:text-amber-200"
                >
                  {t("freeTierHint.link")}
                </Link>
                {t("freeTierHint.afterLink")}
              </p>
            )}
            <div className="relative">
              <textarea
                ref={composerRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  selectedId ? t("composer.placeholder.ready") : t("composer.placeholder.noSession")
                }
                disabled={!selectedId}
                rows={3}
                className="min-h-[78px] w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 pb-12 pr-12 font-mono text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50"
                aria-label={t("composer.inputAriaLabel")}
                onCompositionStart={() => {
                  imeComposingRef.current = true;
                }}
                onCompositionEnd={() => {
                  imeComposingRef.current = false;
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || e.shiftKey) {
                    return;
                  }
                  const ne = e.nativeEvent as KeyboardEvent;
                  // 229：部分浏览器在 IME 处理时 keyCode；isComposing：组字或候选确认过程中
                  if (ne.isComposing || imeComposingRef.current || ne.keyCode === 229) {
                    return;
                  }
                  e.preventDefault();
                  void handleSend();
                }}
              />
              <button
                type="button"
                title={sending ? t("composer.send.sending") : t("composer.send.title")}
                aria-label={t("composer.send.ariaLabel")}
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
            <p className="px-1 text-center text-[11px] leading-snug text-zinc-600">
              {t("composer.disclaimer")}
            </p>
          </div>
        </main>
      </div>

      {!isDesktop && drawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label={t("sidebar.drawer.close")}
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className={`relative ml-0 flex h-[100dvh] max-h-[100dvh] min-h-0 ${DRAWER_WIDTH} flex-col border-r border-cyan-500/30 bg-zinc-950 shadow-2xl`}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-3">
              <span className="font-mono text-sm text-cyan-300">{t("sidebar.drawer.title")}</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded px-2 py-1 font-mono text-xs text-zinc-400 hover:text-white"
              >
                {t("sidebar.drawer.close")}
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">{sidebarInner}</div>
          </div>
        </div>
      )}
    </div>
  );
}
