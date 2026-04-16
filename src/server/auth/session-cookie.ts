import { SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "@/common/constants";

type SessionCookieOptions = {
  secure?: boolean;
};

/** 构造 Set-Cookie 会话串 */
export function buildSessionSetCookie(
  sessionId: string,
  options?: SessionCookieOptions,
): string {
  const parts = [
    `${SESSION_COOKIE}=${sessionId}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE_SEC}`,
  ];
  if (options?.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

/** 清除会话 Cookie */
export function buildSessionClearCookie(options?: SessionCookieOptions): string {
  const parts = [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (options?.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}
