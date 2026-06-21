"use client";

import { ImportOutlined, ReloadOutlined } from "@ant-design/icons";
import type { ActionType } from "@ant-design/pro-components";
import { PageContainer, ProTable } from "@ant-design/pro-components";
import { App, Alert, Button, Drawer, Input, Modal, Space } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  CONSOLE_MODEL_LIST_DEFAULT_PAGE_SIZE,
  SKILL_SCRIPT_MAX_RUNS_PER_TURN,
  SKILL_SCRIPT_MAX_RUNS_PER_USER_DAY,
} from "@/common/constants";
import { ErrorCode } from "@/common/enums";
import { parseApiError } from "@/common/utils/parse-api-error";
import { readApiErrorPayload } from "@/components/auth/map-api-errors";
import { Link } from "@/i18n/navigation";
import { handleAdminApiAuthStatus } from "../admin-api-guards";
import { getAdminSkillColumns } from "./admin-skill-columns";
import PackDetailDrawer from "./components/PackDetailDrawer";
import PackImportModal, { type ImportMode, type SkillPackListItem } from "./components/PackImportModal";

const API_BASE = "/api/admin/skill-configs";

/** 管理后台：系统技能包导入与管理（只读详情，无在线编辑） */
export default function SkillsAdminClient() {
  const locale = useLocale();
  const t = useTranslations("page.admin.skills");
  const tShell = useTranslations("page.admin.shell");
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType>(null);

  const [keyword, setKeyword] = useState("");
  const [keywordDraft, setKeywordDraft] = useState("");
  const [toolbarLoading, setToolbarLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>("create");
  const [importPackId, setImportPackId] = useState<string | undefined>();
  const [importPackName, setImportPackName] = useState<string | undefined>();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPackId, setDrawerPackId] = useState<string | null>(null);
  const [drawerHasScripts, setDrawerHasScripts] = useState(false);
  const [drawerPackName, setDrawerPackName] = useState<string | null>(null);

  const [scriptsHelpOpen, setScriptsHelpOpen] = useState(false);

  const returnPath = `/${locale}/admin/skills`;

  const refreshToolbar = useCallback(() => {
    setToolbarLoading(true);
    void actionRef.current?.reload?.().finally(() => setToolbarLoading(false));
  }, []);

  const applyKeywordSearch = useCallback(() => {
    setKeyword(keywordDraft.trim());
    void actionRef.current?.reload?.();
  }, [keywordDraft]);

  const openDetail = useCallback((item: SkillPackListItem) => {
    setDetailLoadingId(item.id);
    setDrawerPackId(item.id);
    setDrawerPackName(item.name);
    setDrawerHasScripts(item.hasScripts);
    setDrawerOpen(true);
    setDetailLoadingId(null);
  }, []);

  const openCreateImport = useCallback(() => {
    setImportMode("create");
    setImportPackId(undefined);
    setImportPackName(undefined);
    setImportOpen(true);
  }, []);

  const openReimport = useCallback((row: SkillPackListItem) => {
    setImportMode("overwrite");
    setImportPackId(row.id);
    setImportPackName(row.name);
    setImportOpen(true);
  }, []);

  const assistantsLinkRich = useCallback(
    () => <Link href="/admin/assistants">{t("link.assistants")}</Link>,
    [t],
  );

  const handleDelete = useCallback(
    async (row: SkillPackListItem) => {
      setDeletingId(row.id);
      try {
        const res = await fetch(`${API_BASE}/${row.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (handleAdminApiAuthStatus(res.status, locale, returnPath)) {
          return;
        }
        if (res.status === 409) {
          const err = await readApiErrorPayload(res);
          if (err.code === ErrorCode.SKILL_CONFIG_REFERENCED_BY_ASSISTANT) {
            const refs = (err as { referencedAssistants?: Array<{ id: string; name: string }> })
              .referencedAssistants;
            const names = Array.isArray(refs) ? refs.map((a) => a.name).join(", ") : "";
            modal.error({
              title: t("deleteBlocked.title"),
              content: (
                <div>
                  <p>{err.message}</p>
                  <p className="mt-2">
                    {t.rich("deleteBlocked.body", {
                      names,
                      assistantsLink: assistantsLinkRich,
                    })}
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
        if (drawerPackId === row.id) {
          setDrawerOpen(false);
          setDrawerPackId(null);
        }
        await actionRef.current?.reload?.();
      } catch {
        message.error(tShell("errors.networkRetry"));
      } finally {
        setDeletingId(null);
      }
    },
    [assistantsLinkRich, drawerPackId, locale, message, modal, returnPath, t, tShell],
  );

  const columns = useMemo(
    () =>
      getAdminSkillColumns(t, {
        deletingId,
        detailLoadingId,
        openDetail,
        openReimport,
        handleDelete,
      }),
    [deletingId, detailLoadingId, handleDelete, openDetail, openReimport, t],
  );

  return (
    <PageContainer ghost title={t("title")}>
      <div className="max-w-[1400px]">
        <Alert
          type="info"
          showIcon
          closable
          className="mb-4"
          message={t("alert.productScope.message")}
          description={
            <span>
              {t("alert.productScope.description")}{" "}
              <Button type="link" size="small" className="px-0" onClick={() => setScriptsHelpOpen(true)}>
                {t("help.scripts.title")}
              </Button>
            </span>
          }
        />

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

        <ProTable<SkillPackListItem>
          actionRef={actionRef}
          rowKey="id"
          search={false}
          options={false}
          columns={columns}
          scroll={{ x: 1100 }}
          pagination={{
            defaultPageSize: CONSOLE_MODEL_LIST_DEFAULT_PAGE_SIZE,
            showSizeChanger: true,
            showTotal: (count) => t("pagination.total", { count }),
            pageSizeOptions: [10, 20, 50, 100],
          }}
          request={async (params) => {
            const current = params.current ?? 1;
            const pageSize = params.pageSize ?? CONSOLE_MODEL_LIST_DEFAULT_PAGE_SIZE;
            const sp = new URLSearchParams({
              page: String(current),
              pageSize: String(pageSize),
            });
            if (keyword.trim()) sp.set("keyword", keyword.trim());
            try {
              const res = await fetch(`${API_BASE}?${sp.toString()}`, {
                credentials: "include",
              });
              if (handleAdminApiAuthStatus(res.status, locale, returnPath)) {
                return { data: [], success: false, total: 0 };
              }
              if (!res.ok) {
                message.error(await parseApiError(res, { t: tShell }));
                return { data: [], success: false, total: 0 };
              }
              const data = (await res.json()) as {
                items: SkillPackListItem[];
                total: number;
              };
              return {
                data: data.items ?? [],
                success: true,
                total: data.total ?? 0,
              };
            } catch {
              message.error(tShell("errors.networkRetry"));
              return { data: [], success: false, total: 0 };
            }
          }}
          toolBarRender={() => [
            <Button
              key="import"
              type="primary"
              ghost
              icon={<ImportOutlined />}
              onClick={openCreateImport}
            >
              {t("toolbar.import")}
            </Button>,
            <Button key="reload" icon={<ReloadOutlined />} loading={toolbarLoading} onClick={refreshToolbar}>
              {t("toolbar.refresh")}
            </Button>,
          ]}
          locale={{
            emptyText: (
              <div className="py-8 text-center">
                <Space direction="vertical" size="middle">
                  <div className="text-white/55">{t("empty.noPacks")}</div>
                  <Button type="primary" ghost onClick={openCreateImport}>
                    {t("toolbar.import")}
                  </Button>
                  <div className="text-xs text-white/40">{t("empty.importHint")}</div>
                </Space>
              </div>
            ),
          }}
        />
      </div>

      <PackImportModal
        open={importOpen}
        mode={importMode}
        packId={importPackId}
        packName={importPackName}
        onClose={() => setImportOpen(false)}
        onImported={(item) => {
          void actionRef.current?.reload?.();
          if (importMode === "overwrite" && drawerPackId === item.id) {
            setDrawerHasScripts(item.hasScripts);
            setDrawerPackName(item.name);
          }
          openDetail(item);
        }}
      />

      <PackDetailDrawer
        open={drawerOpen}
        packId={drawerPackId}
        initialHasScripts={drawerHasScripts}
        locale={locale}
        adminPath={returnPath}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerPackId(null);
          setDrawerPackName(null);
        }}
        onReimport={() => {
          if (drawerPackId && drawerPackName) {
            openReimport({
              id: drawerPackId,
              name: drawerPackName,
              description: null,
              enabled: true,
              fileCount: 0,
              hasScripts: drawerHasScripts,
              createdAt: "",
              updatedAt: "",
            });
          }
        }}
        onOpenScriptsHelp={() => setScriptsHelpOpen(true)}
      />

      <Drawer
        title={t("help.scripts.title")}
        open={scriptsHelpOpen}
        onClose={() => setScriptsHelpOpen(false)}
        width={480}
      >
        <p className="text-sm text-white/80">
          {t("help.scripts.body", {
            perTurn: SKILL_SCRIPT_MAX_RUNS_PER_TURN,
            perDay: SKILL_SCRIPT_MAX_RUNS_PER_USER_DAY,
          })}
        </p>
      </Drawer>
    </PageContainer>
  );
}
