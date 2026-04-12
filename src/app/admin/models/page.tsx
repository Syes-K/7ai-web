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
  Space,
  Tag,
  Tooltip,
} from "antd";
import dayjs from "dayjs";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  CONSOLE_MODEL_LIST_DEFAULT_PAGE_SIZE,
  MODEL_CONFIG_TAG_OPTIONS,
  type ModelConfigTag,
} from "@/common/constants";
import { ModelProvider } from "@/common/enums";
import type { ModelConfigListItem } from "@/common/types";
import { MODEL_PROVIDER_OPTIONS, providerTagProps } from "@/app/console/models/model-provider-ui";

async function parseApiError(res: Response): Promise<string> {
  const j = (await res.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  return j?.error?.message ?? `请求失败（${res.status}）`;
}

type ModalMode = "create" | "edit";

const API_BASE = "/api/admin/model-configs";

/**
 * 管理后台：公有模型接入（全站用户可在控制台偏好中选用）。
 */
export default function AdminModelsPage() {
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
        if (res.status === 401) {
          window.location.href =
            "/login?redirect=" + encodeURIComponent("/admin/models");
          return;
        }
        if (res.status === 403) {
          message.error("无管理员权限");
          return;
        }
        if (!res.ok) {
          message.error(await parseApiError(res));
          return;
        }
        message.success("已创建公有模型");
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
      if (res.status === 401) {
        window.location.href =
          "/login?redirect=" + encodeURIComponent("/admin/models");
        return;
      }
      if (res.status === 403) {
        message.error("无管理员权限");
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res));
        return;
      }
      message.success("已保存");
      closeModal();
      await actionRef.current?.reload?.();
    } finally {
      setSubmitting(false);
    }
  }, [closeModal, editing, form, message, modalMode]);

  const handleDelete = useCallback(
    async (row: ModelConfigListItem) => {
      setDeletingId(row.id);
      try {
        const res = await fetch(`${API_BASE}/${row.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (res.status === 401) {
          window.location.href =
            "/login?redirect=" + encodeURIComponent("/admin/models");
          return;
        }
        if (res.status === 403) {
          message.error("无管理员权限");
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

  const columns: ProColumns<ModelConfigListItem>[] = useMemo(
    () => [
      {
        title: "模型名称",
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
        title: "类型",
        dataIndex: "visibility",
        width: 80,
        render: () => <Tag color="gold">公有</Tag>,
      },
      {
        title: "标签",
        dataIndex: "tags",
        width: 220,
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
        title: "Provider",
        dataIndex: "provider",
        width: 130,
        render: (_, row) => {
          const p = providerTagProps(row.provider);
          if (!p) {
            return <Tag color="default">数据异常</Tag>;
          }
          return <Tag color={p.color}>{p.label}</Tag>;
        },
      },
      {
        title: "API Key",
        dataIndex: "apiKeyMasked",
        width: 220,
        render: (_, row) => (
          <span className="font-mono text-sm text-white/55">{row.apiKeyMasked}</span>
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
        width: 160,
        fixed: "right",
        render: (_, row) => {
          const busy = deletingId === row.id;
          return (
            <Space size="small">
              <Button
                type="link"
                size="small"
                className="px-0"
                icon={<EditOutlined />}
                onClick={() => openEdit(row)}
              >
                编辑
              </Button>
              <Popconfirm
                title="确定删除该公有模型？"
                description={`「${row.modelName}」删除后，全站用户若已选为默认将自动清空偏好。`}
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true, loading: busy }}
                onConfirm={() => void handleDelete(row)}
              >
                <Button
                  type="link"
                  danger
                  size="small"
                  className="px-0"
                  icon={<DeleteOutlined />}
                  loading={busy}
                >
                  删除
                </Button>
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [deletingId, handleDelete, openEdit],
  );

  return (
    <PageContainer ghost title="模型管理（公有）">
      <div className="max-w-[1400px]">
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message="此处创建的均为公有模型，全站登录用户可见并可在「控制台 → 账号与偏好」中选为默认对话/向量模型。"
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
            showTotal: (t) => `共 ${t} 条`,
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
              const res = await fetch(`${API_BASE}?${sp.toString()}`, {
                credentials: "include",
              });
              if (res.status === 401) {
                window.location.href =
                  "/login?redirect=" + encodeURIComponent("/admin/models");
                return { data: [], success: false, total: 0 };
              }
              if (res.status === 403) {
                message.error("无管理员权限");
                return { data: [], success: false, total: 0 };
              }
              if (!res.ok) {
                message.error(await parseApiError(res));
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
              新建公有模型
            </Button>,
            <Button
              key="reload"
              icon={<ReloadOutlined />}
              loading={toolbarLoading}
              onClick={() => refreshToolbar()}
            >
              刷新
            </Button>,
          ]}
          locale={{
            emptyText: (
              <div className="py-8 text-center">
                <div className="mb-3 text-white/55">暂无公有模型</div>
              </div>
            ),
          }}
        />

        <Modal
          title={modalMode === "create" ? "新建公有模型" : "编辑公有模型"}
          open={modalOpen}
          onCancel={closeModal}
          width={520}
          maskClosable={false}
          destroyOnClose
          okText={modalMode === "create" ? "创建" : "保存"}
          cancelText="取消"
          confirmLoading={submitting}
          onOk={() => void submitModal()}
        >
          <Form form={form} layout="vertical" className="pt-1">
            <Form.Item
              name="provider"
              label="Provider"
              rules={[{ required: true, message: "请选择 Provider" }]}
            >
              <Select placeholder="请选择" options={MODEL_PROVIDER_OPTIONS} />
            </Form.Item>
            <Form.Item
              name="modelName"
              label="模型名称"
              rules={[{ required: true, message: "请输入模型名称" }]}
            >
              <Input placeholder="例如 moonshot-v1-8k" maxLength={255} showCount />
            </Form.Item>
            <Form.Item
              name="tags"
              label="标签"
              extra="可选，可多选；不选表示无标签"
            >
              <Select
                mode="multiple"
                allowClear
                placeholder="选择标签"
                className="w-full"
                options={MODEL_CONFIG_TAG_OPTIONS.map((v) => ({
                  label: v,
                  value: v,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="apiKey"
              label="API Key"
              rules={
                modalMode === "create"
                  ? [{ required: true, message: "请输入 API Key" }]
                  : []
              }
              extra={
                modalMode === "edit" ? "留空则不修改已保存的 API Key" : undefined
              }
            >
              <Input.Password
                placeholder={
                  modalMode === "edit"
                    ? "留空则不修改已保存的 API Key"
                    : "请输入厂商控制台获取的密钥"
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
