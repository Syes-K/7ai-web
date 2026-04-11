# 前端实现说明：对话页（0.0.6 · 阶段 4）

## 代码位置

| 项 | 路径 |
| --- | --- |
| 页面入口 | `src/app/chat/page.tsx` |
| 布局（仅鉴权） | `src/app/chat/layout.tsx` |
| 主界面（客户端，纯 Tailwind） | `src/components/chat/ChatWorkspace.tsx` |
| API 封装（含 SSE 解析） | `src/components/chat/chat-api.ts` |

## 与设计对齐

- **桌面（≥lg）**：左侧约 300px 会话列表 + 主区；顶栏为赛博风自定义导航（非 antd）。
- **移动端**：顶栏「历史」打开侧层；「新建」「清空」同栏。
- **新建 / 选中态**：列表项高亮 + 左侧内阴影条；新建后切到新会话并清空主区消息。
- **清空**：`window.confirm` 二次确认，成功后本地草稿删除并刷新列表。
- **草稿**：按 `conversationId` 保存在组件 state（`drafts`），切换会话恢复；清空后删除对应 key。

## API 对接

- **流式发送**：`POST .../messages`，`{ stream: true }`，解析 SSE：`user_message` / `assistant_delta` / `assistant_done` / `error`。
- 消息列表：单次请求 `limit=100`；更长会话仅展示最近一批。
- 401：跳转登录页并带 `redirect=/chat`。

## 偏差与假设

- **前台 UI**：对话页**不使用** antd / antd-pro，仅用 **Tailwind** + 原生控件；视觉为**赛博科技黑**（深色底、青/品红霓虹描边与微光）。
- **管理端**仍可使用 antd-pro（`/admin` 等），与对话页无关。

## 文档变更

| 日期 | 说明 |
| --- | --- |
| 2026-04-11 | 首版：会话列表、消息气泡、新建/切换/清空、响应式 Drawer。 |
| 2026-04-11 | 改版：Tailwind 赛博主题 + SSE 流式输出；移除对话页 antd。 |
