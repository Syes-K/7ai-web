import {
  ApiOutlined,
  BookOutlined,
  BulbOutlined,
  CloudServerOutlined,
  RobotOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { MenuDataItem } from "@ant-design/pro-components";

/** 侧栏菜单项：path 不含 locale（由 next-intl Link 自动加前缀），文案由 page.console.shell.menu 提供 */
export function getConsoleMenuRoutes(t: (key: string) => string): MenuDataItem[] {
  const base = "/console";
  return [
    {
      path: `${base}/profile`,
      name: t("menu.profile"),
      key: "profile",
      icon: <UserOutlined />,
    },
    {
      path: `${base}/models`,
      name: t("menu.models"),
      key: "models",
      icon: <ApiOutlined />,
    },
    {
      path: `${base}/assistants`,
      name: t("menu.assistants"),
      key: "assistants",
      icon: <RobotOutlined />,
    },
    {
      path: `${base}/knowledge`,
      name: t("menu.knowledge"),
      key: "knowledge",
      icon: <BookOutlined />,
    },
    {
      path: `${base}/mcp`,
      name: t("menu.mcp"),
      key: "mcp",
      icon: <CloudServerOutlined />,
    },
    {
      path: `${base}/skills`,
      name: t("menu.skills"),
      key: "skills",
      icon: <BulbOutlined />,
    },
  ];
}
