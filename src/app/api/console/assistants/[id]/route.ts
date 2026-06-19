import { NextResponse } from "next/server";
import {
  ASSISTANT_ICON_MAX_LENGTH,
  ASSISTANT_NAME_MAX_LENGTH,
  ASSISTANT_OPENING_MESSAGE_MAX_LENGTH,
  ASSISTANT_PROMPT_MAX_LENGTH,
} from "@/common/constants";
import { AssistantScope, ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { assistantToListItem } from "@/server/assistant/assistant-dto";
import {
  normalizeStoredAssistantTags,
  parseAssistantTags,
} from "@/server/assistant/parse-assistant-tags";
import { findReadableAssistant } from "@/server/assistant/readable-assistant";
import { getDataSource } from "@/server/db/data-source";
import { Assistant } from "@/server/db/entities/Assistant";
import { AssistantMcpBinding } from "@/server/db/entities/AssistantMcpBinding";
import { AssistantSkillBinding } from "@/server/db/entities/AssistantSkillBinding";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";
import { withApiWrapper } from "@/server/http/with-api-wrapper";

export const runtime = "nodejs";

type PatchBody = {
  name?: unknown;
  prompt?: unknown;
  icon?: unknown;
  openingMessage?: unknown;
  tags?: unknown;
};

/**
 * GET：单条详情（系统助手或本人个人助手）；错误 message 随 locale 双语。
 */
export const GET = withApiWrapper(async (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => {
  const locale = resolveRequestLocale(request);
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(
      ErrorCode.UNAUTHORIZED,
      tApiMessage(locale, "unauthorized"),
      HttpStatus.UNAUTHORIZED,
    );
  }
  const { user } = reqCtx;

  const { id } = await context.params;
  if (!id || typeof id !== "string") {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidId"),
      HttpStatus.BAD_REQUEST,
    );
  }

  const ds = await getDataSource();
  const row = await findReadableAssistant(ds, id, user.id);
  if (!row) {
    return jsonError(
      ErrorCode.ASSISTANT_NOT_FOUND,
      tApiMessage(locale, "assistantNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }

  return NextResponse.json(
    { item: assistantToListItem(row) },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

/**
 * PATCH：仅本人个人助手；错误 message 随 locale 双语。
 */
export const PATCH = withApiWrapper(async (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => {
  const locale = resolveRequestLocale(request);
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(
      ErrorCode.UNAUTHORIZED,
      tApiMessage(locale, "unauthorized"),
      HttpStatus.UNAUTHORIZED,
    );
  }
  const { user } = reqCtx;

  const { id } = await context.params;
  if (!id || typeof id !== "string") {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidId"),
      HttpStatus.BAD_REQUEST,
    );
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidJson"),
      HttpStatus.BAD_REQUEST,
    );
  }

  const ds = await getDataSource();
  const repo = ds.getRepository(Assistant);
  const row = await repo.findOne({
    where: { id, scope: AssistantScope.Personal, userId: user.id },
  });
  if (!row) {
    return jsonError(
      ErrorCode.ASSISTANT_NOT_FOUND,
      tApiMessage(locale, "assistantNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }

  const details: JsonErrorDetail[] = [];
  let nextName = row.name;
  let nextPrompt = row.prompt;
  let nextIcon = row.icon;
  let nextOpening = row.openingMessage;
  let nextTags = normalizeStoredAssistantTags(row.tags);

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      details.push({ field: "name", message: tApiMessage(locale, "validation.required") });
    } else if (name.length > ASSISTANT_NAME_MAX_LENGTH) {
      details.push({
        field: "name",
        message: tApiMessage(locale, "validation.maxLength", { max: ASSISTANT_NAME_MAX_LENGTH }),
      });
    } else {
      nextName = name;
    }
  }

  if (body.prompt !== undefined) {
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      details.push({ field: "prompt", message: tApiMessage(locale, "validation.required") });
    } else if (prompt.length > ASSISTANT_PROMPT_MAX_LENGTH) {
      details.push({
        field: "prompt",
        message: tApiMessage(locale, "validation.maxLength", { max: ASSISTANT_PROMPT_MAX_LENGTH }),
      });
    } else {
      nextPrompt = prompt;
    }
  }

  if (body.icon !== undefined) {
    if (body.icon !== null && typeof body.icon !== "string") {
      details.push({ field: "icon", message: tApiMessage(locale, "validation.stringOrNull") });
    } else {
      const i =
        body.icon === null || body.icon === undefined
          ? ""
          : (body.icon as string).trim();
      if (i.length > ASSISTANT_ICON_MAX_LENGTH) {
        details.push({
          field: "icon",
          message: tApiMessage(locale, "validation.maxLength", { max: ASSISTANT_ICON_MAX_LENGTH }),
        });
      } else {
        nextIcon = i.length > 0 ? i : null;
      }
    }
  }

  if (body.openingMessage !== undefined) {
    if (body.openingMessage !== null && typeof body.openingMessage !== "string") {
      details.push({
        field: "openingMessage",
        message: tApiMessage(locale, "validation.stringOrNull"),
      });
    } else {
      const o =
        body.openingMessage === null || body.openingMessage === undefined
          ? ""
          : (body.openingMessage as string).trim();
      if (o.length > ASSISTANT_OPENING_MESSAGE_MAX_LENGTH) {
        details.push({
          field: "openingMessage",
          message: tApiMessage(locale, "validation.maxLength", {
            max: ASSISTANT_OPENING_MESSAGE_MAX_LENGTH,
          }),
        });
      } else {
        nextOpening = o.length > 0 ? o : null;
      }
    }
  }

  if ("tags" in body) {
    const parsed = parseAssistantTags(body.tags, locale);
    if (!parsed.ok) {
      details.push({ field: "tags", message: parsed.message });
    } else {
      nextTags = parsed.tags;
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

  row.name = nextName;
  row.prompt = nextPrompt;
  row.icon = nextIcon;
  row.openingMessage = nextOpening;
  row.tags = nextTags.length > 0 ? nextTags : null;
  await repo.save(row);

  return NextResponse.json(
    { item: assistantToListItem(row) },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

/**
 * DELETE：仅本人个人助手。
 */
export const DELETE = withApiWrapper(async (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => {
  const locale = resolveRequestLocale(request);
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(
      ErrorCode.UNAUTHORIZED,
      tApiMessage(locale, "unauthorized"),
      HttpStatus.UNAUTHORIZED,
    );
  }
  const { user } = reqCtx;

  const { id } = await context.params;
  if (!id || typeof id !== "string") {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidId"),
      HttpStatus.BAD_REQUEST,
    );
  }

  const ds = await getDataSource();
  const repo = ds.getRepository(Assistant);
  const row = await repo.findOne({
    where: { id, scope: AssistantScope.Personal, userId: user.id },
  });
  if (!row) {
    return jsonError(
      ErrorCode.ASSISTANT_NOT_FOUND,
      tApiMessage(locale, "assistantNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }

  await ds.getRepository(AssistantMcpBinding).delete({ assistantId: id, userId: user.id } as any);
  await ds.getRepository(AssistantSkillBinding).delete({ assistantId: id, userId: user.id } as any);
  await repo.remove(row);

  return new NextResponse(null, { status: HttpStatus.NO_CONTENT });
});
