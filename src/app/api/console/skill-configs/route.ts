import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  SKILL_CONFIG_MAX_PER_USER,
  SKILL_CONFIG_NAME_MAX_LENGTH,
  SKILL_PACK_SKILL_MD_PATH,
} from "@/common/constants";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { getDataSource } from "@/server/db/data-source";
import { UserSkillConfig } from "@/server/db/entities/UserSkillConfig";
import { SkillPackFile } from "@/server/db/entities/SkillPackFile";
import { AssistantSkillBinding } from "@/server/db/entities/AssistantSkillBinding";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { userSkillConfigToListItemJson } from "@/server/skill/skill-config-dto";
import {
  parseBoolean,
  rejectDeprecatedSkillContentField,
  trimString,
  validateSkillDescription,
  validateSkillName,
} from "@/server/skill/skill-config-validation";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";
import { buildDefaultSkillMdTemplate } from "@/server/skill/pack-frontmatter";
import { loadPackAggregatesByPackIds } from "@/server/skill/pack-files";

export const runtime = "nodejs";

type PostBody = {
  name?: unknown;
  description?: unknown;
  content?: unknown;
  enabled?: unknown;
};

async function loadReferenceCountsBySkillId(ds: Awaited<ReturnType<typeof getDataSource>>, userId: string) {
  const raw = await ds
    .getRepository(AssistantSkillBinding)
    .createQueryBuilder("b")
    .select("b.skillConfigId", "sid")
    .addSelect("COUNT(*)", "cnt")
    .where("b.userId = :uid", { uid: userId })
    .groupBy("b.skillConfigId")
    .getRawMany<{ sid: string; cnt: string }>();
  const m = new Map<string, number>();
  for (const r of raw) {
    m.set(r.sid, Number.parseInt(String(r.cnt), 10) || 0);
  }
  return m;
}

/**
 * GET /api/console/skill-configs — 当前用户的 Skill Pack 列表。
 */
export const GET = withApiWrapper(async (request: Request) => {
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

  const url = new URL(request.url);
  const keyword = (url.searchParams.get("keyword") ?? "").trim();

  const ds = await getDataSource();
  const repo = ds.getRepository(UserSkillConfig);
  const qb = repo.createQueryBuilder("s").where("s.userId = :uid", { uid: user.id });
  if (keyword.length > 0) {
    qb.andWhere("(instr(lower(s.name), lower(:kw)) > 0 OR instr(lower(s.description), lower(:kw)) > 0)", {
      kw: keyword,
    });
  }
  const rows = await qb.orderBy("s.updatedAt", "DESC").addOrderBy("s.id", "DESC").getMany();
  const counts = await loadReferenceCountsBySkillId(ds, user.id);
  const aggregates = await loadPackAggregatesByPackIds(
    ds,
    user.id,
    rows.map((r) => r.id),
  );
  const items = rows.map((r) =>
    userSkillConfigToListItemJson(r, counts.get(r.id) ?? 0, aggregates.get(r.id)),
  );
  return NextResponse.json({ items }, { headers: { "Content-Type": "application/json; charset=utf-8" } });
});

/**
 * POST /api/console/skill-configs — 新建 Skill Pack（事务内预置 SKILL.md）。
 */
export const POST = withApiWrapper(async (request: Request) => {
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
  rejectDeprecatedSkillContentField(body as Record<string, unknown>, details, locale);

  const name = trimString(body.name);
  validateSkillName(name, details, locale);

  let description: string | null = null;
  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    const d = validateSkillDescription(body.description, details, locale);
    if (d !== undefined) description = d;
  }

  const enabled = parseBoolean(body.enabled, true);

  if (details.length > 0) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidParams"),
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    );
  }

  const ds = await getDataSource();
  const existingCount = await ds.getRepository(UserSkillConfig).count({ where: { userId: user.id } });
  if (existingCount >= SKILL_CONFIG_MAX_PER_USER) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.skillConfigLimitPerUser", { max: SKILL_CONFIG_MAX_PER_USER }),
      HttpStatus.UNPROCESSABLE_ENTITY,
      [{
        field: "name",
        message: tApiMessage(locale, "validation.skillConfigLimitReached"),
      }],
    );
  }

  const packId = uuidv4();
  const skillMd = buildDefaultSkillMdTemplate(name, description);

  try {
    await ds.transaction(async (em) => {
      const pack = em.getRepository(UserSkillConfig).create({
        id: packId,
        userId: user.id,
        name,
        description,
        content: null,
        enabled,
      });
      await em.getRepository(UserSkillConfig).save(pack);
      await em.getRepository(SkillPackFile).save(
        em.getRepository(SkillPackFile).create({
          id: uuidv4(),
          userId: user.id,
          packId,
          path: SKILL_PACK_SKILL_MD_PATH,
          content: skillMd,
        }),
      );
    });
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

  const row = await ds.getRepository(UserSkillConfig).findOneOrFail({ where: { id: packId, userId: user.id } });
  const counts = await loadReferenceCountsBySkillId(ds, user.id);
  const aggregates = await loadPackAggregatesByPackIds(ds, user.id, [packId]);
  return NextResponse.json(
    { item: userSkillConfigToListItemJson(row, counts.get(packId) ?? 0, aggregates.get(packId)) },
    { status: HttpStatus.CREATED, headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});
