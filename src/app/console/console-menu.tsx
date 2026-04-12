import {
  ApiOutlined,
  BookOutlined,
  RobotOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { MenuDataItem } from "@ant-design/pro-components";

export const consoleMenuRoutes: MenuDataItem[] = [
  {
    path: "/console/profile",
    name: "个人信息",
    key: "profile",
    icon: <UserOutlined />,
  },
  {
    path: "/console/settings",
    name: "用户配置",
    key: "settings",
    icon: <SettingOutlined />,
  },
  {
    path: "/console/models",
    name: "模型管理",
    key: "models",
    icon: <ApiOutlined />,
  },
  {
    path: "/console/assistants",
    name: "助手管理",
    key: "assistants",
    icon: <RobotOutlined />,
  },
  {
    path: "/console/knowledge",
    name: "知识库管理",
    key: "knowledge",
    icon: <BookOutlined />,
  },
];
