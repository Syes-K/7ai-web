# 实现记录：多轮对话摘要（迭代 0.1.4）

## 1. 实现结论（与代码一致）

### 1.1 摘要生成：LangChain `summarizationMiddleware`

- 文件：`src/server/llm/assistant.ts`
- 在 `createAgent({ middleware: [...] })` 中挂载 `summarizationMiddleware`（来自 `langchain`）。
- 当 `conversationSummaryConfig.enabled === false` 时不挂载 middleware（等价关闭摘要能力）。
- `maxChars` 在服务端仅替换 `{maxChars}`；模板保留字面量 `{messages}`，由 `summarizationMiddleware` 在运行时注入历史正文。
- `summaryPrefix` 使用合并后的 `summarySystemPrefix` 文案。
- `mode` 与 trigger/keep：
  - `messages` 模式：使用 `summaryTriggerMessages` / `summaryKeepMessages`；
  - `tokens` 模式：使用 `summaryTriggerTokens` / `summaryKeepTokens`；
  - 仅按当前模式传入对应键，避免 `keep` 同时包含 tokens/messages。
- 摘要子调用模型独立构造并打 `summarization` tag（`getSummarizationModel` / `getChatRuntimeSummarizationModel`）。

### 1.2 摘要落库：callback 捕获摘要子调用输出

- 文件：`src/server/llm/callback.ts`
- `SummarizationLlmCallbackHandler` 通过 `tags` 识别摘要子调用（`summarization`），并在 `handleChatModelStart` 记录 `prompt` 元信息（长度/hash，仅调试）。
- `handleChatModelEnd` / `handleLLMEnd` 提取摘要文本并回调 `onSummary(summary)`。
- 文件：`src/server/chat/assistant.ts`
  - `invokeAssistantReply`：`agent.invoke(..., { callbacks })`
  - `streamAssistantReply`：`streamChatAssistantAgentText(..., callbacks)`（`src/server/llm/assistant.ts` 已将 callbacks 透传到 `streamEvents`）
- 文件：`src/app/api/chat/conversations/[conversationId]/messages/route.ts`
  - 在 `onSummary` 中更新 `Conversation.contextSummary`、`contextSummaryUpdatedAt`、`contextSummaryCutoffSortOrder`。
  - 有摘要时按「摘要 + cutoff 后增量消息（不足补齐 `summaryMinRecentMessages`）」组装历史输入。
  - 流式路径过滤摘要子调用分词事件，避免摘要文本并入最终 assistant 消息。

### 1.3 配置：data JSON + 默认值 + 管理端 API

- 默认值：`src/common/constants/defaultConversationSummaryConfig.ts`
- 类型：`src/common/types/conversation-summary-config.ts`
- IO + merge：`src/server/conversation-summary-config/io.ts`、`merge.ts`
- Admin API：`src/app/api/admin/config/conversation-summary/route.ts`
- 管理端页面：`src/app/admin/config/page.tsx`（对话摘要 Card）

### 1.4 提示词合并读取

- 文件：`src/server/chat/conversation-summary.ts`
  - 仅保留 `getConversationSummaryConfig()` 与 `getSummaryPromptTemplates()`（供 `getAssistantAgent` 使用）。

### 1.5 数据模型

- 文件：`src/server/db/entities/Conversation.ts`
  - `contextSummary`、`contextSummaryUpdatedAt`、`contextSummaryCutoffSortOrder`

### 1.6 清空会话

- 清空消息时同步清空摘要字段与 checkpoint：`src/app/api/chat/conversations/[conversationId]/messages/route.ts`（DELETE）

---

## 2. 已知限制 / 风险

1. **PRD 7.3**：用户侧会话详情 API 仍不返回摘要字段；摘要主要用于服务端上下文与后续扩展。
2. **并发**：同会话快速连发时，摘要写入可能后写覆盖前写；一般可接受。
3. **构建**：本地 `npm run build` 若遇 `.env` 权限问题，与业务代码无关，需在非沙箱环境验证。

---

## 3. 自测

- `npm run lint`：通过（以当前仓库为准）。

---

## 4. 变更记录

| 日期 | 说明 |
| --- | --- |
| 2026-04-14 | 初稿：配置、实体、LangChain middleware、callback 落库。 |
| 2026-04-14 | 同步文档：移除「独立摘要 Agent 文件」叙述，对齐最终实现。 |
