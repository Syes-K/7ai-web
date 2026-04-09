# 实现偏差与设计说明 - version 0.0.1

本文档记录**实现与设计逐页规范（`spec-placeholder-pages.md`）在命名或结构上的差异**，不涉及 PRD 固定标题与固定占位文案（上述文案与实现**一致**）。

## 1. 组件命名合并

| 设计建议 | 实现 | 说明 |
| --- | --- | --- |
| `ChatListShellPlaceholder` + `ChatInputShellPlaceholder` | `ChatShellPlaceholder` | 单文件内同时包含消息区与输入区静态骨架，满足 FR-004「静态输入区外观」与禁止真实收发。 |
| `StatCardPlaceholder` + `PanelShellPlaceholder` | `ConsoleShellPlaceholder` | 单组件内分「统计网格」与「配置区」两区块，满足 FR-005 静态模块框位。 |
| `PageHeaderPlaceholder` | `PageShell` 内嵌 `h1` | 标题区职责等价；SSR 三页统一用 `PageShell` 减少重复。 |
| `NoticePlaceholder` | `EmptyStateCard` | 均承载主占位说明文案，语义一致。 |

## 2. 顶部导航与「页面跳转」

- **spec-placeholder-pages.md §7** 列有「不实现页面跳转逻辑」（与按钮闭环、流程跳转同条语境）。
- **design-spec.md §2.2** 允许在头部保留**统一导航占位**，便于评审信息架构。
- **实现**：`NavPlaceholder` 使用 Next.js `Link` 在四页面间切换，**无鉴权、无守卫、无业务流程**，仅便于团队访问四路由。若产品要求连静态 `Link` 也移除，可在后续小版本仅保留文案导航或单页说明。

## 3. 文档标题（Metadata）

- **根布局** `src/app/layout.tsx` 中 `metadata.title` 为站点级 `7ai-web`，未为每页单独设置 `title`。
- 各页 **H1** 与 PRD 一致（首页/登录/对话/控制台）。若需浏览器标签与 H1 完全一致，可在后续为各 `page` 导出 `metadata` 或通过 `layout` 分段配置。

## 4. 控制台与 `"use client"`

- `ConsoleShellPlaceholder` 带 `"use client"`，原因：该组件仅在 **CSR 子树**（`ConsoleView`）中使用，与 `dynamic(..., { ssr: false })` 搭配；**未**引入状态管理或副作用业务逻辑。

---

**结论**：上述差异不改变 0.0.1 静态占位边界与验收口径；核心约束（无接口、无鉴权、无状态管理、无持久化）仍成立。
