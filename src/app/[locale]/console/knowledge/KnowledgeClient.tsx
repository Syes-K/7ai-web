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
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KNOWLEDGE_BASE_CONTENT_MAX_LENGTH,
  KNOWLEDGE_BASE_DESCRIPTION_MAX_LENGTH,
  KNOWLEDGE_BASE_NAME_MAX_LENGTH,
} from "@/common/constants";
import { redirectToLocaleLogin } from "@/common/utils/locale-login-redirect";
import { parseApiError } from "@/common/utils/parse-api-error";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { Link } from "@/i18n/navigation";

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

type ModalMode = "create" | "edit";

type KnowledgeT = ReturnType<typeof useTranslations<"page.console.knowledge">>;

/** 向量化状态 Tag（文案来自 messages） */
function vectorStatusTag(
  status: KnowledgeBaseListItem["vectorStatus"],
  t: KnowledgeT,
) {
  if (status === "success") return <Tag color="green">{t("tag.vectorSuccess")}</Tag>;
  if (status === "failed") return <Tag color="red">{t("tag.vectorFailed")}</Tag>;
  return <Tag color="processing">{t("tag.vectorPending")}</Tag>;
}

type KnowledgeColumnsCtx = {
  deletingId: string | null;
  chunkTestDisabledReason: (status: KnowledgeBaseListItem["vectorStatus"]) => string | null;
  openDetail: (row: KnowledgeBaseListItem) => void | Promise<void>;
  openEdit: (row: KnowledgeBaseListItem) => void | Promise<void>;
  openChunkTest: (target: ChunkTestTarget) => void;
  handleDelete: (row: KnowledgeBaseListItem) => void | Promise<void>;
};

function getKnowledgeColumns(
  t: KnowledgeT,
  ctx: KnowledgeColumnsCtx,
): ProColumns<KnowledgeBaseListItem>[] {
  const {
    deletingId,
    chunkTestDisabledReason,
    openDetail,
    openEdit,
    openChunkTest,
    handleDelete,
  } = ctx;
  return [
    {
      title: t("columns.name"),
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
      title: t("columns.format"),
      dataIndex: "contentFormat",
      width: 88,
      render: (_, row) =>
        row.contentFormat === "markdown" ? (
          <Tag color="blue">Markdown</Tag>
        ) : (
          <Tag color="default">{t("tag.plainText")}</Tag>
        ),
    },
    {
      title: t("columns.tags"),
      dataIndex: "tags",
      width: 200,
      render: (_, row) =>
        row.tags.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {row.tags.slice(0, 6).map((tag) => (
              <Tag key={tag} className="m-0">
                {tag}
              </Tag>
            ))}
            {row.tags.length > 6 ? <Tag className="m-0">+{row.tags.length - 6}</Tag> : null}
          </span>
        ) : (
          <span className="text-white/35">—</span>
        ),
    },
    {
      title: t("columns.vectorStatus"),
      dataIndex: "vectorStatus",
      width: 120,
      render: (_, row) => vectorStatusTag(row.vectorStatus, t),
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
              {t("columns.view")}
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
                  {t("columns.chunkTest")}
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
                {t("columns.chunkTest")}
              </Button>
            )}
            <Button
              type="link"
              size="small"
              className="px-0"
              icon={<EditOutlined />}
              onClick={() => void openEdit(row)}
            >
              {t("columns.edit")}
            </Button>
            <Popconfirm
              title={t("confirm.delete.title")}
              description={
                <div className="max-w-[280px] text-white/80">
                  <div>{t("confirm.delete.description", { name: row.name })}</div>
                  <div className="mt-1.5 text-xs leading-relaxed text-white/55">
                    {t("confirm.delete.hint")}
                  </div>
                </div>
              }
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
                className="px-0"
                icon={<DeleteOutlined />}
                loading={busy}
              >
                {t("columns.delete")}
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];
}

