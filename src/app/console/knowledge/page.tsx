"use client";

import {
  DeleteOutlined,
  EditOutlined,
  ExperimentOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { ActionType, ProColumns } from "@ant-design/pro-components";
import { PageContainer, ProTable } from "@ant-design/pro-components";
import {
  App,
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  Tooltip,
} from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KNOWLEDGE_BASE_CONTENT_MAX_LENGTH,
  KNOWLEDGE_BASE_DESCRIPTION_MAX_LENGTH,
  KNOWLEDGE_BASE_NAME_MAX_LENGTH,
} from "@/common/constants";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";

type KnowledgeBaseListItem = {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  contentFormat: "markdown" | "plain";
  sourceType: "text" | "file";
  vectorStatus: "pending" | "success" | "failed";
  vectorUpdatedAt: string | null;
  vectorLastStartedAt: string | null;
  vectorError: string | null;
  createdAt: string;
  updatedAt: string;
};

type KnowledgeBaseDetail = KnowledgeBaseListItem & { content: string };
type ChunkTestTarget = Pick<KnowledgeBaseListItem, "id" | "name" | "vectorStatus">;

const API_BASE = "/api/knowledge-bases";

async function parseApiError(res: Response): Promise<string> {
  const j = (await res.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  return j?.error?.message ?? `请求失败（${res.status}）`;
}

function vectorStatusTag(status: KnowledgeBaseListItem["vectorStatus"]) {
  if (status === "success") return <Tag color="green">已完成</Tag>;
  if (status === "failed") return <Tag color="red">失败</Tag>;
  return <Tag color="processing">向量化中</Tag>;
}

type ModalMode = "create" | "edit";

export default function ConsoleKnowledgePage() {
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);

  const [keyword, setKeyword] = useState("");
  const [keywordDraft, setKeywordDraft] = useState("");
  const [toolbarLoading, setToolbarLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editing, setEditing] = useState<KnowledgeBaseDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<{
    name: string;
    description?: string;
    tags?: string[];
    contentFormat: "markdown" | "plain";
    content: string;
  }>();

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<KnowledgeBaseDetail | null>(null);
  const vectorPollRef = useRef<number | null>(null);

  const [chunkTestOpen, setChunkTestOpen] = useState(false);
  const [chunkTestTarget, setChunkTestTarget] = useState<ChunkTestTarget | null>(null);
  const [chunkTesting, setChunkTesting] = useState(false);
  const [chunkTestQuery, setChunkTestQuery] = useState("");
  const [chunkTestTopK, setChunkTestTopK] = useState<number>(3);
  const [chunkTestThreshold, setChunkTestThreshold] = useState<number>(0.75);
  const [chunkTestItems, setChunkTestItems] = useState<
    Array<{
      rank: number;
      chunkIndex: number;
      score: number;
      chunkPreview: string;
      chunkContent: string;
    }>
  >([]);

  const refreshToolbar = useCallback(() => {
    setToolbarLoading(true);
    void actionRef.current?.reload?.().finally(() => setToolbarLoading(false));
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadKnowledgeSearchPreference = async () => {
      try {
        const res = await fetch("/api/console/profile", { credentials: "include" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          preference?: {
            knowledgeTopKEffective?: number;
            knowledgeThresholdEffective?: number;
          };
        };
        if (!mounted) return;
        const topK = data.preference?.knowledgeTopKEffective;
        const threshold = data.preference?.knowledgeThresholdEffective;
        if (typeof topK === "number" && Number.isFinite(topK)) {
          setChunkTestTopK(Math.max(1, Math.min(20, Math.floor(topK))));
        }
        if (typeof threshold === "number" && Number.isFinite(threshold)) {
          setChunkTestThreshold(Math.max(0, Math.min(1, threshold)));
        }
      } catch {
        // ignore: fallback to local defaults
      }
    };
    void loadKnowledgeSearchPreference();
    return () => {
      mounted = false;
    };
  }, []);

  const applyKeywordSearch = useCallback(() => {
    setKeyword(keywordDraft.trim());
    void actionRef.current?.reload?.();
  }, [keywordDraft]);

  const openCreate = useCallback(() => {
    setModalMode("create");
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ tags: [], contentFormat: "markdown" });
    setModalOpen(true);
  }, [form]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
  }, [form]);

  const openEdit = useCallback(
    async (row: KnowledgeBaseListItem) => {
      setModalMode("edit");
      setSubmitting(false);
      setEditing(null);
      setModalOpen(true);
      // 拉取详情以便编辑 content
      try {
        const res = await fetch(`${API_BASE}/${row.id}`, { credentials: "include" });
        if (res.status === 401) {
          window.location.href =
            "/login?redirect=" + encodeURIComponent("/console/knowledge");
          return;
        }
        if (!res.ok) {
          message.error(await parseApiError(res));
          closeModal();
          return;
        }
        const data = (await res.json()) as { item: KnowledgeBaseDetail };
        setEditing(data.item);
        form.setFieldsValue({
          name: data.item.name,
          description: data.item.description ?? "",
          tags: data.item.tags ?? [],
          contentFormat: data.item.contentFormat,
          content: data.item.content,
        });
      } catch {
        message.error("网络异常，请稍后重试");
        closeModal();
      }
    },
    [closeModal, form, message],
  );

  const openDetail = useCallback(
    async (row: KnowledgeBaseListItem) => {
      setDetailOpen(true);
      setDetailLoading(true);
      setDetail(null);
      try {
        const res = await fetch(`${API_BASE}/${row.id}`, { credentials: "include" });
        if (res.status === 401) {
          window.location.href =
            "/login?redirect=" + encodeURIComponent("/console/knowledge");
          return;
        }
        if (!res.ok) {
          message.error(await parseApiError(res));
          return;
        }
        const data = (await res.json()) as { item: KnowledgeBaseDetail };
        setDetail(data.item);
      } catch {
        message.error("网络异常，请稍后重试");
      } finally {
        setDetailLoading(false);
      }
    },
    [message],
  );

  const refreshVectorizationStatus = useCallback(async () => {
    if (!detail) return;
    try {
      const res = await fetch(`${API_BASE}/${detail.id}/vectorization`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        vectorStatus: KnowledgeBaseListItem["vectorStatus"];
        vectorUpdatedAt: string | null;
        vectorLastStartedAt: string | null;
        vectorError: string | null;
      };
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              vectorStatus: data.vectorStatus,
              vectorUpdatedAt: data.vectorUpdatedAt,
              vectorLastStartedAt: data.vectorLastStartedAt,
              vectorError: data.vectorError,
            }
          : prev,
      );
    } catch {
      // ignore
    }
  }, [detail]);

  useEffect(() => {
    // 仅在详情打开且向量化中时轮询
    if (!detailOpen || !detail) return;
    if (detail.vectorStatus !== "pending") return;
    // 先清理旧轮询
    if (vectorPollRef.current) {
      window.clearInterval(vectorPollRef.current);
    }
    vectorPollRef.current = window.setInterval(() => {
      void refreshVectorizationStatus();
    }, 4000);
    return () => {
      if (vectorPollRef.current) {
        window.clearInterval(vectorPollRef.current);
        vectorPollRef.current = null;
      }
    };
  }, [detail, detailOpen, refreshVectorizationStatus]);

  const retryVectorization = useCallback(async () => {
    if (!detail) return;
    try {
      const res = await fetch(`${API_BASE}/${detail.id}/vectorization/retry`, {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 401) {
        window.location.href =
          "/login?redirect=" + encodeURIComponent("/console/knowledge");
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res));
        return;
      }
      message.success("已触发重试");
      // 刷新详情
      await openDetail(detail);
    } catch {
      message.error("网络异常，请稍后重试");
    }
  }, [detail, message, openDetail]);

  const chunkTestDisabledReason = useCallback((status: KnowledgeBaseListItem["vectorStatus"]) => {
    if (status === "pending") return "向量化进行中，完成后可测试";
    if (status === "failed") return "向量化失败，请重试后再测试";
    return null;
  }, []);

  const openChunkTest = useCallback(
    (target: ChunkTestTarget) => {
      const reason = chunkTestDisabledReason(target.vectorStatus);
      if (reason) {
        message.warning(reason);
        return;
      }
      setChunkTestTarget(target);
      setChunkTestOpen(true);
      setChunkTestItems([]);
    },
    [chunkTestDisabledReason, message],
  );

  const submitModal = useCallback(async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    const v = form.getFieldsValue();
    setSubmitting(true);
    try {
      const payload = {
        name: v.name.trim(),
        description: (v.description ?? "").trim() || null,
        tags: Array.isArray(v.tags) ? v.tags : [],
        contentFormat: v.contentFormat,
        content: v.content.trim(),
        sourceType: "text",
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
            "/login?redirect=" + encodeURIComponent("/console/knowledge");
          return;
        }
        if (!res.ok) {
          message.error(await parseApiError(res));
          return;
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
          "/login?redirect=" + encodeURIComponent("/console/knowledge");
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

  const runChunkTest = useCallback(async () => {
    if (!chunkTestTarget) {
      message.warning("请先选择要测试的知识库");
      return;
    }
    if (chunkTestTarget.vectorStatus !== "success") {
      message.warning("当前知识库尚未完成向量化，暂不可测试");
      return;
    }
    const q = chunkTestQuery.trim();
    if (!q) {
      message.error("请输入测试问题");
      return;
    }
    setChunkTesting(true);
    try {
      const res = await fetch(`${API_BASE}/${chunkTestTarget.id}/chunk-tests`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          query: q,
          topK: chunkTestTopK,
          threshold: chunkTestThreshold,
        }),
      });
      if (res.status === 401) {
        window.location.href =
          "/login?redirect=" + encodeURIComponent("/console/knowledge");
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res));
        return;
      }
      const data = (await res.json()) as {
        items: Array<{
          rank: number;
          chunkIndex: number;
          score: number;
          chunkPreview: string;
          chunkContent: string;
        }>;
      };
      setChunkTestItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      message.error("网络异常，请稍后重试");
    } finally {
      setChunkTesting(false);
    }
  }, [chunkTestQuery, chunkTestTarget, chunkTestThreshold, chunkTestTopK, message]);

  const closeChunkTest = useCallback(() => {
    setChunkTestOpen(false);
    setChunkTestTarget(null);
    setChunkTestItems([]);
    setChunkTesting(false);
  }, []);

  const handleDelete = useCallback(
    async (row: KnowledgeBaseListItem) => {
      setDeletingId(row.id);
      try {
        const res = await fetch(`${API_BASE}/${row.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (res.status === 401) {
          window.location.href =
            "/login?redirect=" + encodeURIComponent("/console/knowledge");
          return;
        }
        if (!res.ok) {
          message.error(await parseApiError(res));
          return;
        }
        message.success("已删除");
        if (detail?.id === row.id) {
          setDetailOpen(false);
          setDetail(null);
          closeChunkTest();
        } else if (chunkTestTarget?.id === row.id) {
          closeChunkTest();
        }
        await actionRef.current?.reload?.();
      } catch {
        message.error("网络异常，请稍后重试");
      } finally {
        setDeletingId(null);
      }
    },
    [chunkTestTarget?.id, closeChunkTest, detail?.id, message],
  );

  const resetChunkTest = useCallback(() => {
    setChunkTestQuery("");
    setChunkTestItems([]);
  }, []);

  const copyChunk = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        message.success("已复制");
      } catch {
        message.error("复制失败，请手动复制");
      }
    },
    [message],
  );

  const columns: ProColumns<KnowledgeBaseListItem>[] = useMemo(
    () => [
      {
        title: "名称",
        dataIndex: "name",
        width: 220,
        ellipsis: true,
        render: (_, row) => (
          <Tooltip title={row.name}>
            <span className="text-white/90">{row.name}</span>
          </Tooltip>
        ),
      },
      {
        title: "格式",
        dataIndex: "contentFormat",
        width: 88,
        render: (_, row) =>
          row.contentFormat === "markdown" ? (
            <Tag color="blue">Markdown</Tag>
          ) : (
            <Tag color="default">文本</Tag>
          ),
      },
      {
        title: "标签",
        dataIndex: "tags",
        width: 200,
        render: (_, row) =>
          row.tags.length > 0 ? (
            <span className="flex flex-wrap gap-1">
              {row.tags.slice(0, 6).map((t) => (
                <Tag key={t} className="m-0">
                  {t}
                </Tag>
              ))}
              {row.tags.length > 6 ? <Tag className="m-0">+{row.tags.length - 6}</Tag> : null}
            </span>
          ) : (
            <span className="text-white/35">—</span>
          ),
      },
      {
        title: "向量化",
        dataIndex: "vectorStatus",
        width: 120,
        render: (_, row) => vectorStatusTag(row.vectorStatus),
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
        width: 360,
        fixed: "right",
        render: (_, row) => {
          const disabledReason = chunkTestDisabledReason(row.vectorStatus);
          const busy = deletingId === row.id;
          return (
            <Space size="small">
              <Button
                type="link"
                size="small"
                className="px-0"
                icon={<EyeOutlined />}
                onClick={() => void openDetail(row)}
              >
                查看
              </Button>
              {disabledReason ? (
                <Tooltip title={disabledReason}>
                  <Button
                    type="link"
                    size="small"
                    className="px-0"
                    icon={<ExperimentOutlined />}
                    disabled
                  >
                    检索效果测试
                  </Button>
                </Tooltip>
              ) : (
                <Button
                  type="link"
                  size="small"
                  className="px-0"
                  icon={<ExperimentOutlined />}
                  onClick={() => openChunkTest(row)}
                >
                  检索效果测试
                </Button>
              )}
              <Button
                type="link"
                size="small"
                className="px-0"
                icon={<EditOutlined />}
                onClick={() => void openEdit(row)}
              >
                编辑
              </Button>
              <Popconfirm
                title="确定删除该知识库？"
                description={
                  <div className="max-w-[280px] text-white/80">
                    <div>「{row.name}」删除后不可恢复。</div>
                    <div className="mt-1.5 text-xs leading-relaxed text-white/55">
                      若仍有助手在使用该知识库，将无法删除；请先到「助手管理」解除关联后再删。
                    </div>
                  </div>
                }
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true, loading: busy }}
                disabled={busy}
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
    [chunkTestDisabledReason, deletingId, handleDelete, openChunkTest, openDetail, openEdit],
  );

  return (
    <PageContainer ghost title="知识库管理">
      <div className="max-w-[1400px]">
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

        <ProTable<KnowledgeBaseListItem>
          actionRef={actionRef}
          rowKey="id"
          search={false}
          options={false}
          columns={columns}
          scroll={{ x: 980 }}
          request={async () => {
            const sp = new URLSearchParams();
            if (keyword.trim()) sp.set("keyword", keyword.trim());
            try {
              const res = await fetch(`${API_BASE}?${sp.toString()}`, {
                credentials: "include",
              });
              if (res.status === 401) {
                window.location.href =
                  "/login?redirect=" + encodeURIComponent("/console/knowledge");
                return { data: [], success: false, total: 0 };
              }
              if (!res.ok) {
                message.error(await parseApiError(res));
                return { data: [], success: false, total: 0 };
              }
              const data = (await res.json()) as { items: KnowledgeBaseListItem[] };
              return { data: data.items ?? [], success: true, total: data.items?.length ?? 0 };
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
              新建知识库
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
                <div className="mb-3 text-white/55">暂无知识库，请先创建。</div>
              </div>
            ),
          }}
        />
      </div>

      <Modal
        title={modalMode === "create" ? "新建知识库" : "编辑知识库"}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => void submitModal()}
        okText="保存"
        okButtonProps={{ ghost: true }}
        cancelText="取消"
        confirmLoading={submitting}
        width={760}
        maskClosable={false}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label="名称"
            rules={[
              { required: true, message: "请输入名称" },
              { max: KNOWLEDGE_BASE_NAME_MAX_LENGTH, message: `最多 ${KNOWLEDGE_BASE_NAME_MAX_LENGTH} 字` },
            ]}
          >
            <Input placeholder="知识库名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
            rules={[{ max: KNOWLEDGE_BASE_DESCRIPTION_MAX_LENGTH, message: `最多 ${KNOWLEDGE_BASE_DESCRIPTION_MAX_LENGTH} 字` }]}
          >
            <Input.TextArea placeholder="用于意图识别与选择展示（可选）" rows={3} showCount maxLength={KNOWLEDGE_BASE_DESCRIPTION_MAX_LENGTH} />
          </Form.Item>

          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="输入后回车添加" style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="contentFormat"
            label="内容格式"
            rules={[{ required: true, message: "请选择内容格式" }]}
          >
            <Select
              options={[
                { label: "Markdown", value: "markdown" },
                { label: "普通文本", value: "plain" },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="content"
            label="正文内容"
            rules={[
              { required: true, message: "请输入正文内容" },
              { max: KNOWLEDGE_BASE_CONTENT_MAX_LENGTH, message: `最多 ${KNOWLEDGE_BASE_CONTENT_MAX_LENGTH} 字符` },
            ]}
          >
            <Input.TextArea
              rows={10}
              showCount
              maxLength={KNOWLEDGE_BASE_CONTENT_MAX_LENGTH}
              placeholder="直接文本输入（本期仅支持该方式）"
            />
          </Form.Item>

          <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-white/60">
            文件上传（PDF/TXT/MD）即将支持，本期暂不可用。
          </div>
        </Form>
      </Modal>

      <Drawer
        title="知识库详情"
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetail(null);
        }}
        width={860}
        destroyOnClose
      >
        {detailLoading || !detail ? (
          <div className="text-white/55">加载中…</div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-lg font-medium text-white/90">{detail.name}</div>
              <Space>
                <Button icon={<EditOutlined />} onClick={() => void openEdit(detail)}>
                  编辑
                </Button>
                <Button onClick={() => void retryVectorization()} disabled={detail.vectorStatus === "pending"}>
                  重试向量化
                </Button>
                <Button
                  type="primary"
                  ghost
                  onClick={() => openChunkTest(detail)}
                  disabled={detail.vectorStatus !== "success"}
                >
                  检索效果测试
                </Button>
              </Space>
            </div>

            <Descriptions
              size="small"
              column={2}
              items={[
                { key: "format", label: "格式", children: detail.contentFormat },
                { key: "status", label: "向量化", children: vectorStatusTag(detail.vectorStatus) },
                { key: "updatedAt", label: "更新时间", children: dayjs(detail.updatedAt).format("YYYY-MM-DD HH:mm") },
                {
                  key: "vectorUpdatedAt",
                  label: "向量完成时间",
                  children: detail.vectorUpdatedAt ? dayjs(detail.vectorUpdatedAt).format("YYYY-MM-DD HH:mm") : "—",
                },
              ]}
            />

            {detail.vectorStatus === "failed" && detail.vectorError ? (
              <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                失败原因：{detail.vectorError}
              </div>
            ) : null}
            {detail.vectorStatus === "pending" ? (
              <div className="mt-3 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-white/60">
                向量化进行中…完成后即可进行检索效果测试。页面将自动刷新状态。
              </div>
            ) : null}

            <div className="mt-4">
              <div className="mb-2 text-sm text-white/70">正文</div>
              {detail.contentFormat === "markdown" ? (
                <div className="overflow-auto rounded-md border border-white/10 bg-black/20 p-3 text-sm">
                  <MarkdownRenderer body={detail.content} variant="console" />
                </div>
              ) : (
                <pre className="overflow-auto rounded-md border border-white/10 bg-black/20 p-3 text-xs text-white/80">
                  {detail.content}
                </pre>
              )}
            </div>

          </>
        )}
      </Drawer>

      <Drawer
        title={chunkTestTarget ? `检索效果测试 - ${chunkTestTarget.name}` : "检索效果测试"}
        open={chunkTestOpen}
        onClose={closeChunkTest}
        width={760}
        destroyOnClose
      >
        <div className="mb-3 text-sm text-white/60">
          输入一段文本作为 query，返回按相关度排序的命中片段（展示顺序、片段序号、相关度）。
        </div>
        <div className="mb-2">
          <Input.TextArea
            rows={3}
            value={chunkTestQuery}
            onChange={(e) => setChunkTestQuery(e.target.value)}
            placeholder="例如：我们的退款规则是什么？"
          />
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <InputNumber
            style={{ width: 120 }}
            value={chunkTestTopK}
            min={1}
            max={20}
            precision={0}
            step={1}
            onChange={(v) => setChunkTestTopK(typeof v === "number" ? v : 3)}
            placeholder="topK"
          />
          <InputNumber
            style={{ width: 140 }}
            value={chunkTestThreshold}
            min={0}
            max={1}
            precision={3}
            step={0.05}
            onChange={(v) =>
              setChunkTestThreshold(typeof v === "number" ? v : 0.75)
            }
            placeholder="阈值 0~1"
          />
          <Button type="primary" ghost loading={chunkTesting} onClick={() => void runChunkTest()}>
            开始测试
          </Button>
          <Button onClick={resetChunkTest}>重置</Button>
        </div>

        <div className="mb-3 text-sm text-white/55">
          命中 {chunkTestItems.length} 条（topK={chunkTestTopK}，阈值={chunkTestThreshold}）
        </div>

        {chunkTestItems.length === 0 ? (
          <div className="rounded-md border border-white/10 bg-white/5 p-4 text-white/55">
            暂无结果。你可以尝试换一种问法，或降低阈值后再试。
          </div>
        ) : (
          <div className="space-y-3">
            {chunkTestItems.map((it) => (
              <div
                key={`${it.rank}-${it.chunkIndex}`}
                className="rounded-md border border-white/10 bg-white/5 p-3"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                  <Tag color="blue">#{it.rank}</Tag>
                  <span className="text-white/70">片段序号={it.chunkIndex}</span>
                  <span className="text-white/70">相关度={it.score}</span>
                  <Button
                    size="small"
                    className="ml-auto"
                    onClick={() => void copyChunk(it.chunkContent)}
                  >
                    复制
                  </Button>
                </div>
                <pre className="whitespace-pre-wrap text-xs text-white/80">
                  {it.chunkPreview}
                </pre>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </PageContainer>
  );
}
