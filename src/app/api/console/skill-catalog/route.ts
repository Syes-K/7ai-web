import { NextResponse } from "next/server";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { getDataSource } from "@/server/db/data-source";
import { UserSkillConfig } from "@/server/db/entities/UserSkillConfig";
import { jsonError } from "@/server/http/json-response";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";
import { loadPackAggregatesByPackIds } from "@/server/skill/pack-files";
import { userSkillConfigToCatalogItemJson } from "@/server/skill/skill-config-dto";

export const runtime = "nodejs";

const CATALOG_MAX_PAGE_SIZE = 500;

function parsePageSize(s: string | null): number {
  if (s === null || s === "") return CATALOG_MAX_PAGE_SIZE;
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n) || n < 1) return CATALOG_MAX_PAGE_SIZE;
  return Math.min(n, CATALOG_MAX_PAGE_SIZE);
}

function parsePage(s: string | null): number {
  if (s === null || s === "") return 1;
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

/**
 * GET /api/console/skill-catalog — 已启用系统 Skill Pack 只读目录（助手挂载多选用）。
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

  const url = new URL(request.url);
  const keyword = (url.searchParams.get("keyword") ?? "").trim();
  const page = parsePage(url.searchParams.get("page"));
  const pageSize = parsePageSize(url.searchParams.get("pageSize"));

  const ds = await getDataSource();
  const qb = ds
    .getRepository(UserSkillConfig)
    .createQueryBuilder("s")
    .where("s.enabled = :en", { en: true });

  if (keyword.length > 0) {
    qb.andWhere(
      "(instr(lower(s.name), lower(:kw)) > 0 OR instr(lower(s.description), lower(:kw)) > 0)",
      { kw: keyword },
    );
  }

  const total = await qb.clone().getCount();
  const rows = await qb
    .orderBy("s.name", "ASC")
    .addOrderBy("s.id", "ASC")
    .skip((page - 1) * pageSize)
    .take(pageSize)
    .getMany();

  const aggregates = await loadPackAggregatesByPackIds(
    ds,
    rows.map((r) => r.id),
  );
  const items = rows.map((r) =>
    userSkillConfigToCatalogItemJson(r, aggregates.get(r.id)),
  );

  return NextResponse.json(
    { items, total },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});
