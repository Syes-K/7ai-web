"use client";

import { PageContainer } from "@ant-design/pro-components";
import {
  Alert,
  App,
  Button,
  Input,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { UserStatus } from "@/common/enums";
import type { AdminUserRow } from "@/common/types";

async function parseApiError(res: Response): Promise<string> {
  const j = (await res.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  return j?.error?.message ?? `请求失败（${res.status}）`;
}

function formatLockRemain(ms: number): string {
  if (ms <= 0) return "";
  const mins = Math.ceil(ms / 60_000);
  return mins >= 1 ? `约 ${mins} 分钟` : "不到 1 分钟";
}

export default function AdminUsersPage() {
  const { message, modal } = App.useApp();

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [items, setItems] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);

  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [pwdModal, setPwdModal] = useState<{
    label: string;
    temporaryPassword: string;
  } | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const sp = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (appliedQ) {
        sp.set("q", appliedQ);
      }
      const res = await fetch(`/api/admin/users?${sp.toString()}`, {
        credentials: "same-origin",
      });
      if (res.status === 401) {
        window.location.href =
          "/login?redirect=" + encodeURIComponent("/admin/users");
        return;
      }
      if (res.status === 403) {
        window.location.replace("/console?notice=admin_forbidden");
        return;
      }
      if (!res.ok) {
        setListError(await parseApiError(res));
        return;
      }
      const data = (await res.json()) as {
        items: AdminUserRow[];
        total: number;
        page: number;
        pageSize: number;
      };
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setListError("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, appliedQ]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (cancelled || !res.ok) return;
      const data = (await res.json()) as { user?: { id: string } };
      if (data.user?.id) {
        setCurrentUserId(data.user.id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applySearch = useCallback(() => {
    setPage(1);
    setAppliedQ(searchInput.trim());
  }, [searchInput]);

  const refresh = useCallback(() => {
    void loadList();
  }, [loadList]);

  const patchStatus = useCallback(
    (row: AdminUserRow, next: UserStatus) => {
      const label = row.email || row.nickName;
      const isDisable = next === UserStatus.Disabled;
      modal.confirm({
        title: isDisable ? "停用用户账号？" : "启用用户账号？",
        content: `将对「${label}」执行「${isDisable ? "停用" : "启用"}」。${isDisable
            ? "停用后该用户将无法登录系统（具体以系统策略为准）。"
            : ""
          }`,
        okText: `确认${isDisable ? "停用" : "启用"}`,
        cancelText: "取消",
        okButtonProps: { danger: isDisable },
        onOk: async () => {
          setRowBusyId(row.id);
          try {
            const res = await fetch(`/api/admin/users/${row.id}`, {
              method: "PATCH",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: next }),
            });
            if (res.status === 401) {
              window.location.href =
                "/login?redirect=" + encodeURIComponent("/admin/users");
              return;
            }
            if (res.status === 403) {
              window.location.replace("/console?notice=admin_forbidden");
              return;
            }
            if (!res.ok) {
              message.error(await parseApiError(res));
              return Promise.reject();
            }
            message.success(isDisable ? "已停用" : "已启用");
            await loadList();
          } finally {
            setRowBusyId(null);
          }
        },
      });
    },
    [loadList, message, modal],
  );

  const patchReadOnly = useCallback(
    (row: AdminUserRow, next: boolean) => {
      const label = row.email || row.nickName;
      modal.confirm({
        title: next ? "设为只读账号？" : "取消只读账号？",
        content: next
          ? `将对「${label}」开启只读限制：登录后仅允许 GET 请求。`
          : `将对「${label}」关闭只读限制：恢复新增/修改/删除等写操作能力。`,
        okText: next ? "确认设为只读" : "确认取消只读",
        cancelText: "取消",
        onOk: async () => {
          setRowBusyId(row.id);
          try {
            const res = await fetch(`/api/admin/users/${row.id}`, {
              method: "PATCH",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ readOnly: next }),
            });
            if (res.status === 401) {
              window.location.href =
                "/login?redirect=" + encodeURIComponent("/admin/users");
              return;
            }
            if (res.status === 403) {
              window.location.replace("/console?notice=admin_forbidden");
              return;
            }
            if (!res.ok) {
              message.error(await parseApiError(res));
              return Promise.reject();
            }
            message.success(next ? "已设为只读账号" : "已取消只读账号");
            await loadList();
          } finally {
            setRowBusyId(null);
          }
        },
      });
    },
    [loadList, message, modal],
  );

  const openResetPassword = useCallback(
    (row: AdminUserRow) => {
      const label = row.email || row.nickName;
      modal.confirm({
        title: "重置该用户的密码？",
        content: `将为「${label}」生成新的登录密码。请仅在安全渠道告知用户；请勿在公共场合展示。`,
        okText: "确认重置",
        cancelText: "取消",
        okButtonProps: { danger: true },
        onOk: async () => {
          setRowBusyId(row.id);
          try {
            const res = await fetch(
              `/api/admin/users/${row.id}/reset-password`,
              {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
              },
            );
            if (res.status === 401) {
              window.location.href =
                "/login?redirect=" + encodeURIComponent("/admin/users");
              return;
            }
            if (res.status === 403) {
              window.location.replace("/console?notice=admin_forbidden");
              return;
            }
            if (!res.ok) {
              message.error(await parseApiError(res));
              return Promise.reject();
            }
            const data = (await res.json()) as {
              temporaryPassword: string;
            };
            setPwdModal({ label, temporaryPassword: data.temporaryPassword });
            setPwdModalOpen(true);
            await loadList();
          } finally {
            setRowBusyId(null);
          }
        },
      });
    },
    [loadList, message, modal],
  );

  const closePwdModal = useCallback(() => {
    setPwdModalOpen(false);
    setPwdModal(null);
  }, []);

  const copyAndClose = useCallback(async () => {
    if (!pwdModal) return;
    try {
      await navigator.clipboard.writeText(pwdModal.temporaryPassword);
      message.success("已复制到剪贴板");
    } catch {
      message.warning("复制失败，请手动复制密码");
    }
    closePwdModal();
  }, [closePwdModal, message, pwdModal]);

  const columns: ColumnsType<AdminUserRow> = useMemo(
    () => [
      {
        title: "用户",
        key: "user",
        width: 260,
        render: (_, row) => (
          <div>
            <div className="font-medium text-white/90">{row.email}</div>
            <div className="text-xs text-white/45">
              {row.nickName}
              <span className="ml-2 font-mono text-[11px] text-white/35">
                {row.id}
              </span>
            </div>
          </div>
        ),
      },
      {
        title: "状态",
        dataIndex: "status",
        width: 100,
        render: (status: string) =>
          status === UserStatus.Active ? (
            <Tag color="success">启用</Tag>
          ) : (
            <Tag>停用</Tag>
          ),
      },
      {
        title: "访问模式",
        dataIndex: "readOnly",
        width: 120,
        render: (readOnly: boolean) =>
          readOnly ? <Tag color="gold">只读</Tag> : <Tag color="blue">读写</Tag>,
      },
      {
        title: "登录失败锁",
        key: "lock",
        width: 160,
        render: (_, row) =>
          row.loginFailureLocked ? (
            <div>
              <Tag color="warning">已锁定</Tag>
              <span className="ml-1 text-xs text-white/50">
                {formatLockRemain(row.loginFailureLockRemainingMs)}
              </span>
            </div>
          ) : (
            <Tag>正常</Tag>
          ),
      },
      {
        title: "最近更新",
        dataIndex: "updatedAt",
        width: 168,
        render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
      },
      {
        title: "操作",
        key: "actions",
        width: 220,
        fixed: "right",
        render: (_, row) => {
          const self = currentUserId !== null && row.id === currentUserId;
          const busy = rowBusyId === row.id;
          const canToggle =
            row.status === UserStatus.Active
              ? UserStatus.Disabled
              : UserStatus.Active;
          const enableLabel = row.status === UserStatus.Active ? "停用" : "启用";
          const readOnlyLabel = row.readOnly ? "取消只读" : "设为只读";
          return (
            <Space size="small" wrap>
              <Tooltip
                title={
                  self
                    ? "不能变更当前登录账号的只读状态，请使用其他管理员操作"
                    : undefined
                }
              >
                <Button
                  type="link"
                  size="small"
                  className="px-0"
                  disabled={self}
                  loading={busy}
                  onClick={() => patchReadOnly(row, !row.readOnly)}
                >
                  {readOnlyLabel}
                </Button>
              </Tooltip>
              <Tooltip
                title={
                  self
                    ? "不能变更当前登录账号的状态，请使用其他管理员操作"
                    : undefined
                }
              >
                <Button
                  type="link"
                  size="small"
                  className="px-0"
                  disabled={self}
                  loading={busy}
                  onClick={() => patchStatus(row, canToggle)}
                >
                  {enableLabel}
                </Button>
              </Tooltip>
              <Tooltip
                title={
                  self
                    ? "不能通过管理端重置当前登录账号的密码"
                    : undefined
                }
              >
                <Button
                  type="link"
                  size="small"
                  danger
                  className="px-0"
                  disabled={self}
                  loading={busy}
                  onClick={() => openResetPassword(row)}
                >
                  重置密码
                </Button>
              </Tooltip>
            </Space>
          );
        },
      },
    ],
    [currentUserId, openResetPassword, patchReadOnly, patchStatus, rowBusyId],
  );

  return (
    <PageContainer
      ghost
      title="用户管理"
      subTitle="系统账号运维：查看状态、调整可用性、重置密码。"
    >
      <div className="max-w-[1400px]">
        <Space wrap className="mb-4 w-full justify-between" size="middle">
          <Space.Compact style={{ minWidth: 280, maxWidth: 480 }}>
            <Input
              allowClear
              placeholder="搜索邮箱或用户名"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onPressEnter={() => applySearch()}
            />
            <Button type="primary" ghost onClick={() => applySearch()}>
              搜索
            </Button>
          </Space.Compact>
          <Button onClick={() => refresh()} disabled={loading}>
            刷新
          </Button>
        </Space>

        {listError ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            message="用户列表加载失败"
            description={listError}
            action={
              <Button size="small" type="primary" ghost onClick={() => refresh()}>
                重试
              </Button>
            }
          />
        ) : null}

        <div className="overflow-x-auto">
          <Spin spinning={loading}>
            <Table<AdminUserRow>
              rowKey="id"
              size="middle"
              columns={columns}
              dataSource={items}
              locale={{
                emptyText: loading ? "加载中…" : "暂无用户",
              }}
              pagination={{
                current: page,
                pageSize,
                total,
                showSizeChanger: true,
                showTotal: (t) => `共 ${t} 条`,
                pageSizeOptions: [10, 20, 50, 100],
                onChange: (p, ps) => {
                  setPage(p);
                  setPageSize(ps);
                },
              }}
            />
          </Spin>
        </div>

        <Typography.Text type="secondary" className="mt-4 block text-xs">
          登录失败锁为进程内状态，多实例部署下列表展示可能与实际命中节点不一致。
        </Typography.Text>
      </div>

      <Modal
        title="密码已重置"
        open={pwdModalOpen}
        onCancel={closePwdModal}
        footer={[
          <Button key="close" onClick={closePwdModal}>
            关闭
          </Button>,
          <Button key="copy" type="primary" ghost onClick={() => void copyAndClose()}>
            复制密码并关闭
          </Button>,
        ]}
        destroyOnClose
        width={480}
      >
        {pwdModal ? (
          <div className="flex flex-col gap-3">
            <p className="text-white/85">
              「{pwdModal.label}」的临时密码如下。此密码仅显示一次，关闭窗口后请通过安全渠道告知用户。
            </p>
            <Input.Password
              readOnly
              aria-readonly
              className="font-mono"
              value={pwdModal.temporaryPassword}
            />
            <Alert
              type="warning"
              showIcon
              message="请勿通过即时通讯公群发送；建议用户首次登录后尽快修改密码。"
            />
          </div>
        ) : null}
      </Modal>
    </PageContainer>
  );
}
