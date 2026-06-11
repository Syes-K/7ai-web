"use client";

import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import type { ActionType } from "@ant-design/pro-components";
import { PageContainer, ProTable } from "@ant-design/pro-components";
import { App, Button, Form, Input, Modal, Select } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ASSISTANT_ICON_MAX_LENGTH,
  ASSISTANT_NAME_MAX_LENGTH,
  ASSISTANT_OPENING_MESSAGE_MAX_LENGTH,
  ASSISTANT_PROMPT_MAX_LENGTH,
  CONSOLE_ASSISTANT_LIST_DEFAULT_PAGE_SIZE,
} from "@/common/constants";
import type { AssistantListItem } from "@/common/types";
import { parseApiError } from "@/common/utils/parse-api-error";
import { handleAdminApiAuthStatus } from "../admin-api-guards";
import { getAdminAssistantColumns } from "./admin-assistant-columns";

const API_BASE = "/api/admin/assistants";

type ModalMode = "create" | "edit";

/** 系统助手管理 */
export default function AssistantsClient() {
  const locale = useLocale();
  const t = useTranslations("page.admin.assistants");
  const tShell = useTranslations("page.admin.shell");
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);
  const [form] = Form.useForm<{
    name: string;
    prompt: string;
    icon?: string;
    openingMessage?: string;
    tags?: string[];
  }>();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editing, setEditing] = useState<AssistantListItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toolbarLoading, setToolbarLoading] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [keywordDraft, setKeywordDraft] = useState("");

  const returnPath = `/${locale}/admin/assistants`;

  const openCreate = useCallback(() => {
    setModalMode("create");
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ tags: [] });
    setModalOpen(true);
  }, [form]);

  const openEdit = useCallback(
    (row: AssistantListItem) => {
      setModalMode("edit");
      setEditing(row);
      form.setFieldsValue({
        name: row.name,
        prompt: row.prompt,
        icon: row.icon ?? "",
        openingMessage: row.openingMessage ?? "",
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
      const tags = Array.isArray(v.tags) ? v.tags : [];
      const iconTrim = (v.icon ?? "").trim();
      const openingTrim = (v.openingMessage ?? "").trim();
      const payload = {
        name: v.name.trim(),
        prompt: v.prompt.trim(),
        icon: iconTrim.length > 0 ? iconTrim : null,
        openingMessage: openingTrim.length > 0 ? openingTrim : null,
        tags,
      };

      if (modalMode === "create") {
        const res = await fetch(API_BASE, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify(payload),
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
      const res = await fetch(`${API_BASE}/${editing.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
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
    async (row: AssistantListItem) => {
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

  const applyKeywordSearch = useCallback(() => {
    setKeyword(keywordDraft.trim());
    void actionRef.current?.reload?.();
  }, [keywordDraft]);

  const columns = useMemo(
    () => getAdminAssistantColumns(t, { deletingId, handleDelete, openEdit }),
    [deletingId, handleDelete, openEdit, t],
  );

  return (
    <PageContainer ghost title={t("title")}>
      <div className="max-w-[1400px]">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input.Search
            placeholder={t("search.placeholder")}
            allowClear
            style={{ width: 220 }}
            value={keywordDraft}
            onChange={(e) => setKeywordDraft(e.target.value)}
            onSearch={applyKeywordSearch}
          />
        </div>
        <ProTable<AssistantListItem>
          actionRef={actionRef}
          rowKey="id"
          search={false}
          options={false}
          columns={columns}
          scroll={{ x: 1040 }}
          pagination={{
            defaultPageSize: CONSOLE_ASSISTANT_LIST_DEFAULT_PAGE_SIZE,
            showSizeChanger: true,
            showTotal: (count) => t("pagination.total", { count }),
            pageSizeOptions: [10, 20, 50, 100],
          }}
          request={async (params) => {
            const current = params.current ?? 1;
            const pageSize =
              params.pageSize ?? CONSOLE_ASSISTANT_LIST_DEFAULT_PAGE_SIZE;
            const sp = new URLSearchParams({
              page: String(current),
              pageSize: String(pageSize),
            });
            if (keyword.trim()) {
              sp.set("keyword", keyword.trim());
            }
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
                items: AssistantListItem[];
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
              onClick={refreshToolbar}
            >
              {t("toolbar.refresh")}
            </Button>,
          ]}
          locale={{
            emptyText: (
              <div className="py-8 text-center">
                <div className="mb-3 text-white/55">{t("empty.noAssistants")}</div>
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
          onOk={() => void submitModal()}
          okText={
            modalMode === "create" ? t("modal.ok.create") : t("modal.ok.save")
          }
          okButtonProps={{ ghost: true }}
          cancelText={t("modal.cancel")}
          confirmLoading={submitting}
          width={640}
          maskClosable={false}
          destroyOnClose
        >
          <Form form={form} layout="vertical" className="mt-4">
            <Form.Item
              name="name"
              label={t("form.name.label")}
              rules={[
                { required: true, message: t("form.name.rules.required") },
                {
                  max: ASSISTANT_NAME_MAX_LENGTH,
                  message: t("form.name.rules.max", { max: ASSISTANT_NAME_MAX_LENGTH }),
                },
              ]}
            >
              <Input placeholder={t("form.name.placeholder")} />
            </Form.Item>
            <Form.Item
              name="prompt"
              label={t("form.prompt.label")}
              rules={[
                { required: true, message: t("form.prompt.rules.required") },
                {
                  max: ASSISTANT_PROMPT_MAX_LENGTH,
                  message: t("form.prompt.rules.max", { max: ASSISTANT_PROMPT_MAX_LENGTH }),
                },
              ]}
            >
              <Input.TextArea
                placeholder={t("form.prompt.placeholder")}
                rows={8}
                showCount
                maxLength={ASSISTANT_PROMPT_MAX_LENGTH}
              />
            </Form.Item>
            <Form.Item
              name="icon"
              label={t("form.icon.label")}
              rules={[
                {
                  max: ASSISTANT_ICON_MAX_LENGTH,
                  message: t("form.icon.rules.max", { max: ASSISTANT_ICON_MAX_LENGTH }),
                },
              ]}
            >
              <Input
                placeholder={t("form.icon.placeholder")}
                maxLength={ASSISTANT_ICON_MAX_LENGTH}
              />
            </Form.Item>
            <Form.Item
              name="openingMessage"
              label={t("form.openingMessage.label")}
              rules={[
                {
                  max: ASSISTANT_OPENING_MESSAGE_MAX_LENGTH,
                  message: t("form.openingMessage.rules.max", {
                    max: ASSISTANT_OPENING_MESSAGE_MAX_LENGTH,
                  }),
                },
              ]}
            >
              <Input.TextArea
                rows={2}
                showCount
                maxLength={ASSISTANT_OPENING_MESSAGE_MAX_LENGTH}
                placeholder={t("form.openingMessage.placeholder")}
              />
            </Form.Item>
            <Form.Item name="tags" label={t("form.tags.label")}>
              <Select
                mode="tags"
                placeholder={t("form.tags.placeholder")}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </PageContainer>
  );
}
