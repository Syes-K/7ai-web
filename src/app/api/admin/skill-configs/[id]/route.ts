import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { withAdminApi } from "@/server/auth/with-admin-api";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { getDataSource } from "@/server/db/data-source";
import { UserSkillConfig } from "@/server/db/entities/UserSkillConfig";
import { SkillPackFile } from "@/server/db/entities/SkillPackFile";
import type { User } from "@/server/db/entities/User";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";
import { getPackById, loadPackAggregatesByPackIds } from "@/server/skill/pack-files";
import { userSkillConfigToAdminListItemJson } from "@/server/skill/skill-config-dto";
import { listAssistantsReferencingSkill } from "@/server/skill/assistant-skill-bindings";
import { skillConfigWriteDisabledResponse } from "@/server/skill/skill-config-api-responses";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET：单条 Skill Pack 元数据。
 * DELETE：删除 Pack（含引用检查）。
 * PATCH：禁止在线编辑 → 403。
 */
export const GET = withApiWrapper([withAdminApi], async (_admin: User, request: NextRequest, ctx: RouteParams) => {
  const locale = resolveRequestLocale(request);
  const { id } = await ctx.params;
  const ds = await getDataSource();
  const row = await getPackById(ds, id);
  if (!row) {
    return jsonError(
      ErrorCode.SKILL_CONFIG_NOT_FOUND,
      tApiMessage(locale, "skillConfigNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }
  const aggregates = await loadPackAggregatesByPackIds(ds, [id]);
  return NextResponse.json(
    { item: userSkillConfigToAdminListItemJson(row, aggregates.get(id)) },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

export const DELETE = withApiWrapper([withAdminApi], async (_admin: User, request: NextRequest, ctx: RouteParams) => {
  const locale = resolveRequestLocale(request);
  const { id } = await ctx.params;
  const ds = await getDataSource();
  const row = await getPackById(ds, id);
  if (!row) {
    return jsonError(
      ErrorCode.SKILL_CONFIG_NOT_FOUND,
      tApiMessage(locale, "skillConfigNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }

  const referencedAssistants = await listAssistantsReferencingSkill(ds, id);
  if (referencedAssistants.length > 0) {
    const details: JsonErrorDetail[] = [{
      field: "id",
      message: tApiMessage(locale, "validation.skillConfigReferencedCount", {
        count: referencedAssistants.length,
      }),
    }];
    return NextResponse.json(
      {
        code: ErrorCode.SKILL_CONFIG_REFERENCED_BY_ASSISTANT,
        message: tApiMessage(locale, "skillConfigReferencedByAssistant"),
        referencedAssistants,
        details,
      },
      { status: HttpStatus.CONFLICT, headers: { "Content-Type": "application/json; charset=utf-8" } },
    );
  }

  try {
    await ds.transaction(async (em) => {
      await em.getRepository(SkillPackFile).delete({ packId: id });
      await em.getRepository(UserSkillConfig).delete({ id });
    });
  } catch (e) {
    console.error(
      JSON.stringify({
        module: "admin.skill-configs",
        action: "delete_failed",
        id,
        message: e instanceof Error ? e.message : String(e),
      }),
    );
    return jsonError(
      ErrorCode.INTERNAL_ERROR,
      tApiMessage(locale, "saveFailedRetry"),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  return new NextResponse(null, { status: HttpStatus.NO_CONTENT });
});

export const PATCH = withApiWrapper([withAdminApi], async (_admin: User, request: NextRequest) => {
  const locale = resolveRequestLocale(request);
  return skillConfigWriteDisabledResponse(locale);
});
