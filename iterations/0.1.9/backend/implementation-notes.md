# 阶段 3B 实现说明（version 0.1.9）

## 概述

已实现：**用户 MCP 配置 CRUD**、**测试连接**、**知识库 ↔ MCP 多对全量替换挂载**、**对话轮次从助手绑定知识库解析 MCP 并通过 `@langchain/mcp-adapters` 注入 LangChain tools**。

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `MCP_CREDENTIALS_MASTER_KEY` | 可选但**保存含 `credentials` 的 MCP 配置时必需**。推荐 **32 字节 Base64**；若为任意字符串则使用 `sha256` 派生 32 字节密钥（弱于随机密钥，仅便于开发）。未配置时创建/更新带密钥请求返回 `MCP_CREDENTIALS_ENCRYPTION_UNAVAILABLE`（422）。 |

## 新增 / 变更 API

- `GET|POST /api/console/mcp-configs`
- `GET|PATCH|DELETE /api/console/mcp-configs/:id`
- `POST /api/console/mcp-configs/:id/test-connection`（200 + `ok`；失败不落 5xx；简单频控 3s/配置）
- `GET /api/knowledge-bases`、`GET|PATCH /api/knowledge-bases/:id`、`POST /api/knowledge-bases` 的 `item(s)` 增加 `mcpConfigIds`、`mcpConfigCount`；`PATCH` 可**仅**更新 `mcpConfigIds`（不触发正文向量化）
- `DELETE /api/knowledge-bases/:id` 级联删除 `knowledge_base_mcp_bindings`

## 数据表（TypeORM synchronize）

- `user_mcp_configs`
- `knowledge_base_mcp_bindings`（`UNIQUE(knowledgeBaseId, mcpConfigId)`，冗余 `userId`）

## 对话链路

- `src/server/chat/turn-capabilities.ts`：`loadMcpBindingsForChatTurn` 使用 `getAssistantConfiguredKnowledgeBaseIds` → 绑定表去重 → 仅 `enabled=true` 的配置；`mcpBindingsToLangChainTools` 对每条配置单独 `MultiServerMCPClient`，`Promise.allSettled`，单条失败不影响其他；每轮最多 `MCP_CONFIG_MAX_BINDINGS_PER_CHAT_TURN`（10）条配置。

## 传输与 endpoint 形状

| `transport` | `endpoint`（JSON） |
| --- | --- |
| `http` | `{ "url": "https://..." }`，可选在 `metadata.headers` 或解密后的 `credentials`（JSON `{ "headers": {} }` / 纯 token 走 `Authorization`）中带鉴权 |
| `sse` | `{ "url": "..." }` + 可选 headers |
| `stdio` | `{ "command": "npx", "args": ["-y", "..."] }` 等 |

## 自测建议

1. 无 `MCP_CREDENTIALS_MASTER_KEY` 时 POST 带 `credentials` → 422。  
2. 创建 MCP → 列表 `endpointSummary` 无密钥明文。  
3. 知识库 PATCH `mcpConfigIds` 含他人/随机 id → 422。  
4. 知识库挂载后 DELETE MCP → 409。  
5. 助手绑定知识库 + 有效远程 MCP（若有）发消息 → 日志无密钥；工具可调用（依赖外部 MCP 可用性）。

## 依赖

- `package.json` 增加：`@modelcontextprotocol/sdk`、`@langchain/mcp-adapters`。

## 本轮增量需求同步（聊天可观测性与知识库策略）

### 1) MCP 对话链路稳定性

- 修复“测试连接通过但对话内工具调用报 `Not connected`”问题：`list_tools` 后不再立即关闭 MCP 客户端。
- 调整为“按 **单轮对话** 维持 MCP 连接生命周期”：`getAssistantAgent` 返回 `disposeMcp`，在 `invoke/stream` `finally` 中统一释放。
- `turn-capabilities` 改为单会话聚合连接并按配置回填工具元数据，避免前缀差异导致“未拉取到工具”的误判。

### 2) 知识库检索策略调整

- 移除“先意图识别再检索”门控：只要助手挂载知识库，即直接执行向量检索。
- `buildKnowledgeInjectionForChat` 不再依赖 `decideKnowledgeRetrievalIntent`，命中理由改为固定语义：
  - 命中：`direct_vector_search`
  - 未命中：`no_hit_above_threshold`
- 主链路 `prepareModelInputForPostMessage` 在“未命中”时补齐 no-hit guard system message，禁止模型误称“根据知识库检索片段”。

### 3) C1 数据语义收敛

- C1 不再写 `reasonTag`（知识库“命中理由”字段下线）。
- `kbDetailsFromInjection` 不再输出“命中理由”卡片，仅保留命中知识库与命中片段等有效信息。

### 4) 推理/摘要语义隔离

- 修复摘要回调与推理摘要串用：会话摘要回调完成后仅更新 `reasoning.status`，不再把摘要正文写入 `reasoning.safeSummary`。
