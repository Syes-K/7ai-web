import { SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "@/common/constants";

/** 构造 Set-Cookie 会话串 */
export function buildSessionSetCookie(sessionId: string): string {
  const parts = [
    `${SESSION_COOKIE}=${sessionId}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE_SEC}`,
  ];
  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }
  return parts.join("; ");
}

/** 清除会话 Cookie */
export function buildSessionClearCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
