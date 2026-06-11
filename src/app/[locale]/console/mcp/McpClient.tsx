"use client";

import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import type { ActionType, ProColumns } from "@ant-design/pro-components";
import { PageContainer, ProTable } from "@ant-design/pro-components";
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
} from "antd";
import dayjs from "dayjs";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  MCP_CONFIG_DESCRIPTION_MAX_LENGTH,
  MCP_CONFIG_NAME_MAX_LENGTH,
} from "@/common/constants";
import { ErrorCode } from "@/common/enums";
import { redirectToLocaleLogin } from "@/common/utils/locale-login-redirect";
import { parseApiError } from "@/common/utils/parse-api-error";
import { readApiErrorPayload } from "@/components/auth/map-api-errors";
import {
  TABLE_ACTION_BTN_CLASS,
  TableRowActions,
} from "@/components/ui/table-row-actions";
import { Link } from "@/i18n/navigation";

type McpListItem = {
  id: string;
  name: string;
  description: string | null;
  transport: string;
  endpointSummary: string;
  credentialsConfigured: boolean;
  enabled: boolean;
  lastCheckedAt: string | null;
  lastCheckStatus: string;
  lastErrorSummary: string | null;
  createdAt: string;
  updatedAt: string;
  referencedAssistantCount: number;
};

const API_BASE = "/api/console/mcp-configs";

const TRANSPORT_LABEL: Record<string, string> = {
  stdio: "STDIO",
  sse: "SSE",
  http: "HTTP",
};

function transportLabel(transport: string) {
  return TRANSPORT_LABEL[transport] ?? transport;
}

type McpT = ReturnType<typeof useTranslations<"page.console.mcp">>;

function checkStatusTag(status: string, t: McpT) {
  if (status === "success") return <Tag color="green">{t("tag.testSuccess")}</Tag>;
  if (status === "failure") return <Tag color="red">{t("tag.testFailure")}</Tag>;
  return <Tag>{t("tag.testUnknown")}</Tag>;
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const v = JSON.parse(trimmed) as unknown;
    if (typeof v !== "object" || v === null || Array.isArray(v)) {
      return null;
    }
    return v as Record<string, unknown>;
  } catch {
    return null;
  }
}

type ModalMode = "create" | "edit";

type McpColumnsCtx = {
  deletingId: string | null;
  testingRowId: string | null;
  detailLoadingId: string | null;
  handleRowTestClick: (row: McpListItem) => void;
  openEdit: (row: McpListItem) => void | Promise<void>;
  handleDelete: (row: McpListItem) => void | Promise<void>;
};

