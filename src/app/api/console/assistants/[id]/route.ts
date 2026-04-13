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

export const runtime = "nodejs";

type PatchBody = {
  name?: unknown;
  prompt?: unknown;
  icon?: unknown;
  openingMessage?: unknown;
  tags?: unknown;
};

/**
 * GET：单条详情（系统助手或本人个人助手）。
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  const { id } = await context.params;
  if (!id || typeof id !== "string") {
    return jsonError(ErrorCode.VALIDATION_ERROR, "id 无效", HttpStatus.BAD_REQUEST);
  }

  const ds = await getDataSource();
  const row = await findReadableAssistant(ds, id, user.id);
  if (!row) {
    return jsonError(
      ErrorCode.ASSISTANT_NOT_FOUND,
      "助手不存在",
      HttpStatus.NOT_FOUND,
    );
  }

  return NextResponse.json(
    { item: assistantToListItem(row) },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
}

/**
 * PATCH：仅本人个人助手。
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  const { id } = await context.params;
  if (!id || typeof id !== "string") {
    return jsonError(ErrorCode.VALIDATION_ERROR, "id 无效", HttpStatus.BAD_REQUEST);
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return jsonError(ErrorCode.VALIDATION_ERROR, "请求体须为 JSON", HttpStatus.BAD_REQUEST);
  }

  const ds = await getDataSource();
  const repo = ds.getRepository(Assistant);
  const row = await repo.findOne({
    where: { id, scope: AssistantScope.Personal, userId: user.id },
  });
  if (!row) {
    return jsonError(
      ErrorCode.ASSISTANT_NOT_FOUND,
      "助手不存在",
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
      details.push({ field: "name", message: "不能为空" });
    } else if (name.length > ASSISTANT_NAME_MAX_LENGTH) {
      details.push({
        field: "name",
        message: `长度不能超过 ${ASSISTANT_NAME_MAX_LENGTH}`,
      });
    } else {
      nextName = name;
    }
  }

  if (body.prompt !== undefined) {
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      details.push({ field: "prompt", message: "不能为空" });
    } else if (prompt.length > ASSISTANT_PROMPT_MAX_LENGTH) {
      details.push({
        field: "prompt",
        message: `长度不能超过 ${ASSISTANT_PROMPT_MAX_LENGTH}`,
      });
    } else {
      nextPrompt = prompt;
    }
  }

  if (body.icon !== undefined) {
    if (body.icon !== null && typeof body.icon !== "string") {
      details.push({ field: "icon", message: "须为字符串或 null" });
    } else {
      const i =
        body.icon === null || body.icon === undefined
          ? ""
          : (body.icon as string).trim();
      if (i.length > ASSISTANT_ICON_MAX_LENGTH) {
        details.push({
          field: "icon",
          message: `长度不能超过 ${ASSISTANT_ICON_MAX_LENGTH}`,
        });
      } else {
        nextIcon = i.length > 0 ? i : null;
      }
    }
  }

  if (body.openingMessage !== undefined) {
    if (body.openingMessage !== null && typeof body.openingMessage !== "string") {
      details.push({ field: "openingMessage", message: "须为字符串或 null" });
    } else {
      const o =
        body.openingMessage === null || body.openingMessage === undefined
          ? ""
          : (body.openingMessage as string).trim();
      if (o.length > ASSISTANT_OPENING_MESSAGE_MAX_LENGTH) {
        details.push({
          field: "openingMessage",
          message: `长度不能超过 ${ASSISTANT_OPENING_MESSAGE_MAX_LENGTH}`,
        });
      } else {
        nextOpening = o.length > 0 ? o : null;
      }
    }
  }

  if ("tags" in body) {
    const parsed = parseAssistantTags(body.tags);
    if (!parsed.ok) {
      details.push({ field: "tags", message: parsed.message });
    } else {
      nextTags = parsed.tags;
    }
  }

  if (details.length > 0) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "请求参数不合法",
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
}

/**
 * DELETE：仅本人个人助手。
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  const { id } = await context.params;
  if (!id || typeof id !== "string") {
    return jsonError(ErrorCode.VALIDATION_ERROR, "id 无效", HttpStatus.BAD_REQUEST);
  }

  const ds = await getDataSource();
  const repo = ds.getRepository(Assistant);
  const row = await repo.findOne({
    where: { id, scope: AssistantScope.Personal, userId: user.id },
  });
  if (!row) {
    return jsonError(
      ErrorCode.ASSISTANT_NOT_FOUND,
      "助手不存在",
      HttpStatus.NOT_FOUND,
    );
  }

  await repo.remove(row);

  return new NextResponse(null, { status: HttpStatus.NO_CONTENT });
}
