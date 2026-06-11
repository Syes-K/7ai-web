"use client";

import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { ActionType, ProColumns } from "@ant-design/pro-components";
import { PageContainer, ProTable } from "@ant-design/pro-components";
import {
  App,
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Tag,
  Tooltip,
} from "antd";
import dayjs from "dayjs";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  CONSOLE_MODEL_LIST_DEFAULT_PAGE_SIZE,
  type ModelConfigTag,
} from "@/common/constants";
import {
  formatModelConfigTag,
  getModelConfigTagSelectOptions,
} from "@/common/model-config/model-tag-ui";
import { ModelProvider } from "@/common/enums";
import type { ModelConfigListItem } from "@/common/types";
import { redirectToLocaleLogin } from "@/common/utils/locale-login-redirect";
import { parseApiError } from "@/common/utils/parse-api-error";
import {
  TABLE_ACTION_BTN_CLASS,
  TableRowActions,
} from "@/components/ui/table-row-actions";
import {
  getModelProviderOptions,
  getProviderTagProps,
} from "./model-provider-ui";

type ModalMode = "create" | "edit";

type ModelColumnsCtx = {
  deletingId: string | null;
  handleDelete: (row: ModelConfigListItem) => Promise<void>;
  openEdit: (row: ModelConfigListItem) => void;
};

/** ProTable 列定义（依赖运行时状态，通过 ctx 注入） */
function getModelColumns(
  t: ReturnType<typeof useTranslations<"page.console.models">>,
  ctx: ModelColumnsCtx,
): ProColumns<ModelConfigListItem>[] {
  return [
    {
      title: t("columns.modelName"),
      dataIndex: "modelName",
      ellipsis: true,
      width: 200,
      render: (_, row) => (
        <Tooltip title={row.modelName}>
          <span className="text-white/90">{row.modelName}</span>
        </Tooltip>
      ),
    },
    {
      title: t("columns.visibility"),
      dataIndex: "visibility",
      width: 88,
      render: (_, row) =>
        row.visibility === "public" ? (
          <Tag color="gold">{t("tag.public")}</Tag>
        ) : (
          <Tag color="default">{t("tag.private")}</Tag>
        ),
    },
    {
      title: t("columns.tags"),
      dataIndex: "tags",
      width: 220,
      render: (_, row) =>
        row.tags.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {row.tags.map((tag) => (
              <Tag key={tag} className="m-0">
                {formatModelConfigTag(tag, t)}
              </Tag>
            ))}
          </span>
        ) : (
          <span className="text-white/35">—</span>
        ),
    },
    {
      title: t("columns.provider"),
      dataIndex: "provider",
      width: 130,
      render: (_, row) => {
        const p = getProviderTagProps(t, row.provider);
        if (!p) {
          return <Tag color="default">{t("tag.dataError")}</Tag>;
        }
        return <Tag color={p.color}>{p.label}</Tag>;
      },
    },
    {
      title: t("columns.apiKey"),
      dataIndex: "apiKeyMasked",
      width: 220,
      render: (_, row) => (
        <span className="font-mono text-sm text-white/55">{row.apiKeyMasked}</span>
      ),
    },
    {
      title: t("columns.updatedAt"),
      dataIndex: "updatedAt",
      width: 168,
      render: (_, row) => (
        <span className="text-white/55">
          {dayjs(row.updatedAt).format("YYYY-MM-DD HH:mm")}
        </span>
      ),
    },
    {
      title: t("columns.actions"),
      valueType: "option",
      width: 140,
      fixed: "right",
      render: (_, row) => {
        const busy = ctx.deletingId === row.id;
        const isPublic = row.visibility === "public";
        return (
          <TableRowActions>
            <Button
              type="link"
              size="small"
              className={TABLE_ACTION_BTN_CLASS}
              icon={<EditOutlined />}
              disabled={isPublic}
              title={isPublic ? t("tooltip.publicEditAdmin") : undefined}
              onClick={() => ctx.openEdit(row)}
            >
              {t("columns.edit")}
            </Button>
            <Popconfirm
              title={t("confirm.delete.title")}
              description={t("confirm.delete.description", { name: row.modelName })}
              okText={t("confirm.delete.ok")}
              cancelText={t("modal.cancel")}
              okButtonProps={{ danger: true, loading: busy }}
              disabled={isPublic}
              onConfirm={() => void ctx.handleDelete(row)}
            >
              <Button
                type="link"
                danger
                size="small"
                className={TABLE_ACTION_BTN_CLASS}
                icon={<DeleteOutlined />}
                loading={busy}
                disabled={isPublic}
                title={isPublic ? t("tooltip.publicDeleteAdmin") : undefined}
              >
                {t("columns.delete")}
              </Button>
            </Popconfirm>
          </TableRowActions>
        );
      },
    },
  ];
}

