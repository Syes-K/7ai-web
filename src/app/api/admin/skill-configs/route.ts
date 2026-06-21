import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  CONSOLE_MODEL_LIST_DEFAULT_PAGE,
  CONSOLE_MODEL_LIST_DEFAULT_PAGE_SIZE,
  CONSOLE_MODEL_LIST_MAX_PAGE_SIZE,
} from "@/common/constants";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";
import { withAdminApi } from "@/server/auth/with-admin-api";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { getDataSource } from "@/server/db/data-source";
import { UserSkillConfig } from "@/server/db/entities/UserSkillConfig";
import type { User } from "@/server/db/entities/User";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";
import { loadPackAggregatesByPackIds } from "@/server/skill/pack-files";
import { userSkillConfigToAdminListItemJson } from "@/server/skill/skill-config-dto";
import { skillConfigWriteDisabledResponse } from "@/server/skill/skill-config-api-responses";

export const runtime = "nodejs";

function parsePage(s: string | null, fallback: number): number | null {
  if (s === null || s === "") return fallback;
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

function parsePageSize(s: string | null): number | null {
  if (s === null || s === "") return CONSOLE_MODEL_LIST_DEFAULT_PAGE_SIZE;
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n) || n < 1 || n > CONSOLE_MODEL_LIST_MAX_PAGE_SIZE) return null;
  return n;
}

/**
 * GET：分页列出系统 Skill Pack（含 disabled）。
 * POST：禁止在线创建 → 403。
 */
export const GET = withApiWrapper([withAdminApi], async (_admin: User, request: NextRequest) => {
  const locale = resolveRequestLocale(request);
  const url = new URL(request.url);
  const page = parsePage(url.searchParams.get("page"), CONSOLE_MODEL_LIST_DEFAULT_PAGE);
  const pageSize = parsePageSize(url.searchParams.get("pageSize"));
  if (page === null || pageSize === null) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.paginationParamsInvalid", {
        maxPageSize: CONSOLE_MODEL_LIST_MAX_PAGE_SIZE,
      }),
      HttpStatus.BAD_REQUEST,
    );
  }

  const keyword = (url.searchParams.get("keyword") ?? "").trim();
  const ds = await getDataSource();
  const qb = ds.getRepository(UserSkillConfig).createQueryBuilder("s");
  if (keyword.length > 0) {
    qb.andWhere(
      "(instr(lower(s.name), lower(:kw)) > 0 OR instr(lower(s.description), lower(:kw)) > 0)",
      { kw: keyword },
    );
  }

  const total = await qb.clone().getCount();
  const rows = await qb
    .orderBy("s.updatedAt", "DESC")
    .addOrderBy("s.id", "DESC")
    .skip((page - 1) * pageSize)
    .take(pageSize)
    .getMany();

  const aggregates = await loadPackAggregatesByPackIds(
    ds,
    rows.map((r) => r.id),
  );
  const items = rows.map((r) =>
    userSkillConfigToAdminListItemJson(r, aggregates.get(r.id)),
  );

  return NextResponse.json(
    { items, total, page, pageSize },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

export const POST = withApiWrapper([withAdminApi], async (_admin: User, request: NextRequest) => {
  const locale = resolveRequestLocale(request);
  return skillConfigWriteDisabledResponse(locale);
});
