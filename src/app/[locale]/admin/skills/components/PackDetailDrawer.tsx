"use client";

import {
  CodeOutlined,
  FileMarkdownOutlined,
  FileOutlined,
  FolderOutlined,
  ImportOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import {
  App,
  Alert,
  Badge,
  Breadcrumb,
  Button,
  Descriptions,
  Drawer,
  Grid,
  Result,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Tree,
  Typography,
} from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SKILL_PACK_SKILL_MD_PATH } from "@/common/constants";
import { parseApiError } from "@/common/utils/parse-api-error";
import { handleAdminApiAuthStatus } from "@/app/[locale]/admin/admin-api-guards";
import {
  buildPackFileTree,
  collectFilePaths,
  encodePackFilePath,
  isScriptPath,
  sortPackFilePaths,
  type PackFileMeta,
  type PackTreeNode,
} from "../pack-utils";
import type { SkillPackListItem } from "./PackImportModal";

type Props = {
  open: boolean;
  packId: string | null;
  initialHasScripts?: boolean;
  locale: string;
  adminPath: string;
  onClose: () => void;
  onReimport: () => void;
  onOpenScriptsHelp: () => void;
};

function fileApiBase(packId: string, relPath?: string): string {
  const base = `/api/admin/skill-configs/${packId}/files`;
  if (!relPath) return base;
  return `${base}/${encodePackFilePath(relPath)}`;
}

