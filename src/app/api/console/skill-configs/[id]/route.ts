import { NextResponse } from "next/server";
import { SKILL_CONFIG_NAME_MAX_LENGTH } from "@/common/constants";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { getDataSource } from "@/server/db/data-source";
import { UserSkillConfig } from "@/server/db/entities/UserSkillConfig";
import { SkillPackFile } from "@/server/db/entities/SkillPackFile";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { userSkillConfigToDetailItemJson } from "@/server/skill/skill-config-dto";
import { countAssistantsReferencingSkill } from "@/server/skill/assistant-skill-bindings";
import {
  parseBoolean,
  rejectDeprecatedSkillContentField,
  trimString,
  validateSkillDescription,
  validateSkillName,
} from "@/server/skill/skill-config-validation";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";
import {
  assertSkillMdPresent,
  loadPackAggregatesByPackIds,
} from "@/server/skill/pack-files";
import { validateSkillMdRequiredForEnable } from "@/server/skill/skill-pack-file-validation";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

type PatchBody = {
  name?: unknown;
  description?: unknown;
  content?: unknown;
  enabled?: unknown;
  alwaysLoad?: unknown;
};

async function getOwnedConfigOr404(userId: string, id: string) {
  const ds = await getDataSource();
  const row = await ds.getRepository(UserSkillConfig).findOne({ where: { id, userId } });
  if (!row) {
    return { ds, row: null as null };
  }
  return { ds, row };
}

/**
 * GET / PATCH / DELETE Skill Pack 元数据。
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
  const { id } = await ctx.params;
  if (!id) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidId"),
      HttpStatus.BAD_REQUEST,
    );
  }

  const { ds, row } = await getOwnedConfigOr404(user.id, id);
  if (!row) {
    return jsonError(
      ErrorCode.SKILL_CONFIG_NOT_FOUND,
      tApiMessage(locale, "skillConfigNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }
  const refCount = await countAssistantsReferencingSkill(ds, user.id, id);
  const aggregates = await loadPackAggregatesByPackIds(ds, user.id, [id]);
  return NextResponse.json(
    { item: userSkillConfigToDetailItemJson(row, refCount, aggregates.get(id)) },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

export const PATCH = withApiWrapper(async (request: Request, ctx: RouteParams) => {
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
  const { id } = await ctx.params;
  if (!id) {
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

  const { ds, row } = await getOwnedConfigOr404(user.id, id);
  if (!row) {
    return jsonError(
      ErrorCode.SKILL_CONFIG_NOT_FOUND,
      tApiMessage(locale, "skillConfigNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }

  const details: JsonErrorDetail[] = [];
  rejectDeprecatedSkillContentField(body as Record<string, unknown>, details, locale);

  if ("name" in body) {
    const name = trimString(body.name);
    const nameDetails: JsonErrorDetail[] = [];
    validateSkillName(name, nameDetails, locale);
    details.push(...nameDetails);
    if (nameDetails.length === 0) row.name = name;
  }

  if ("description" in body) {
    const d = validateSkillDescription(body.description, details, locale);
    if (d !== undefined) row.description = d;
  }

  const nextEnabled = "enabled" in body ? parseBoolean(body.enabled, row.enabled) : row.enabled;
  if ("enabled" in body && nextEnabled && !row.enabled) {
    const ok = await assertSkillMdPresent(ds, user.id, id);
    if (!ok) {
      validateSkillMdRequiredForEnable(null, details, locale);
    }
  }
  if ("enabled" in body) {
    row.enabled = nextEnabled;
  }

  if ("alwaysLoad" in body) {
    row.alwaysLoad = parseBoolean(body.alwaysLoad, row.alwaysLoad);
  }

  if (details.length > 0) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidParams"),
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    );
  }

  try {
    await ds.getRepository(UserSkillConfig).save(row);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("unique")) {
      return jsonError(
        ErrorCode.SKILL_CONFIG_NAME_CONFLICT,
        tApiMessage(locale, "skillConfigNameConflict"),
        HttpStatus.CONFLICT,
        [{
          field: "name",
          message: tApiMessage(locale, "validation.skillConfigNameUnique", {
            maxLength: SKILL_CONFIG_NAME_MAX_LENGTH,
          }),
        }],
      );
    }
    return jsonError(
      ErrorCode.INTERNAL_ERROR,
      tApiMessage(locale, "saveFailedRetry"),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  const refCount = await countAssistantsReferencingSkill(ds, user.id, id);
  const aggregates = await loadPackAggregatesByPackIds(ds, user.id, [id]);
  return NextResponse.json(
    { item: userSkillConfigToDetailItemJson(row, refCount, aggregates.get(id)) },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

export const DELETE = withApiWrapper(async (request: Request, ctx: RouteParams) => {
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
  const { id } = await ctx.params;
  if (!id) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidId"),
      HttpStatus.BAD_REQUEST,
    );
  }

  const { ds, row } = await getOwnedConfigOr404(user.id, id);
  if (!row) {
    return jsonError(
      ErrorCode.SKILL_CONFIG_NOT_FOUND,
      tApiMessage(locale, "skillConfigNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }

  const refCount = await countAssistantsReferencingSkill(ds, user.id, id);
  if (refCount > 0) {
    return jsonError(
      ErrorCode.SKILL_CONFIG_REFERENCED_BY_ASSISTANT,
      tApiMessage(locale, "skillConfigReferencedByAssistant"),
      HttpStatus.CONFLICT,
      [{
        field: "id",
        message: tApiMessage(locale, "validation.skillConfigReferencedCount", { count: refCount }),
      }],
    );
  }

  await ds.transaction(async (em) => {
    await em.getRepository(SkillPackFile).delete({ userId: user.id, packId: id });
    await em.getRepository(UserSkillConfig).delete({ id, userId: user.id });
  });
  return new NextResponse(null, { status: HttpStatus.NO_CONTENT });
});
