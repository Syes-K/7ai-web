import { NextResponse } from "next/server";
import { Brackets } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import {
  CHAT_CONVERSATION_LIST_DEFAULT_LIMIT,
  CHAT_CONVERSATION_LIST_MAX_LIMIT,
  CHAT_DEFAULT_CONVERSATION_TITLE,
} from "@/common/constants";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { decodeCursor, encodeCursor } from "@/server/chat/cursor";
import { getDataSource } from "@/server/db/data-source";
import { Conversation } from "@/server/db/entities/Conversation";
import { Message } from "@/server/db/entities/Message";

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
export async function GET(req: Request) {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  const { searchParams } = new URL(req.url);
  const limit = parseLimit(searchParams.get("limit"));
  if (limit === null) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "limit 参数无效",
      HttpStatus.UNPROCESSABLE_ENTITY,
      [{ field: "limit", message: "须为 1～50 的正整数" }],
    );
  }

  const cursorRaw = searchParams.get("cursor");
  const cur = decodeCursor<ListCursor>(cursorRaw);

  const ds = await getDataSource();
  const convRepo = ds.getRepository(Conversation);
  const msgRepo = ds.getRepository(Message);

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
  const previews: Record<string, string | null> = {};

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

    await Promise.all(
      ids.map(async (cid) => {
        const last = await msgRepo.findOne({
          where: { conversationId: cid },
          order: { createdAt: "DESC", id: "DESC" },
        });
        previews[cid] = last ? last.content.slice(0, 120) : null;
      }),
    );
  }

  const items = page.map((c) => ({
    id: c.id,
    title: c.title,
    updatedAt: c.updatedAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
    preview: previews[c.id] ?? null,
    messageCount: counts[c.id] ?? 0,
  }));

  let nextCursor: string | null = null;
  if (hasMore && page.length > 0) {
    const last = page[page.length - 1];
    nextCursor = encodeCursor({ u: last.updatedAt.toISOString(), i: last.id });
  }

  return NextResponse.json(
    { items, nextCursor },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
}

type PostBody = { title?: string | null };

/**
 * POST /api/chat/conversations — 创建会话
 */
export async function POST(req: Request) {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  let body: PostBody = {};
  try {
    const text = await req.text();
    if (text.trim()) {
      body = JSON.parse(text) as PostBody;
    }
  } catch {
    return jsonError(ErrorCode.VALIDATION_ERROR, "请求体须为 JSON", HttpStatus.UNPROCESSABLE_ENTITY);
  }

  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 255)
      : CHAT_DEFAULT_CONVERSATION_TITLE;

  const ds = await getDataSource();
  const convRepo = ds.getRepository(Conversation);
  const conv = convRepo.create({
    id: uuidv4(),
    userId: user.id,
    title,
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
      },
    },
    {
      status: HttpStatus.CREATED,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    },
  );
}
