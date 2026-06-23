import { NextResponse } from "next/server";
import { Brackets, In } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import {
  CHAT_CONVERSATION_LIST_DEFAULT_LIMIT,
  CHAT_CONVERSATION_LIST_MAX_LIMIT,
} from "@/common/constants";
import { ErrorCode, HttpStatus, MessageRole } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";
import { findReadableAssistant } from "@/server/assistant/readable-assistant";
import { chatAssistantFields } from "@/server/chat/conversation-dto";
import { decodeCursor, encodeCursor } from "@/server/chat/cursor";
import { getDataSource } from "@/server/db/data-source";
import { Assistant } from "@/server/db/entities/Assistant";
import { Conversation } from "@/server/db/entities/Conversation";
import { Message } from "@/server/db/entities/Message";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { defaultConversationTitle } from "@/server/chat/default-conversation-title";
import { defaultAssistantOpeningMessage } from "@/server/chat/default-assistant-opening-message";

export const runtime = "nodejs";

type ListCursor = { u: string; i: string };

function parseLimit(raw: string | null): number | null {
  if (raw === null || raw === undefined || raw === "") {
    return CHAT_CONVERSATION_LIST_DEFAULT_LIMIT;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return null;
  }
  return Math.min(n, CHAT_CONVERSATION_LIST_MAX_LIMIT);
}

/**
 * GET /api/chat/conversations — 分页列出当前用户会话（updatedAt DESC）
 */
