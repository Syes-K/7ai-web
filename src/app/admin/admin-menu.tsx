import {
  CloudServerOutlined,
  CommentOutlined,
  FileSearchOutlined,
  RobotOutlined,
  SettingOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { MenuDataItem } from "@ant-design/pro-components";

export const adminMenuRoutes: MenuDataItem[] = [
  {
    path: "/admin/config",
    name: "配置管理",
    key: "config",
    icon: <SettingOutlined />,
  },
  {
    path: "/admin/users",
    name: "用户管理",
    key: "users",
    icon: <TeamOutlined />,
  },
  {
    path: "/admin/models",
    name: "模型管理",
    key: "models",
    icon: <CloudServerOutlined />,
  },
  {
    path: "/admin/prompts",
    name: "提示词模版",
    key: "prompts",
    icon: <CommentOutlined />,
  },
  {
    path: "/admin/logs",
    name: "日志查询",
    key: "logs",
    icon: <FileSearchOutlined />,
  },
  {
    path: "/admin/assistants",
    name: "系统助手管理",
    key: "assistants",
    icon: <RobotOutlined />,
  },
];
