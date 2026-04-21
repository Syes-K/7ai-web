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
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  MCP_CONFIG_DESCRIPTION_MAX_LENGTH,
  MCP_CONFIG_NAME_MAX_LENGTH,
} from "@/common/constants";
import { ErrorCode } from "@/common/enums";
import { readApiErrorPayload } from "@/components/auth/map-api-errors";

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
const REDIRECT = "/console/mcp";

const TRANSPORT_LABEL: Record<string, string> = {
  stdio: "STDIO",
  sse: "SSE",
  http: "HTTP",
};

function transportLabel(t: string) {
  return TRANSPORT_LABEL[t] ?? t;
}

function checkStatusTag(status: string) {
  if (status === "success") return <Tag color="green">成功</Tag>;
  if (status === "failure") return <Tag color="red">失败</Tag>;
  return <Tag>未检测</Tag>;
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const v = JSON.parse(t) as unknown;
    if (typeof v !== "object" || v === null || Array.isArray(v)) {
      return null;
    }
    return v as Record<string, unknown>;
  } catch {
    return null;
  }
}

type ModalMode = "create" | "edit";

export default function ConsoleMcpPage() {
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
  /** 正在拉取编辑详情（GET 单条，含 endpoint/metadata） */
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
          window.location.href = "/login?redirect=" + encodeURIComponent(REDIRECT);
          return;
        }
        if (!res.ok) {
          const err = await readApiErrorPayload(res);
          message.error(err.message);
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
        message.error("加载配置失败");
      } finally {
        setDetailLoadingId(null);
      }
    },
    [computeFormSignature, form, message],
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
          window.location.href = "/login?redirect=" + encodeURIComponent(REDIRECT);
          return;
        }
        // 注意：readApiErrorPayload 会消费 response body，仅能在 !res.ok 时调用，成功路径再单独 json()。
        if (!res.ok) {
          const err = await readApiErrorPayload(res);
          message.error(err.message);
          return;
        }
        const data = (await res.json()) as {
          ok?: boolean;
          item?: McpListItem;
        };
        if (data.ok) {
          message.success("连接测试成功");
        } else {
          message.error(data.item?.lastErrorSummary?.trim() || "连接测试失败");
        }
        await actionRef.current?.reload?.();
      } catch {
        message.error("网络异常，请稍后重试");
      } finally {
        setTestingRowId(null);
      }
    },
    [message],
  );

  const handleRowTestClick = useCallback(
    (row: McpListItem) => {
      void runTestConnection(row.id);
    },
    [runTestConnection],
  );

  const handleModalTestClick = useCallback(async () => {
    if (modalMode !== "edit" || !editingRow) {
      message.info("请先保存配置后再测试连接");
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
  }, [editingRow, isModalDirty, message, modalMode, runTestConnection]);

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
        message.error("连接参数须为合法 JSON 对象（如 {\"url\":\"https://...\"}）");
        return;
      }
    } else {
      if (v.endpointJson.trim() && !endpoint) {
        message.error("连接参数 JSON 无法解析或不是对象");
        return;
      }
    }

    let metadata: Record<string, unknown> | null | undefined;
    if (v.metadataJson.trim()) {
      const m = parseJsonObject(v.metadataJson);
      if (!m) {
        message.error("metadata 须为合法 JSON 对象");
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
          window.location.href = "/login?redirect=" + encodeURIComponent(REDIRECT);
          return;
        }
        if (!res.ok) {
          const err = await readApiErrorPayload(res);
          message.error(err.message);
          return;
        }
        message.success("已创建");
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
        window.location.href = "/login?redirect=" + encodeURIComponent(REDIRECT);
        return;
      }
      if (!res.ok) {
        const err = await readApiErrorPayload(res);
        message.error(err.message);
        return;
      }
      message.success("已保存");
      setPendingTestAfterSave(false);
      closeModal();
      await actionRef.current?.reload?.();
      if (runTestAfterSave) {
        await runTestConnection(savedId);
      }
    } finally {
      setSubmitting(false);
    }
  }, [closeModal, editingRow, form, message, modalMode, pendingTestAfterSave, runTestConnection]);

  const handleDelete = useCallback(
    async (row: McpListItem) => {
      setDeletingId(row.id);
      try {
        const res = await fetch(`${API_BASE}/${row.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (res.status === 401) {
          window.location.href = "/login?redirect=" + encodeURIComponent(REDIRECT);
          return;
        }
        if (res.status === 409) {
          const err = await readApiErrorPayload(res);
          if (err.code === ErrorCode.MCP_CONFIG_REFERENCED_BY_ASSISTANT) {
            modal.warning({
              title: "无法删除",
              content: (
                <div>
                  <p>{err.message}</p>
                  <p className="mt-2">
                    <Link href="/console/assistants">前往助手管理</Link>
                    解除 MCP 挂载后再试。
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
          const err = await readApiErrorPayload(res);
          message.error(err.message);
          return;
        }
        message.success("已删除");
        await actionRef.current?.reload?.();
      } catch {
        message.error("网络异常，请稍后重试");
      } finally {
        setDeletingId(null);
      }
    },
    [message, modal],
  );

  const columns: ProColumns<McpListItem>[] = useMemo(
    () => [
      {
        title: "名称",
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
        title: "启用",
        dataIndex: "enabled",
        width: 88,
        render: (_, row) =>
          row.enabled ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>,
      },
      {
        title: "传输",
        dataIndex: "transport",
        width: 100,
        render: (_, row) => <span className="text-white/80">{transportLabel(row.transport)}</span>,
      },
      {
        title: "连接摘要",
        dataIndex: "endpointSummary",
        ellipsis: true,
        render: (_, row) => (
          <Tooltip title={row.endpointSummary}>
            <span className="text-white/70">{row.endpointSummary}</span>
          </Tooltip>
        ),
      },
      {
        title: "助手引用",
        dataIndex: "referencedAssistantCount",
        width: 110,
        render: (_, row) => <span className="text-white/70">{row.referencedAssistantCount}</span>,
      },
      {
        title: "最近检测",
        dataIndex: "lastCheckedAt",
        width: 220,
        render: (_, row) => (
          <Space direction="vertical" size={0}>
            <Space size={6}>
              {checkStatusTag(row.lastCheckStatus)}
              {row.lastCheckedAt ? (
                <span className="text-white/55">{dayjs(row.lastCheckedAt).format("YYYY-MM-DD HH:mm")}</span>
              ) : (
                <span className="text-white/40">—</span>
              )}
            </Space>
            {row.lastCheckStatus === "failure" && row.lastErrorSummary ? (
              <Tooltip title={row.lastErrorSummary}>
                <span className="line-clamp-1 text-xs text-red-300/90">{row.lastErrorSummary}</span>
              </Tooltip>
            ) : null}
          </Space>
        ),
      },
      {
        title: "操作",
        valueType: "option",
        width: 300,
        fixed: "right",
        render: (_, row) => {
          const busy = deletingId === row.id;
          const testing = testingRowId === row.id;
          const loadingDetail = detailLoadingId === row.id;
          return (
            <Space size="small">
              <Button
                type="link"
                size="small"
                className="px-0"
                icon={<ThunderboltOutlined />}
                loading={testing}
                disabled={loadingDetail}
                onClick={() => handleRowTestClick(row)}
              >
                测试连接
              </Button>
              <Button
                type="link"
                size="small"
                className="px-0"
                icon={<EditOutlined />}
                loading={loadingDetail}
                onClick={() => void openEdit(row)}
              >
                编辑
              </Button>
              <Popconfirm
                title="确定删除该 MCP 配置？"
                description="删除后无法恢复。若仍被助手引用将无法删除。"
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true, loading: busy }}
                disabled={busy}
                onConfirm={() => void handleDelete(row)}
              >
                <Button type="link" danger size="small" className="px-0" icon={<DeleteOutlined />} loading={busy}>
                  删除
                </Button>
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [deletingId, detailLoadingId, handleDelete, handleRowTestClick, openEdit, testingRowId],
  );

  return (
    <PageContainer ghost title="MCP 管理">
      <div className="max-w-[1400px]">
        <p className="mb-4 text-sm text-white/55">
          在此维护个人 MCP 连接；在「助手管理」中为助手挂载 MCP，对话时按助手加载工具。
        </p>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input.Search
            placeholder="搜索名称/描述"
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
              const res = await fetch(`${API_BASE}?${sp.toString()}`, { credentials: "include" });
              if (res.status === 401) {
                window.location.href = "/login?redirect=" + encodeURIComponent(REDIRECT);
                return { data: [], success: false, total: 0 };
              }
              if (!res.ok) {
                const err = await readApiErrorPayload(res);
                message.error(err.message);
                return { data: [], success: false, total: 0 };
              }
              const data = (await res.json()) as { items: McpListItem[] };
              return { data: data.items ?? [], success: true, total: data.items?.length ?? 0 };
            } catch {
              message.error("网络异常，请稍后重试");
              return { data: [], success: false, total: 0 };
            }
          }}
          toolBarRender={() => [
            <Button key="create" type="primary" ghost icon={<PlusOutlined />} onClick={openCreate}>
              新建 MCP
            </Button>,
            <Button key="reload" icon={<ReloadOutlined />} loading={toolbarLoading} onClick={refreshToolbar}>
              刷新
            </Button>,
          ]}
          locale={{
            emptyText: (
              <div className="py-8 text-center">
                <div className="mb-3 text-white/55">暂无 MCP 配置。</div>
                <Button type="primary" ghost onClick={openCreate}>
                  新建 MCP
                </Button>
              </div>
            ),
          }}
        />
      </div>

      <Modal
        title={modalMode === "create" ? "新建 MCP" : "编辑 MCP"}
        open={modalOpen}
        onCancel={closeModal}
        width={760}
        maskClosable={false}
        destroyOnClose
        footer={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            {modalMode === "edit" ? (
              <Button className="mr-auto" loading={testingInModal} onClick={() => void handleModalTestClick()}>
                测试连接
              </Button>
            ) : null}
            <Button onClick={closeModal}>取消</Button>
            <Button type="primary" ghost loading={submitting} onClick={() => void submitModal()}>
              保存
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" className="mt-2">
          <Form.Item
            name="name"
            label="名称"
            rules={[
              { required: true, message: "请输入名称" },
              { max: MCP_CONFIG_NAME_MAX_LENGTH, message: `最多 ${MCP_CONFIG_NAME_MAX_LENGTH} 字` },
            ]}
          >
            <Input placeholder="展示名称" showCount maxLength={MCP_CONFIG_NAME_MAX_LENGTH} />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
            rules={[
              { max: MCP_CONFIG_DESCRIPTION_MAX_LENGTH, message: `最多 ${MCP_CONFIG_DESCRIPTION_MAX_LENGTH} 字` },
            ]}
          >
            <Input.TextArea rows={2} placeholder="可选" showCount maxLength={MCP_CONFIG_DESCRIPTION_MAX_LENGTH} />
          </Form.Item>
          <Form.Item name="transport" label="传输方式" rules={[{ required: true, message: "请选择传输方式" }]}>
            <Select
              options={[
                { label: "HTTP", value: "http" },
                { label: "SSE", value: "sse" },
                { label: "STDIO（子进程）", value: "stdio" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="endpointJson"
            label="连接参数（JSON）"
            rules={[
              {
                required: modalMode === "create",
                message: "请填写连接参数 JSON",
              },
            ]}
            extra={
              modalMode === "edit" ? (
                <span className="text-white/45">
                  留空表示不修改。HTTP/SSE 示例：{`{"url":"https://..."}`}；stdio 示例：
                  {`{"command":"npx","args":["-y","包名"]}`}
                </span>
              ) : (
                <span className="text-white/45">
                  须为 JSON 对象；打开编辑时会从服务端加载当前配置。留空整段表示不修改 endpoint。
                </span>
              )
            }
          >
            <Input.TextArea rows={6} placeholder={'例如 {"url":"https://api.example.com/mcp"}'} />
          </Form.Item>
          <Form.Item
            name="metadataJson"
            label="metadata（可选 JSON）"
            extra="须为 JSON 对象；留空表示不设置或不修改（编辑时留空不改）。"
          >
            <Input.TextArea rows={4} placeholder="{}" />
          </Form.Item>
          <Form.Item
            name="credentials"
            label={
              <span className="inline-flex items-center gap-1.5">
                <span>凭证 / Token</span>
                <Tooltip
                  overlayStyle={{ maxWidth: 400 }}
                  title={
                    <div className="space-y-2 text-left text-xs leading-relaxed">
                      <p>
                        用于连接该 MCP 服务端点时的<strong>鉴权信息</strong>（例如 API Key、Bearer
                        Token），让远端识别合法客户端。
                      </p>
                      <p>
                        <strong>HTTP / SSE</strong>：一般填一串 token；若需多个请求头或自定义头名，也可填 JSON，例如{" "}
                        <code className="rounded bg-black/30 px-1">{`{"headers":{"Authorization":"Bearer …"}}`}</code>
                        （会与 metadata 中的 headers 合并）。
                      </p>
                      <p>
                        <strong>STDIO</strong>：多数情况无需在此填写；若文档要求通过环境变量传密钥，优先写在连接参数里。
                      </p>
                      <p className="text-white/85">
                        保存后<strong>加密入库</strong>，列表与接口<strong>不回显</strong>明文。环境变量{" "}
                        <code className="rounded bg-black/30 px-1">MCP_CREDENTIALS_MASTER_KEY</code>{" "}
                        是服务端用来加密存储的密钥，<strong>不是</strong>要填给 MCP 服务商的那份 token。
                      </p>
                    </div>
                  }
                >
                  <QuestionCircleOutlined
                    className="cursor-help text-[13px] text-white/45 transition-colors hover:text-sky-300/90"
                    aria-label="凭证与 Token 说明"
                  />
                </Tooltip>
              </span>
            }
            extra={
              modalMode === "edit"
                ? "已配置则留空表示不修改；填写新值则覆盖加密存储。"
                : "可选；服务端需配置 MCP_CREDENTIALS_MASTER_KEY 才能保存。"
            }
          >
            <Input.Password placeholder={modalMode === "edit" ? "留空表示不修改" : "可选"} autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="enabled" label="启用该 MCP" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="未保存的修改"
        open={testChoiceOpen}
        onCancel={() => setTestChoiceOpen(false)}
        footer={null}
        destroyOnClose
      >
        <p className="text-white/75">测试连接以服务端已保存配置为准。请选择：</p>
        <div className="mt-4 flex w-full flex-wrap justify-end gap-2">
          <Button onClick={() => setTestChoiceOpen(false)}>取消</Button>
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
            放弃修改并测试
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
            保存并测试
          </Button>
        </div>
      </Modal>
    </PageContainer>
  );
}
