import { headers } from "next/headers";
import type { NextResponse } from "next/server";
import type { User } from "../db/entities/User";
import { LOCALE_COOKIE } from "@/common/constants/i18n";
import { resolveLocaleFromCookieAndHeader } from "@/common/utils/i18n";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";
import { tApiMessage } from "@/server/i18n/t-api-message";
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

/** 从当前请求 headers 解析 locale（供无 Request 参数的 admin gate 使用） */
function parseCookieFromHeader(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }
  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey?.trim() === LOCALE_COOKIE) {
      return rest.join("=").trim() || undefined;
    }
  }
  return undefined;
}

async function localeFromHeaders() {
  const h = await headers();
  const cookie = parseCookieFromHeader(h.get("cookie"));
  return resolveLocaleFromCookieAndHeader(cookie, h.get("accept-language"));
}

export type AdminGateResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

/**
 * 管理端 API：已登录且邮箱在白名单内才通过；否则返回 401 / 403 JSON。
 * 路由层请优先使用 {@link withAdminApi} 包装，避免每个 Method 重复调用本函数。
 */
export async function requireAdminApi(): Promise<AdminGateResult> {
  const locale = await localeFromHeaders();
  const reqCtx = await getRequestUserContext();
  const user = reqCtx?.user;
  if (!user) {
    return {
      ok: false,
      response: jsonError(
        ErrorCode.UNAUTHORIZED,
        tApiMessage(locale, "unauthorized"),
        HttpStatus.UNAUTHORIZED,
      ),
    };
  }
  if (!isAdminEmail(user.email)) {
    return {
      ok: false,
      response: jsonError(
        ErrorCode.FORBIDDEN,
        tApiMessage(locale, "forbidden"),
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
