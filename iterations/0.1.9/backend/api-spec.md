# API 规格：用户 MCP 配置、知识库挂载、与现有控制台/知识库接口关系（version 0.1.9）

本文档为 **阶段 3A** 接口契约草案，供阶段 3B 实现与前端对接。风格对齐现有 Route Handler：`withApiWrapper`（`src/server/http/with-api-wrapper.ts`）、`getRequestUserContext`（`src/server/auth/request-user-context.ts`）、`jsonError`（`src/server/http/json-response.ts`）、`ErrorCode` / `HttpStatus`（`src/common/enums/http.ts`）。

---

## 1. 鉴权与用户隔离

| 规则 | 说明 |
| --- | --- |
| 登录 | 所有下列接口须已登录；未登录返回 **`401`**，`error.code = UNAUTHORIZED`（与 `GET/PATCH /api/knowledge-bases/[id]` 一致）。 |
| 数据边界 | 一切查询/写入以 `getRequestUserContext()` 得到的 **`user.id`** 为边界；禁止按裸 id 访问他用户资源。 |
| 404 策略 | 对他人的 `mcpConfigId` / `knowledgeBaseId` 进行写操作时，与助手-知识库接口一致：**统一 404 或统一 422**，避免通过不同 HTTP 语义枚举资源是否存在；**推荐**与 `PUT /api/console/assistants/:id/knowledge-bases` 对无效 `knowledgeBaseIds` 一致：**`422` + `VALIDATION_ERROR` + `details`**（不暗示「该 MCP 属于他人」与「不存在」之区分）。 |

---

## 2. 用户 MCP 配置 CRUD

**建议路由前缀**：`/api/console/mcp-configs`（与现有 `src/app/api/console/assistants/**` 同属控制台域，便于权限与审计一致）。

> 实现时文件布局示例：`src/app/api/console/mcp-configs/route.ts`（GET/POST）、`src/app/api/console/mcp-configs/[id]/route.ts`（GET/PATCH/DELETE）、`src/app/api/console/mcp-configs/[id]/test-connection/route.ts`（POST）。

### 2.1 `GET /api/console/mcp-configs`

**用途**：MCP 管理列表、知识库挂载选择器选项源。

**Query（可选）**

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `keyword` | string | 名称模糊匹配（trim；空则忽略），与知识库列表关键字策略对齐。 |

