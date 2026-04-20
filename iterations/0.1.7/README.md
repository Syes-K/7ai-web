# 迭代 0.1.7：对话单轮链路编排（文档化）

本迭代采用“**文档先行 + 最小重构试点**”策略：固化「发送消息 → 模型回复 → 落库」阶段模型与图表，并在服务端落地 B→C 编排试点（`RunnableSequence`），便于后续统一编排（tools / MCP / skills 等）。

| 阶段 | 路径 |
|------|------|
| 需求 | [`product/prd-chat-turn-pipeline.md`](./product/prd-chat-turn-pipeline.md) |
| 设计 | [`design/spec-chat-turn-pipeline.md`](./design/spec-chat-turn-pipeline.md) |
| Branch 迁移 Step 清单 | [`design/pipeline-branch-steps.md`](./design/pipeline-branch-steps.md) |
| 服务端（branch 迁移实现） | [`backend/implementation-notes.md`](./backend/implementation-notes.md) |

下游（backend / frontend）若在本版本实现代码，请另起实现说明并引用上述文档为单一事实来源。

**实现备忘**：`tools` / MCP / Skills 加载占位见 `src/server/chat/turn-capabilities.ts`，由 `src/server/chat/langchain-agent.ts` 在构建 Agent 时调用（当前均为空，保留扩展点）。`server/llm` 仅保留 `model.ts` 与 `callback.ts`。
