"use client";

import {
  CodeOutlined,
  DeleteOutlined,
  FileMarkdownOutlined,
  FileOutlined,
  FolderOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  App,
  Alert,
  Badge,
  Breadcrumb,
  Button,
  Collapse,
  Drawer,
  Grid,
  Input,
  Modal,
  Popconfirm,
  Result,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Tooltip,
  Tree,
} from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SKILL_CONFIG_DESCRIPTION_MAX_LENGTH,
  SKILL_CONFIG_NAME_MAX_LENGTH,
  SKILL_MD_MAX_BODY_LENGTH,
  SKILL_PACK_FILE_MAX_BYTES,
  SKILL_PACK_MAX_FILES,
  SKILL_PACK_MAX_TOTAL_BYTES,
  SKILL_PACK_SKILL_MD_PATH,
} from "@/common/constants";
import { redirectToLocaleLogin } from "@/common/utils/locale-login-redirect";
import { parseApiError } from "@/common/utils/parse-api-error";
import {
  buildPackFileTree,
  collectFilePaths,
  encodePackFilePath,
  isScriptPath,
  sortPackFilePaths,
  utf8ByteLength,
  type PackFileMeta,
  type PackTreeNode,
} from "../pack-utils";
import type { SkillPackListItem } from "./PackImportModal";


type DetailMode = "create" | "edit";

type Props = {
  open: boolean;
  mode: DetailMode;
  packId: string | null;
  initialHasScripts?: boolean;
  locale: string;
  consolePath: string;
  onClose: () => void;
  onSaved: () => void;
  onOpenScriptsHelp: () => void;
};

type DirtyMap = Record<string, string>;

function fileApiBase(packId: string, relPath?: string): string {
  const base = `/api/console/skill-configs/${packId}/files`;
  if (!relPath) return base;
  return `${base}/${encodePackFilePath(relPath)}`;
}

