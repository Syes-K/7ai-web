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
  Space,
  Tag,
  Tooltip,
} from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ASSISTANT_ICON_MAX_LENGTH,
  ASSISTANT_NAME_MAX_LENGTH,
  ASSISTANT_OPENING_MESSAGE_MAX_LENGTH,
  ASSISTANT_PROMPT_MAX_LENGTH,
  CONSOLE_ASSISTANT_LIST_DEFAULT_PAGE_SIZE,
} from "@/common/constants";
import type { AssistantListItem } from "@/common/types";

const API_BASE = "/api/console/assistants";
const KB_API_BASE = "/api/knowledge-bases";
const MCP_LIST_API = "/api/console/mcp-configs";

type McpPickerItem = { id: string; name: string; enabled: boolean; transport: string };
const EMPTY_MCP_IDS: string[] = [];

async function parseApiError(res: Response): Promise<string> {
  const j = (await res.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  return j?.error?.message ?? `请求失败（${res.status}）`;
}

type ModalMode = "create" | "edit" | "view";

export default function ConsoleAssistantsPage() {
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
        window.location.href =
          "/login?redirect=" + encodeURIComponent("/console/assistants");
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res));
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
  }, [message]);

  const loadMcpOptions = useCallback(async () => {
    setMcpLoading(true);
    try {
      const res = await fetch(MCP_LIST_API, { credentials: "include" });
      if (res.status === 401) {
        window.location.href =
          "/login?redirect=" + encodeURIComponent("/console/assistants");
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res));
        return;
      }
      const data = (await res.json()) as { items: McpPickerItem[] };
      setMcpOptions(Array.isArray(data.items) ? data.items : []);
    } finally {
      setMcpLoading(false);
    }
  }, [message]);

  const loadAssistantMcpConfigs = useCallback(
    async (assistantId: string) => {
      const res = await fetch(`${API_BASE}/${assistantId}/mcp-configs`, {
        credentials: "include",
      });
      if (res.status === 401) {
        window.location.href =
          "/login?redirect=" + encodeURIComponent("/console/assistants");
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res));
        return;
      }
      const data = (await res.json()) as { mcpConfigIds: string[] };
      form.setFieldsValue({
        mcpConfigIds: Array.isArray(data.mcpConfigIds) ? data.mcpConfigIds : [],
      });
    },
    [form, message],
  );

  const openCreate = useCallback(() => {
    setModalMode("create");
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ tags: [], knowledgeBaseIds: [], mcpConfigIds: [] });
    setModalOpen(true);
    void loadKnowledgeBaseOptions();
    void loadMcpOptions();
  }, [form, loadKnowledgeBaseOptions, loadMcpOptions]);

  const loadAssistantKnowledgeBases = useCallback(
    async (assistantId: string) => {
      const res = await fetch(`${API_BASE}/${assistantId}/knowledge-bases`, {
        credentials: "include",
      });
      if (res.status === 401) {
        window.location.href =
          "/login?redirect=" + encodeURIComponent("/console/assistants");
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res));
        return;
      }
      const data = (await res.json()) as { knowledgeBaseIds: string[] };
      form.setFieldsValue({
        knowledgeBaseIds: Array.isArray(data.knowledgeBaseIds)
          ? data.knowledgeBaseIds
          : [],
      });
    },
    [form, message],
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
      void loadAssistantKnowledgeBases(row.id);
      void loadAssistantMcpConfigs(row.id);
    },
    [form, loadAssistantKnowledgeBases, loadAssistantMcpConfigs, loadKnowledgeBaseOptions, loadMcpOptions],
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
          window.location.href =
            "/login?redirect=" + encodeURIComponent("/console/assistants");
          return;
        }
        if (!res.ok) {
          message.error(await parseApiError(res));
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
              message.warning("助手已创建，但知识库绑定保存失败");
            }
          }
          const mcpRes = await fetch(`${API_BASE}/${assistantId}/mcp-configs`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify({ mcpConfigIds }),
          });
          if (!mcpRes.ok) {
            message.warning("助手已创建，但 MCP 挂载保存失败");
          }
        }
        message.success("已创建");
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
        window.location.href =
          "/login?redirect=" + encodeURIComponent("/console/assistants");
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res));
        return;
      }
      // 保存知识库绑定（仅个人助手有该配置）
      const relRes = await fetch(`${API_BASE}/${editing.id}/knowledge-bases`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ knowledgeBaseIds }),
      });
      if (!relRes.ok) {
        message.warning("助手已保存，但知识库绑定保存失败");
      }
      const mcpRes = await fetch(`${API_BASE}/${editing.id}/mcp-configs`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ mcpConfigIds }),
      });
      if (!mcpRes.ok) {
        message.warning("助手已保存，但 MCP 挂载保存失败");
      }
      message.success("已保存");
      closeModal();
      await actionRef.current?.reload?.();
    } finally {
      setSubmitting(false);
    }
  }, [closeModal, editing, form, message, modalMode]);

  const handleDelete = useCallback(
    async (row: AssistantListItem) => {
      setDeletingId(row.id);
      try {
        const res = await fetch(`${API_BASE}/${row.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (res.status === 401) {
          window.location.href =
            "/login?redirect=" + encodeURIComponent("/console/assistants");
          return;
        }
        if (!res.ok) {
          message.error(await parseApiError(res));
          return;
        }
        message.success("已删除");
        await actionRef.current?.reload?.();
      } finally {
        setDeletingId(null);
      }
    },
    [message],
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

  const columns: ProColumns<AssistantListItem>[] = useMemo(
    () => [
      {
        title: "类型",
        dataIndex: "scope",
        width: 88,
        render: (_, row) =>
          row.scope === "system" ? (
            <Tag color="gold">系统</Tag>
          ) : (
            <Tag color="default">个人</Tag>
          ),
      },
      {
        title: "图标",
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
        title: "名称",
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
        title: "标签",
        dataIndex: "tags",
        width: 200,
        render: (_, row) =>
          row.tags.length > 0 ? (
            <span className="flex flex-wrap gap-1">
              {row.tags.map((t) => (
                <Tag key={t} className="m-0">
                  {t}
                </Tag>
              ))}
            </span>
          ) : (
            <span className="text-white/35">—</span>
          ),
      },
      {
        title: "开场白",
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
        title: "最近更新",
        dataIndex: "updatedAt",
        width: 168,
        render: (_, row) => (
          <span className="text-white/55">
            {dayjs(row.updatedAt).format("YYYY-MM-DD HH:mm")}
          </span>
        ),
      },
      {
        title: "操作",
        valueType: "option",
        width: 220,
        fixed: "right",
        render: (_, row) => {
          const busy = deletingId === row.id;
          const isSystem = row.scope === "system";
          const systemTip = "系统助手请在管理后台维护";
          return (
            <Space size="small">
              {isSystem ? (
                <Button
                  type="link"
                  size="small"
                  className="px-0"
                  icon={<EyeOutlined />}
                  onClick={() => openView(row)}
                >
                  查看
                </Button>
              ) : null}
              <Tooltip title={isSystem ? systemTip : undefined}>
                <span className={isSystem ? "inline-block" : undefined}>
                  <Button
                    type="link"
                    size="small"
                    className="px-0"
                    icon={<EditOutlined />}
                    disabled={isSystem}
                    onClick={() => openEdit(row)}
                  >
                    编辑
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={isSystem ? systemTip : undefined}>
                <span className={isSystem ? "inline-block" : undefined}>
                  <Popconfirm
                    title="确定删除该助手？"
                    description={`「${row.name}」删除后不可恢复。`}
                    okText="删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true, loading: busy }}
                    disabled={isSystem}
                    onConfirm={() => void handleDelete(row)}
                  >
                    <Button
                      type="link"
                      danger
                      size="small"
                      className="px-0"
                      icon={<DeleteOutlined />}
                      loading={busy}
                      disabled={isSystem}
                    >
                      删除
                    </Button>
                  </Popconfirm>
                </span>
              </Tooltip>
            </Space>
          );
        },
      },
    ],
    [deletingId, handleDelete, openEdit, openView],
  );

  const modalTitle =
    modalMode === "create"
      ? "新建助手"
      : modalMode === "edit"
        ? "编辑助手"
        : "查看助手（系统）";

  const selectedMcpIdsForPicker = Array.isArray(mcpConfigIdsWatch) ? mcpConfigIdsWatch : EMPTY_MCP_IDS;
  const hasInactiveMountedMcp = useMemo(
    () =>
      selectedMcpIdsForPicker.some((id) => {
        const o = mcpOptions.find((m) => m.id === id);
        return Boolean(o && !o.enabled);
      }),
    [mcpOptions, selectedMcpIdsForPicker],
  );

  return (
    <PageContainer ghost title="助手管理">
      <div className="max-w-[1400px]">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input.Search
            placeholder="搜索名称"
            allowClear
            style={{ width: 220 }}
            value={keywordDraft}
            onChange={(e) => setKeywordDraft(e.target.value)}
            onSearch={applyKeywordSearch}
          />
          <Select
            placeholder="范围"
            style={{ width: 130 }}
            value={scopeFilter}
            onChange={(v) => {
              setScopeFilter(v);
              void actionRef.current?.reload?.();
            }}
            options={[
              { label: "全部", value: "all" },
              { label: "仅系统", value: "system" },
              { label: "仅个人", value: "personal" },
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
            showTotal: (t) => `共 ${t} 条`,
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
                window.location.href =
                  "/login?redirect=" + encodeURIComponent("/console/assistants");
                return { data: [], success: false, total: 0 };
              }
              if (!res.ok) {
                message.error(await parseApiError(res));
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
              message.error("网络异常，请稍后重试");
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
              新建助手
            </Button>,
            <Button
              key="reload"
              icon={<ReloadOutlined />}
              loading={toolbarLoading}
              onClick={refreshToolbar}
            >
              刷新
            </Button>,
          ]}
          locale={{
            emptyText: (
              <div className="py-8 text-center">
                <div className="mb-3 text-white/55">
                  暂无助手。您可新建个人助手，或由管理员在后台发布系统助手。
                </div>
              </div>
            ),
          }}
        />

        <Modal
          title={modalTitle}
          open={modalOpen}
          onCancel={closeModal}
          onOk={modalMode === "view" ? undefined : () => void submitModal()}
          okText="保存"
          okButtonProps={{ ghost: true }}
          cancelText="取消"
          confirmLoading={submitting}
          width={640}
          maskClosable={false}
          destroyOnClose
          footer={
            modalMode === "view" ? (
              <Button type="primary" ghost onClick={closeModal}>
                关闭
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
              label="名称"
              rules={[
                { required: true, message: "请输入名称" },
                { max: ASSISTANT_NAME_MAX_LENGTH, message: `最多 ${ASSISTANT_NAME_MAX_LENGTH} 字` },
              ]}
            >
              <Input placeholder="助手名称" />
            </Form.Item>
            <Form.Item
              name="prompt"
              label="提示词"
              rules={[
                { required: true, message: "请输入提示词" },
                { max: ASSISTANT_PROMPT_MAX_LENGTH, message: `最多 ${ASSISTANT_PROMPT_MAX_LENGTH} 字` },
              ]}
            >
              <Input.TextArea
                placeholder="模型 system / 行为说明"
                rows={8}
                showCount
                maxLength={ASSISTANT_PROMPT_MAX_LENGTH}
              />
            </Form.Item>
            <Form.Item
              name="icon"
              label="图标（emoji）"
              rules={[{ max: ASSISTANT_ICON_MAX_LENGTH, message: `最多 ${ASSISTANT_ICON_MAX_LENGTH} 字符` }]}
            >
              <Input placeholder="例如 🤖" maxLength={ASSISTANT_ICON_MAX_LENGTH} />
            </Form.Item>
            <Form.Item
              name="openingMessage"
              label="开场白"
              rules={[
                { max: ASSISTANT_OPENING_MESSAGE_MAX_LENGTH, message: `最多 ${ASSISTANT_OPENING_MESSAGE_MAX_LENGTH} 字` },
              ]}
            >
              <Input.TextArea
                rows={2}
                showCount
                maxLength={ASSISTANT_OPENING_MESSAGE_MAX_LENGTH}
                placeholder="可选"
              />
            </Form.Item>
            <Form.Item name="tags" label="标签">
              <Select mode="tags" placeholder="输入后回车添加" style={{ width: "100%" }} />
            </Form.Item>

            {modalMode !== "view" ? (
              <>
                <Divider className="my-3" />
                <Form.Item
                  name="knowledgeBaseIds"
                  label="知识库（多选）"
                  extra="为该助手配置可用知识库；对话时将按需检索这些知识库。"
                >
                  <Select
                    mode="multiple"
                    allowClear
                    placeholder="请选择知识库"
                    loading={kbLoading}
                    options={kbOptions}
                    optionFilterProp="label"
                    showSearch
                    maxTagCount="responsive"
                  />
                </Form.Item>

                <Divider className="my-3">MCP 挂载</Divider>
                {mcpOptions.length === 0 && !mcpLoading ? (
                  <Alert
                    type="info"
                    showIcon
                    className="mb-3"
                    message="您还没有可用的 MCP"
                    description={
                      <span>
                        请先到 <Link href="/console/mcp">MCP 管理</Link> 添加配置。
                      </span>
                    }
                  />
                ) : null}
                {hasInactiveMountedMcp ? (
                  <Alert
                    type="warning"
                    showIcon
                    className="mb-3"
                    message="部分已挂载的 MCP 已停用"
                    description="对话中不会加载已停用的 MCP，建议启用或移除。"
                  />
                ) : null}
                <Form.Item
                  name="mcpConfigIds"
                  label={
                    <span className="flex flex-wrap items-center gap-2">
                      <span>MCP（多选）</span>
                      <Link href="/console/mcp" className="text-xs font-normal text-sky-300 hover:text-sky-200">
                        管理 MCP…
                      </Link>
                    </span>
                  }
                  extra="对话时为本助手加载对应工具；与是否使用知识库检索无关。"
                >
                  <Select
                    mode="multiple"
                    allowClear
                    placeholder="加载 MCP 列表…"
                    loading={mcpLoading}
                    disabled={mcpOptions.length === 0 && !mcpLoading}
                    optionFilterProp="label"
                    showSearch
                    maxTagCount="responsive"
                    options={mcpOptions.map((m) => ({
                      label: `${m.name}（${m.transport}）`,
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
                          {inactive ? "（已停用）" : ""}
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
