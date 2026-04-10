import type { ThemeConfig } from "antd";
import { theme } from "antd";

/** 管理后台深色 token，与设计 spec §5 对齐 */
export const adminTheme: ThemeConfig = {
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
