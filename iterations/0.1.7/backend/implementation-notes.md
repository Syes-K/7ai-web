# 服务端实现说明：对话 POST branch 迁移（0.1.7）

## 已落地

- 新增 `src/server/chat/post-message-pipeline.ts`，将下列步骤从路由中抽出并与 [`../design/pipeline-branch-steps.md`](../design/pipeline-branch-steps.md) 对齐：
  - **A1** `validatePostMessageBody`
  - **A3** `persistUserMessageAndTouchConversation`
  - **B2** `loadFullHistoryForConversation`
  - **B1～B4** `applyPersistedSummaryWindow`
  - **C1～C5** `injectKbSystemIntoHistoryForModel`
  - **E1** `createConversationSummaryUpdater`
  - 助手消息 `sortOrder`：`getNextMessageSortOrder`（与用户消息共用同一 MAX 查询逻辑）
- 新增 `prepareModelInputForPostMessage`（`RunnableSequence`）：把 **B（历史+摘要窗口）→ C（知识库注入）** 串为单一可复用编排入口，路由层改为一次调用拿到 `historyForModel` 与 `summaryCutoffCandidate`。
- `POST .../messages` 路由仅编排上述函数 + **D**（`invokeAssistantReply` / `streamAssistantReply`）+ **F**（持久化助手消息与响应）。

## 行为与重构前一致性

- 校验错误码、摘要窗口与 cutoff 计算、知识库注入顺序与失败吞掉、摘要落库字段与流式/非流式分支与重构前一致（逻辑搬家，不改语义）。

## 完成度状态（对齐 PRD/Design）

- **已完成（0.1.7）**
  - A1/A3/B/C/E1 迁移至 `post-message-pipeline.ts`
  - `prepareModelInputForPostMessage`（`RunnableSequence`）编排 B→C
  - `server/llm` 收敛为 `model.ts` / `callback.ts`，Agent 编排迁移到 `chat/langchain-agent.ts`
- **未完成（留后续迭代）**
  - F3：将 SSE `ReadableStream` 分支独立为 responder 函数
  - 前端阶段状态同步协议（`stage` 事件流）及对应可视化

## 后续可拆

- 将流式分支内的 `ReadableStream` 构造再抽为 `respondStreamAssistant(...)`（对应 F3 子分支），便于单测。
- **D** 步已存在于 `chat/assistant.ts`、`chat/langchain-agent.ts`、`chat/turn-capabilities.ts`；`server/llm` 仅 `model.ts` / `callback.ts`。
