import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ASSISTANT_ICON_MAX_LENGTH,
  ASSISTANT_NAME_MAX_LENGTH,
  ASSISTANT_OPENING_MESSAGE_MAX_LENGTH,
  ASSISTANT_PROMPT_MAX_LENGTH,
  CONSOLE_ASSISTANT_LIST_DEFAULT_PAGE,
  CONSOLE_ASSISTANT_LIST_DEFAULT_PAGE_SIZE,
  CONSOLE_ASSISTANT_LIST_MAX_PAGE_SIZE,
} from "@/common/constants";
import { AssistantScope, ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { withAdminApi } from "@/server/auth/with-admin-api";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { createAssistantRow } from "@/server/assistant/create-assistant";
import { assistantToListItem } from "@/server/assistant/assistant-dto";
import { parseAssistantTags } from "@/server/assistant/parse-assistant-tags";
import { getDataSource } from "@/server/db/data-source";
import { Assistant } from "@/server/db/entities/Assistant";
import type { User } from "@/server/db/entities/User";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";

export const runtime = "nodejs";

function parsePage(s: string | null, fallback: number): number | null {
  if (s === null || s === "") {
    return fallback;
  }
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n) || n < 1) {
    return null;
  }
  return n;
}

function parsePageSize(s: string | null): number | null {
  if (s === null || s === "") {
    return CONSOLE_ASSISTANT_LIST_DEFAULT_PAGE_SIZE;
  }
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n) || n < 1 || n > CONSOLE_ASSISTANT_LIST_MAX_PAGE_SIZE) {
    return null;
  }
  return n;
}

type PostBody = {
  name?: unknown;
  prompt?: unknown;
  icon?: unknown;
  openingMessage?: unknown;
  tags?: unknown;
};

/**
 * GET：分页列出系统助手；错误 message 随 locale 双语。
 */
export const GET = withApiWrapper([withAdminApi], async (_admin: User, request: NextRequest, _ctx) => {
  const locale = resolveRequestLocale(request);
  const url = new URL(request.url);
  const page = parsePage(url.searchParams.get("page"), CONSOLE_ASSISTANT_LIST_DEFAULT_PAGE);
  const pageSize = parsePageSize(url.searchParams.get("pageSize"));
  if (page === null || pageSize === null) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.paginationParamsInvalid", {
        maxPageSize: CONSOLE_ASSISTANT_LIST_MAX_PAGE_SIZE,
      }),
      HttpStatus.BAD_REQUEST,
    );
  }

  const keyword = (url.searchParams.get("keyword") ?? "").trim();

  const ds = await getDataSource();
  const repo = ds.getRepository(Assistant);
  const qb = repo
    .createQueryBuilder("a")
    .where("a.scope = :sys", { sys: AssistantScope.System });

  if (keyword.length > 0) {
    qb.andWhere("instr(lower(a.name), lower(:kw)) > 0", { kw: keyword });
  }

  const total = await qb.clone().getCount();
  const rows = await qb
    .orderBy("a.updatedAt", "DESC")
    .addOrderBy("a.id", "DESC")
    .skip((page - 1) * pageSize)
    .take(pageSize)
    .getMany();

  const items = rows.map((row) => assistantToListItem(row));

  return NextResponse.json(
    { items, total, page, pageSize },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

/**
 * POST：新建系统助手。
 */
export const POST = withApiWrapper([withAdminApi], async (_admin: User, request: NextRequest, _ctx) => {
  const locale = resolveRequestLocale(request);
  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidJson"),
      HttpStatus.BAD_REQUEST,
    );
  }

  const details: JsonErrorDetail[] = [];

  const nameRaw = typeof body.name === "string" ? body.name.trim() : "";
  if (!nameRaw) {
    details.push({ field: "name", message: tApiMessage(locale, "validation.required") });
  } else if (nameRaw.length > ASSISTANT_NAME_MAX_LENGTH) {
    details.push({
      field: "name",
      message: tApiMessage(locale, "validation.maxLength", { max: ASSISTANT_NAME_MAX_LENGTH }),
    });
  }

  const promptRaw = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!promptRaw) {
    details.push({ field: "prompt", message: tApiMessage(locale, "validation.required") });
  } else if (promptRaw.length > ASSISTANT_PROMPT_MAX_LENGTH) {
    details.push({
      field: "prompt",
      message: tApiMessage(locale, "validation.maxLength", { max: ASSISTANT_PROMPT_MAX_LENGTH }),
    });
  }

  let iconOut: string | null = null;
  if (body.icon !== undefined && body.icon !== null) {
    if (typeof body.icon !== "string") {
      details.push({ field: "icon", message: tApiMessage(locale, "validation.stringOrNull") });
    } else {
      const i = body.icon.trim();
      if (i.length > ASSISTANT_ICON_MAX_LENGTH) {
        details.push({
          field: "icon",
          message: tApiMessage(locale, "validation.maxLength", { max: ASSISTANT_ICON_MAX_LENGTH }),
        });
      } else {
        iconOut = i.length > 0 ? i : null;
      }
    }
  }

  let openingOut: string | null = null;
  if (body.openingMessage !== undefined && body.openingMessage !== null) {
    if (typeof body.openingMessage !== "string") {
      details.push({
        field: "openingMessage",
        message: tApiMessage(locale, "validation.stringOrNull"),
      });
    } else {
      const o = body.openingMessage.trim();
      if (o.length > ASSISTANT_OPENING_MESSAGE_MAX_LENGTH) {
        details.push({
          field: "openingMessage",
          message: tApiMessage(locale, "validation.maxLength", {
            max: ASSISTANT_OPENING_MESSAGE_MAX_LENGTH,
          }),
        });
      } else {
        openingOut = o.length > 0 ? o : null;
      }
    }
  }

  let tagsToSave: string[] = [];
  if (body.tags !== undefined) {
    const parsed = parseAssistantTags(body.tags, locale);
    if (!parsed.ok) {
      details.push({ field: "tags", message: parsed.message });
    } else {
      tagsToSave = parsed.tags;
    }
  }

  if (details.length > 0) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidParams"),
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    );
  }

  const row = createAssistantRow({
    scope: AssistantScope.System,
    userId: null,
    name: nameRaw,
    prompt: promptRaw,
    icon: iconOut,
    openingMessage: openingOut,
    tags: tagsToSave,
  });

  try {
    const ds = await getDataSource();
    await ds.getRepository(Assistant).save(row);
  } catch (e) {
    console.error(
      JSON.stringify({
        module: "admin.assistants",
        action: "post_save_failed",
        message: e instanceof Error ? e.message : String(e),
      }),
    );
    return jsonError(
      ErrorCode.INTERNAL_ERROR,
      tApiMessage(locale, "saveFailedRetry"),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  return NextResponse.json(
    { item: assistantToListItem(row) },
    {
      status: HttpStatus.CREATED,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    },
  );
});
