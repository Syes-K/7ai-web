# 实现计划：MCP 配置、知识库挂载、与 LangChain Agent 工具链（version 0.1.9）

阶段 **3B** 执行顺序建议；本文档不写业务代码，仅列步骤、依赖与自测要点。

---

## 1. 目标对齐（验收锚点）

| 来源 | 要点 |
| --- | --- |
| PRD / 用户故事 | AC-M1~M4、AC-K1~K3、AC-C1~C3 |
| 设计默认 | 删除 MCP **禁止硬删**（409）；`enabled=false` **不参与**运行时 tools；MCP 与 RAG **解耦**（每轮只要助手绑定的 KB 集合上有挂载即尝试加载） |
| 代码约束 | Tools 必须经 `resolveAllToolsForAgent`（`src/server/chat/turn-capabilities.ts`），由 `getAssistantAgent`（`src/server/chat/langchain-agent.ts`）统一创建 Agent |

---

## 2. 数据层（3B 第一步）

1. **新增实体** `UserMcpConfig`、`KnowledgeBaseMcpBinding`（字段见 `data-models.md`），在 `src/server/db/data-source.ts` 注册。
2. **常量与枚举**：在 `@/common/constants` 增加名称长度等；在 `@/common/enums` 增加 `McpTransport`、`McpLastCheckStatus`（或等价命名）；在 `ErrorCode` 增加 `api-spec.md` 所列项。
3. **（可选）** 小型仓库层函数：`listMcpConfigsByUser`、`getMcpConfigForUser`、`replaceKnowledgeBaseMcpBindings(kbId, userId, ids[])`，避免 Route 内堆 SQL。

---

## 3. HTTP API（3B 第二步）

1. 实现 `/api/console/mcp-configs` CRUD + `test-connection`（契约见 `api-spec.md`），全部 **`withApiWrapper`** + **`getRequestUserContext`**。
2. 扩展 **`GET/PATCH` `src/app/api/knowledge-bases/[id]/route.ts`** 与列表 **`src/app/api/knowledge-bases/route.ts`** 的 DTO，写入/返回 `mcpConfigIds`（或详情专用字段）。
3. **删除 MCP**：事务内检查 `KnowledgeBaseMcpBinding` 引用计数，>0 → **409** + `MCP_CONFIG_REFERENCED_BY_KNOWLEDGE_BASE`。
4. **助手-知识库**：**不修改** `src/app/api/console/assistants/[id]/knowledge-bases/route.ts` 语义（除非 bugfix）。

---

## 4. 对话运行时：`loadMcpBindingsForChatTurn`（3B 第三步）

**文件**：`src/server/chat/turn-capabilities.ts`

**输入上下文**：现有 `ChatTurnCapabilityContext` 已含 `userId`、`assistantId`、`user`（`langchain-agent.ts` 传入 `capCtx`）。

**算法**

1. 若 **`!assistantId`**：返回 `[]`（设计：非助手会话不注入 KB MCP；见 `spec-chat-agent-mcp.md`）。
2. `getDataSource()`，调用与 `getAssistantConfiguredKnowledgeBaseIds`（`src/server/knowledge-base/assistant-config.ts`）**同等权限规则**的路径解析助手所属 `knowledgeBaseId[]`；若为空返回 `[]`。
3. 批量查询这些 KB 的 **`KnowledgeBaseMcpBinding`**，收集 `mcpConfigId`，**去重**（`Set`）。
4. 加载对应 `UserMcpConfig` 行：`enabled === true` 且 `userId === ctx.userId` 的保留；`enabled === false` **跳过**（静默，与 AC-K3/UI 分工一致）。
5. 映射为现有 **`McpServerBinding`**：`{ id: mcpConfigId }[]`（类型已存在于同文件）。

**注意**：系统助手若未来绑定知识库，需与 `findReadableAssistant` / `AssistantScope` 行为一致；当前以 **个人助手 + 本人 KB** 为主路径，与 `assistant-config.ts` 中 `Personal` 校验对齐。

---

## 5. `mcpBindingsToLangChainTools` 与 LangChain MCP 集成（3B 第四步）

