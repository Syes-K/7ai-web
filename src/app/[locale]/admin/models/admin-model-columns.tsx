import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import type { ProColumns } from "@ant-design/pro-components";
import { Button, Popconfirm, Tag, Tooltip } from "antd";
import dayjs from "dayjs";
import type { ModelConfigListItem } from "@/common/types";
import { formatModelConfigTag } from "@/common/model-config/model-tag-ui";
import { getProviderTagProps } from "@/app/[locale]/console/models/model-provider-ui";
import {
  TABLE_ACTION_BTN_CLASS,
  TableRowActions,
} from "@/components/ui/table-row-actions";

type ModelsT = (key: string, values?: Record<string, string | number>) => string;

export type AdminModelColumnsCtx = {
  deletingId: string | null;
  handleDelete: (row: ModelConfigListItem) => Promise<void>;
  openEdit: (row: ModelConfigListItem) => void;
};

/** 公有模型 ProTable 列 factory */
export function getAdminModelColumns(
  t: ModelsT,
  ctx: AdminModelColumnsCtx,
): ProColumns<ModelConfigListItem>[] {
  const { deletingId, handleDelete, openEdit } = ctx;

  return [
    {
      title: t("columns.modelName"),
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
      title: t("columns.type"),
      dataIndex: "visibility",
      width: 80,
      render: () => <Tag color="gold">{t("tag.public")}</Tag>,
    },
    {
      title: t("columns.tags"),
      dataIndex: "tags",
      width: 220,
      render: (_, row) =>
        row.tags.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {row.tags.map((tag) => (
              <Tag key={tag} className="m-0">
                {formatModelConfigTag(tag, t)}
              </Tag>
            ))}
          </span>
        ) : (
          <span className="text-white/35">—</span>
        ),
    },
    {
      title: t("columns.provider"),
      dataIndex: "provider",
      width: 130,
      render: (_, row) => {
        const p = getProviderTagProps(t, row.provider);
        if (!p) {
          return <Tag color="default">{t("tag.dataError")}</Tag>;
        }
        return <Tag color={p.color}>{p.label}</Tag>;
      },
    },
    {
      title: t("columns.apiKey"),
      dataIndex: "apiKeyMasked",
      width: 220,
      render: (_, row) => (
        <span className="font-mono text-sm text-white/55">{row.apiKeyMasked}</span>
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
      width: 160,
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
              description={t("confirm.delete.description", { name: row.modelName })}
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
