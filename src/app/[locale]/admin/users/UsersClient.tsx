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
  Typography,
} from "antd";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { UserStatus } from "@/common/enums";
import type { AdminUserRow } from "@/common/types";
import { parseApiError } from "@/common/utils/parse-api-error";
import { handleAdminApiAuthStatus } from "../admin-api-guards";
import { useAdminSession } from "../AdminSessionContext";
import { getAdminUserColumns } from "./admin-user-columns";

/** 用户管理：列表、启停、只读、重置密码 */
export default function UsersClient() {
  const locale = useLocale();
  const t = useTranslations("page.admin.users");
  const tShell = useTranslations("page.admin.shell");
  const tConfirm = useTranslations("page.shell.confirm");
  const { userId: currentUserId } = useAdminSession();
  const { message, modal } = App.useApp();

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [items, setItems] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);

  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [pwdModal, setPwdModal] = useState<{
    label: string;
    temporaryPassword: string;
  } | null>(null);

  const returnPath = `/${locale}/admin/users`;

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
      if (handleAdminApiAuthStatus(res.status, locale, returnPath)) {
        return;
      }
      if (!res.ok) {
        setListError(await parseApiError(res, { t: tShell }));
        return;
      }
      const data = (await res.json()) as {
        items: AdminUserRow[];
        total: number;
      };
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setListError(tShell("errors.networkRetry"));
    } finally {
      setLoading(false);
    }
  }, [appliedQ, locale, page, pageSize, returnPath, tShell]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

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
        title: isDisable
          ? t("confirm.disableUser.title")
          : t("confirm.enableUser.title"),
        content: isDisable
          ? t("confirm.disableUser.content", { label })
          : t("confirm.enableUser.content", { label }),
        okText: isDisable
          ? t("confirm.disableUser.ok")
          : t("confirm.enableUser.ok"),
        cancelText: tConfirm("cancel"),
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
            if (handleAdminApiAuthStatus(res.status, locale, returnPath)) {
              return;
            }
            if (!res.ok) {
              message.error(await parseApiError(res, { t: tShell }));
              return Promise.reject();
            }
            message.success(isDisable ? t("toast.disabled") : t("toast.enabled"));
            await loadList();
          } finally {
            setRowBusyId(null);
          }
        },
      });
    },
    [loadList, locale, message, modal, returnPath, t, tConfirm, tShell],
  );

  const patchReadOnly = useCallback(
    (row: AdminUserRow, next: boolean) => {
      const label = row.email || row.nickName;
      modal.confirm({
        title: next
          ? t("confirm.setReadOnly.title")
          : t("confirm.unsetReadOnly.title"),
        content: next
          ? t("confirm.setReadOnly.content", { label })
          : t("confirm.unsetReadOnly.content", { label }),
        okText: next ? t("confirm.setReadOnly.ok") : t("confirm.unsetReadOnly.ok"),
        cancelText: tConfirm("cancel"),
        onOk: async () => {
          setRowBusyId(row.id);
          try {
            const res = await fetch(`/api/admin/users/${row.id}`, {
              method: "PATCH",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ readOnly: next }),
            });
            if (handleAdminApiAuthStatus(res.status, locale, returnPath)) {
              return;
            }
            if (!res.ok) {
              message.error(await parseApiError(res, { t: tShell }));
              return Promise.reject();
            }
            message.success(next ? t("toast.readOnlyOn") : t("toast.readOnlyOff"));
            await loadList();
          } finally {
            setRowBusyId(null);
          }
        },
      });
    },
    [loadList, locale, message, modal, returnPath, t, tConfirm, tShell],
  );

  const openResetPassword = useCallback(
    (row: AdminUserRow) => {
      const label = row.email || row.nickName;
      modal.confirm({
        title: t("confirm.resetPassword.title"),
        content: t("confirm.resetPassword.content", { label }),
        okText: t("confirm.resetPassword.ok"),
        cancelText: tConfirm("cancel"),
        okButtonProps: { danger: true },
        onOk: async () => {
          setRowBusyId(row.id);
          try {
            const res = await fetch(`/api/admin/users/${row.id}/reset-password`, {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            });
            if (handleAdminApiAuthStatus(res.status, locale, returnPath)) {
              return;
            }
            if (!res.ok) {
              message.error(await parseApiError(res, { t: tShell }));
              return Promise.reject();
            }
            const data = (await res.json()) as { temporaryPassword: string };
            setPwdModal({ label, temporaryPassword: data.temporaryPassword });
            setPwdModalOpen(true);
            await loadList();
          } finally {
            setRowBusyId(null);
          }
        },
      });
    },
    [loadList, locale, message, modal, returnPath, t, tConfirm, tShell],
  );

  const closePwdModal = useCallback(() => {
    setPwdModalOpen(false);
    setPwdModal(null);
  }, []);

  const copyAndClose = useCallback(async () => {
    if (!pwdModal) return;
    try {
      await navigator.clipboard.writeText(pwdModal.temporaryPassword);
      message.success(t("toast.copied"));
    } catch {
      message.warning(t("toast.copyFailed"));
    }
    closePwdModal();
  }, [closePwdModal, message, pwdModal, t]);

  const columns = useMemo(
    () =>
      getAdminUserColumns(t, {
        currentUserId,
        rowBusyId,
        patchReadOnly,
        patchStatus,
        openResetPassword,
      }),
    [currentUserId, openResetPassword, patchReadOnly, patchStatus, rowBusyId, t],
  );

  return (
    <PageContainer ghost title={t("title")} subTitle={t("subTitle")}>
      <div className="max-w-[1400px]">
        <Space wrap className="mb-4 w-full justify-between" size="middle">
          <Space.Compact style={{ minWidth: 280, maxWidth: 480 }}>
            <Input
              allowClear
              placeholder={t("search.placeholder")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onPressEnter={() => applySearch()}
            />
            <Button type="primary" ghost onClick={() => applySearch()}>
              {t("search.button")}
            </Button>
          </Space.Compact>
          <Button onClick={() => refresh()} disabled={loading}>
            {t("toolbar.refresh")}
          </Button>
        </Space>

        {listError ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            message={t("alert.listFailed")}
            description={listError}
            action={
              <Button size="small" type="primary" ghost onClick={() => refresh()}>
                {t("actions.retry")}
              </Button>
            }
          />
        ) : null}

        <div className="overflow-x-auto">
          <Spin spinning={loading}>
            <Table<AdminUserRow>
              rowKey="id"
              size="middle"
              tableLayout="fixed"
              columns={columns}
              dataSource={items}
              locale={{
                emptyText: loading ? t("empty.loading") : t("empty.noUsers"),
              }}
              pagination={{
                current: page,
                pageSize,
                total,
                showSizeChanger: true,
                showTotal: (count) => t("pagination.total", { count }),
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
          {t("hint.lockDistributed")}
        </Typography.Text>
      </div>

      <Modal
        title={t("modal.resetPassword.title")}
        open={pwdModalOpen}
        onCancel={closePwdModal}
        footer={[
          <Button key="close" onClick={closePwdModal}>
            {t("modal.resetPassword.close")}
          </Button>,
          <Button key="copy" type="primary" ghost onClick={() => void copyAndClose()}>
            {t("modal.resetPassword.copyAndClose")}
          </Button>,
        ]}
        destroyOnClose
        width={480}
      >
        {pwdModal ? (
          <div className="flex flex-col gap-3">
            <p className="text-white/85">
              {t("modal.resetPassword.body", { label: pwdModal.label })}
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
              message={t("modal.resetPassword.warning")}
            />
          </div>
        ) : null}
      </Modal>
    </PageContainer>
  );
}
