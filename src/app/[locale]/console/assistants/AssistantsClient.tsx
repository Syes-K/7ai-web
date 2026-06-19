"use client";

import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { ActionType, ProColumns } from "@ant-design/pro-components";
import { PageContainer, ProTable } from "@ant-design/pro-components";
import {
  App,
  Alert,
  Button,
  Divider,
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
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ASSISTANT_ICON_MAX_LENGTH,
  ASSISTANT_NAME_MAX_LENGTH,
  ASSISTANT_OPENING_MESSAGE_MAX_LENGTH,
  ASSISTANT_PROMPT_MAX_LENGTH,
  CONSOLE_ASSISTANT_LIST_DEFAULT_PAGE_SIZE,
} from "@/common/constants";
import type { AssistantListItem } from "@/common/types";
import { redirectToLocaleLogin } from "@/common/utils/locale-login-redirect";
import { parseApiError } from "@/common/utils/parse-api-error";
import {
  TABLE_ACTION_BTN_CLASS,
  TableRowActions,
} from "@/components/ui/table-row-actions";
import { Link } from "@/i18n/navigation";

const API_BASE = "/api/console/assistants";
const KB_API_BASE = "/api/knowledge-bases";
const MCP_LIST_API = "/api/console/mcp-configs";
const SKILL_LIST_API = "/api/console/skill-configs";

type McpPickerItem = { id: string; name: string; enabled: boolean; transport: string };
type SkillPickerItem = {
  id: string;
  name: string;
  enabled: boolean;
  description?: string | null;
  fileCount?: number;
  hasScripts?: boolean;
};
const EMPTY_MCP_IDS: string[] = [];
const EMPTY_SKILL_IDS: string[] = [];

type ModalMode = "create" | "edit" | "view";

type AssistantT = ReturnType<typeof useTranslations<"page.console.assistants">>;

/** ProTable 列定义工厂（Q8-B）：列头与固定文案经 t 解析，交互回调放 ctx */
type AssistantColumnsCtx = {
  deletingId: string | null;
  openView: (row: AssistantListItem) => void;
  openEdit: (row: AssistantListItem) => void;
  handleDelete: (row: AssistantListItem) => void | Promise<void>;
};

function getAssistantColumns(
  t: AssistantT,
  ctx: AssistantColumnsCtx,
): ProColumns<AssistantListItem>[] {
  const { deletingId, openView, openEdit, handleDelete } = ctx;
  return [
    {
      title: t("columns.type"),
      dataIndex: "scope",
      width: 88,
      render: (_, row) =>
        row.scope === "system" ? (
          <Tag color="gold">{t("tag.system")}</Tag>
        ) : (
          <Tag color="default">{t("tag.personal")}</Tag>
        ),
    },
    {
      title: t("columns.icon"),
      dataIndex: "icon",
      width: 72,
      render: (_, row) =>
        row.icon ? (
          <span className="text-xl leading-none">{row.icon}</span>
        ) : (
          <span className="text-white/35">—</span>
        ),
    },
    {
      title: t("columns.name"),
      dataIndex: "name",
      ellipsis: true,
      width: 160,
      render: (_, row) => (
        <Tooltip title={row.name}>
          <span className="text-white/90">{row.name}</span>
        </Tooltip>
      ),
    },
    {
      title: t("columns.tags"),
      dataIndex: "tags",
      width: 200,
      render: (_, row) =>
        row.tags.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {row.tags.map((tag) => (
              <Tag key={tag} className="m-0">
                {tag}
              </Tag>
            ))}
          </span>
        ) : (
          <span className="text-white/35">—</span>
        ),
    },
    {
      title: t("columns.opening"),
      dataIndex: "openingMessage",
      ellipsis: true,
      width: 200,
      render: (_, row) =>
        row.openingMessage ? (
          <Tooltip title={row.openingMessage}>
            <span className="text-white/70">{row.openingMessage}</span>
          </Tooltip>
        ) : (
          <span className="text-white/35">—</span>
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
      width: 220,
      fixed: "right",
      render: (_, row) => {
        const busy = deletingId === row.id;
        const isSystem = row.scope === "system";
        const systemTip = t("tooltip.systemMaintainAdmin");
        return (
          <TableRowActions>
            {isSystem ? (
              <Button
                type="link"
                size="small"
                className={TABLE_ACTION_BTN_CLASS}
                icon={<EyeOutlined />}
                onClick={() => openView(row)}
              >
                {t("columns.view")}
              </Button>
            ) : null}
            <Tooltip title={isSystem ? systemTip : undefined}>
              <span className={isSystem ? "inline-block" : undefined}>
                <Button
                  type="link"
                  size="small"
                  className={TABLE_ACTION_BTN_CLASS}
                  icon={<EditOutlined />}
                  disabled={isSystem}
                  onClick={() => openEdit(row)}
                >
                  {t("columns.edit")}
                </Button>
              </span>
            </Tooltip>
            <Tooltip title={isSystem ? systemTip : undefined}>
              <span className={isSystem ? "inline-block" : undefined}>
                <Popconfirm
                  title={t("confirm.delete.title")}
                  description={t("confirm.delete.description", { name: row.name })}
                  okText={t("columns.delete")}
                  cancelText={t("drawer.cancel")}
                  okButtonProps={{ danger: true, loading: busy }}
                  disabled={isSystem}
                  onConfirm={() => void handleDelete(row)}
                >
                  <Button
                    type="link"
                    danger
                    size="small"
                    className={TABLE_ACTION_BTN_CLASS}
                    icon={<DeleteOutlined />}
                    loading={busy}
                    disabled={isSystem}
                  >
                    {t("columns.delete")}
                  </Button>
                </Popconfirm>
              </span>
            </Tooltip>
          </TableRowActions>
        );
      },
    },
  ];
}

