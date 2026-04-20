/**
 * `server/llm` 仅保留：
 * - {@link ./model.ts}：纯模型工厂（`getModel`、provider 等）
 * - {@link ./callback.ts}：通用 LangChain 回调（日志、摘要监听等）
 *
 * 聊天 Agent 编排见 `server/chat/langchain-agent.ts`；业务胶水见 `server/chat/assistant.ts`。
 */

export {};
