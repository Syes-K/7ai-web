# 迭代 0.1.4：多轮对话摘要

## 文档索引

| 阶段 | 路径 |
| --- | --- |
| 需求 | [`product/prd-conversation-summary.md`](./product/prd-conversation-summary.md) |
| 设计 | [`design/spec-conversation-summary.md`](./design/spec-conversation-summary.md) |
| 后端 API | [`backend/api-spec-conversation-summary.md`](./backend/api-spec-conversation-summary.md) |
| 数据模型 | [`backend/data-models.md`](./backend/data-models.md) |
| 实现计划（3A 预备） | [`backend/implementation-plan.md`](./backend/implementation-plan.md) |
| 后端实现记录 | [`backend/implementation-notes.md`](./backend/implementation-notes.md) |
| 前端实现记录 | [`frontend/implementation-notes.md`](./frontend/implementation-notes.md) |

## 实现要点（与代码一致）

- 摘要生成：**LangChain** `summarizationMiddleware`（`src/server/llm/assistant.ts`）
- 摘要模型识别：摘要子调用模型统一打 `summarization` tag（`src/server/llm/model.ts` + `src/server/chat/llm-runtime.ts`）
- 摘要落库：**callback** 捕获摘要子调用并写 `Conversation.contextSummary`（`src/server/llm/callback.ts`、`src/server/chat/assistant.ts`、消息路由）
- 会话 checkpoint：新增 `contextSummaryCutoffSortOrder`，记录摘要已覆盖到的最后 `sortOrder`
- 历史组装：有摘要时按「摘要 + cutoff 后增量消息（不足补齐 `summaryMinRecentMessages`）」构造输入，避免刷新后立刻重复摘要
- 流式输出修正：过滤摘要子调用分词事件，避免摘要文本拼进最终 assistant 消息
- 运行时配置：`data/conversationSummaryConfig.json` + 默认值常量（新增 `summaryMinRecentMessages`）
- 管理端：`/admin/config` 对话摘要 Card + `GET/PUT /api/admin/config/conversation-summary`
