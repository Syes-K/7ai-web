import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import type { ProColumns } from "@ant-design/pro-components";
import { Button, Popconfirm, Tag, Tooltip } from "antd";
import dayjs from "dayjs";
import type { AssistantListItem } from "@/common/types";
import {
  TABLE_ACTION_BTN_CLASS,
  TableRowActions,
} from "@/components/ui/table-row-actions";

type AssistantsT = (key: string, values?: Record<string, string | number>) => string;

export type AdminAssistantColumnsCtx = {
  deletingId: string | null;
  handleDelete: (row: AssistantListItem) => Promise<void>;
  openEdit: (row: AssistantListItem) => void;
};

/** 系统助手 ProTable 列 factory */
export function getAdminAssistantColumns(
  t: AssistantsT,
  ctx: AdminAssistantColumnsCtx,
): ProColumns<AssistantListItem>[] {
  const { deletingId, handleDelete, openEdit } = ctx;

  return [
    {
      title: t("columns.type"),
      dataIndex: "scope",
      width: 88,
      render: () => <Tag color="gold">{t("tag.system")}</Tag>,
    },
    {
      title: t("columns.icon"),
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
      title: t("columns.name"),
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
      title: t("columns.tags"),
      dataIndex: "tags",
      width: 200,
      render: (_, row) =>
        row.tags.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {row.tags.map((tag) => (
              <Tag key={tag} className="m-0">
                {tag}
              </Tag>
            ))}
          </span>
        ) : (
          <span className="text-white/35">—</span>
        ),
    },
    {
      title: t("columns.openingMessage"),
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
      width: 140,
      fixed: "right",
      render: (_, row) => {
        const busy = deletingId === row.id;
        return (
          <TableRowActions>
            <Button
              type="link"
              size="small"
              className={TABLE_ACTION_BTN_CLASS}
              icon={<EditOutlined />}
              onClick={() => openEdit(row)}
            >
              {t("actions.edit")}
            </Button>
            <Popconfirm
              title={t("confirm.delete.title")}
              description={t("confirm.delete.description", { name: row.name })}
              okText={t("confirm.delete.ok")}
              cancelText={t("modal.cancel")}
              okButtonProps={{ danger: true, loading: busy }}
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
                {t("actions.delete")}
              </Button>
            </Popconfirm>
          </TableRowActions>
        );
      },
    },
  ];
}