/** 只读技能包详情：元数据 + 文件树预览，无保存/编辑 */
export default function PackDetailDrawer({
  open,
  packId,
  initialHasScripts,
  locale,
  adminPath,
  onClose,
  onReimport,
  onOpenScriptsHelp,
}: Props) {
  const t = useTranslations("page.admin.skills");
  const tShell = useTranslations("page.admin.shell");
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const isWide = screens.md !== false;

  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState(false);
  const [truncated, setTruncated] = useState(false);

  const [meta, setMeta] = useState<SkillPackListItem | null>(null);
  const [files, setFiles] = useState<PackFileMeta[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(SKILL_PACK_SKILL_MD_PATH);
  const [previewContent, setPreviewContent] = useState("");

  const hasScripts = useMemo(
    () => Boolean(meta?.hasScripts ?? initialHasScripts ?? files.some((f) => isScriptPath(f.path))),
    [files, initialHasScripts, meta?.hasScripts],
  );

  const treeData = useMemo(() => buildPackFileTree(files.map((f) => f.path)), [files]);

  const loadFiles = useCallback(
    async (id: string) => {
      const res = await fetch(fileApiBase(id), { credentials: "include" });
      if (handleAdminApiAuthStatus(res.status, locale, adminPath)) {
        return null;
      }
      if (!res.ok) {
        message.error(await parseApiError(res, { t: tShell }));
        return null;
      }
      const data = (await res.json()) as { files: PackFileMeta[] };
      setFiles(data.files ?? []);
      return data;
    },
    [adminPath, locale, message, tShell],
  );

  const loadPackMeta = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/admin/skill-configs/${id}`, { credentials: "include" });
      if (handleAdminApiAuthStatus(res.status, locale, adminPath)) {
        return null;
      }
      if (!res.ok) {
        message.error(await parseApiError(res, { t: tShell }));
        return null;
      }
      const data = (await res.json()) as { item: SkillPackListItem };
      return data.item;
    },
    [adminPath, locale, message, tShell],
  );

  const loadFileContent = useCallback(
    async (id: string, path: string) => {
      setFileLoading(true);
      setFileError(false);
      setTruncated(false);
      try {
        const res = await fetch(fileApiBase(id, path), { credentials: "include" });
        if (handleAdminApiAuthStatus(res.status, locale, adminPath)) {
          return;
        }
        if (!res.ok) {
          setFileError(true);
          message.error(await parseApiError(res, { t: tShell }));
          return;
        }
        const data = (await res.json()) as { content: string; truncated?: boolean };
        setPreviewContent(data.content ?? "");
        setTruncated(Boolean(data.truncated));
      } catch {
        setFileError(true);
        message.error(tShell("errors.networkRetry"));
      } finally {
        setFileLoading(false);
      }
    },
    [adminPath, locale, message, tShell],
  );

  const initDrawer = useCallback(async () => {
    if (!packId) return;
    setLoading(true);
    try {
      const [item, fileData] = await Promise.all([loadPackMeta(packId), loadFiles(packId)]);
      if (item) {
        setMeta(item);
      }
      const paths = sortPackFilePaths((fileData?.files ?? []).map((f) => f.path));
      const first = paths.includes(SKILL_PACK_SKILL_MD_PATH)
        ? SKILL_PACK_SKILL_MD_PATH
        : (paths[0] ?? SKILL_PACK_SKILL_MD_PATH);
      setSelectedPath(first);
      await loadFileContent(packId, first);
    } finally {
      setLoading(false);
    }
  }, [loadFileContent, loadFiles, loadPackMeta, packId]);

  useEffect(() => {
    if (open && packId) void initDrawer();
  }, [open, packId, initDrawer]);

  const selectFile = useCallback(
    (path: string) => {
      if (path === selectedPath || !packId) return;
      setSelectedPath(path);
      void loadFileContent(packId, path);
    },
    [loadFileContent, packId, selectedPath],
  );

  const handleClose = useCallback(() => {
    setMeta(null);
    setFiles([]);
    setPreviewContent("");
    onClose();
  }, [onClose]);

  const renderTreeTitle = useCallback(
    (node: PackTreeNode) => {
      const path = node.path ?? String(node.key);
      const isSkillMd = path === SKILL_PACK_SKILL_MD_PATH;
      const isScript = isScriptPath(path);
      return (
        <span className="flex items-center gap-1">
          {isSkillMd ? (
            <FileMarkdownOutlined className="text-sky-400" />
          ) : isScript ? (
            <CodeOutlined className="text-amber-400/90" />
          ) : node.isFolder ? (
            <FolderOutlined />
          ) : (
            <FileOutlined />
          )}
          <span>{node.title as string}</span>
          {isSkillMd ? <span className="text-red-400">*</span> : null}
          {isScript && !node.isFolder ? (
            <Tooltip title={t("fileTree.scriptRunnableTooltip")}>
              <Badge count={t("fileTree.scriptRunnable")} style={{ backgroundColor: "#389e0d" }} />
            </Tooltip>
          ) : null}
        </span>
      );
    },
    [t],
  );

  const fileSelectOptions = useMemo(
    () =>
      sortPackFilePaths(collectFilePaths(treeData)).map((p) => ({
        label: p,
        value: p,
      })),
    [treeData],
  );

  const drawerTitle = meta?.name ?? t("drawer.title");

  return (
    <Drawer
      title={drawerTitle}
      placement="right"
      width="min(1200px, 92vw)"
      open={open}
      onClose={handleClose}
      destroyOnClose
      extra={
        <Space>
          <Button icon={<ImportOutlined />} onClick={onReimport}>
            {t("columns.reimport")}
          </Button>
          <Button type="text" icon={<QuestionCircleOutlined />} onClick={onOpenScriptsHelp} />
        </Space>
      }
    >
      <Spin spinning={loading}>
        {hasScripts ? (
          <Alert
            type="warning"
            showIcon
            closable
            className="mb-3"
            message={t("alert.scriptsSandbox.message")}
            description={
              <span>
                {t("alert.scriptsSandbox.description")}{" "}
                <Button type="link" size="small" className="px-0" onClick={onOpenScriptsHelp}>
                  {t("help.scripts.title")}
                </Button>
              </span>
            }
          />
        ) : null}

        {meta ? (
          <>
            <Descriptions bordered size="small" column={isWide ? 2 : 1} className="mb-3">
              <Descriptions.Item label={t("packMeta.name")}>{meta.name}</Descriptions.Item>
              <Descriptions.Item label={t("packMeta.enabled")}>
                {meta.enabled ? (
                  <Tag color="green">{t("tag.enabled")}</Tag>
                ) : (
                  <Tag>{t("tag.disabled")}</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label={t("packMeta.alwaysLoad")}>
                {meta.alwaysLoad ? (
                  <Tag color="purple">{t("tag.alwaysLoad")}</Tag>
                ) : (
                  <span className="text-white/40">—</span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label={t("packMeta.updatedAt")}>
                {new Date(meta.updatedAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label={t("packMeta.description")} span={2}>
                {meta.description?.trim() || "—"}
              </Descriptions.Item>
            </Descriptions>
            <Typography.Text type="secondary" className="mb-3 block text-xs">
              {t("packMeta.readOnlyHint")}
            </Typography.Text>
          </>
        ) : null}

        {files.length === 0 && !loading ? (
          <div className="py-6 text-center text-white/50">{t("empty.noFiles")}</div>
        ) : (
          <div className={`flex gap-3 ${isWide ? "flex-row" : "flex-col"}`}>
            <div className={isWide ? "w-[28%] min-w-[180px]" : "w-full"}>
              {isWide ? (
                <Tree
                  treeData={treeData}
                  selectedKeys={selectedPath ? [selectedPath] : []}
                  onSelect={(keys) => {
                    const key = keys[0];
                    if (typeof key !== "string") return;
                    const asFile = files.find((f) => f.path === key);
                    if (asFile) {
                      selectFile(asFile.path);
                      return;
                    }
                    const nested = files.find((f) => f.path.startsWith(`${key}/`));
                    if (nested) selectFile(nested.path);
                  }}
                  titleRender={(node) => renderTreeTitle(node as PackTreeNode)}
                  blockNode
                  className="rounded border border-white/10 bg-black/20 p-2"
                />
              ) : (
                <Select
                  className="w-full"
                  value={selectedPath ?? undefined}
                  options={fileSelectOptions}
                  onChange={(v) => selectFile(v)}
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <Breadcrumb
                items={[{ title: selectedPath ?? "—" }]}
                className="mb-2 text-xs text-white/60"
              />

              {truncated ? (
                <Alert type="info" showIcon className="mb-2" message={t("preview.truncated")} />
              ) : null}

              {fileError ? (
                <Result
                  status="warning"
                  title={t("preview.loadError")}
                  extra={
                    <Button
                      type="primary"
                      ghost
                      onClick={() => packId && selectedPath && void loadFileContent(packId, selectedPath)}
                    >
                      {t("toolbar.refresh")}
                    </Button>
                  }
                />
              ) : (
                <Spin spinning={fileLoading}>
                  <pre className="max-h-[60vh] overflow-auto rounded border border-white/10 bg-black/30 p-3 font-mono text-sm text-white/85 whitespace-pre-wrap break-words">
                    {previewContent || (fileLoading ? "" : "—")}
                  </pre>
                </Spin>
              )}
            </div>
          </div>
        )}
      </Spin>
    </Drawer>
  );
}
