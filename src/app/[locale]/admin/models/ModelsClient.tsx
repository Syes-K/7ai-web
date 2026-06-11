"use client";

import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import type { ActionType } from "@ant-design/pro-components";
import { PageContainer, ProTable } from "@ant-design/pro-components";
import { App, Alert, Button, Form, Input, Modal, Select } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  CONSOLE_MODEL_LIST_DEFAULT_PAGE_SIZE,
  type ModelConfigTag,
} from "@/common/constants";
import { getModelConfigTagSelectOptions } from "@/common/model-config/model-tag-ui";
import { ModelProvider } from "@/common/enums";
import type { ModelConfigListItem } from "@/common/types";
import { parseApiError } from "@/common/utils/parse-api-error";
import { getModelProviderOptions } from "@/app/[locale]/console/models/model-provider-ui";
import { handleAdminApiAuthStatus } from "../admin-api-guards";
import { getAdminModelColumns } from "./admin-model-columns";

const API_BASE = "/api/admin/model-configs";

type ModalMode = "create" | "edit";

/** 管理后台：公有模型接入 */
export default function ModelsClient() {
  const locale = useLocale();
  const t = useTranslations("page.admin.models");
  const tShell = useTranslations("page.admin.shell");
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

  const returnPath = `/${locale}/admin/models`;
  const providerOptions = useMemo(() => getModelProviderOptions(t), [t]);

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
        const res = await fetch(API_BASE, {
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
        if (handleAdminApiAuthStatus(res.status, locale, returnPath)) {
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
      const res = await fetch(`${API_BASE}/${editing.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(body),
      });
      if (handleAdminApiAuthStatus(res.status, locale, returnPath)) {
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
  }, [closeModal, editing, form, locale, message, modalMode, returnPath, t, tShell]);

  const handleDelete = useCallback(
    async (row: ModelConfigListItem) => {
      setDeletingId(row.id);
      try {
        const res = await fetch(`${API_BASE}/${row.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (handleAdminApiAuthStatus(res.status, locale, returnPath)) {
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
    [locale, message, returnPath, t, tShell],
  );

  const refreshToolbar = useCallback(() => {
    setToolbarLoading(true);
    void actionRef.current?.reload?.().finally(() => {
      setToolbarLoading(false);
    });
  }, []);

  const columns = useMemo(
    () => getAdminModelColumns(t, { deletingId, handleDelete, openEdit }),
    [deletingId, handleDelete, openEdit, t],
  );

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
          scroll={{ x: 1040 }}
          pagination={{
            defaultPageSize: CONSOLE_MODEL_LIST_DEFAULT_PAGE_SIZE,
            showSizeChanger: true,
            showTotal: (count) => t("pagination.total", { count }),
            pageSizeOptions: [10, 20, 50, 100],
          }}
          request={async (params) => {
            const current = params.current ?? 1;
            const pageSize =
              params.pageSize ?? CONSOLE_MODEL_LIST_DEFAULT_PAGE_SIZE;
            const sp = new URLSearchParams({
              page: String(current),
              pageSize: String(pageSize),
            });
            try {
              const res = await fetch(`${API_BASE}?${sp.toString()}`, {
                credentials: "include",
              });
              if (handleAdminApiAuthStatus(res.status, locale, returnPath)) {
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
                <div className="mb-3 text-white/55">{t("empty.noModels")}</div>
              </div>
            ),
          }}
        />

        <Modal
          title={
            modalMode === "create" ? t("modal.create.title") : t("modal.edit.title")
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
              rules={[{ required: true, message: t("form.provider.rules.required") }]}
            >
              <Select
                placeholder={t("form.provider.placeholder")}
                options={providerOptions}
              />
            </Form.Item>
            <Form.Item
              name="modelName"
              label={t("form.modelName.label")}
              rules={[{ required: true, message: t("form.modelName.rules.required") }]}
            >
              <Input
                placeholder={t("form.modelName.placeholder")}
                maxLength={255}
                showCount
              />
            </Form.Item>
            <Form.Item name="tags" label={t("form.tags.label")} extra={t("form.tags.extra")}>
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
                  ? [{ required: true, message: t("form.apiKey.rules.required") }]
                  : []
              }
              extra={
                modalMode === "edit" ? t("form.apiKey.hint.edit") : t("form.apiKey.hint.create")
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