**文件**：同上 `turn-capabilities.ts`（或拆到 `src/server/mcp/` 模块并在本文件聚合，避免单文件过长）。

**推荐实现顺序**

1. **选型**：确认官方/社区 **MCP 客户端** 与 LangChain 的桥接方式（`@langchain/mcp` 或 LangGraph tool 节点等——以 3B 实施时 lockfile 与文档为准），**仅选一条主路径**，避免双栈。
2. **单配置探测**：对单条 `UserMcpConfig` 实现「建连 + `list_tools`」封装，带 **超时**（如 5~15s 可配置）、**进程/连接清理**（stdio 子进程尤甚）。
3. **并发**：对去重后的 bindings **`Promise.allSettled`** 拉取 tools；**单条失败不抛断整体**：失败 MCP 跳过，记录 **结构化日志**（含 `mcpConfigId`、脱敏原因），满足 AC-C3。
4. **工具命名**：为防冲突，建议前缀 `mcp_{shortId}_` 或 `mcp__{configName}__`（需处理重名）；在 `implementation-notes` 中写明与 ToolTrace 的对应关系。
5. **`resolveAllToolsForAgent`**：保持现有 `Promise.all([loadToolsForChatTurn, loadMcpBindingsForChatTurn])` 结构；将来原生工具非空时自然合并。

**与 `getAssistantAgent` 的衔接**：无需改 `langchain-agent.ts` 签名；若需减少 DB 往返，可利用 `ctx.user` 传入的已加载 `User`。

---

## 6. 横切能力（3B 第五阶段，可与 API 并行）

| 能力 | 说明 |
| --- | --- |
| SSRF / 出网 | 对 `http(s)` 类 transport：可选 **allowlist**、禁止访问 RFC1918、限制重定向；超时与响应大小上限。 |
| 频控 | `test-connection` 按用户/配置限流；对话每 turn MCP 建连次数与 `bindings.length` 上限（产品未卡死前可先设技术常量于 `@/common/constants`）。 |
| 可观测性 | 结构化日志字段：`userId`、`assistantId`、`mcpConfigId`、`phase: list_tools \| invoke`；**不**打密钥。 |

---

## 7. 迁移策略

- 当前开发库 **`synchronize: true`**：新实体自动建表；**首版上线前**若需零停机，应评估改为显式迁移（TypeORM migration 或导出 SQL）。
- **已有数据**：新表为空，旧对话路径 **行为不变**（bindings 空 → `loadMcpBindingsForChatTurn` 仍返回 `[]`）。

---

## 8. 自测清单（3B 完成后）

### 8.1 API / 数据

- [ ] 未登录访问 MCP API → 401。
- [ ] 用户 A 无法通过猜测 id 读取/修改 B 的 MCP（404 或 422 策略与文档一致）。
- [ ] 创建 MCP 后列表可见；PATCH 不传 `credentials` 时库中密文不变。
- [ ] 删除仍被 KB 引用的 MCP → **409**，删除成功后绑定消失。
- [ ] PATCH 知识库传入他人 `mcpConfigId` → **422** + 统一文案。
- [ ] PATCH 知识库 `mcpConfigIds` 全量替换后 GET 回显一致；`enabled=false` 的 MCP 仍可保存挂载。

### 8.2 对话 / Agent

- [ ] 助手绑定 KB1+KB2，各挂不同 MCP，发消息：日志或 mock 中断言 **`resolveAllToolsForAgent`** 合并了来自两边的工具（且同一 `mcpConfigId` 只加载一次）。
- [ ] 助手无 KB 或无 MCP：工具列表与改造前一致（仅原生，当前原生仍为空）。
- [ ] 模拟一个 MCP `list_tools` 抛错：该 MCP tools 缺失，其余 MCP 与对话正文仍成功（AC-C3）。
- [ ] `enabled=false` 的挂载：不应出现在 Agent tools。

### 8.3 回归

- [ ] `PUT /api/console/assistants/:id/knowledge-bases` 行为不变。
- [ ] 知识库向量检索与 `buildKnowledgeInjectionForChat` 路径无回归（MCP 与 RAG 解耦，不阻塞主链路）。

---

## 9. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-04-21 | 3A 初稿 |
