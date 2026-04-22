import type { AdminUserRow } from "@/common/types";
import type { User } from "@/server/db/entities/User";
import { UserStatus } from "@/common/enums";
import { getLoginFailureAggregateForEmail } from "@/server/auth/login-fail-lock";

function iso(d: Date): string {
  return d.toISOString();
}

/** 将实体转为管理端列表/详情 DTO（含登录失败锁派生字段）。 */
export function userToAdminRow(user: User): AdminUserRow {
  const { locked, remainingMsMax } = getLoginFailureAggregateForEmail(user.email);
  const accountDisabled = user.status !== UserStatus.Active;
  return {
    id: user.id,
    email: user.email,
    nickName: user.nickName,
    telNo: user.telNo,
    status: user.status,
    readOnly: Boolean(user.readOnly),
    createdAt: iso(user.createdAt),
    updatedAt: iso(user.updatedAt),
    accountDisabled,
    loginFailureLocked: locked,
    loginFailureLockRemainingMs: locked ? remainingMsMax : 0,
  };
}
