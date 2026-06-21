import { DeleteOutlined, EyeOutlined, ImportOutlined } from "@ant-design/icons";
import type { ProColumns } from "@ant-design/pro-components";
import { Button, Popconfirm, Space, Tag, Tooltip } from "antd";
import dayjs from "dayjs";
import { TABLE_ACTION_BTN_CLASS, TableRowActions } from "@/components/ui/table-row-actions";
import type { SkillPackListItem } from "./components/PackImportModal";

type SkillsT = (key: string, values?: Record<string, string | number>) => string;

type SkillColumnsCtx = {
  deletingId: string | null;
  detailLoadingId: string | null;
  openDetail: (row: SkillPackListItem) => void | Promise<void>;
  openReimport: (row: SkillPackListItem) => void;
  handleDelete: (row: SkillPackListItem) => void | Promise<void>;
};

/** 管理后台技能包列表列定义 */
export function getAdminSkillColumns(
  t: SkillsT,
  ctx: SkillColumnsCtx,
): ProColumns<SkillPackListItem>[] {
  const { deletingId, detailLoadingId, openDetail, openReimport, handleDelete } = ctx;
  return [
    {
      title: t("columns.name"),
      dataIndex: "name",
      width: 180,
      ellipsis: true,
      render: (_, row) => (
        <Tooltip title={row.name}>
          <span className="text-white/90">{row.name}</span>
        </Tooltip>
      ),
    },
    {
      title: t("columns.description"),
      dataIndex: "description",
      width: 220,
      ellipsis: true,
      render: (_, row) => {
        const d = row.description?.trim();
        if (!d) return <span className="text-white/40">—</span>;
        const truncated = d.length > 80 ? `${d.slice(0, 80)}…` : d;
        return (
          <Tooltip title={d}>
            <span className="text-white/70">{truncated}</span>
          </Tooltip>
        );
      },
    },
    {
      title: t("columns.fileCount"),
      dataIndex: "fileCount",
      width: 88,
      render: (_, row) => (
        <span className={row.fileCount === 0 ? "text-orange-400" : "text-white/70"}>
          {row.fileCount}
        </span>
      ),
    },
    {
      title: t("columns.hasScripts"),
      dataIndex: "hasScripts",
      width: 100,
      render: (_, row) =>
        row.hasScripts ? (
          <Tooltip title={t("alert.scriptsSandbox.tooltip")}>
            <Tag color="gold">{t("tag.hasScripts")}</Tag>
          </Tooltip>
        ) : (
          <span className="text-white/35">—</span>
        ),
    },
    {
      title: t("columns.alwaysLoad"),
      dataIndex: "alwaysLoad",
      width: 100,
      render: (_, row) =>
        row.alwaysLoad ? (
          <Tag color="purple">{t("tag.alwaysLoad")}</Tag>
        ) : (
          <span className="text-white/35">—</span>
        ),
    },
    {
      title: t("columns.enabled"),
      dataIndex: "enabled",
      width: 88,
      render: (_, row) =>
        row.enabled ? (
          <Tag color="green">{t("tag.enabled")}</Tag>
        ) : (
          <Tag>{t("tag.disabled")}</Tag>
        ),
    },
    {
      title: t("columns.updatedAt"),
      dataIndex: "updatedAt",
      width: 160,
      render: (_, row) => (
        <span className="text-white/55">{dayjs(row.updatedAt).format("YYYY-MM-DD HH:mm")}</span>
      ),
    },
    {
      title: t("columns.actions"),
      valueType: "option",
      width: 220,
      fixed: "right",
      render: (_, row) => {
        const busy = deletingId === row.id;
        const loadingDetail = detailLoadingId === row.id;
        return (
          <TableRowActions>
            <Button
              type="link"
              size="small"
              className={TABLE_ACTION_BTN_CLASS}
              icon={<EyeOutlined />}
              loading={loadingDetail}
              onClick={() => void openDetail(row)}
            >
              {t("columns.detail")}
            </Button>
            <Button
              type="link"
              size="small"
              className={TABLE_ACTION_BTN_CLASS}
              icon={<ImportOutlined />}
              onClick={() => openReimport(row)}
            >
              {t("columns.reimport")}
            </Button>
            <Popconfirm
              title={t("confirm.delete.title")}
              description={t("confirm.delete.description")}
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
                className={TABLE_ACTION_BTN_CLASS}
                icon={<DeleteOutlined />}
                loading={busy}
              >
                {t("columns.delete")}
              </Button>
            </Popconfirm>
          </TableRowActions>
        );
      },
    },
  ];
}
