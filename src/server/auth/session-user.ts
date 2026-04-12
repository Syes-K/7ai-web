import { cookies } from "next/headers";
import { getDataSource } from "../db/data-source";
import { Session } from "../db/entities/Session";
import { User } from "../db/entities/User";
import { SESSION_COOKIE } from "@/common/constants";

/**
 * 从 Cookie 解析当前登录用户（底层实现）。
 * 业务路由若需同时拿到「用户 + 偏好指针」，请优先使用 `./request-user-context` 中的 `getRequestUserContext`。
 */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sid = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sid) {
    return null;
  }

  const ds = await getDataSource();
  const sessionRepo = ds.getRepository(Session);
  const session = await sessionRepo.findOne({ where: { id: sid } });
  if (!session) {
    return null;
  }
  if (new Date(session.expiresAt) < new Date()) {
    return null;
  }

  const userRepo = ds.getRepository(User);
  const user = await userRepo.findOne({ where: { id: session.userId } });
  if (!user || user.status !== "active") {
    return null;
  }
  return user;
}
