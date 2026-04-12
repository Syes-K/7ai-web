import type { NextResponse } from "next/server";
import type { User } from "../db/entities/User";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";
import { getRequestUserContext } from "./request-user-context";

/**
 * 管理员白名单：环境变量 `ADMIN_USER`，逗号分隔邮箱（忽略首尾空格，比较时忽略大小写）。
 * 未配置或为空时，无人具备管理后台权限（需本地/部署显式配置）。
 */
function parseAdminEmails(): string[] {
  const raw = process.env.ADMIN_USER?.trim();
  if (!raw) {
    return [];
  }
  return raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) {
    return false;
  }
  const admins = parseAdminEmails();
  return admins.includes(email.trim().toLowerCase());
}

/** 当前会话用户是否为管理员（未登录为 false）。 */
export async function isAdmin(): Promise<boolean> {
  const reqCtx = await getRequestUserContext();
  return isAdminEmail(reqCtx?.user.email);
}

export type AdminGateResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

/**
 * 管理端 API：已登录且邮箱在白名单内才通过；否则返回 401 / 403 JSON。
 * 路由层请优先使用 {@link withAdminApi} 包装，避免每个 Method 重复调用本函数。
 */
export async function requireAdminApi(): Promise<AdminGateResult> {
  const reqCtx = await getRequestUserContext();
  const user = reqCtx?.user;
  if (!user) {
    return {
      ok: false,
      response: jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED),
    };
  }
  if (!isAdminEmail(user.email)) {
    return {
      ok: false,
      response: jsonError(
        ErrorCode.FORBIDDEN,
        "无管理员权限",
        HttpStatus.FORBIDDEN,
      ),
    };
  }
  return { ok: true, user };
}

/**
 * 管理后台页面（RSC layout）：区分未登录与已登录非管理员。
 */
export async function gateAdminPageAccess(): Promise<"ok" | "login" | "forbidden"> {
  const reqCtx = await getRequestUserContext();
  const user = reqCtx?.user;
  if (!user) {
    return "login";
  }
  if (!isAdminEmail(user.email)) {
    return "forbidden";
  }
  return "ok";
}
