/**
 * 从 HTTP 请求解析 API / middleware 使用的 AppLocale。
 */
import type { NextRequest } from "next/server";
import { LOCALE_COOKIE } from "@/common/constants/i18n";
import { resolveLocaleFromCookieAndHeader } from "@/common/utils/i18n";
import type { AppLocale } from "@/common/constants/i18n";

/** 从 Cookie 头字符串中提取指定 cookie 值（裸 Request 场景） */
function cookieFromHeader(
  cookieHeader: string | null,
  name: string,
): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = part.slice(0, eq).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return undefined;
}

/** 从 Request / NextRequest 解析 API 与 middleware 使用的 locale */
export function resolveRequestLocale(request: Request | NextRequest): AppLocale {
  let cookieValue: string | undefined;

  if ("cookies" in request && typeof request.cookies?.get === "function") {
    cookieValue = request.cookies.get(LOCALE_COOKIE)?.value;
  } else {
    cookieValue = cookieFromHeader(request.headers.get("cookie"), LOCALE_COOKIE);
  }

  return resolveLocaleFromCookieAndHeader(
    cookieValue,
    request.headers.get("accept-language"),
  );
}
