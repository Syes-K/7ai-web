import { randomBytes } from "crypto";
import { getDataSource } from "../db/data-source";
import { Session } from "../db/entities/Session";
import { SESSION_MAX_AGE_SEC } from "@/common/constants";
import { buildSessionClearCookie, buildSessionSetCookie } from "./session-cookie";

/** 创建会话并返回 Set-Cookie 头值 */
export async function createUserSession(userId: string): Promise<string> {
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
  return buildSessionSetCookie(id);
}

/** 按 session id 删除会话 */
export async function destroySession(sessionId: string | undefined): Promise<void> {
  if (!sessionId) {
    return;
  }
  const ds = await getDataSource();
  await ds.getRepository(Session).delete({ id: sessionId });
}

export function clearSessionCookieHeader(): string {
  return buildSessionClearCookie();
}
