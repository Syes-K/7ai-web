"use client";

import {
  DeleteOutlined,
  EditOutlined,
  ImportOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { ActionType, ProColumns } from "@ant-design/pro-components";
import { PageContainer, ProTable } from "@ant-design/pro-components";
import { App, Alert, Button, Drawer, Form, Input, Modal, Popconfirm, Space, Tag, Tooltip } from "antd";
import dayjs from "dayjs";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  SKILL_CONFIG_DESCRIPTION_MAX_LENGTH,
  SKILL_CONFIG_NAME_MAX_LENGTH,
} from "@/common/constants";
import { ErrorCode } from "@/common/enums";
import { redirectToLocaleLogin } from "@/common/utils/locale-login-redirect";
import { parseApiError } from "@/common/utils/parse-api-error";
import { readApiErrorPayload } from "@/components/auth/map-api-errors";
import { TABLE_ACTION_BTN_CLASS, TableRowActions } from "@/components/ui/table-row-actions";
import { Link } from "@/i18n/navigation";
import PackDetailDrawer from "./components/PackDetailDrawer";
import PackImportModal, { type SkillPackListItem } from "./components/PackImportModal";

const API_BASE = "/api/console/skill-configs";

type SkillsT = ReturnType<typeof useTranslations<"page.console.skills">>;

type SkillColumnsCtx = {
  deletingId: string | null;
  detailLoadingId: string | null;
  openEdit: (row: SkillPackListItem) => void | Promise<void>;
  handleDelete: (row: SkillPackListItem) => void | Promise<void>;
};

