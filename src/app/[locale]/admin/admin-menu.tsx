import {
  AppstoreOutlined,
  CloudServerOutlined,
  CommentOutlined,
  FileSearchOutlined,
  RobotOutlined,
  SettingOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { MenuDataItem } from "@ant-design/pro-components";

/** 管理后台侧栏：path 不含 locale（next-intl Link 自动加前缀） */
export function getAdminMenuRoutes(t: (key: string) => string): MenuDataItem[] {
  const base = "/admin";
  return [
    {
      path: `${base}/config`,
      name: t("menu.config"),
      key: "config",
      icon: <SettingOutlined />,
    },
    {
      path: `${base}/users`,
      name: t("menu.users"),
      key: "users",
      icon: <TeamOutlined />,
    },
    {
      path: `${base}/models`,
      name: t("menu.models"),
      key: "models",
      icon: <CloudServerOutlined />,
    },
    {
      path: `${base}/skills`,
      name: t("menu.skills"),
      key: "skills",
      icon: <AppstoreOutlined />,
    },
    {
      path: `${base}/prompts`,
      name: t("menu.prompts"),
      key: "prompts",
      icon: <CommentOutlined />,
    },
    {
      path: `${base}/logs`,
      name: t("menu.logs"),
      key: "logs",
      icon: <FileSearchOutlined />,
    },
    {
      path: `${base}/assistants`,
      name: t("menu.assistants"),
      key: "assistants",
      icon: <RobotOutlined />,
    },
  ];
}