export default function KnowledgeClient() {
  const locale = useLocale();
  const t = useTranslations("page.console.knowledge");
  const tShell = useTranslations("page.console.shell");
  const consolePath = `/${locale}/console/knowledge`;

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
        // 忽略：使用本地默认值
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
      try {
        const res = await fetch(`${API_BASE}/${row.id}`, { credentials: "include" });
        if (res.status === 401) {
          redirectToLocaleLogin(locale, consolePath);
          return;
        }
        if (!res.ok) {
          message.error(await parseApiError(res, { t: tShell }));
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
        message.error(tShell("errors.networkRetry"));
        closeModal();
      }
    },
    [closeModal, consolePath, form, locale, message, tShell],
  );

  const openDetail = useCallback(
    async (row: KnowledgeBaseListItem) => {
      setDetailOpen(true);
      setDetailLoading(true);
      setDetail(null);
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
        const data = (await res.json()) as { item: KnowledgeBaseDetail };
        setDetail(data.item);
      } catch {
        message.error(tShell("errors.networkRetry"));
      } finally {
        setDetailLoading(false);
      }
    },
    [consolePath, locale, message, tShell],
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
      // 忽略轮询错误
    }
  }, [detail]);

  useEffect(() => {
    if (!detailOpen || !detail) return;
    if (detail.vectorStatus !== "pending") return;
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
        redirectToLocaleLogin(locale, consolePath);
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res, { t: tShell }));
        return;
      }
      message.success(t("toast.retryTriggered"));
      await openDetail(detail);
    } catch {
      message.error(tShell("errors.networkRetry"));
    }
  }, [consolePath, detail, locale, message, openDetail, t, tShell]);

  const chunkTestDisabledReason = useCallback(
    (status: KnowledgeBaseListItem["vectorStatus"]) => {
      if (status === "pending") return t("chunkTest.status.pending");
      if (status === "failed") return t("chunkTest.status.failed");
      return null;
    },
    [t],
  );

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
      message.success(t("toast.saved"));
      closeModal();
      await actionRef.current?.reload?.();
    } finally {
      setSubmitting(false);
    }
  }, [closeModal, consolePath, editing, form, locale, message, modalMode, t, tShell]);

  const runChunkTest = useCallback(async () => {
    if (!chunkTestTarget) {
      message.warning(t("chunkTest.warn.selectKb"));
      return;
    }
    if (chunkTestTarget.vectorStatus !== "success") {
      message.warning(t("chunkTest.warn.notReady"));
      return;
    }
    const q = chunkTestQuery.trim();
    if (!q) {
      message.error(t("chunkTest.warn.enterQuery"));
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
        redirectToLocaleLogin(locale, consolePath);
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res, { t: tShell }));
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
      message.error(tShell("errors.networkRetry"));
    } finally {
      setChunkTesting(false);
    }
  }, [
    chunkTestQuery,
    chunkTestTarget,
    chunkTestThreshold,
    chunkTestTopK,
    consolePath,
    locale,
    message,
    t,
    tShell,
  ]);

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
          redirectToLocaleLogin(locale, consolePath);
          return;
        }
        if (!res.ok) {
          message.error(await parseApiError(res, { t: tShell }));
          return;
        }
        message.success(t("toast.deleted"));
        if (detail?.id === row.id) {
          setDetailOpen(false);
          setDetail(null);
          closeChunkTest();
        } else if (chunkTestTarget?.id === row.id) {
          closeChunkTest();
        }
        await actionRef.current?.reload?.();
      } catch {
        message.error(tShell("errors.networkRetry"));
      } finally {
        setDeletingId(null);
      }
    },
    [chunkTestTarget?.id, closeChunkTest, consolePath, detail?.id, locale, message, t, tShell],
  );

  const resetChunkTest = useCallback(() => {
    setChunkTestQuery("");
    setChunkTestItems([]);
  }, []);

  const copyChunk = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        message.success(t("toast.copied"));
      } catch {
        message.error(t("toast.copyFailed"));
      }
    },
    [message, t],
  );

  const columns = useMemo(
    () =>
      getKnowledgeColumns(t, {
        deletingId,
        chunkTestDisabledReason,
        openDetail,
        openEdit,
        openChunkTest,
        handleDelete,
      }),
    [
      chunkTestDisabledReason,
      deletingId,
      handleDelete,
      openChunkTest,
      openDetail,
      openEdit,
      t,
    ],
  );

  return (
    <PageContainer ghost title={t("title")}>
      <div className="max-w-[1400px]">
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
                redirectToLocaleLogin(locale, consolePath);
                return { data: [], success: false, total: 0 };
              }
              if (!res.ok) {
                message.error(await parseApiError(res, { t: tShell }));
                return { data: [], success: false, total: 0 };
              }
              const data = (await res.json()) as { items: KnowledgeBaseListItem[] };
              return { data: data.items ?? [], success: true, total: data.items?.length ?? 0 };
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
                <div className="mb-3 text-white/55">{t("empty.noData")}</div>
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
          <div className="flex w-full justify-end gap-2">
            <Button onClick={closeModal}>{t("modal.cancel")}</Button>
            <Button type="primary" ghost loading={submitting} onClick={() => void submitModal()}>
              {t("modal.save")}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label={t("form.name.label")}
            rules={[
              { required: true, message: t("form.name.rules.required") },
              {
                max: KNOWLEDGE_BASE_NAME_MAX_LENGTH,
                message: t("form.name.rules.max", { max: KNOWLEDGE_BASE_NAME_MAX_LENGTH }),
              },
            ]}
          >
            <Input placeholder={t("form.name.placeholder")} />
          </Form.Item>

          <Form.Item
            name="description"
            label={t("form.description.label")}
            rules={[
              {
                max: KNOWLEDGE_BASE_DESCRIPTION_MAX_LENGTH,
                message: t("form.description.rules.max", {
                  max: KNOWLEDGE_BASE_DESCRIPTION_MAX_LENGTH,
                }),
              },
            ]}
          >
            <Input.TextArea
              placeholder={t("form.description.placeholder")}
              rows={3}
              showCount
              maxLength={KNOWLEDGE_BASE_DESCRIPTION_MAX_LENGTH}
            />
          </Form.Item>

          <Form.Item name="tags" label={t("form.tags.label")}>
            <Select mode="tags" placeholder={t("form.tags.placeholder")} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="contentFormat"
            label={t("form.contentFormat.label")}
            rules={[{ required: true, message: t("form.contentFormat.rules.required") }]}
          >
            <Select
              options={[
                { label: "Markdown", value: "markdown" },
                { label: t("form.contentFormat.plain"), value: "plain" },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="content"
            label={t("form.content.label")}
            rules={[
              { required: true, message: t("form.content.rules.required") },
              {
                max: KNOWLEDGE_BASE_CONTENT_MAX_LENGTH,
                message: t("form.content.rules.max", { max: KNOWLEDGE_BASE_CONTENT_MAX_LENGTH }),
              },
            ]}
          >
            <Input.TextArea
              rows={10}
              showCount
              maxLength={KNOWLEDGE_BASE_CONTENT_MAX_LENGTH}
              placeholder={t("form.content.placeholder")}
            />
          </Form.Item>

          <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-white/60">
            {t("form.uploadNotice")}
          </div>
        </Form>
      </Modal>

      <Drawer
        title={t("detail.title")}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetail(null);
        }}
        width={860}
        destroyOnClose
      >
        {detailLoading || !detail ? (
          <div className="text-white/55">{t("detail.loading")}</div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-lg font-medium text-white/90">{detail.name}</div>
              <Space>
                <Link href={`/knowledge/${detail.id}`}>
                  <Button type="link" className="px-0">
                    {t("detail.previewLink")}
                  </Button>
                </Link>
                <Button icon={<EditOutlined />} onClick={() => void openEdit(detail)}>
                  {t("detail.edit")}
                </Button>
                <Button
                  onClick={() => void retryVectorization()}
                  disabled={detail.vectorStatus === "pending"}
                >
                  {t("detail.retryVector")}
                </Button>
                <Button
                  type="primary"
                  ghost
                  onClick={() => openChunkTest(detail)}
                  disabled={detail.vectorStatus !== "success"}
                >
                  {t("detail.chunkTest")}
                </Button>
              </Space>
            </div>

            <Descriptions
              size="small"
              column={2}
              items={[
                { key: "format", label: t("detail.format"), children: detail.contentFormat },
                {
                  key: "status",
                  label: t("detail.vectorStatus"),
                  children: vectorStatusTag(detail.vectorStatus, t),
                },
                {
                  key: "updatedAt",
                  label: t("detail.updatedAt"),
                  children: dayjs(detail.updatedAt).format("YYYY-MM-DD HH:mm"),
                },
                {
                  key: "vectorUpdatedAt",
                  label: t("detail.vectorCompletedAt"),
                  children: detail.vectorUpdatedAt
                    ? dayjs(detail.vectorUpdatedAt).format("YYYY-MM-DD HH:mm")
                    : "—",
                },
              ]}
            />

            {detail.vectorStatus === "failed" && detail.vectorError ? (
              <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {t("detail.failureReason", { error: detail.vectorError })}
              </div>
            ) : null}
            {detail.vectorStatus === "pending" ? (
              <div className="mt-3 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-white/60">
                {t("detail.vectorPendingHint")}
              </div>
            ) : null}

            <div className="mt-4">
              <div className="mb-2 text-sm text-white/70">{t("detail.body")}</div>
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
        title={
          chunkTestTarget
            ? t("chunkTest.titleWithName", { name: chunkTestTarget.name })
            : t("chunkTest.title")
        }
        open={chunkTestOpen}
        onClose={closeChunkTest}
        width={760}
        destroyOnClose
      >
        <div className="mb-3 text-sm text-white/60">{t("chunkTest.intro")}</div>
        <div className="mb-2">
          <Input.TextArea
            rows={3}
            value={chunkTestQuery}
            onChange={(e) => setChunkTestQuery(e.target.value)}
            placeholder={t("chunkTest.query.placeholder")}
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
            onChange={(v) => setChunkTestThreshold(typeof v === "number" ? v : 0.75)}
            placeholder={t("chunkTest.threshold.placeholder")}
          />
          <Button type="primary" ghost loading={chunkTesting} onClick={() => void runChunkTest()}>
            {t("chunkTest.run")}
          </Button>
          <Button onClick={resetChunkTest}>{t("chunkTest.reset")}</Button>
        </div>

        <div className="mb-3 text-sm text-white/55">
          {t("chunkTest.hits", {
            count: chunkTestItems.length,
            topK: chunkTestTopK,
            threshold: chunkTestThreshold,
          })}
        </div>

        {chunkTestItems.length === 0 ? (
          <div className="rounded-md border border-white/10 bg-white/5 p-4 text-white/55">
            {t("chunkTest.noResults")}
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
                  <span className="text-white/70">
                    {t("chunkTest.chunkIndex", { index: it.chunkIndex })}
                  </span>
                  <span className="text-white/70">{t("chunkTest.score", { score: it.score })}</span>
                  <Button
                    size="small"
                    className="ml-auto"
                    onClick={() => void copyChunk(it.chunkContent)}
                  >
                    {t("chunkTest.copy")}
                  </Button>
                </div>
                <pre className="whitespace-pre-wrap text-xs text-white/80">{it.chunkPreview}</pre>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </PageContainer>
  );
}
