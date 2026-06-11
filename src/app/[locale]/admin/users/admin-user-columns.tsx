import { Button, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { UserStatus } from "@/common/enums";
import type { AdminUserRow } from "@/common/types";
import {
  TABLE_ACTION_BTN_CLASS,
  TableRowActions,
} from "@/components/ui/table-row-actions";

type UsersT = (key: string, values?: Record<string, string | number>) => string;

/** 锁定剩余时间文案（ICU 参数，非运行时拼接） */
export function formatLockRemain(t: UsersT, remainingMs: number): string {
  if (remainingMs <= 0) return "";
  const mins = Math.ceil(remainingMs / 60_000);
  return mins >= 1
    ? t("lockRemain.aboutMinutes", { minutes: mins })
    : t("lockRemain.lessThanOneMinute");
}

export type AdminUserColumnsCtx = {
  currentUserId: string | null;
  rowBusyId: string | null;
  patchReadOnly: (row: AdminUserRow, next: boolean) => void;
  patchStatus: (row: AdminUserRow, next: UserStatus) => void;
  openResetPassword: (row: AdminUserRow) => void;
};

/** 用户管理 ProTable/Table 列 factory */
export function getAdminUserColumns(
  t: UsersT,
  ctx: AdminUserColumnsCtx,
): ColumnsType<AdminUserRow> {
  const { currentUserId, rowBusyId, patchReadOnly, patchStatus, openResetPassword } = ctx;

  return [
    {
      title: t("columns.user"),
      key: "user",
      width: 260,
      render: (_, row) => (
        <div>
          <div className="font-medium text-white/90">{row.email}</div>
          <div className="text-xs text-white/45">
            {row.nickName}
            <span className="ml-2 font-mono text-[11px] text-white/35">{row.id}</span>
          </div>
        </div>
      ),
    },
    {
      title: t("columns.status"),
      dataIndex: "status",
      width: 100,
      render: (status: string) =>
        status === UserStatus.Active ? (
          <Tag color="success">{t("tag.active")}</Tag>
        ) : (
          <Tag>{t("tag.disabled")}</Tag>
        ),
    },
    {
      title: t("columns.accessMode"),
      dataIndex: "readOnly",
      width: 120,
      render: (readOnly: boolean) =>
        readOnly ? (
          <Tag color="gold">{t("tag.readOnly")}</Tag>
        ) : (
          <Tag color="blue">{t("tag.readWrite")}</Tag>
        ),
    },
    {
      title: t("columns.loginLock"),
      key: "lock",
      width: 160,
      render: (_, row) =>
        row.loginFailureLocked ? (
          <div>
            <Tag color="warning">{t("tag.locked")}</Tag>
            <span className="ml-1 text-xs text-white/50">
              {formatLockRemain(t, row.loginFailureLockRemainingMs)}
            </span>
          </div>
        ) : (
          <Tag>{t("tag.normal")}</Tag>
        ),
    },
    {
      title: t("columns.updatedAt"),
      dataIndex: "updatedAt",
      width: 168,
      render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: t("columns.actions"),
      key: "actions",
      width: 240,
      fixed: "right",
      render: (_, row) => {
        const self = currentUserId !== null && row.id === currentUserId;
        const busy = rowBusyId === row.id;
        const canToggle =
          row.status === UserStatus.Active ? UserStatus.Disabled : UserStatus.Active;
        const enableLabel =
          row.status === UserStatus.Active ? t("actions.disable") : t("actions.enable");
        const readOnlyLabel = row.readOnly
          ? t("actions.unsetReadOnly")
          : t("actions.setReadOnly");

        return (
          <TableRowActions twoRows>
            <Tooltip
              title={self ? t("tooltip.cannotChangeOwnReadOnly") : undefined}
            >
              <Button
                type="link"
                size="small"
                className={TABLE_ACTION_BTN_CLASS}
                disabled={self}
                loading={busy}
                onClick={() => patchReadOnly(row, !row.readOnly)}
              >
                {readOnlyLabel}
              </Button>
            </Tooltip>
            <Tooltip title={self ? t("tooltip.cannotChangeOwnStatus") : undefined}>
              <Button
                type="link"
                size="small"
                className={TABLE_ACTION_BTN_CLASS}
                disabled={self}
                loading={busy}
                onClick={() => patchStatus(row, canToggle)}
              >
                {enableLabel}
              </Button>
            </Tooltip>
            <Tooltip title={self ? t("tooltip.cannotResetOwnPassword") : undefined}>
              <Button
                type="link"
                size="small"
                danger
                className={TABLE_ACTION_BTN_CLASS}
                disabled={self}
                loading={busy}
                onClick={() => openResetPassword(row)}
              >
                {t("actions.resetPassword")}
              </Button>
            </Tooltip>
          </TableRowActions>
        );
      },
    },
  ];
}