export default function ModelsClient() {
  const locale = useLocale();
  const t = useTranslations("page.console.models");
  const tShell = useTranslations("page.console.shell");
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);
  const [form] = Form.useForm<{
    provider: ModelProvider;
    modelName: string;
    apiKey?: string;
    tags?: ModelConfigTag[];
  }>();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editing, setEditing] = useState<ModelConfigListItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toolbarLoading, setToolbarLoading] = useState(false);

  const modelsReturnPath = `/${locale}/console/models`;

  const openCreate = useCallback(() => {
    setModalMode("create");
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }, [form]);

  const openEdit = useCallback(
    (row: ModelConfigListItem) => {
      setModalMode("edit");
      setEditing(row);
      form.setFieldsValue({
        provider: row.provider as ModelProvider,
        modelName: row.modelName,
        apiKey: undefined,
        tags: row.tags?.length ? [...row.tags] : [],
      });
      setModalOpen(true);
    },
    [form],
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
  }, [form]);

  const submitModal = useCallback(async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    const v = form.getFieldsValue();
    setSubmitting(true);
    try {
      if (modalMode === "create") {
        const res = await fetch("/api/console/models", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({
            provider: v.provider,
            modelName: v.modelName.trim(),
            apiKey: (v.apiKey ?? "").trim(),
            tags: Array.isArray(v.tags) ? v.tags : [],
          }),
        });
        if (res.status === 401) {
          redirectToLocaleLogin(locale, modelsReturnPath);
          return;
        }
        if (!res.ok) {
          message.error(await parseApiError(res, { t: tShell }));
          return;
        }
        message.success(t("toast.created"));
        closeModal();
        await actionRef.current?.reload?.();
        return;
      }

      if (!editing) return;
      const body: Record<string, string | string[]> = {
        provider: v.provider,
        modelName: v.modelName.trim(),
        tags: Array.isArray(v.tags) ? v.tags : [],
      };
      const keyTrim = (v.apiKey ?? "").trim();
      if (keyTrim.length > 0) {
        body.apiKey = keyTrim;
      }
      const res = await fetch(`/api/console/models/${editing.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        redirectToLocaleLogin(locale, modelsReturnPath);
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res, { t: tShell }));
        return;
      }
      message.success(t("toast.saved"));
      closeModal();
      await actionRef.current?.reload?.();
    } finally {
      setSubmitting(false);
    }
  }, [closeModal, editing, form, locale, message, modalMode, modelsReturnPath, t, tShell]);

  const handleDelete = useCallback(
    async (row: ModelConfigListItem) => {
      setDeletingId(row.id);
      try {
        const res = await fetch(`/api/console/models/${row.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (res.status === 401) {
          redirectToLocaleLogin(locale, modelsReturnPath);
          return;
        }
        if (!res.ok) {
          message.error(await parseApiError(res, { t: tShell }));
          return;
        }
        message.success(t("toast.deleted"));
        await actionRef.current?.reload?.();
      } finally {
        setDeletingId(null);
      }
    },
    [locale, message, modelsReturnPath, t, tShell],
  );

  const refreshToolbar = useCallback(() => {
    setToolbarLoading(true);
    void actionRef.current?.reload?.().finally(() => {
      setToolbarLoading(false);
    });
  }, []);

  const columns: ProColumns<ModelConfigListItem>[] = useMemo(
    () =>
      getModelColumns(t, {
        deletingId,
        handleDelete,
        openEdit,
      }),
    [deletingId, handleDelete, openEdit, t],
  );

  const providerOptions = useMemo(() => getModelProviderOptions(t), [t]);

  return (
    <PageContainer ghost title={t("title")}>
      <div className="max-w-[1400px]">
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message={t("alert.publicModelNotice")}
        />
        <ProTable<ModelConfigListItem>
          actionRef={actionRef}
          rowKey="id"
          search={false}
          options={false}
          columns={columns}
          scroll={{ x: 920 }}
          pagination={{
            defaultPageSize: CONSOLE_MODEL_LIST_DEFAULT_PAGE_SIZE,
            showSizeChanger: true,
            showTotal: (total) => t("pagination.total", { total }),
            pageSizeOptions: [10, 20, 50, 100],
          }}
          request={async (params) => {
            const current = params.current ?? 1;
            const pageSize = params.pageSize ?? CONSOLE_MODEL_LIST_DEFAULT_PAGE_SIZE;
            const sp = new URLSearchParams({
              page: String(current),
              pageSize: String(pageSize),
            });
            try {
              const res = await fetch(`/api/console/models?${sp.toString()}`, {
                credentials: "include",
              });
              if (res.status === 401) {
                redirectToLocaleLogin(locale, modelsReturnPath);
                return { data: [], success: false, total: 0 };
              }
              if (!res.ok) {
                message.error(await parseApiError(res, { t: tShell }));
                return { data: [], success: false, total: 0 };
              }
              const data = (await res.json()) as {
                items: ModelConfigListItem[];
                total: number;
              };
              return {
                data: data.items,
                success: true,
                total: data.total,
              };
            } catch {
              message.error(tShell("errors.networkRetry"));
              return { data: [], success: false, total: 0 };
            }
          }}
          toolBarRender={() => [
            <Button
              key="create"
              type="primary"
              ghost
              icon={<PlusOutlined />}
              onClick={openCreate}
            >
              {t("toolbar.create")}
            </Button>,
            <Button
              key="reload"
              icon={<ReloadOutlined />}
              loading={toolbarLoading}
              onClick={() => refreshToolbar()}
            >
              {t("toolbar.refresh")}
            </Button>,
          ]}
          locale={{
            emptyText: (
              <div className="py-8 text-center">
                <div className="mb-3 text-white/55">{t("empty.noData")}</div>
              </div>
            ),
          }}
        />

        <Modal
          title={
            modalMode === "create"
              ? t("modal.create.title")
              : t("modal.edit.title")
          }
          open={modalOpen}
          onCancel={closeModal}
          width={520}
          maskClosable={false}
          destroyOnClose
          okText={
            modalMode === "create" ? t("modal.ok.create") : t("modal.ok.save")
          }
          cancelText={t("modal.cancel")}
          confirmLoading={submitting}
          onOk={() => void submitModal()}
          okButtonProps={{ ghost: true }}
        >
          <Form form={form} layout="vertical" className="pt-1">
            <Form.Item
              name="provider"
              label={t("form.provider.label")}
              rules={[
                {
                  required: true,
                  message: t("form.provider.rules.required"),
                },
              ]}
            >
              <Select
                placeholder={t("form.provider.placeholder")}
                options={providerOptions}
                disabled={false}
              />
            </Form.Item>
            <Form.Item
              name="modelName"
              label={t("form.modelName.label")}
              rules={[
                {
                  required: true,
                  message: t("form.modelName.rules.required"),
                },
              ]}
            >
              <Input
                placeholder={t("form.modelName.placeholder")}
                maxLength={255}
                showCount
              />
            </Form.Item>
            <Form.Item
              name="tags"
              label={t("form.tags.label")}
              extra={t("form.tags.extra")}
            >
              <Select
                mode="multiple"
                allowClear
                placeholder={t("form.tags.placeholder")}
                className="w-full"
                options={getModelConfigTagSelectOptions(t)}
              />
            </Form.Item>
            <Form.Item
              name="apiKey"
              label={t("form.apiKey.label")}
              rules={
                modalMode === "create"
                  ? [
                      {
                        required: true,
                        message: t("form.apiKey.rules.required"),
                      },
                    ]
                  : []
              }
              extra={
                modalMode === "edit"
                  ? t("form.apiKey.extra.edit")
                  : t("form.apiKey.extra.create")
              }
            >
              <Input.Password
                placeholder={
                  modalMode === "edit"
                    ? t("form.apiKey.placeholder.edit")
                    : t("form.apiKey.placeholder.create")
                }
                autoComplete="new-password"
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </PageContainer>
  );
}
