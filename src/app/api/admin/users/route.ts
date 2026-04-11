import { NextResponse } from "next/server";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";
import { withAdminApi } from "@/server/auth/with-admin-api";
import { getDataSource } from "@/server/db/data-source";
import { User } from "@/server/db/entities/User";
import { userToAdminRow } from "@/server/user-admin/map-to-dto";

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
    return 20;
  }
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n) || n < 1 || n > 100) {
    return null;
  }
  return n;
}

/**
 * GET：分页用户列表，可选关键字 `q`（匹配 email / nickName）。
 */
export const GET = withAdminApi(async (_admin, request, _ctx) => {
  const url = new URL(request.url);
  const page = parsePage(url.searchParams.get("page"), 1);
  const pageSize = parsePageSize(url.searchParams.get("pageSize"));
  if (page === null || pageSize === null) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "分页参数非法：page 须为 ≥1 的整数，pageSize 须为 1–100 的整数",
      HttpStatus.BAD_REQUEST,
    );
  }

  const qRaw = (url.searchParams.get("q") ?? "").trim();
  /** 去掉 LIKE 通配符，避免误用 %/_ 扩大匹配（管理端仍须防输入滥用）。 */
  const qSafe = qRaw.slice(0, 500).replace(/[%_]/g, "");

  const ds = await getDataSource();
  const repo = ds.getRepository(User);
  const qb = repo.createQueryBuilder("user");

  if (qSafe.length > 0) {
    qb.andWhere("(user.email LIKE :pat OR user.nickName LIKE :pat)", {
      pat: `%${qSafe}%`,
    });
  }

  const total = await qb.getCount();
  const users = await qb
    .clone()
    .orderBy("user.createdAt", "DESC")
    .skip((page - 1) * pageSize)
    .take(pageSize)
    .getMany();

  const items = users.map(userToAdminRow);

  return NextResponse.json(
    {
      items,
      total,
      page,
      pageSize,
    },
    {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    },
  );
});