function getSkillColumns(t: SkillsT, ctx: SkillColumnsCtx): ProColumns<SkillPackListItem>[] {
  const { deletingId, detailLoadingId, openEdit, handleDelete } = ctx;
  return [
    {
      title: t("columns.name"),
      dataIndex: "name",
      width: 180,
      ellipsis: true,
      render: (_, row) => (
        <Tooltip title={row.name}>
          <span className="text-white/90">{row.name}</span>
        </Tooltip>
      ),
    },
    {
      title: t("columns.description"),
      dataIndex: "description",
      width: 200,
      ellipsis: true,
      render: (_, row) => {
        const d = row.description?.trim();
        if (!d) return <span className="text-white/40">—</span>;
        const truncated = d.length > 80 ? `${d.slice(0, 80)}…` : d;
        return (
          <Tooltip title={d}>
            <span className="text-white/70">{truncated}</span>
          </Tooltip>
        );
      },
    },
    {
      title: t("columns.fileCount"),
      dataIndex: "fileCount",
      width: 88,
      render: (_, row) => (
        <span className={row.fileCount === 0 ? "text-orange-400" : "text-white/70"}>
          {row.fileCount}
        </span>
      ),
    },
    {
      title: t("columns.hasScripts"),
      dataIndex: "hasScripts",
      width: 100,
      render: (_, row) =>
        row.hasScripts ? (
          <Tooltip title={t("alert.scriptsReadOnly.tooltip")}>
            <Tag color="gold">{t("tag.hasScripts")}</Tag>
          </Tooltip>
        ) : (
          <span className="text-white/35">—</span>
        ),
    },
    {
      title: t("columns.enabled"),
      dataIndex: "enabled",
      width: 88,
      render: (_, row) =>
        row.enabled ? (
          <Tag color="green">{t("tag.enabled")}</Tag>
        ) : (
          <Tag>{t("tag.disabled")}</Tag>
        ),
    },
    {
      title: t("columns.updatedAt"),
      dataIndex: "updatedAt",
      width: 160,
      render: (_, row) => (
        <span className="text-white/55">{dayjs(row.updatedAt).format("YYYY-MM-DD HH:mm")}</span>
      ),
    },
    {
      title: t("columns.assistantRefs"),
      dataIndex: "referencedAssistantCount",
      width: 110,
      render: (_, row) => (
        <span className={row.referencedAssistantCount > 0 ? "text-white/70" : "text-white/40"}>
          {row.referencedAssistantCount}
        </span>
      ),
    },
    {
      title: t("columns.actions"),
      valueType: "option",
      width: 180,
      fixed: "right",
      render: (_, row) => {
        const busy = deletingId === row.id;
        const loadingDetail = detailLoadingId === row.id;
        return (
          <TableRowActions>
            <Button
              type="link"
              size="small"
              className={TABLE_ACTION_BTN_CLASS}
              icon={<EditOutlined />}
              loading={loadingDetail}
              onClick={() => void openEdit(row)}
            >
              {t("columns.edit")}
            </Button>
            <Popconfirm
              title={t("confirm.delete.title")}
              description={t("confirm.delete.description")}
              okText={t("columns.delete")}
              cancelText={t("modal.cancel")}
              okButtonProps={{ danger: true, loading: busy }}
              disabled={busy}
              onConfirm={() => void handleDelete(row)}
            >
              <Button
                type="link"
                danger
                size="small"
                className={TABLE_ACTION_BTN_CLASS}
                icon={<DeleteOutlined />}
                loading={busy}
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

export default function SkillsClient() {
  const locale = useLocale();
  const t = useTranslations("page.console.skills");
  const tShell = useTranslations("page.console.shell");
  const consolePath = `/${locale}/console/skills`;

  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType>(null);

  const [keyword, setKeyword] = useState("");
  const [keywordDraft, setKeywordDraft] = useState("");
  const [toolbarLoading, setToolbarLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm] = Form.useForm<{ name: string; description?: string; enabled: boolean }>();

  const [importOpen, setImportOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("edit");
  const [drawerPackId, setDrawerPackId] = useState<string | null>(null);
  const [drawerHasScripts, setDrawerHasScripts] = useState(false);

  const [scriptsHelpOpen, setScriptsHelpOpen] = useState(false);

  const refreshToolbar = useCallback(() => {
    setToolbarLoading(true);
    void actionRef.current?.reload?.().finally(() => setToolbarLoading(false));
  }, []);

  const applyKeywordSearch = useCallback(() => {
    setKeyword(keywordDraft.trim());
    void actionRef.current?.reload?.();
  }, [keywordDraft]);

  const openDrawerForPack = useCallback((item: SkillPackListItem, mode: "create" | "edit") => {
    setDrawerMode(mode);
    setDrawerPackId(item.id);
    setDrawerHasScripts(item.hasScripts);
    setDrawerOpen(true);
  }, []);

  const openCreate = useCallback(() => {
    createForm.resetFields();
    createForm.setFieldsValue({ enabled: true, description: "" });
    setCreateOpen(true);
  }, [createForm]);

  const submitCreate = useCallback(async () => {
    try {
      await createForm.validateFields();
    } catch {
      return;
    }
    const v = createForm.getFieldsValue();
    setCreateSubmitting(true);
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          name: v.name.trim(),
          description: (v.description ?? "").trim() || null,
          enabled: v.enabled,
        }),
      });
      if (res.status === 401) {
        redirectToLocaleLogin(locale, consolePath);
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res, { t: tShell }));
        return;
      }
      const data = (await res.json()) as { item: SkillPackListItem };
      message.success(t("toast.created"));
      setCreateOpen(false);
      await actionRef.current?.reload?.();
      openDrawerForPack(data.item, "create");
    } finally {
      setCreateSubmitting(false);
    }
  }, [consolePath, createForm, locale, message, openDrawerForPack, t, tShell]);

  const openEdit = useCallback(
    async (row: SkillPackListItem) => {
      setDetailLoadingId(row.id);
      try {
        openDrawerForPack(row, "edit");
      } finally {
        setDetailLoadingId(null);
      }
    },
    [openDrawerForPack],
  );

  const assistantsLinkRich = useCallback(
    () => <Link href="/console/assistants">{t("link.assistants")}</Link>,
    [t],
  );

  const handleDelete = useCallback(
    async (row: SkillPackListItem) => {
      setDeletingId(row.id);
      try {
        const res = await fetch(`${API_BASE}/${row.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (res.status === 401) {
          redirectToLocaleLogin(locale, consolePath);
          return;
        }
        if (res.status === 409) {
          const err = await readApiErrorPayload(res);
          if (err.code === ErrorCode.SKILL_CONFIG_REFERENCED_BY_ASSISTANT) {
            modal.warning({
              title: t("deleteBlocked.title"),
              content: (
                <div>
                  <p>{err.message}</p>
                  <p className="mt-2">
                    {t.rich("deleteBlocked.body", { assistantsLink: assistantsLinkRich })}
                  </p>
                </div>
              ),
            });
          } else {
            message.error(err.message);
          }
          return;
        }
        if (!res.ok) {
          message.error(await parseApiError(res, { t: tShell }));
          return;
        }
        message.success(t("toast.deleted"));
        if (drawerPackId === row.id) {
          setDrawerOpen(false);
          setDrawerPackId(null);
        }
        await actionRef.current?.reload?.();
      } catch {
        message.error(tShell("errors.networkRetry"));
      } finally {
        setDeletingId(null);
      }
    },
    [assistantsLinkRich, consolePath, drawerPackId, locale, message, modal, t, tShell],
  );

  const columns = useMemo(
    () =>
      getSkillColumns(t, {
        deletingId,
        detailLoadingId,
        openEdit,
        handleDelete,
      }),
    [deletingId, detailLoadingId, handleDelete, openEdit, t],
  );

  return (
    <PageContainer ghost title={t("title")}>
      <div className="max-w-[1400px]">
        <Alert
          type="info"
          showIcon
          closable
          className="mb-4"
          message={t("alert.productScope.message")}
          description={
            <span>
              {t("alert.productScope.description")}{" "}
              <Button type="link" size="small" className="px-0" onClick={() => setScriptsHelpOpen(true)}>
                {t("help.scripts.title")}
              </Button>
            </span>
          }
        />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input.Search
            placeholder={t("toolbar.searchPlaceholder")}
            allowClear
            style={{ width: 260 }}
            value={keywordDraft}
            onChange={(e) => setKeywordDraft(e.target.value)}
            onSearch={applyKeywordSearch}
          />
        </div>

        <ProTable<SkillPackListItem>
          actionRef={actionRef}
          rowKey="id"
          search={false}
          options={false}
          columns={columns}
          scroll={{ x: 1200 }}
          request={async () => {
            const sp = new URLSearchParams();
            if (keyword.trim()) sp.set("keyword", keyword.trim());
            try {
              const res = await fetch(`${API_BASE}?${sp.toString()}`, {
                credentials: "include",
              });
              if (res.status === 401) {
                redirectToLocaleLogin(locale, consolePath);
                return { data: [], success: false, total: 0 };
              }
              if (!res.ok) {
                message.error(await parseApiError(res, { t: tShell }));
                return { data: [], success: false, total: 0 };
              }
              const data = (await res.json()) as { items: SkillPackListItem[] };
              const items = data.items ?? [];
              return { data: items, success: true, total: items.length };
            } catch {
              message.error(tShell("errors.networkRetry"));
              return { data: [], success: false, total: 0 };
            }
          }}
          toolBarRender={() => [
            <Button key="create" type="primary" ghost icon={<PlusOutlined />} onClick={openCreate}>
              {t("toolbar.create")}
            </Button>,
            <Button key="import" icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>
              {t("toolbar.import")}
            </Button>,
            <Button key="reload" icon={<ReloadOutlined />} loading={toolbarLoading} onClick={refreshToolbar}>
              {t("toolbar.refresh")}
            </Button>,
          ]}
          locale={{
            emptyText: (
              <div className="py-8 text-center">
                <Space direction="vertical" size="middle">
                  <div className="text-white/55">{t("empty.noSkills")}</div>
                  <Space>
                    <Button type="primary" ghost onClick={openCreate}>
                      {t("empty.createFirst")}
                    </Button>
                    <Button onClick={() => setImportOpen(true)}>{t("toolbar.import")}</Button>
                  </Space>
                  <div className="text-xs text-white/40">{t("empty.importHint")}</div>
                </Space>
              </div>
            ),
          }}
        />
      </div>

      <Modal
        title={t("modal.create.title")}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        maskClosable={false}
        destroyOnClose
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button onClick={() => setCreateOpen(false)}>{t("modal.cancel")}</Button>
            <Button type="primary" ghost loading={createSubmitting} onClick={() => void submitCreate()}>
              {t("modal.ok.create")}
            </Button>
          </div>
        }
      >
        <Form form={createForm} layout="vertical" className="mt-2">
          <Form.Item
            name="name"
            label={t("form.name.label")}
            rules={[
              { required: true, message: t("form.name.rules.required") },
              {
                max: SKILL_CONFIG_NAME_MAX_LENGTH,
                message: t("form.name.rules.max", { max: SKILL_CONFIG_NAME_MAX_LENGTH }),
              },
            ]}
          >
            <Input placeholder={t("form.name.placeholder")} showCount maxLength={SKILL_CONFIG_NAME_MAX_LENGTH} />
          </Form.Item>
          <Form.Item
            name="description"
            label={t("form.description.label")}
            rules={[
              {
                max: SKILL_CONFIG_DESCRIPTION_MAX_LENGTH,
                message: t("form.description.rules.max", { max: SKILL_CONFIG_DESCRIPTION_MAX_LENGTH }),
              },
            ]}
          >
            <Input.TextArea
              rows={2}
              placeholder={t("form.description.placeholder")}
              showCount
              maxLength={SKILL_CONFIG_DESCRIPTION_MAX_LENGTH}
            />
          </Form.Item>
        </Form>
      </Modal>

      <PackImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(item, summary) => {
          void actionRef.current?.reload?.();
          if (summary.hasScripts) setDrawerHasScripts(true);
          openDrawerForPack(item, "edit");
        }}
      />

      <PackDetailDrawer
        open={drawerOpen}
        mode={drawerMode}
        packId={drawerPackId}
        initialHasScripts={drawerHasScripts}
        locale={locale}
        consolePath={consolePath}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerPackId(null);
        }}
        onSaved={() => void actionRef.current?.reload?.()}
        onOpenScriptsHelp={() => setScriptsHelpOpen(true)}
      />

      <Drawer
        title={t("help.scripts.title")}
        open={scriptsHelpOpen}
        onClose={() => setScriptsHelpOpen(false)}
        width={480}
      >
        <p className="text-sm text-white/80">{t("help.scripts.body")}</p>
      </Drawer>
    </PageContainer>
  );
}
