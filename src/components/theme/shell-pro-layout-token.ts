/** ProLayout token：慢网 / CSS-in-JS 未就绪前与 shellDarkTheme 一致的静态深色兜底 */
export const shellProLayoutToken = {
  bgLayout: "#0a0a0f",
  header: {
    colorBgHeader: "#1a1a24",
    heightLayoutHeader: 56,
  },
  pageContainer: {
    colorBgPageContainer: "#0a0a0f",
    paddingBlockPageContainerContent: 24,
    paddingInlinePageContainerContent: 24,
  },
  sider: {
    colorMenuBackground: "#14141c",
    colorBgMenuItemSelected: "rgba(34, 211, 238, 0.12)",
    colorBgMenuItemHover: "rgba(255, 255, 255, 0.06)",
    colorTextMenu: "rgba(255, 255, 255, 0.65)",
    colorTextMenuSelected: "#22d3ee",
    colorTextMenuActive: "rgba(255, 255, 255, 0.88)",
  },
} as const;
