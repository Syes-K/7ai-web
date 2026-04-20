import { NextResponse } from "next/server";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { findOwnedConversation } from "@/server/chat/conversation-access";
import { getDataSource } from "@/server/db/data-source";
import { ChatTurn } from "@/server/db/entities/ChatTurn";
import { jsonError } from "@/server/http/json-response";
import { withApiWrapper } from "@/server/http/with-api-wrapper";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ conversationId: string }> };

function safeParseSnapshot(raw: string): {
  version: "0.1.8";
  frozen: boolean;
  mainStages: Array<{ stage: "A" | "B" | "C" | "D" | "E" | "F"; status: string }>;
  subSteps: Array<Record<string, unknown>>;
  reasoning: {
    visibilityLevel: 0;
    status: "not_triggered" | "running" | "completed" | "failed" | "interrupted";
    safeSummary: string | null;
  };
} {
  try {
    const parsed = JSON.parse(raw) as {
      version?: "0.1.8";
      frozen?: boolean;
      mainStages?: Array<{ stage: "A" | "B" | "C" | "D" | "E" | "F"; status: string }>;
      subSteps?: Array<Record<string, unknown>>;
      reasoning?: {
        visibilityLevel?: number;
        status?: "not_triggered" | "running" | "completed" | "failed" | "interrupted";
        safeSummary?: string | null;
      };
    };
    return {
      version: "0.1.8",
      frozen: Boolean(parsed.frozen),
      mainStages: Array.isArray(parsed.mainStages) ? parsed.mainStages : [],
      subSteps: Array.isArray(parsed.subSteps) ? parsed.subSteps : [],
      reasoning: {
        visibilityLevel: 0,
        status: parsed.reasoning?.status ?? "not_triggered",
        safeSummary: parsed.reasoning?.safeSummary ?? null,
      },
    };
  } catch {
    return {
      version: "0.1.8",
      frozen: false,
      mainStages: [],
      subSteps: [],
      reasoning: {
        visibilityLevel: 0,
        status: "not_triggered",
        safeSummary: null,
      },
    };
  }
}

function turnDto(t: ChatTurn) {
  const steps = safeParseSnapshot(t.stepsSnapshotJson);
  return {
    turnId: t.id,
    userMessageId: t.userMessageId,
    assistantMessageId: t.assistantMessageId,
    finalStatus: t.finalStatus,
    interruptionReason: t.interruptionReason,
    startedAt: t.startedAt.toISOString(),
    endedAt: t.endedAt ? t.endedAt.toISOString() : null,
    durationMs: t.durationMs,
    steps,
    reasoning: steps.reasoning,
  };
}

export const GET = withApiWrapper(async (_req: Request, ctx: RouteParams) => {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;
  const { conversationId } = await ctx.params;
  const ds = await getDataSource();
  const conv = await findOwnedConversation(ds, user.id, conversationId);
  if (!conv) {
    return jsonError(ErrorCode.CONVERSATION_NOT_FOUND, "会话不存在", HttpStatus.NOT_FOUND);
  }
  const turns = await ds.getRepository(ChatTurn).find({
    where: { conversationId: conv.id },
    order: { createdAt: "ASC" },
  });
  return NextResponse.json(
    { items: turns.map(turnDto) },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});
