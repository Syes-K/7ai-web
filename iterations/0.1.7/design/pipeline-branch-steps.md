# Branch 迁移：单轮对话 Step 清单

**迭代版本**：`0.1.7`  
**关联**：[对话单轮链路规格](./spec-chat-turn-pipeline.md)

本文按**执行顺序**列出以 **branch（条件分支 + 顺序阶段）** 方式收敛代码时可对齐的 step：**名称**与**主要职责**。合并或拆 step 以实际模块边界为准。

---

## A. 请求与会话前置

| # | Step 名称 | 主要功能 |
|---|-----------|----------|
| A1 | `validateRequest` | 鉴权、解析 JSON、`content` / `stream` 校验、长度上限 |
| A2 | `loadConversation` | 校验会话归属，不存在则 404 |
| A3 | `persistUserMessage` | 写入用户消息、`sortOrder`，首条时更新标题，更新 `updatedAt` |

---

## B. 历史与输入侧摘要（模型输入基底）

| # | Step 名称 | 主要功能 |
|---|-----------|----------|
| B1 | `loadSummaryConfig` | 读会话摘要开关、模板、`minRecent` 等 |
| B2 | `loadFullHistory` | 按会话拉全量消息（升序），含刚写入的用户消息 |
| B3 | `applyPersistedSummaryWindow` | 若存在 `contextSummary`：拼「摘要 system + 最近 N 条」；算 `summaryCutoffCandidate`；否则用全量历史 |
| B4 | `fallbackFullHistoryOnConfigError` | 配置异常时回退全量历史（不中断主流程） |

---

## C. 知识库增强（仅影响本轮模型输入）

| # | Step 名称 | 主要功能 |
|---|-----------|----------|
| C1 | `buildKnowledgeInjection` | 无助手或未绑 KB 则跳过 |
| C2 | `decideKbRetrievalIntent` | 额外 LLM：是否 `needSearch` |
| C3 | `retrieveKbChunks` | 向量检索、`topK` / 阈值过滤 |
| C4 | `injectKbSystemMessage` | 有命中则插入 KB system；无则不改列表 |
| C5 | `kbInjectionNoopOnError` | 失败打日志，不阻断对话 |

---

## D. Agent 构建与主对话

| # | Step 名称 | 主要功能 |
|---|-----------|----------|
| D1 | `resolveBaseSystemPrompt` | 默认或助手可读提示词 |
| D2 | `loadTurnCapabilities` | `resolveSystemPromptWithSkills` + `resolveAllToolsForAgent`（skills 文案、tools + MCP 合并；当前多为空占位） |
| D3 | `buildAgent` | `createAgent`：主模型、system、tools、摘要中间件（若启用） |
| D4 | `invokeOrStreamAssistant` | 非流式 `invoke` 或流式 `streamEvents`，过滤摘要流 |

---

## E. 图内摘要与落库（条件）

| # | Step 名称 | 主要功能 |
|---|-----------|----------|
| E1 | `onSummarizationFromMiddleware` | 摘要子调用完成时回调；更新 `contextSummary`、`contextSummaryCutoffSortOrder` 等 |
| E2 | `skipSummaryPersist` | 未触发中间件则本步无 DB 更新（逻辑占位，便于分支对齐） |

---

## F. 助手输出持久化与响应

| # | Step 名称 | 主要功能 |
|---|-----------|----------|
| F1 | `persistAssistantMessage` | 写入助手消息、`sortOrder` |
| F2 | `touchConversation` | 更新 `updatedAt`，必要时带最新 `title` |
| F3 | `respond` | JSON 或 SSE 事件序列 |

---

## 主干与典型分支

- **主干顺序**：`A → B → C → D → E（条件）→ F`。
- **典型分支点**：B3（有 / 无落库摘要）、C2～C4（是否检索 / 是否注入）、请求体 `stream` 分支、E（是否触发图内摘要）。
- **可合并示例**：B1 + B2 → `loadHistoryContext`；C2 + C3 + C4 → `enrichWithKnowledgeBase`（内部再分支）。
- **0.1.7 试点策略**：A/F 保持路由编排；D 保持 Agent 层；B/C 允许优先 Runnable 化（当前已由 `prepareModelInputForPostMessage` 落地）。

---

## 与代码的大致对应（非一一函数名）

| 区间 | 参考路径 |
|------|----------|
| A1 `validatePostMessageBody`、B、C、E1 `createConversationSummaryUpdater`、A3 `persistUserMessageAndTouchConversation`、`getNextMessageSortOrder` | `src/server/chat/post-message-pipeline.ts` |
| 鉴权、`findOwnedConversation`、流式/JSON 响应、F1 助手消息写入 | `src/app/api/chat/conversations/[conversationId]/messages/route.ts` |
| D（capabilities + agent） | `src/server/chat/langchain-agent.ts`、`src/server/chat/turn-capabilities.ts` |
| E 摘要子调用检测与落库触发 | `src/server/llm/callback.ts`（`SummarizationLlmCallbackHandler`） |

迁移迭代时在 `iterations/0.1.7/backend/implementation-notes.md` 中可逐条勾选与本清单对齐情况。
