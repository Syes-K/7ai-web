"use client";

import { FolderOpenOutlined, InboxOutlined } from "@ant-design/icons";
import { App, Alert, Button, Modal, Progress, Table, Upload } from "antd";
import type { UploadProps } from "antd";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { ErrorCode } from "@/common/enums";
import { parseApiError } from "@/common/utils/parse-api-error";
import { readApiErrorPayload } from "@/components/auth/map-api-errors";

const API_IMPORT = "/api/admin/skill-configs/import";

export type SkillPackListItem = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  alwaysLoad?: boolean;
  fileCount: number;
  hasScripts: boolean;
  createdAt: string;
  updatedAt: string;
};

type SkippedFile = { path: string; reason: string };

type ImportSummary = {
  importedFileCount: number;
  skippedFileCount: number;
  skipped: SkippedFile[];
  totalBytes: number;
  hasScripts: boolean;
};

export type ImportMode = "create" | "overwrite";

type Props = {
  open: boolean;
  mode: ImportMode;
  packId?: string;
  packName?: string;
  onClose: () => void;
  onImported: (item: SkillPackListItem, summary: ImportSummary) => void;
};

/** 管理后台：新建或覆盖导入技能包 */
export default function PackImportModal({
  open,
  mode,
  packId,
  packName,
  onClose,
  onImported,
}: Props) {
  const t = useTranslations("page.admin.skills");
  const tShell = useTranslations("page.admin.shell");
  const { message, modal } = App.useApp();
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [skipped, setSkipped] = useState<SkippedFile[]>([]);

  const resetState = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setSkipped([]);
  }, []);

  const handleClose = useCallback(() => {
    if (uploading) return;
    resetState();
    onClose();
  }, [onClose, resetState, uploading]);

  const processResponse = useCallback(
    async (res: Response) => {
      if (!res.ok) {
        if (res.status === 409) {
          const err = await readApiErrorPayload(res);
          if (err.code === ErrorCode.SKILL_CONFIG_NAME_CONFLICT) {
            modal.error({ title: t("import.conflict"), content: err.message });
            return;
          }
        }
        message.error(await parseApiError(res, { t: tShell }));
        return;
      }
      const data = (await res.json()) as {
        item: SkillPackListItem;
        importSummary: ImportSummary;
      };
      message.success(t("toast.imported"));
      if (data.importSummary.skipped.length > 0) {
        setSkipped(data.importSummary.skipped);
        message.warning(t("import.skippedFiles", { count: data.importSummary.skippedFileCount }));
      } else {
        resetState();
        onClose();
      }
      onImported(data.item, data.importSummary);
    },
    [message, modal, onClose, onImported, resetState, t, tShell],
  );

  const uploadZip = useCallback(
    async (file: File) => {
      setUploading(true);
      setProgress(30);
      setSkipped([]);
      try {
        const formData = new FormData();
        formData.append("file", file);
        if (mode === "overwrite" && packId) {
          formData.append("packId", packId);
        }
        setProgress(60);
        const res = await fetch(API_IMPORT, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        setProgress(100);
        await processResponse(res);
      } catch {
        message.error(tShell("errors.networkRetry"));
      } finally {
        setUploading(false);
      }
    },
    [message, mode, packId, processResponse, tShell],
  );

  const uploadFolder = useCallback(
    async (files: FileList) => {
      if (files.length === 0) return;
      setUploading(true);
      setProgress(20);
      setSkipped([]);
      try {
        const formData = new FormData();
        for (const f of Array.from(files)) {
          const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
          formData.append("files", f, rel);
        }
        if (mode === "overwrite" && packId) {
          formData.append("packId", packId);
        }
        setProgress(60);
        const res = await fetch(API_IMPORT, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        setProgress(100);
        await processResponse(res);
      } catch {
        message.error(tShell("errors.networkRetry"));
      } finally {
        setUploading(false);
      }
    },
    [message, mode, packId, processResponse, tShell],
  );

  const uploadProps: UploadProps = {
    accept: ".zip",
    multiple: false,
    showUploadList: false,
    disabled: uploading,
    beforeUpload: (file) => {
      void uploadZip(file);
      return false;
    },
  };

  const title = mode === "overwrite" ? t("import.overwriteTitle") : t("import.title");

  return (
    <Modal
      title={title}
      open={open}
      onCancel={handleClose}
      width={520}
      maskClosable={!uploading}
      destroyOnClose
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button onClick={handleClose} disabled={uploading}>
            {t("modal.cancel")}
          </Button>
        </div>
      }
    >
      {mode === "overwrite" && packName ? (
        <Alert
          type="warning"
          showIcon
          className="mb-3"
          message={t("import.overwriteWarning", { name: packName })}
        />
      ) : null}

      <Upload.Dragger {...uploadProps} className="mb-3">
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="text-white/80">{t("import.dragHint")}</p>
      </Upload.Dragger>

      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is non-standard but widely supported
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files) void uploadFolder(files);
          e.target.value = "";
        }}
      />
      <Button
        type="link"
        icon={<FolderOpenOutlined />}
        disabled={uploading}
        onClick={() => folderInputRef.current?.click()}
        className="px-0"
      >
        {t("import.folderButton")}
      </Button>

      {uploading ? (
        <div className="mt-4">
          <Progress percent={progress} status="active" />
        </div>
      ) : null}

      {skipped.length > 0 ? (
        <Table
          className="mt-4"
          size="small"
          pagination={false}
          scroll={{ y: 200 }}
          rowKey="path"
          dataSource={skipped}
          columns={[
            { title: "path", dataIndex: "path", ellipsis: true },
            { title: "reason", dataIndex: "reason", width: 140, ellipsis: true },
          ]}
        />
      ) : null}
    </Modal>
  );
}
