# 服务端实现说明：对话 API（0.0.6 · 阶段 3B）

## 代码位置

| 能力 | 路径 |
| --- | --- |
| 实体 | `src/server/db/entities/Conversation.ts`、`Message.ts` |
| DataSource 注册 | `src/server/db/data-source.ts` |
| LangChain 调用 | `src/server/chat/assistant.ts`、`llm-runtime.ts` |
| 分页 cursor | `src/server/chat/cursor.ts` |
| 会话标题截断 | `src/server/chat/conversation-title.ts` |
| 归属校验 | `src/server/chat/conversation-access.ts` |
| Route Handlers | `src/app/api/chat/conversations/route.ts`、`[conversationId]/route.ts`、`[conversationId]/messages/route.ts` |
| 公共枚举/常量/类型 | `MessageRole`、`CHAT_*` 常量、`common/types/chat.ts` |

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `OPENAI_API_KEY` | 兼容 OpenAI 的 API Key（与各厂商 base URL 配合） |
| `CHAT_LLM_PROVIDER` | 可选，默认 `DEEPSEEK`（键与 `src/server/llm/model.ts` 中 `MODEL_PROVIDER_BASE_URL` 一致） |
| `CHAT_LLM_MODEL` | 可选，默认 `deepseek-chat` |
| `SQLITE_PATH` | 可选，数据库文件路径 |

## 与 3A 文档的差异 / 实现取舍

- **消息分页 cursor**：实现为按 `sortOrder` 的 opaque JSON（`{ s: number }`），保证稳定顺序；首屏为「最近一批」消息按时间正序返回，与 `api-spec-chat.md` 中「无 cursor 取最近一页」一致。
- **SSE `assistant_done`**：在单条 `data` 中同时包含助手消息字段与 `conversation` 摘要，便于前端一次更新标题与时间。
- **403**：会话越权统一 **404** + `CONVERSATION_NOT_FOUND`，与 3A 防枚举策略一致。

## 研发自测建议

1. 登录后 `POST /api/chat/conversations` → `201`，再 `POST .../messages` 非流式 → 返回 `userMessage` / `assistantMessage`（需有效模型 Key）。
2. `GET /api/chat/conversations` 首条 `updatedAt` 最新；`DELETE .../messages` 后 `title` 回退为默认、`messageCount` 为 0。
3. 使用他人 `conversationId` 访问 → **404**。
4. 未登录访问 `/api/chat/*` → **401**。

## 文档变更

| 日期 | 说明 |
| --- | --- |
| 2026-04-11 | 3B 首次落地：会话/消息表、聊天 API、LangChain 非流式与 SSE。 |