**响应 `200`**

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "展示名",
      "description": "可选",
      "transport": "stdio | sse | http | ...",
      "endpointSummary": "脱敏后的连接摘要（非密钥明文）",
      "enabled": true,
      "lastCheckedAt": "2026-04-21T12:00:00.000Z",
      "lastCheckStatus": "never | success | failure",
      "lastErrorSummary": "失败时脱敏摘要，可为 null",
      "createdAt": "...",
      "updatedAt": "...",
      "referencedKnowledgeBaseCount": 0
    }
  ]
}
```

- **`referencedKnowledgeBaseCount`**：可选字段；若实现可显著改善删除拦截 UX（`spec-mcp-console.md`），建议提供。
- **不返回**：`credentials` 明文、原始 `endpoint` 中含密钥的 query、任何可反推出密钥的字段。

### 2.2 `POST /api/console/mcp-configs`

**请求体**

```json
{
  "name": "string, required",
  "description": "string | null, optional",
  "transport": "string, required",
  "endpoint": {},
  "metadata": {},
  "credentials": "string | null, optional — 创建时按 transport 规则可能必填",
  "enabled": true
}
```

- **`endpoint` / `metadata`**：建议为 **JSON 对象**（具体 shape 由 `transport` 分支校验）；若首版仅支持单 URL，可为 `{ "url": "https://..." }`，在实现计划中展开校验矩阵。
- **`credentials`**：创建时可写入；响应中**永不**回显明文。

**响应 `201`**

```json
{ "item": { /* 同 GET 单项字段，不含 credentials */ } }
```

**错误**

| 场景 | HTTP | `error.code` | 说明 |
| --- | --- | --- | --- |
| 参数非法 | 400 / 422 | `VALIDATION_ERROR` | 可带 `details[]`（`field` + `message`） |
| 未登录 | 401 | `UNAUTHORIZED` | — |
| 名称与用户下唯一冲突 | 409 | **待 3B 在 `ErrorCode` 新增**，如 `MCP_CONFIG_NAME_CONFLICT` | 与 `KnowledgeBase` 的 `userId+name` 唯一约束体验对齐时可选用 409 |

### 2.3 `GET /api/console/mcp-configs/:id`

**响应 `200`**：`{ "item": { ... } }`（字段同列表项；仍不含密钥明文）。

**错误**：非本人或不存在 → 建议 **`404`** + `MCP_CONFIG_NOT_FOUND`（**新增枚举**），与 `KNOWLEDGE_BASE_NOT_FOUND` 语义一致；若采用全局「控制台资源统一 404」文案，message 固定为「配置不存在」。

### 2.4 `PATCH /api/console/mcp-configs/:id`

**请求体**（部分更新）

```json
{
  "name": "optional",
  "description": "optional",
  "transport": "optional",
  "endpoint": "optional object",
  "metadata": "optional object",
  "credentials": "optional — 省略或 null 表示不修改；非空表示覆盖",
  "enabled": "optional boolean"
}
```

- 与 `spec-mcp-console.md` 一致：**密钥「置空不修改」** → 客户端不传 `credentials` 字段即可；若传 `""` 是否视为清空密钥由 3B 明确（建议：**不允许**用空字符串擦除，需单独「清除密钥」接口或显式 `clearCredentials: true` 以免误操作）。

**响应 `200`**：`{ "item": { ... } }`

**错误**：同 GET；校验失败 `422`。

### 2.5 `DELETE /api/console/mcp-configs/:id`

**成功 `204`** 无 body，或 **`200`** + `{ "ok": true }`（与项目习惯二选一，3B 与前端统一）。

**失败：仍被知识库引用（设计默认：禁止硬删）**

| HTTP | `error.code`（建议新增） | `error.message` | `error.details` |
| --- | --- | --- | --- |
| **409** | `MCP_CONFIG_REFERENCED_BY_KNOWLEDGE_BASE` | 无法删除：仍被知识库引用 | 可选：`[{ "field": "knowledgeBaseIds", "message": "..." }]` 或扩展结构携带最多 N 条知识库 **名称**（仅本人可见 KB，无泄露风险） |

与 `KNOWLEDGE_BASE_REFERENCED_BY_ASSISTANT`（删除知识库被助手引用）模式对称，见 `src/app/api/knowledge-bases/[id]/route.ts` 删除逻辑。

### 2.6 `POST /api/console/mcp-configs/:id/test-connection`

**用途**：手动探测；更新 `lastCheckedAt` / `lastCheckStatus` / `lastErrorSummary`（AC-M4）。

**请求体**：可选 `{}`；若未来支持「探测前临时覆盖 endpoint」仅用于探测不落库，再扩展字段（首版建议**仅对已落库配置**探测，与 `spec-mcp-console.md`「已存配置为准」一致）。

**响应 `200`（推荐统一 200，由 body 表达业务成败，避免把「连接失败」误当 5xx）**

```json
{
  "ok": true,
  "item": {
    "id": "...",
    "lastCheckedAt": "...",
    "lastCheckStatus": "success",
    "lastErrorSummary": null
  }
}
```

失败示例：

```json
{
  "ok": false,
  "item": {
    "id": "...",
    "lastCheckedAt": "...",
    "lastCheckStatus": "failure",
    "lastErrorSummary": "超时（已脱敏）"
  }
}
```

- **禁止**在 JSON 中返回密钥、完整堆栈、内网 IP 细节（SSRF 探测结果需脱敏）。
- **频控**：建议对单用户/单配置短时间重复测试返回 **`429`** + `RATE_LIMITED`（与全局枚举已有项对齐）。

---

## 3. 知识库与 MCP 挂载关系

### 3.1 与现有接口的关系

| 现有接口 | 说明 |
| --- | --- |
| `PUT /api/console/assistants/:id/knowledge-bases` | **维持职责不变**：仅维护助手 ↔ 知识库多对多（`AssistantKnowledgeBase`）。**不**在本期扩展为携带 MCP；MCP 挂载在知识库实体侧维护（PRD 5.2 / 设计 IA）。 |
| `GET/PATCH/DELETE /api/knowledge-bases/...` | **推荐扩展**：在 **`GET /api/knowledge-bases`**、**`GET /api/knowledge-bases/:id`**、**`PATCH /api/knowledge-bases/:id`** 上增加 `mcpConfigIds` 读写，使知识库保存与 `spec-knowledge-base-mcp-bindings.md`「Modal 一次保存」一致。 |

**备选**：新增子资源 `PUT /api/knowledge-bases/:id/mcp-configs`，body `{ "mcpConfigIds": string[] }`；代价是前端两次请求或需合并事务，**次选**。

### 3.2 `GET /api/knowledge-bases` / `GET /api/knowledge-bases/:id` 扩展

在现有 `kbDto`（`src/app/api/knowledge-bases/route.ts`、`src/app/api/knowledge-bases/[id]/route.ts`）中增加：

```json
"mcpConfigIds": ["uuid", "..."]
```

- 顺序：稳定顺序（如按挂载表 `createdAt` 或 `mcpConfigId` 字典序），便于前端 diff。
- 列表接口若担心 payload：可对列表项仅返回 `mcpConfigCount`，详情返回完整 `mcpConfigIds`（3B 与前端权衡；设计稿多选在编辑 Modal，**至少详情必含 ids**）。

### 3.3 `PATCH /api/knowledge-bases/:id` 扩展

在现有 `PatchBody` 上增加可选字段：

```json
{
  "mcpConfigIds": ["uuid"]
}
```

**语义**：**整表替换**该知识库与 MCP 的挂载集合（与 `PUT` 助手-knowledgeBaseIds 全量替换一致）；`undefined` 表示本请求不修改挂载；`[]` 表示清空。

**校验**

1. 每个 id 必须属于 **`user.id`** 下的 MCP 配置；否则 **`422`** + `VALIDATION_ERROR`，`details: [{ "field": "mcpConfigIds", "message": "包含无效 MCP 配置" }]`（与无效 knowledgeBaseIds 文案策略一致，**不**区分「他人 id」与「伪造 id」）。
2. **不去重**客户端重复 id 时服务端可规范化去重后保存。
3. **`enabled === false` 的 MCP**：允许写入挂载（设计默认）；运行时由 `loadMcpBindingsForChatTurn` 过滤。

**响应**：沿用现有 PATCH 响应结构，在返回的 `item` 中带更新后的 `mcpConfigIds`。

---

## 4. 对话运行时接口

**无新增 REST**：MCP 注入发生在已有发消息 / Agent 构建链路内（`getAssistantAgent` → `resolveAllToolsForAgent`，见 `src/server/chat/langchain-agent.ts`、`src/server/chat/turn-capabilities.ts`）。前端无需单独「拉 MCP tools」API。

---

## 5. `ErrorCode` 扩展建议（3B）

在 `src/common/enums/http.ts` 中新增（命名可按项目惯例微调，但宜保持可读）：

| 枚举值 | 典型 HTTP | 用途 |
| --- | --- | --- |
| `MCP_CONFIG_NOT_FOUND` | 404 | GET/PATCH/DELETE/TEST 目标不存在或非本人 |
| `MCP_CONFIG_REFERENCED_BY_KNOWLEDGE_BASE` | 409 | 删除仍被挂载 |
| `MCP_CONFIG_NAME_CONFLICT` | 409 | 可选，`userId+name` 唯一冲突 |

连接测试业务失败沿用 `VALIDATION_ERROR` 或仅用 **`200` + `ok:false`**，避免与「路由层错误」混淆。

---

## 6. 与 `withApiWrapper` 的约束

新增 `src/app/api/console/mcp-configs/**/route.ts` 的导出方法均应 **`withApiWrapper(async ...)`** 包装；若未来该资源纳入「仅管理员」范畴再组合 `withAdminApi`；**当前设计为个人控制台资源，与 `console/assistants` 一致使用会话用户上下文即可**。

---

## 7. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-04-21 | 3A 初稿，对齐 product/design 0.1.9 与仓库现有 API 风格 |