export default function PackDetailDrawer({
  open,
  mode,
  packId,
  initialHasScripts,
  locale,
  consolePath,
  onClose,
  onSaved,
  onOpenScriptsHelp,
}: Props) {
  const t = useTranslations("page.console.skills");
  const tShell = useTranslations("page.console.shell");
  const { message, modal } = App.useApp();
  const screens = Grid.useBreakpoint();
  const isWide = screens.md !== false;

  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);

  const [meta, setMeta] = useState<SkillPackListItem | null>(null);
  const [files, setFiles] = useState<PackFileMeta[]>([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [selectedPath, setSelectedPath] = useState<string | null>(SKILL_PACK_SKILL_MD_PATH);
  const [editorContent, setEditorContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [dirtyMap, setDirtyMap] = useState<DirtyMap>({});

  const [nameDraft, setNameDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const [enabledDraft, setEnabledDraft] = useState(true);
  const [alwaysLoadDraft, setAlwaysLoadDraft] = useState(false);
  const [alwaysLoadSaving, setAlwaysLoadSaving] = useState(false);

  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renamePath, setRenamePath] = useState("");

  const hasScripts = useMemo(
    () => Boolean(meta?.hasScripts ?? initialHasScripts ?? files.some((f) => isScriptPath(f.path))),
    [files, initialHasScripts, meta?.hasScripts],
  );

  const treeData = useMemo(() => buildPackFileTree(files.map((f) => f.path)), [files]);

  const dirtyPaths = useMemo(() => Object.keys(dirtyMap), [dirtyMap]);
  const currentDirty = selectedPath != null && dirtyMap[selectedPath] !== undefined;
  const currentBytes = utf8ByteLength(editorContent);

  const loadFiles = useCallback(
    async (id: string) => {
      const res = await fetch(fileApiBase(id), { credentials: "include" });
      if (res.status === 401) {
        redirectToLocaleLogin(locale, consolePath);
        return null;
      }
      if (!res.ok) {
        message.error(await parseApiError(res, { t: tShell }));
        return null;
      }
      const data = (await res.json()) as {
        files: PackFileMeta[];
        totalBytes: number;
      };
      setFiles(data.files ?? []);
      setTotalBytes(data.totalBytes ?? 0);
      return data;
    },
    [consolePath, locale, message, tShell],
  );

  const loadPackMeta = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/console/skill-configs/${id}`, { credentials: "include" });
      if (res.status === 401) {
        redirectToLocaleLogin(locale, consolePath);
        return null;
      }
      if (!res.ok) {
        message.error(await parseApiError(res, { t: tShell }));
        return null;
      }
      const data = (await res.json()) as { item: SkillPackListItem };
      return data.item;
    },
    [consolePath, locale, message, tShell],
  );

  const loadFileContent = useCallback(
    async (id: string, path: string) => {
      setFileLoading(true);
      setFileError(false);
      try {
        const res = await fetch(fileApiBase(id, path), { credentials: "include" });
        if (res.status === 401) {
          redirectToLocaleLogin(locale, consolePath);
          return;
        }
        if (!res.ok) {
          setFileError(true);
          message.error(await parseApiError(res, { t: tShell }));
          return;
        }
        const data = (await res.json()) as { content: string };
        const content = data.content ?? "";
        setEditorContent(content);
        setSavedContent(content);
      } catch {
        setFileError(true);
        message.error(tShell("errors.networkRetry"));
      } finally {
        setFileLoading(false);
      }
    },
    [consolePath, locale, message, tShell],
  );

  const initDrawer = useCallback(async () => {
    if (!packId) return;
    setLoading(true);
    setDirtyMap({});
    try {
      const [item, fileData] = await Promise.all([loadPackMeta(packId), loadFiles(packId)]);
      if (item) {
        setMeta(item);
        setNameDraft(item.name);
        setDescDraft(item.description ?? "");
        setEnabledDraft(item.enabled);
        setAlwaysLoadDraft(item.alwaysLoad ?? false);
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

  const confirmDiscard = useCallback(
    (next: () => void) => {
      if (dirtyPaths.length === 0) {
        next();
        return;
      }
      modal.confirm({
        title: t("drawer.unsaved.title"),
        content: t("drawer.unsaved.description"),
        okText: t("modal.cancel"),
        cancelText: t("drawer.saveFile"),
        onOk: next,
      });
    },
    [dirtyPaths.length, modal, t],
  );

  const selectFile = useCallback(
    (path: string) => {
      if (path === selectedPath) return;
      confirmDiscard(() => {
        if (!packId) return;
        setSelectedPath(path);
        if (dirtyMap[path] !== undefined) {
          setEditorContent(dirtyMap[path]!);
          setSavedContent(dirtyMap[path]!);
          setFileError(false);
          setFileLoading(false);
        } else {
          void loadFileContent(packId, path);
        }
      });
    },
    [confirmDiscard, dirtyMap, loadFileContent, packId, selectedPath],
  );

  const updateEditor = useCallback(
    (value: string) => {
      setEditorContent(value);
      if (selectedPath) {
        setDirtyMap((prev) => {
          if (value === savedContent) {
            const next = { ...prev };
            delete next[selectedPath];
            return next;
          }
          return { ...prev, [selectedPath]: value };
        });
      }
    },
    [savedContent, selectedPath],
  );

  const saveCurrentFile = useCallback(async () => {
    if (!packId || !selectedPath) return;
    if (currentBytes > SKILL_PACK_FILE_MAX_BYTES) {
      message.error(t("form.skillMd.extra", { max: SKILL_MD_MAX_BODY_LENGTH }));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(fileApiBase(packId, selectedPath), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ content: editorContent }),
      });
      if (res.status === 401) {
        redirectToLocaleLogin(locale, consolePath);
        return;
      }
      if (!res.ok) {
        message.error(await parseApiError(res, { t: tShell }));
        return;
      }
      const data = (await res.json()) as { item?: SkillPackListItem };
      setSavedContent(editorContent);
      setDirtyMap((prev) => {
        const next = { ...prev };
        delete next[selectedPath];
        return next;
      });
      if (data.item) {
        setMeta(data.item);
        setNameDraft(data.item.name);
        setDescDraft(data.item.description ?? "");
        setAlwaysLoadDraft(data.item.alwaysLoad ?? false);
        if (selectedPath === SKILL_PACK_SKILL_MD_PATH) {
          message.success(t("toast.syncedFromFrontmatter"));
        }
      }
      await loadFiles(packId);
      onSaved();
    } finally {
      setSaving(false);
    }
  }, [
    consolePath,
    currentBytes,
    editorContent,
    loadFiles,
    locale,
    message,
    onSaved,
    packId,
    selectedPath,
    t,
    tShell,
  ]);

  const saveAllFiles = useCallback(async () => {
    if (!packId) return;
    const entries = Object.entries(dirtyMap);
    if (entries.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(fileApiBase(packId), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          files: entries.map(([path, content]) => ({ path, content })),
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
      const data = (await res.json()) as { item?: SkillPackListItem };
      setDirtyMap({});
      setSavedContent(editorContent);
      if (data.item) {
        setMeta(data.item);
        setNameDraft(data.item.name);
        setDescDraft(data.item.description ?? "");
        setAlwaysLoadDraft(data.item.alwaysLoad ?? false);
      }
      await loadFiles(packId);
      message.success(t("toast.saved"));
      onSaved();
    } finally {
      setSaving(false);
    }
  }, [consolePath, dirtyMap, editorContent, loadFiles, locale, message, onSaved, packId, t, tShell]);

  const handleAlwaysLoadChange = useCallback(
    async (checked: boolean) => {
      if (!packId) return;
      setAlwaysLoadSaving(true);
      const prev = alwaysLoadDraft;
      setAlwaysLoadDraft(checked);
      try {
        const res = await fetch(`/api/console/skill-configs/${packId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ alwaysLoad: checked }),
        });
        if (res.status === 401) {
          redirectToLocaleLogin(locale, consolePath);
          setAlwaysLoadDraft(prev);
          return;
        }
        if (!res.ok) {
          message.error(await parseApiError(res, { t: tShell }));
          setAlwaysLoadDraft(prev);
          return;
        }
        const data = (await res.json()) as { item: SkillPackListItem };
        setMeta(data.item);
        setAlwaysLoadDraft(data.item.alwaysLoad ?? checked);
        message.success(t("toast.alwaysLoadUpdated"));
        onSaved();
      } catch {
        message.error(tShell("errors.networkRetry"));
        setAlwaysLoadDraft(prev);
      } finally {
        setAlwaysLoadSaving(false);
      }
    },
    [
      alwaysLoadDraft,
      consolePath,
      locale,
      message,
      onSaved,
      packId,
      t,
      tShell,
    ],
  );

  const saveMeta = useCallback(async () => {
    if (!packId) return;
    setSavingMeta(true);
    try {
      const res = await fetch(`/api/console/skill-configs/${packId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          name: nameDraft.trim(),
          description: descDraft.trim() || null,
          enabled: enabledDraft,
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
      setMeta(data.item);
      message.success(t("toast.saved"));
      onSaved();
    } finally {
      setSavingMeta(false);
    }
  }, [consolePath, descDraft, enabledDraft, locale, message, nameDraft, onSaved, packId, t, tShell]);

  const handleCreateFile = useCallback(async () => {
    if (!packId) return;
    const path = newFilePath.trim().replace(/\\/g, "/").replace(/^\/+/, "");
    if (!path || path.includes("..")) {
      message.error(t("form.name.rules.required"));
      return;
    }
    if (files.length >= SKILL_PACK_MAX_FILES) {
      message.error(t("import.skippedFiles", { count: SKILL_PACK_MAX_FILES }));
      return;
    }
    setNewFileOpen(false);
    setNewFilePath("");
    const res = await fetch(fileApiBase(packId, path), {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ content: "" }),
    });
    if (!res.ok) {
      message.error(await parseApiError(res, { t: tShell }));
      return;
    }
    await loadFiles(packId);
    selectFile(path);
    onSaved();
  }, [files.length, loadFiles, message, newFilePath, onSaved, packId, selectFile, t, tShell]);

  const handleRename = useCallback(async () => {
    if (!packId || !selectedPath) return;
    const newPath = renamePath.trim().replace(/\\/g, "/").replace(/^\/+/, "");
    if (!newPath || newPath.includes("..")) return;
    setRenameOpen(false);
    const res = await fetch(fileApiBase(packId, selectedPath), {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ newPath }),
    });
    if (!res.ok) {
      message.error(await parseApiError(res, { t: tShell }));
      return;
    }
    await loadFiles(packId);
    setSelectedPath(newPath);
    setDirtyMap((prev) => {
      const next = { ...prev };
      if (next[selectedPath] !== undefined) {
        next[newPath] = next[selectedPath]!;
        delete next[selectedPath];
      }
      return next;
    });
    onSaved();
  }, [loadFiles, message, onSaved, packId, renamePath, selectedPath, tShell]);

  const handleDeleteFile = useCallback(async () => {
    if (!packId || !selectedPath) return;
    if (selectedPath === SKILL_PACK_SKILL_MD_PATH) {
      message.warning(t("fileTree.skillMdRequired"));
      return;
    }
    const res = await fetch(fileApiBase(packId, selectedPath), {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      message.error(await parseApiError(res, { t: tShell }));
      return;
    }
    await loadFiles(packId);
    const remaining = files.filter((f) => f.path !== selectedPath).map((f) => f.path);
    const next = sortPackFilePaths(remaining)[0] ?? SKILL_PACK_SKILL_MD_PATH;
    setSelectedPath(next);
    void loadFileContent(packId, next);
    onSaved();
  }, [files, loadFileContent, loadFiles, message, onSaved, packId, selectedPath, t, tShell]);

  const handleClose = useCallback(() => {
    confirmDiscard(() => {
      setMeta(null);
      setFiles([]);
      setDirtyMap({});
      onClose();
    });
  }, [confirmDiscard, onClose]);

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

  const drawerTitle = mode === "create" ? t("drawer.create.title") : t("drawer.edit.title");

  return (
    <>
      <Drawer
        title={drawerTitle}
        placement="right"
        width="min(1200px, 92vw)"
        open={open}
        onClose={handleClose}
        destroyOnClose
        extra={
          <Space>
            <Tooltip title={t("form.alwaysLoad.extra")}>
              <Space size={4}>
                <span className="text-sm text-white/70">{t("form.alwaysLoad.label")}</span>
                <Switch
                  checked={alwaysLoadDraft}
                  loading={alwaysLoadSaving}
                  onChange={(checked) => void handleAlwaysLoadChange(checked)}
                />
              </Space>
            </Tooltip>
            <Switch
              checked={enabledDraft}
              onChange={setEnabledDraft}
              checkedChildren={t("tag.enabled")}
              unCheckedChildren={t("tag.disabled")}
            />
            <Button type="primary" ghost loading={savingMeta} onClick={() => void saveMeta()}>
              {t("modal.ok.save")}
            </Button>
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

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder={t("form.name.label")}
              maxLength={SKILL_CONFIG_NAME_MAX_LENGTH}
              className="max-w-xs"
            />
            <span className="text-xs text-white/45">
              {totalBytes.toLocaleString()} / {SKILL_PACK_MAX_TOTAL_BYTES.toLocaleString()} B
            </span>
          </div>

          <div className={`flex gap-3 ${isWide ? "flex-row" : "flex-col"}`}>
            <div className={isWide ? "w-[28%] min-w-[180px]" : "w-full"}>
              {isWide ? (
                <>
                  <Space className="mb-2">
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setNewFilePath("");
                        setNewFileOpen(true);
                      }}
                    >
                      {t("fileTree.newFile")}
                    </Button>
                    {selectedPath ? (
                      <>
                        <Button
                          size="small"
                          onClick={() => {
                            setRenamePath(selectedPath);
                            setRenameOpen(true);
                          }}
                        >
                          {t("fileTree.rename")}
                        </Button>
                        <Popconfirm
                          title={t("fileTree.delete")}
                          onConfirm={() => void handleDeleteFile()}
                          disabled={selectedPath === SKILL_PACK_SKILL_MD_PATH}
                        >
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            disabled={selectedPath === SKILL_PACK_SKILL_MD_PATH}
                          />
                        </Popconfirm>
                      </>
                    ) : null}
                  </Space>
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
                </>
              ) : (
                <Select
                  className="w-full"
                  value={selectedPath ?? undefined}
                  options={fileSelectOptions}
                  onChange={(v) => selectFile(v)}
                  placeholder={t("fileTree.newFile")}
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Breadcrumb
                  items={[{ title: selectedPath ?? "—" }]}
                  className="text-xs text-white/60"
                />
                {currentDirty ? <Tag color="orange">*</Tag> : null}
              </div>

              {fileError ? (
                <Result
                  status="error"
                  title={t("toast.loadFailed")}
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
                  <Input.TextArea
                    rows={20}
                    className="font-mono text-sm"
                    value={editorContent}
                    onChange={(e) => updateEditor(e.target.value)}
                    showCount={{
                      formatter: () =>
                        `${currentBytes.toLocaleString()} / ${SKILL_PACK_FILE_MAX_BYTES.toLocaleString()} B`,
                    }}
                  />
                  {selectedPath === SKILL_PACK_SKILL_MD_PATH ? (
                    <div className="mt-1 text-xs text-white/45">
                      {t("form.skillMd.extra", { max: SKILL_MD_MAX_BODY_LENGTH })}
                    </div>
                  ) : null}
                </Spin>
              )}

              <div className="mt-3 flex w-full justify-end gap-2">
                <Button type="primary" ghost loading={saving} onClick={() => void saveCurrentFile()}>
                  {t("drawer.saveFile")}
                </Button>
                <Button
                  type="primary"
                  ghost
                  loading={saving}
                  disabled={dirtyPaths.length === 0}
                  onClick={() => void saveAllFiles()}
                >
                  {t("drawer.saveAll")}
                  {dirtyPaths.length > 0 ? ` (${dirtyPaths.length})` : ""}
                </Button>
              </div>
            </div>
          </div>

          <Collapse
            className="mt-4"
            items={[
              {
                key: "meta",
                label: t("form.description.label"),
                children: (
                  <div className="space-y-3">
                    <Input.TextArea
                      rows={2}
                      value={descDraft}
                      onChange={(e) => setDescDraft(e.target.value)}
                      maxLength={SKILL_CONFIG_DESCRIPTION_MAX_LENGTH}
                      placeholder={t("form.description.placeholder")}
                    />
                    <div className="flex w-full justify-end">
                      <Button type="primary" ghost loading={savingMeta} onClick={() => void saveMeta()}>
                        {t("modal.ok.save")}
                      </Button>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </Spin>
      </Drawer>

      <Modal
        title={t("fileTree.newFile")}
        open={newFileOpen}
        onCancel={() => setNewFileOpen(false)}
        onOk={() => void handleCreateFile()}
        okButtonProps={{ ghost: true, type: "primary" }}
        cancelText={t("modal.cancel")}
        okText={t("modal.ok.create")}
      >
        <Input
          placeholder="reference.md"
          value={newFilePath}
          onChange={(e) => setNewFilePath(e.target.value)}
        />
      </Modal>

      <Modal
        title={t("fileTree.rename")}
        open={renameOpen}
        onCancel={() => setRenameOpen(false)}
        onOk={() => void handleRename()}
        okButtonProps={{ ghost: true, type: "primary" }}
        cancelText={t("modal.cancel")}
        okText={t("modal.ok.save")}
      >
        <Input value={renamePath} onChange={(e) => setRenamePath(e.target.value)} />
      </Modal>
    </>
  );
}