export default function AssistantsClient() {
  const locale = useLocale();
  const t = useTranslations("page.console.assistants");
  const tShell = useTranslations("page.console.shell");
  const consolePath = `/${locale}/console/assistants`;

  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);
  const [form] = Form.useForm<{
    name: string;
    prompt: string;
    icon?: string;
    openingMessage?: string;
    tags?: string[];
    knowledgeBaseIds?: string[];
    mcpConfigIds?: string[];
    skillConfigIds?: string[];
  }>();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editing, setEditing] = useState<AssistantListItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toolbarLoading, setToolbarLoading] = useState(false);
  const [kbOptions, setKbOptions] = useState<{ label: string; value: string }[]>(
    [],
  );
  const [kbLoading, setKbLoading] = useState(false);
  const [mcpOptions, setMcpOptions] = useState<McpPickerItem[]>([]);
  const [mcpLoading, setMcpLoading] = useState(false);
  const mcpConfigIdsWatch = Form.useWatch("mcpConfigIds", form);
  const [skillOptions, setSkillOptions] = useState<SkillPickerItem[]>([]);
  const [skillLoading, setSkillLoading] = useState(false);
  const skillConfigIdsWatch = Form.useWatch("skillConfigIds", form);

  const [keyword, setKeyword] = useState("");
  const [keywordDraft, setKeywordDraft] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"all" | "system" | "personal">(
    "all",
  );

  const loadKnowledgeBaseOptions = useCallback(async () => {
    setKbLoading(true);
    try {
      const res = await fetch(KB_API_BASE, { credentials: "include" });
      if (res.status === 401) {
        redirectToLocaleLogin(locale, consolePath);
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res, { t: tShell }));
        return;
      }
      const data = (await res.json()) as {
        items: Array<{ id: string; name: string }>;
      };
      setKbOptions(
        (data.items ?? []).map((i) => ({ label: i.name, value: i.id })),
      );
    } finally {
      setKbLoading(false);
    }
  }, [consolePath, locale, message, tShell]);

  const loadMcpOptions = useCallback(async () => {
    setMcpLoading(true);
    try {
      const res = await fetch(MCP_LIST_API, { credentials: "include" });
      if (res.status === 401) {
        redirectToLocaleLogin(locale, consolePath);
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res, { t: tShell }));
        return;
      }
      const data = (await res.json()) as { items: McpPickerItem[] };
      setMcpOptions(Array.isArray(data.items) ? data.items : []);
    } finally {
      setMcpLoading(false);
    }
  }, [consolePath, locale, message, tShell]);

  const loadSkillOptions = useCallback(async () => {
    setSkillLoading(true);
    try {
      const res = await fetch(SKILL_LIST_API, { credentials: "include" });
      if (res.status === 401) {
        redirectToLocaleLogin(locale, consolePath);
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res, { t: tShell }));
        return;
      }
      const data = (await res.json()) as { items: SkillPickerItem[] };
      setSkillOptions(Array.isArray(data.items) ? data.items : []);
    } finally {
      setSkillLoading(false);
    }
  }, [consolePath, locale, message, tShell]);

  const loadAssistantMcpConfigs = useCallback(
    async (assistantId: string) => {
      const res = await fetch(`${API_BASE}/${assistantId}/mcp-configs`, {
        credentials: "include",
      });
      if (res.status === 401) {
        redirectToLocaleLogin(locale, consolePath);
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res, { t: tShell }));
        return;
      }
      const data = (await res.json()) as { mcpConfigIds: string[] };
      form.setFieldsValue({
        mcpConfigIds: Array.isArray(data.mcpConfigIds) ? data.mcpConfigIds : [],
      });
    },
    [consolePath, form, locale, message, tShell],
  );

  const loadAssistantSkillConfigs = useCallback(
    async (assistantId: string) => {
      const res = await fetch(`${API_BASE}/${assistantId}/skill-configs`, {
        credentials: "include",
      });
      if (res.status === 401) {
        redirectToLocaleLogin(locale, consolePath);
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res, { t: tShell }));
        return;
      }
      const data = (await res.json()) as { skillConfigIds: string[] };
      form.setFieldsValue({
        skillConfigIds: Array.isArray(data.skillConfigIds) ? data.skillConfigIds : [],
      });
    },
    [consolePath, form, locale, message, tShell],
  );

  const openCreate = useCallback(() => {
    setModalMode("create");
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ tags: [], knowledgeBaseIds: [], mcpConfigIds: [], skillConfigIds: [] });
    setModalOpen(true);
    void loadKnowledgeBaseOptions();
    void loadMcpOptions();
    void loadSkillOptions();
  }, [form, loadKnowledgeBaseOptions, loadMcpOptions, loadSkillOptions]);

  const loadAssistantKnowledgeBases = useCallback(
    async (assistantId: string) => {
      const res = await fetch(`${API_BASE}/${assistantId}/knowledge-bases`, {
        credentials: "include",
      });
      if (res.status === 401) {
        redirectToLocaleLogin(locale, consolePath);
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res, { t: tShell }));
        return;
      }
      const data = (await res.json()) as { knowledgeBaseIds: string[] };
      form.setFieldsValue({
        knowledgeBaseIds: Array.isArray(data.knowledgeBaseIds)
          ? data.knowledgeBaseIds
          : [],
      });
    },
    [consolePath, form, locale, message, tShell],
  );

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
        knowledgeBaseIds: [],
      });
      setModalOpen(true);
      void loadKnowledgeBaseOptions();
      void loadMcpOptions();
      void loadSkillOptions();
      void loadAssistantKnowledgeBases(row.id);
      void loadAssistantMcpConfigs(row.id);
      void loadAssistantSkillConfigs(row.id);
    },
    [form, loadAssistantKnowledgeBases, loadAssistantMcpConfigs, loadAssistantSkillConfigs, loadKnowledgeBaseOptions, loadMcpOptions, loadSkillOptions],
  );

  const openView = useCallback(
    (row: AssistantListItem) => {
      setModalMode("view");
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
    if (modalMode === "view") {
      closeModal();
      return;
    }
    try {
      await form.validateFields();
    } catch {
      return;
    }
    const v = form.getFieldsValue();
    setSubmitting(true);
    try {
      const tags = Array.isArray(v.tags) ? v.tags : [];
      const knowledgeBaseIds = Array.isArray(v.knowledgeBaseIds)
        ? v.knowledgeBaseIds
        : [];
      const mcpConfigIds = Array.isArray(v.mcpConfigIds) ? v.mcpConfigIds : [];
      const skillConfigIds = Array.isArray(v.skillConfigIds) ? v.skillConfigIds : [];
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
        if (res.status === 401) {
          redirectToLocaleLogin(locale, consolePath);
          return;
        }
        if (!res.ok) {
          message.error(await parseApiError(res, { t: tShell }));
          return;
        }
        const data = (await res.json()) as { item?: { id?: string } };
        const assistantId = data?.item?.id;
        if (assistantId) {
          if (knowledgeBaseIds.length > 0) {
            const relRes = await fetch(`${API_BASE}/${assistantId}/knowledge-bases`, {
              method: "PUT",
              credentials: "include",
              headers: { "Content-Type": "application/json; charset=utf-8" },
              body: JSON.stringify({ knowledgeBaseIds }),
            });
            if (!relRes.ok) {
              message.warning(t("toast.kbBindFailedOnCreate"));
            }
          }
          const mcpRes = await fetch(`${API_BASE}/${assistantId}/mcp-configs`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify({ mcpConfigIds }),
          });
          if (!mcpRes.ok) {
            message.warning(t("toast.mcpBindFailedOnCreate"));
          }
          const skillRes = await fetch(`${API_BASE}/${assistantId}/skill-configs`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify({ skillConfigIds }),
          });
          if (!skillRes.ok) {
            message.warning(t("toast.skillsBindFailedOnCreate"));
          }
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
      if (res.status === 401) {
        redirectToLocaleLogin(locale, consolePath);
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res, { t: tShell }));
        return;
      }
      const relRes = await fetch(`${API_BASE}/${editing.id}/knowledge-bases`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ knowledgeBaseIds }),
      });
      if (!relRes.ok) {
        message.warning(t("toast.kbBindFailedOnSave"));
      }
      const mcpRes = await fetch(`${API_BASE}/${editing.id}/mcp-configs`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ mcpConfigIds }),
      });
      if (!mcpRes.ok) {
        message.warning(t("toast.mcpBindFailedOnSave"));
      }
      const skillRes = await fetch(`${API_BASE}/${editing.id}/skill-configs`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ skillConfigIds }),
      });
      if (!skillRes.ok) {
        message.warning(t("toast.skillsBindFailedOnSave"));
      }
      message.success(t("toast.saved"));
      closeModal();
      await actionRef.current?.reload?.();
    } finally {
      setSubmitting(false);
    }
  }, [closeModal, consolePath, editing, form, locale, message, modalMode, t, tShell]);

  const handleDelete = useCallback(
    async (row: AssistantListItem) => {
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
    [consolePath, locale, message, t, tShell],
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
    () =>
      getAssistantColumns(t, {
        deletingId,
        openView,
        openEdit,
        handleDelete,
      }),
    [deletingId, handleDelete, openEdit, openView, t],
  );

  const modalTitle =
    modalMode === "create"
      ? t("drawer.create.title")
      : modalMode === "edit"
        ? t("drawer.edit.title")
        : t("drawer.viewSystem.title");

  const selectedMcpIdsForPicker = Array.isArray(mcpConfigIdsWatch) ? mcpConfigIdsWatch : EMPTY_MCP_IDS;
  const hasInactiveMountedMcp = useMemo(
    () =>
      selectedMcpIdsForPicker.some((id) => {
        const o = mcpOptions.find((m) => m.id === id);
        return Boolean(o && !o.enabled);
      }),
    [mcpOptions, selectedMcpIdsForPicker],
  );

  const mcpLinkRich = useCallback(
    (chunks: ReactNode) => (
      <Link href="/console/mcp" className="text-sky-300 hover:text-sky-200">
        {chunks}
      </Link>
    ),
    [],
  );

  const selectedSkillIdsForPicker = Array.isArray(skillConfigIdsWatch)
    ? skillConfigIdsWatch
    : EMPTY_SKILL_IDS;
  const hasInactiveMountedSkills = useMemo(
    () =>
      selectedSkillIdsForPicker.some((id) => {
        const o = skillOptions.find((s) => s.id === id);
        return Boolean(o && !o.enabled);
      }),
    [skillOptions, selectedSkillIdsForPicker],
  );

  const skillsLinkRich = useCallback(
    (chunks: ReactNode) => (
      <Link href="/console/skills" className="text-sky-300 hover:text-sky-200">
        {chunks}
      </Link>
    ),
    [],
  );

  return (
    <PageContainer ghost title={t("title")}>
      <div className="max-w-[1400px]">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input.Search
            placeholder={t("toolbar.searchPlaceholder")}
            allowClear
            style={{ width: 220 }}
            value={keywordDraft}
            onChange={(e) => setKeywordDraft(e.target.value)}
            onSearch={applyKeywordSearch}
          />
          <Select
            placeholder={t("toolbar.scopePlaceholder")}
            style={{ width: 130 }}
            value={scopeFilter}
            onChange={(v) => {
              setScopeFilter(v);
              void actionRef.current?.reload?.();
            }}
            options={[
              { label: t("filter.all"), value: "all" },
              { label: t("filter.systemOnly"), value: "system" },
              { label: t("filter.personalOnly"), value: "personal" },
            ]}
          />
        </div>
        <ProTable<AssistantListItem>
          actionRef={actionRef}
          rowKey="id"
          search={false}
          options={false}
          columns={columns}
          scroll={{ x: 1100 }}
          pagination={{
            defaultPageSize: CONSOLE_ASSISTANT_LIST_DEFAULT_PAGE_SIZE,
            showSizeChanger: true,
            showTotal: (total) => t("pagination.total", { total }),
            pageSizeOptions: [10, 20, 50, 100],
          }}
          request={async (params) => {
            const current = params.current ?? 1;
            const pageSize =
              params.pageSize ?? CONSOLE_ASSISTANT_LIST_DEFAULT_PAGE_SIZE;
            const sp = new URLSearchParams({
              page: String(current),
              pageSize: String(pageSize),
              scope: scopeFilter,
            });
            if (keyword.trim()) {
              sp.set("keyword", keyword.trim());
            }
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
                <div className="mb-3 text-white/55">{t("empty.description")}</div>
              </div>
            ),
          }}
        />

        <Modal
          title={modalTitle}
          open={modalOpen}
          onCancel={closeModal}
          onOk={modalMode === "view" ? undefined : () => void submitModal()}
          okText={t("drawer.ok")}
          okButtonProps={{ ghost: true }}
          cancelText={t("drawer.cancel")}
          confirmLoading={submitting}
          width={640}
          maskClosable={false}
          destroyOnClose
          footer={
            modalMode === "view" ? (
              <Button type="primary" ghost onClick={closeModal}>
                {t("drawer.close")}
              </Button>
            ) : undefined
          }
        >
          <Form
            form={form}
            layout="vertical"
            className="mt-4"
            disabled={modalMode === "view"}
          >
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
              <Input placeholder={t("form.icon.placeholder")} maxLength={ASSISTANT_ICON_MAX_LENGTH} />
            </Form.Item>
            <Form.Item
              name="openingMessage"
              label={t("form.opening.label")}
              rules={[
                {
                  max: ASSISTANT_OPENING_MESSAGE_MAX_LENGTH,
                  message: t("form.opening.rules.max", {
                    max: ASSISTANT_OPENING_MESSAGE_MAX_LENGTH,
                  }),
                },
              ]}
            >
              <Input.TextArea
                rows={2}
                showCount
                maxLength={ASSISTANT_OPENING_MESSAGE_MAX_LENGTH}
                placeholder={t("form.opening.placeholder")}
              />
            </Form.Item>
            <Form.Item name="tags" label={t("form.tags.label")}>
              <Select mode="tags" placeholder={t("form.tags.placeholder")} style={{ width: "100%" }} />
            </Form.Item>

            {modalMode !== "view" ? (
              <>
                <Divider className="my-3" />
                <Form.Item
                  name="knowledgeBaseIds"
                  label={t("form.knowledgeBases.label")}
                  extra={t("form.knowledgeBases.extra")}
                >
                  <Select
                    mode="multiple"
                    allowClear
                    placeholder={t("form.knowledgeBases.placeholder")}
                    loading={kbLoading}
                    options={kbOptions}
                    optionFilterProp="label"
                    showSearch
                    maxTagCount="responsive"
                  />
                </Form.Item>

                <Divider className="my-3">{t("section.mcpMount")}</Divider>
                {mcpOptions.length === 0 && !mcpLoading ? (
                  <Alert
                    type="info"
                    showIcon
                    className="mb-3"
                    message={t("alert.noMcp")}
                    description={t.rich("alert.noMcpAction", { mcpLink: mcpLinkRich })}
                  />
                ) : null}
                {hasInactiveMountedMcp ? (
                  <Alert
                    type="warning"
                    showIcon
                    className="mb-3"
                    message={t("alert.mcpInactive")}
                    description={t("alert.mcpInactiveDesc")}
                  />
                ) : null}
                <Form.Item
                  name="mcpConfigIds"
                  label={
                    <span className="flex flex-wrap items-center gap-2">
                      <span>{t("form.mcp.label")}</span>
                      <Link
                        href="/console/mcp"
                        className="text-xs font-normal text-sky-300 hover:text-sky-200"
                      >
                        {t("form.mcp.manageLink")}
                      </Link>
                    </span>
                  }
                  extra={t("form.mcp.extra")}
                >
                  <Select
                    mode="multiple"
                    allowClear
                    placeholder={t("form.mcp.placeholder")}
                    loading={mcpLoading}
                    disabled={mcpOptions.length === 0 && !mcpLoading}
                    optionFilterProp="label"
                    showSearch
                    maxTagCount="responsive"
                    options={mcpOptions.map((m) => ({
                      label: `${m.name} (${m.transport})`,
                      value: m.id,
                      disabled: !m.enabled && !selectedMcpIdsForPicker.includes(m.id),
                    }))}
                    tagRender={(props) => {
                      const { label, value, closable, onClose } = props;
                      const row = mcpOptions.find((m) => m.id === value);
                      const inactive = row && !row.enabled;
                      return (
                        <Tag
                          color={inactive ? "orange" : "blue"}
                          closable={closable}
                          onClose={onClose}
                          className="m-0 max-w-[220px]"
                        >
                          <span className="inline-block max-w-[160px] truncate align-bottom">
                            {row?.name ?? String(label)}
                          </span>
                          {inactive ? t("form.mcp.inactiveSuffix") : ""}
                        </Tag>
                      );
                    }}
                  />
                </Form.Item>

                <Divider className="my-3">{t("section.skillsMount")}</Divider>
                {skillOptions.length === 0 && !skillLoading ? (
                  <Alert
                    type="info"
                    showIcon
                    className="mb-3"
                    message={t("alert.noSkills")}
                    description={t.rich("alert.noSkillsAction", { skillsLink: skillsLinkRich })}
                  />
                ) : null}
                {hasInactiveMountedSkills ? (
                  <Alert
                    type="warning"
                    showIcon
                    className="mb-3"
                    message={t("alert.skillsInactive")}
                    description={t("alert.skillsInactiveDesc")}
                  />
                ) : null}
                <Form.Item
                  name="skillConfigIds"
                  label={
                    <span className="flex flex-wrap items-center gap-2">
                      <span>{t("form.skills.label")}</span>
                      <Link
                        href="/console/skills"
                        className="text-xs font-normal text-sky-300 hover:text-sky-200"
                      >
                        {t("form.skills.manageLink")}
                      </Link>
                    </span>
                  }
                  extra={t("form.skills.extra")}
                >
                  <Select
                    mode="multiple"
                    allowClear
                    placeholder={t("form.skills.placeholder")}
                    loading={skillLoading}
                    disabled={skillOptions.length === 0 && !skillLoading}
                    optionFilterProp="label"
                    showSearch
                    maxTagCount="responsive"
                    options={skillOptions.map((s) => ({
                      label: s.name,
                      value: s.id,
                      fileCount: s.fileCount ?? 0,
                      hasScripts: s.hasScripts ?? false,
                      disabled: !s.enabled && !selectedSkillIdsForPicker.includes(s.id),
                    }))}
                    optionRender={(option) => {
                      const row = skillOptions.find((s) => s.id === option.value);
                      if (!row) return <span>{option.label}</span>;
                      const fileCount = row.fileCount ?? 0;
                      return (
                        <span className="flex flex-wrap items-center gap-1">
                          <span>
                            {fileCount > 0
                              ? t("form.skills.optionFiles", { name: row.name, count: fileCount })
                              : row.name}
                          </span>
                          {row.hasScripts ? (
                            <Tooltip title={t("form.skills.scriptsTooltip")}>
                              <Tag className="m-0" color="gold">
                                {t("form.skills.scriptsTag")}
                              </Tag>
                            </Tooltip>
                          ) : null}
                        </span>
                      );
                    }}
                    tagRender={(props) => {
                      const { label, value, closable, onClose } = props;
                      const row = skillOptions.find((s) => s.id === value);
                      const inactive = row && !row.enabled;
                      return (
                        <Tag
                          color={inactive ? "orange" : "purple"}
                          closable={closable}
                          onClose={onClose}
                          className="m-0 max-w-[220px]"
                        >
                          <span className="inline-block max-w-[160px] truncate align-bottom">
                            {row?.name ?? String(label)}
                          </span>
                          {inactive ? t("form.skills.inactiveSuffix") : ""}
                        </Tag>
                      );
                    }}
                  />
                </Form.Item>
              </>
            ) : null}
          </Form>
        </Modal>
      </div>
    </PageContainer>
  );
}
