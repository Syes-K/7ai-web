import {
  ApiOutlined,
  BookOutlined,
  CloudServerOutlined,
  RobotOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { MenuDataItem } from "@ant-design/pro-components";

export const consoleMenuRoutes: MenuDataItem[] = [
  {
    path: "/console/profile",
    name: "账号与偏好",
    key: "profile",
    icon: <UserOutlined />,
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
  {
    path: "/console/mcp",
    name: "MCP 管理",
    key: "mcp",
    icon: <CloudServerOutlined />,
  },
];
