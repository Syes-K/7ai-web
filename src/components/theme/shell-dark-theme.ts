import type { ThemeConfig } from "antd";
import { theme } from "antd";

/**
 * 控制台 / 管理后台共用的 ProLayout 深色主题（antd token），与产品深色壳设计一致。
 */
export const shellDarkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorBgLayout: "#0a0a0f",
    colorBgContainer: "#14141c",
    colorBgElevated: "#1a1a24",
    colorBorder: "#2a2a36",
    colorBorderSecondary: "#22222e",
    colorText: "rgba(255, 255, 255, 0.88)",
    colorTextSecondary: "rgba(255, 255, 255, 0.65)",
    colorTextTertiary: "rgba(255, 255, 255, 0.45)",
    colorPrimary: "#22d3ee",
  },
  components: {
    Layout: {
      siderBg: "#14141c",
      headerBg: "#1a1a24",
      bodyBg: "#0a0a0f",
    },
    Menu: {
      darkItemBg: "#14141c",
      darkSubMenuItemBg: "#14141c",
    },
  },
};
