# 前端实现记录：对话摘要配置（迭代 0.1.4）

## 1. 页面

- 路由：`/admin/config`
- 文件：`src/app/admin/config/page.tsx`
- 形态：`PageContainer` + `Card`「对话摘要」

## 2. 能力

- 从 `GET /api/admin/config/conversation-summary` 加载合并配置与 `fileState`
- `fileState === invalid_json` 时展示顶部 `Alert`
- 表单字段：
  - `enabled`（Select 真/假）
  - `maxChars`
  - `mode`：`tokens | messages`
  - `tokens` 模式：`summaryTriggerTokens`、`summaryKeepTokens`
  - `messages` 模式：`summaryTriggerMessages`、`summaryKeepMessages`
  - 通用保底：`summaryMinRecentMessages`（摘要后最少保留最近原文消息条数）
- 保存：`PUT /api/admin/config/conversation-summary`
- 「恢复默认」：回填 `DEFAULT_CONVERSATION_SUMMARY_CONFIG`
- 页尾文案：引导到 `/admin/prompts` 编辑 `contextSummarySystem` / `summarySystemPrefix`

## 3. 与 PRD 对齐

- 不在聊天 UI 展示摘要全文（PRD 7.3）；本页仅管理系统级 JSON 配置。

## 4. 变更记录

| 日期 | 说明 |
| --- | --- |
| 2026-04-14 | 初稿：配置管理页对话摘要 Card 与 API 对接说明。 |