export const GET = withApiWrapper(async (req: Request) => {
  const locale = resolveRequestLocale(req);
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(
      ErrorCode.UNAUTHORIZED,
      tApiMessage(locale, "unauthorized"),
      HttpStatus.UNAUTHORIZED,
    );
  }
  const { user } = reqCtx;

  const { searchParams } = new URL(req.url);
  const limit = parseLimit(searchParams.get("limit"));
  if (limit === null) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "limitParamInvalid"),
      HttpStatus.UNPROCESSABLE_ENTITY,
      [{ field: "limit", message: tApiMessage(locale, "validation.limitRange") }],
    );
  }

  const cursorRaw = searchParams.get("cursor");
  const cur = decodeCursor<ListCursor>(cursorRaw);

  const ds = await getDataSource();
  const convRepo = ds.getRepository(Conversation);
  const msgRepo = ds.getRepository(Message);
  const asstRepo = ds.getRepository(Assistant);

  const qb = convRepo
    .createQueryBuilder("c")
    .where("c.userId = :uid", { uid: user.id })
    .orderBy("c.updatedAt", "DESC")
    .addOrderBy("c.id", "DESC")
    .take(limit + 1);

  if (cur?.u && cur?.i) {
    const uDate = new Date(cur.u);
    qb.andWhere(
      new Brackets((qb2) => {
        qb2
          .where("c.updatedAt < :ud", { ud: uDate })
          .orWhere(
            new Brackets((qb3) => {
              qb3
                .where("c.updatedAt = :ud2", { ud2: uDate })
                .andWhere("c.id < :cid", { cid: cur.i });
            }),
          );
      }),
    );
  }

  const rows = await qb.getMany();
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const ids = page.map((c) => c.id);
  const counts: Record<string, number> = {};
  const lastActivityAtMap: Record<string, string> = {};

  if (ids.length > 0) {
    const rawCounts = await msgRepo
      .createQueryBuilder("m")
      .select("m.conversationId", "cid")
      .addSelect("COUNT(*)", "cnt")
      .where("m.conversationId IN (:...ids)", { ids })
      .groupBy("m.conversationId")
      .getRawMany<{ cid: string; cnt: string }>();
    for (const r of rawCounts) {
      counts[r.cid] = Number.parseInt(r.cnt, 10);
    }

    const rawLast = await msgRepo
      .createQueryBuilder("m")
      .select("m.conversationId", "cid")
      .addSelect("MAX(m.createdAt)", "lastAt")
      .where("m.conversationId IN (:...ids)", { ids })
      .groupBy("m.conversationId")
      .getRawMany<{ cid: string; lastAt: string }>();
    for (const r of rawLast) {
      lastActivityAtMap[r.cid] = new Date(r.lastAt).toISOString();
    }
  }

  const boundAsstIds = [...new Set(page.map((c) => c.assistantId).filter(Boolean))] as string[];
  const existingAsstIds = new Set<string>();
  if (boundAsstIds.length > 0) {
    const found = await asstRepo.find({
      where: { id: In(boundAsstIds) },
      select: ["id"],
    });
    for (const a of found) {
      existingAsstIds.add(a.id);
    }
  }

  const items = page.map((c) => {
    const asstPayload = chatAssistantFields(
      c,
      c.assistantId ? existingAsstIds.has(c.assistantId) : true,
    );
    const lastActivityAt =
      lastActivityAtMap[c.id] ?? c.createdAt.toISOString();
    return {
      id: c.id,
      title: c.title,
      updatedAt: c.updatedAt.toISOString(),
      createdAt: c.createdAt.toISOString(),
      /** PRD F8：侧栏不再展示预览；字段保留为 null 兼容旧客户端 */
      preview: null as string | null,
      messageCount: counts[c.id] ?? 0,
      lastActivityAt,
      ...asstPayload,
    };
  });

  let nextCursor: string | null = null;
  if (hasMore && page.length > 0) {
    const last = page[page.length - 1];
    nextCursor = encodeCursor({ u: last.updatedAt.toISOString(), i: last.id });
  }

  return NextResponse.json(
    { items, nextCursor },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

type PostBody = { title?: string | null; assistantId?: string | null };

function parseAssistantId(raw: unknown): string | undefined {
  if (raw === null || raw === undefined) {
    return undefined;
  }
  if (typeof raw !== "string") {
    return undefined;
  }
  const t = raw.trim();
  return t.length > 0 ? t : undefined;
}

/**
 * POST /api/chat/conversations — 创建会话（可选绑定助手并注入首条开场消息）
 */
export const POST = withApiWrapper(async (req: Request) => {
  const locale = resolveRequestLocale(req);
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(
      ErrorCode.UNAUTHORIZED,
      tApiMessage(locale, "unauthorized"),
      HttpStatus.UNAUTHORIZED,
    );
  }
  const { user } = reqCtx;

  let body: PostBody = {};
  try {
    const text = await req.text();
    if (text.trim()) {
      body = JSON.parse(text) as PostBody;
    }
  } catch {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidJson"),
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 255)
      : defaultConversationTitle(locale);

  const assistantId = parseAssistantId(body.assistantId);

  const ds = await getDataSource();

  if (assistantId) {
    const asst = await findReadableAssistant(ds, assistantId, user.id);
    if (!asst) {
      return jsonError(
        ErrorCode.ASSISTANT_NOT_FOUND,
        tApiMessage(locale, "assistantNotFound"),
        HttpStatus.NOT_FOUND,
      );
    }

    const openingRaw = asst.openingMessage?.trim() ?? "";
    const openingContent =
      openingRaw.length > 0 ? openingRaw : defaultAssistantOpeningMessage(locale);

    const convId = uuidv4();
    const msgId = uuidv4();

    await ds.transaction(async (manager) => {
      const convRepo = manager.getRepository(Conversation);
      const msgRepo = manager.getRepository(Message);

      const convRow = convRepo.create({
        id: convId,
        userId: user.id,
        title,
        assistantId: asst.id,
        assistantName: asst.name,
        assistantIcon: asst.icon,
      });
      await convRepo.save(convRow);

      const msgRow = msgRepo.create({
        id: msgId,
        conversationId: convId,
        userId: user.id,
        role: MessageRole.Assistant,
        content: openingContent,
        sortOrder: 0,
      });
      await msgRepo.save(msgRow);
    });

    const convRepo = ds.getRepository(Conversation);
    const conv = await convRepo.findOne({ where: { id: convId } });
    if (!conv) {
      return jsonError(
        ErrorCode.INTERNAL_ERROR,
        tApiMessage(locale, "createConversationFailed"),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const asstFields = chatAssistantFields(conv, true);

    return NextResponse.json(
      {
        conversation: {
          id: conv.id,
          title: conv.title,
          createdAt: conv.createdAt.toISOString(),
          updatedAt: conv.updatedAt.toISOString(),
          messageCount: 1,
          lastActivityAt: conv.updatedAt.toISOString(),
          ...asstFields,
        },
      },
      {
        status: HttpStatus.CREATED,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      },
    );
  }

  const convRepo = ds.getRepository(Conversation);
  const conv = convRepo.create({
    id: uuidv4(),
    userId: user.id,
    title,
    assistantId: null,
    assistantName: null,
    assistantIcon: null,
  });
  await convRepo.save(conv);

  return NextResponse.json(
    {
      conversation: {
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
        messageCount: 0,
        lastActivityAt: conv.createdAt.toISOString(),
        assistant: null,
      },
    },
    {
      status: HttpStatus.CREATED,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    },
  );
});
