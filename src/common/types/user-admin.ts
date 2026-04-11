/** 管理端用户列表/详情中的单条用户（与 `iterations/0.0.5/backend/api-spec-user-management.md` §2 对齐）。 */
export type AdminUserRow = {
  id: string;
  email: string;
  nickName: string;
  telNo: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  accountDisabled: boolean;
  loginFailureLocked: boolean;
  loginFailureLockRemainingMs: number;
};
