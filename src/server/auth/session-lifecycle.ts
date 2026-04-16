import { randomBytes } from "crypto";
import { getDataSource } from "../db/data-source";
import { Session } from "../db/entities/Session";
import { SESSION_MAX_AGE_SEC } from "@/common/constants";
import { buildSessionClearCookie, buildSessionSetCookie } from "./session-cookie";

function isSecureRequest(request: Request): boolean {
  const xfp = request.headers.get("x-forwarded-proto");
  if (xfp) {
    return xfp.split(",")[0]?.trim().toLowerCase() === "https";
  }
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return process.env.NODE_ENV === "production";
  }
}

/** 创建会话并返回 Set-Cookie 头值 */
export async function createUserSession(userId: string, request: Request): Promise<string> {
  const ds = await getDataSource();
  const repo = ds.getRepository(Session);
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000);
  await repo.save(
    repo.create({
      id,
      userId,
      expiresAt,
      createdAt: new Date(),
    }),
  );
  return buildSessionSetCookie(id, { secure: isSecureRequest(request) });
}

/** 按 session id 删除会话 */
export async function destroySession(sessionId: string | undefined): Promise<void> {
  if (!sessionId) {
    return;
  }
  const ds = await getDataSource();
  await ds.getRepository(Session).delete({ id: sessionId });
}

export function clearSessionCookieHeader(request: Request): string {
  return buildSessionClearCookie({ secure: isSecureRequest(request) });
}