function getMcpColumns(t: McpT, ctx: McpColumnsCtx): ProColumns<McpListItem>[] {
  const {
    deletingId,
    testingRowId,
    detailLoadingId,
    handleRowTestClick,
    openEdit,
    handleDelete,
  } = ctx;
  return [
    {
      title: t("columns.name"),
      dataIndex: "name",
      width: 200,
      ellipsis: true,
      render: (_, row) => (
        <Tooltip title={row.name}>
          <span className="text-white/90">{row.name}</span>
        </Tooltip>
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
      title: t("columns.transport"),
      dataIndex: "transport",
      width: 100,
      render: (_, row) => (
        <span className="text-white/80">{transportLabel(row.transport)}</span>
      ),
    },
    {
      title: t("columns.connectionSummary"),
      dataIndex: "endpointSummary",
      ellipsis: true,
      render: (_, row) => (
        <Tooltip title={row.endpointSummary}>
          <span className="text-white/70">{row.endpointSummary}</span>
        </Tooltip>
      ),
    },
    {
      title: t("columns.assistantRefs"),
      dataIndex: "referencedAssistantCount",
      width: 110,
      render: (_, row) => (
        <span className="text-white/70">{row.referencedAssistantCount}</span>
      ),
    },
    {
      title: t("columns.lastTest"),
      dataIndex: "lastCheckedAt",
      width: 220,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Space size={6}>
            {checkStatusTag(row.lastCheckStatus, t)}
            {row.lastCheckedAt ? (
              <span className="text-white/55">
                {dayjs(row.lastCheckedAt).format("YYYY-MM-DD HH:mm")}
              </span>
            ) : (
              <span className="text-white/40">—</span>
            )}
          </Space>
          {row.lastCheckStatus === "failure" && row.lastErrorSummary ? (
            <Tooltip title={row.lastErrorSummary}>
              <span className="line-clamp-1 text-xs text-red-300/90">
                {row.lastErrorSummary}
              </span>
            </Tooltip>
          ) : null}
        </Space>
      ),
    },
    {
      title: t("columns.actions"),
      valueType: "option",
      width: 300,
      fixed: "right",
      render: (_, row) => {
        const busy = deletingId === row.id;
        const testing = testingRowId === row.id;
        const loadingDetail = detailLoadingId === row.id;
        return (
          <TableRowActions>
            <Button
              type="link"
              size="small"
              className={TABLE_ACTION_BTN_CLASS}
              icon={<ThunderboltOutlined />}
              loading={testing}
              disabled={loadingDetail}
              onClick={() => handleRowTestClick(row)}
            >
              {t("columns.testConnection")}
            </Button>
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

export default function McpClient() {
  const locale = useLocale();
  const t = useTranslations("page.console.mcp");
  const tShell = useTranslations("page.console.shell");
  const consolePath = `/${locale}/console/mcp`;

  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType>(null);

  const [keyword, setKeyword] = useState("");
  const [keywordDraft, setKeywordDraft] = useState("");
  const [toolbarLoading, setToolbarLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingRow, setEditingRow] = useState<McpListItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<{
    name: string;
    description?: string;
    transport: string;
    endpointJson: string;
    metadataJson: string;
    credentials?: string;
    enabled: boolean;
  }>();

  const [initialFormSignature, setInitialFormSignature] = useState("");
  const [testChoiceOpen, setTestChoiceOpen] = useState(false);
  const [pendingTestAfterSave, setPendingTestAfterSave] = useState(false);

  const [testingRowId, setTestingRowId] = useState<string | null>(null);
  const [testingInModal, setTestingInModal] = useState(false);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);

  const refreshToolbar = useCallback(() => {
    setToolbarLoading(true);
    void actionRef.current?.reload?.().finally(() => setToolbarLoading(false));
  }, []);

  const applyKeywordSearch = useCallback(() => {
    setKeyword(keywordDraft.trim());
    void actionRef.current?.reload?.();
  }, [keywordDraft]);

  const computeFormSignature = useCallback(() => {
    const v = form.getFieldsValue();
    return JSON.stringify({
      name: v.name,
      description: v.description,
      transport: v.transport,
      endpointJson: v.endpointJson,
      metadataJson: v.metadataJson,
      enabled: v.enabled,
      credentials: v.credentials ?? "",
    });
  }, [form]);

  const isModalDirty = useCallback(() => {
    if (!modalOpen || !initialFormSignature) return false;
    return computeFormSignature() !== initialFormSignature;
  }, [computeFormSignature, initialFormSignature, modalOpen]);

  const openCreate = useCallback(() => {
    setModalMode("create");
    setEditingRow(null);
    form.resetFields();
    form.setFieldsValue({
      transport: "http",
      endpointJson: '{\n  "url": "https://"\n}',
      metadataJson: "",
      enabled: true,
    });
    setInitialFormSignature("");
    setModalOpen(true);
    requestAnimationFrame(() => {
      setInitialFormSignature(computeFormSignature());
    });
  }, [computeFormSignature, form]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingRow(null);
    form.resetFields();
    setInitialFormSignature("");
    setTestChoiceOpen(false);
    setPendingTestAfterSave(false);
  }, [form]);

  type McpDetailItem = McpListItem & {
    endpoint: Record<string, unknown>;
    metadata: Record<string, unknown> | null;
  };

  const openEdit = useCallback(
    async (row: McpListItem) => {
      setDetailLoadingId(row.id);
      try {
        const res = await fetch(`${API_BASE}/${row.id}`, { credentials: "include" });
        if (res.status === 401) {
          redirectToLocaleLogin(locale, consolePath);
          return;
        }
        if (!res.ok) {
          message.error(await parseApiError(res, { t: tShell }));
          return;
        }
        const data = (await res.json()) as { item: McpDetailItem };
        const item = data.item;
        setModalMode("edit");
        setEditingRow(row);
        form.resetFields();
        form.setFieldsValue({
          name: item.name,
          description: item.description ?? "",
          transport: item.transport,
          endpointJson: JSON.stringify(item.endpoint, null, 2),
          metadataJson: item.metadata ? JSON.stringify(item.metadata, null, 2) : "",
          credentials: "",
          enabled: item.enabled,
        });
        setModalOpen(true);
        requestAnimationFrame(() => {
          setInitialFormSignature(computeFormSignature());
        });
      } catch {
        message.error(t("toast.loadFailed"));
      } finally {
        setDetailLoadingId(null);
      }
    },
    [computeFormSignature, consolePath, form, locale, message, t, tShell],
  );

  const runTestConnection = useCallback(
    async (id: string) => {
      setTestingRowId(id);
      try {
        const res = await fetch(`${API_BASE}/${id}/test-connection`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: "{}",
        });
        if (res.status === 401) {
          redirectToLocaleLogin(locale, consolePath);
          return;
        }
        if (!res.ok) {
          message.error(await parseApiError(res, { t: tShell }));
          return;
        }
        const data = (await res.json()) as {
          ok?: boolean;
          item?: McpListItem;
        };
        if (data.ok) {
          message.success(t("toast.testSuccess"));
        } else {
          message.error(data.item?.lastErrorSummary?.trim() || t("toast.testFailed"));
        }
        await actionRef.current?.reload?.();
      } catch {
        message.error(tShell("errors.networkRetry"));
      } finally {
        setTestingRowId(null);
      }
    },
    [consolePath, locale, message, t, tShell],
  );

  const handleRowTestClick = useCallback(
    (row: McpListItem) => {
      void runTestConnection(row.id);
    },
    [runTestConnection],
  );

  const handleModalTestClick = useCallback(async () => {
    if (modalMode !== "edit" || !editingRow) {
      message.info(t("toast.saveBeforeTest"));
      return;
    }
    if (isModalDirty()) {
      setTestChoiceOpen(true);
      return;
    }
    setTestingInModal(true);
    try {
      await runTestConnection(editingRow.id);
    } finally {
      setTestingInModal(false);
    }
  }, [editingRow, isModalDirty, message, modalMode, runTestConnection, t]);

  const submitModal = useCallback(async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    const v = form.getFieldsValue();
    const endpoint = parseJsonObject(v.endpointJson);
    if (modalMode === "create") {
      if (!endpoint) {
        message.error(t("toast.endpointInvalidJson"));
        return;
      }
    } else if (v.endpointJson.trim() && !endpoint) {
      message.error(t("toast.endpointParseError"));
      return;
    }

    let metadata: Record<string, unknown> | null | undefined;
    if (v.metadataJson.trim()) {
      const m = parseJsonObject(v.metadataJson);
      if (!m) {
        message.error(t("toast.metadataInvalidJson"));
        return;
      }
      metadata = m;
    }

    setSubmitting(true);
    try {
      if (modalMode === "create") {
        const body: Record<string, unknown> = {
          name: v.name.trim(),
          description: (v.description ?? "").trim() || null,
          transport: v.transport,
          endpoint,
          enabled: v.enabled,
        };
        if (metadata !== undefined) body.metadata = metadata;
        const cred = (v.credentials ?? "").trim();
        if (cred) body.credentials = cred;

        const res = await fetch(API_BASE, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify(body),
        });
        if (res.status === 401) {
          redirectToLocaleLogin(locale, consolePath);
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

      if (!editingRow) return;
      const savedId = editingRow.id;
      const runTestAfterSave = pendingTestAfterSave;
      const patch: Record<string, unknown> = {
        name: v.name.trim(),
        description: (v.description ?? "").trim() || null,
        transport: v.transport,
        enabled: v.enabled,
      };
      if (endpoint) patch.endpoint = endpoint;
      if (v.metadataJson.trim()) patch.metadata = metadata;
      const cred = (v.credentials ?? "").trim();
      if (cred) patch.credentials = cred;

      const res = await fetch(`${API_BASE}/${savedId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(patch),
      });
      if (res.status === 401) {
        redirectToLocaleLogin(locale, consolePath);
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res, { t: tShell }));
        return;
      }
      message.success(t("toast.saved"));
      setPendingTestAfterSave(false);
      closeModal();
      await actionRef.current?.reload?.();
      if (runTestAfterSave) {
        await runTestConnection(savedId);
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    closeModal,
    consolePath,
    editingRow,
    form,
    locale,
    message,
    modalMode,
    pendingTestAfterSave,
    runTestConnection,
    t,
    tShell,
  ]);

  const assistantsLinkRich = useCallback(
    () => <Link href="/console/assistants">{t("link.assistants")}</Link>,
    [t],
  );

  const handleDelete = useCallback(
    async (row: McpListItem) => {
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
          if (err.code === ErrorCode.MCP_CONFIG_REFERENCED_BY_ASSISTANT) {
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
        await actionRef.current?.reload?.();
      } catch {
        message.error(tShell("errors.networkRetry"));
      } finally {
        setDeletingId(null);
      }
    },
    [assistantsLinkRich, consolePath, locale, message, modal, t, tShell],
  );

  const columns = useMemo(
    () =>
      getMcpColumns(t, {
        deletingId,
        testingRowId,
        detailLoadingId,
        handleRowTestClick,
        openEdit,
        handleDelete,
      }),
    [
      deletingId,
      detailLoadingId,
      handleDelete,
      handleRowTestClick,
      openEdit,
      t,
      testingRowId,
    ],
  );

  return (
    <PageContainer ghost title={t("title")}>
      <div className="max-w-[1400px]">
        <p className="mb-4 text-sm text-white/55">{t("intro")}</p>
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

        <ProTable<McpListItem>
          actionRef={actionRef}
          rowKey="id"
          search={false}
          options={false}
          columns={columns}
          scroll={{ x: 1100 }}
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
              const data = (await res.json()) as { items: McpListItem[] };
              return { data: data.items ?? [], success: true, total: data.items?.length ?? 0 };
            } catch {
              message.error(tShell("errors.networkRetry"));
              return { data: [], success: false, total: 0 };
            }
          }}
          toolBarRender={() => [
            <Button key="create" type="primary" ghost icon={<PlusOutlined />} onClick={openCreate}>
              {t("toolbar.create")}
            </Button>,
            <Button key="reload" icon={<ReloadOutlined />} loading={toolbarLoading} onClick={refreshToolbar}>
              {t("toolbar.refresh")}
            </Button>,
          ]}
          locale={{
            emptyText: (
              <div className="py-8 text-center">
                <div className="text-white/55">{t("empty.noData")}</div>
              </div>
            ),
          }}
        />
      </div>

      <Modal
        title={modalMode === "create" ? t("modal.create.title") : t("modal.edit.title")}
        open={modalOpen}
        onCancel={closeModal}
        width={760}
        maskClosable={false}
        destroyOnClose
        footer={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            {modalMode === "edit" ? (
              <Button
                className="mr-auto"
                loading={testingInModal}
                onClick={() => void handleModalTestClick()}
              >
                {t("modal.testConnection")}
              </Button>
            ) : null}
            <Button onClick={closeModal}>{t("modal.cancel")}</Button>
            <Button type="primary" ghost loading={submitting} onClick={() => void submitModal()}>
              {t("modal.save")}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" className="mt-2">
          <Form.Item
            name="name"
            label={t("form.name.label")}
            rules={[
              { required: true, message: t("form.name.rules.required") },
              {
                max: MCP_CONFIG_NAME_MAX_LENGTH,
                message: t("form.name.rules.max", { max: MCP_CONFIG_NAME_MAX_LENGTH }),
              },
            ]}
          >
            <Input placeholder={t("form.name.placeholder")} showCount maxLength={MCP_CONFIG_NAME_MAX_LENGTH} />
          </Form.Item>
          <Form.Item
            name="description"
            label={t("form.description.label")}
            rules={[
              {
                max: MCP_CONFIG_DESCRIPTION_MAX_LENGTH,
                message: t("form.description.rules.max", {
                  max: MCP_CONFIG_DESCRIPTION_MAX_LENGTH,
                }),
              },
            ]}
          >
            <Input.TextArea
              rows={2}
              placeholder={t("form.description.placeholder")}
              showCount
              maxLength={MCP_CONFIG_DESCRIPTION_MAX_LENGTH}
            />
          </Form.Item>
          <Form.Item
            name="transport"
            label={t("form.transport.label")}
            rules={[{ required: true, message: t("form.transport.rules.required") }]}
          >
            <Select
              options={[
                { label: "HTTP", value: "http" },
                { label: "SSE", value: "sse" },
                { label: t("form.transport.stdio"), value: "stdio" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="endpointJson"
            label={t("form.endpoint.label")}
            rules={[
              {
                required: modalMode === "create",
                message: t("form.endpoint.rules.required"),
              },
            ]}
            extra={
              modalMode === "edit" ? (
                <span className="text-white/45">{t("form.endpoint.extra.edit")}</span>
              ) : (
                <span className="text-white/45">{t("form.endpoint.extra.create")}</span>
              )
            }
          >
            <Input.TextArea rows={6} placeholder={t("form.endpoint.placeholder")} />
          </Form.Item>
          <Form.Item
            name="metadataJson"
            label={t("form.metadata.label")}
            extra={t("form.metadata.extra")}
          >
            <Input.TextArea rows={4} placeholder="{}" />
          </Form.Item>
          <Form.Item
            name="credentials"
            label={
              <span className="inline-flex items-center gap-1.5">
                <span>{t("form.credentials.label")}</span>
                <Tooltip
                  overlayStyle={{ maxWidth: 400 }}
                  title={
                    <div className="space-y-2 text-left text-xs leading-relaxed">
                      <p>{t("form.credentials.help.intro")}</p>
                      <p>{t("form.credentials.help.http")}</p>
                      <p>{t("form.credentials.help.stdio")}</p>
                      <p className="text-white/85">{t("form.credentials.help.storage")}</p>
                    </div>
                  }
                >
                  <QuestionCircleOutlined
                    className="cursor-help text-[13px] text-white/45 transition-colors hover:text-sky-300/90"
                    aria-label={t("form.credentials.ariaHelp")}
                  />
                </Tooltip>
              </span>
            }
            extra={
              modalMode === "edit"
                ? t("form.credentials.extra.edit")
                : t("form.credentials.extra.create")
            }
          >
            <Input.Password
              placeholder={
                modalMode === "edit"
                  ? t("form.credentials.placeholder.edit")
                  : t("form.credentials.placeholder.create")
              }
              autoComplete="new-password"
            />
          </Form.Item>
          <Form.Item name="enabled" label={t("form.enabled.label")} valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t("testChoice.title")}
        open={testChoiceOpen}
        onCancel={() => setTestChoiceOpen(false)}
        footer={null}
        destroyOnClose
      >
        <p className="text-white/75">{t("testChoice.body")}</p>
        <div className="mt-4 flex w-full flex-wrap justify-end gap-2">
          <Button onClick={() => setTestChoiceOpen(false)}>{t("testChoice.cancel")}</Button>
          <Button
            onClick={() => {
              setTestChoiceOpen(false);
              if (!editingRow) return;
              void (async () => {
                setTestingInModal(true);
                try {
                  await runTestConnection(editingRow.id);
                } finally {
                  setTestingInModal(false);
                }
              })();
            }}
          >
            {t("testChoice.discardAndTest")}
          </Button>
          <Button
            type="primary"
            ghost
            onClick={() => {
              setTestChoiceOpen(false);
              setPendingTestAfterSave(true);
              void submitModal();
            }}
          >
            {t("testChoice.saveAndTest")}
          </Button>
        </div>
      </Modal>
    </PageContainer>
  );
}
