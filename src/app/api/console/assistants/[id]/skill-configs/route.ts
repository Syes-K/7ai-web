import { NextResponse } from "next/server";
import { AssistantScope, ErrorCode, HttpStatus } from "@/common/enums";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { getDataSource } from "@/server/db/data-source";
import { Assistant } from "@/server/db/entities/Assistant";
import {
  listSkillConfigIdsByAssistantIds,
  replaceAssistantSkillBindings,
} from "@/server/skill/assistant-skill-bindings";
import { parseSkillConfigIdsField } from "@/server/skill/parse-skill-config-ids";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

type PutBody = { skillConfigIds?: unknown };

/**
 * GET / PUT：助手挂载 Skill 配置。
 */
export const GET = withApiWrapper(async (request: Request, ctx: RouteParams) => {
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

  const { id: assistantId } = await ctx.params;
  if (!assistantId) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidId"),
      HttpStatus.BAD_REQUEST,
    );
  }

  const ds = await getDataSource();
  const assistant = await ds.getRepository(Assistant).findOne({
    where: { id: assistantId, scope: AssistantScope.Personal, userId: user.id },
  });
  if (!assistant) {
    return jsonError(
      ErrorCode.ASSISTANT_NOT_FOUND,
      tApiMessage(locale, "assistantNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }

  const map = await listSkillConfigIdsByAssistantIds(ds, user.id, [assistantId]);
  const ids = map.get(assistantId) ?? [];
  return NextResponse.json(
    { assistantId, skillConfigIds: ids },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

export const PUT = withApiWrapper(async (request: Request, ctx: RouteParams) => {
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

  const { id: assistantId } = await ctx.params;
  if (!assistantId) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidId"),
      HttpStatus.BAD_REQUEST,
    );
  }

  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidJson"),
      HttpStatus.BAD_REQUEST,
    );
  }

  if (body.skillConfigIds === undefined) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidParams"),
      HttpStatus.UNPROCESSABLE_ENTITY,
      [{
        field: "skillConfigIds",
        message: tApiMessage(locale, "validation.skillConfigIdsRequired"),
      }],
    );
  }
  const details: JsonErrorDetail[] = [];
  const skillConfigIds = parseSkillConfigIdsField(body.skillConfigIds, details, locale);
  if (skillConfigIds === undefined || details.length > 0) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidParams"),
      HttpStatus.UNPROCESSABLE_ENTITY,
      details.length > 0
        ? details
        : [{
            field: "skillConfigIds",
            message: tApiMessage(locale, "validation.skillConfigIdsInvalid"),
          }],
    );
  }

  const ds = await getDataSource();
  const assistant = await ds.getRepository(Assistant).findOne({
    where: { id: assistantId, scope: AssistantScope.Personal, userId: user.id },
  });
  if (!assistant) {
    return jsonError(
      ErrorCode.ASSISTANT_NOT_FOUND,
      tApiMessage(locale, "assistantNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }

  const rep = await replaceAssistantSkillBindings(ds, user.id, assistantId, skillConfigIds);
  if (!rep.ok) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidParams"),
      HttpStatus.UNPROCESSABLE_ENTITY,
      [{
        field: "skillConfigIds",
        message: tApiMessage(locale, "validation.invalidSkillConfigIds"),
      }],
    );
  }

  return NextResponse.json(
    { assistantId, skillConfigIds },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});
