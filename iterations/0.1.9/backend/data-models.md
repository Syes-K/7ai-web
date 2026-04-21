# 数据模型：UserMcpConfig、KnowledgeBaseMcpBinding（version 0.1.9）

> **仓库现状**：持久化使用 **TypeORM + `better-sqlite3`**（`src/server/db/data-source.ts`），实体位于 `src/server/db/entities/`。**非 Prisma**。下文以 **TypeORM 实体 + SQLite 逻辑约束** 描述；若后续引入迁移文件，可再导出等价 DDL。

---

## 1. 实体：`UserMcpConfig`（表名建议 `user_mcp_configs`）

用户私有 MCP 连接配置一行对应一条记录。

| 字段 | TypeORM 类型建议 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | `varchar(36)` PK | UUID | 与 `KnowledgeBase.id` 风格一致 |
| `userId` | `varchar(36)` | NOT NULL，索引 | FK 逻辑指向 `User.id`；**所有查询** `where: { userId }` |
| `name` | `varchar(64)` | NOT NULL | 展示名；与知识库 name 长度策略可对齐 `@/common/constants` 或单独常量 |
| `description` | `varchar(500)` nullable | — | 可选 |
| `transport` | `varchar(32)` | NOT NULL | 枚举字符串，建议同步 `@/common/enums` 新增 `McpTransport` |
| `endpoint` | `text` 或 `simple-json` | NOT NULL | 结构化连接参数（URL、command、args 等）；**日志中禁止完整打印** |
| `metadata` | `simple-json` nullable | — | 扩展 |
| `credentialsCipher` | `text` nullable | — | **仅存密文**（见第 4 节）；从未配置则为 null |
| `credentialsUpdatedAt` | `datetime` nullable | — | 可选；用于审计「曾配置过密钥」 |
| `enabled` | `boolean` | NOT NULL，默认 true | `false` 时运行时不加载 |
| `lastCheckedAt` | `datetime` nullable | — | 最近测试时间 |
| `lastCheckStatus` | `varchar(16)` | NOT NULL，默认 `'never'` | `never` / `success` / `failure` |
| `lastErrorSummary` | `varchar(500)` nullable | — | 脱敏失败摘要 |
| `createdAt` | `datetime` | CreateDateColumn | — |
| `updatedAt` | `datetime` | UpdateDateColumn | — |

**索引与唯一**

- `@Index(["userId", "updatedAt"])`：列表排序。
- **`@Index(["userId", "name"], { unique: true })`**：与 `KnowledgeBase` 的 `(userId, name)` 唯一一致，避免列表重复混淆（若产品允许多条同名，可退化为非唯一 + 应用层提示）。

**关系（可选 TypeORM 装饰器）**

- `ManyToOne` → `User`（按需；当前项目部分实体仅存 `userId` 字符串亦可）。

---

## 2. 实体：`KnowledgeBaseMcpBinding`（表名建议 `knowledge_base_mcp_bindings`）

知识库与用户 MCP 配置的 **多对多** 中间表（PRD 推荐）。

| 字段 | 类型建议 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | `varchar(36)` PK | UUID | 便于审计删除；也可用复合主键省略 `id` |
| `userId` | `varchar(36)` | NOT NULL，索引 | **冗余但强烈建议**：与 `KnowledgeBase.userId` 一致，便于单用户下鉴权与查询；写入时从 KB 行拷贝并校验 |
| `knowledgeBaseId` | `varchar(36)` | NOT NULL | FK → `knowledge_bases.id` |
| `mcpConfigId` | `varchar(36)` | NOT NULL | FK → `user_mcp_configs.id` |
| `createdAt` | `datetime` | — | 可选 |

**唯一约束**

- **`UNIQUE(knowledgeBaseId, mcpConfigId)`**：同一知识库不重复挂载同一 MCP。

**索引**

- `INDEX(userId, mcpConfigId)`：删除 MCP 前统计「被哪些知识库引用」、409 详情列表。
- `INDEX(knowledgeBaseId)`：按知识库加载挂载列表。

**外键与级联（逻辑）**

- 删除 **知识库**：应 **级联删除** 其绑定行（用户删除 KB 后不留孤儿挂载）。
- 删除 **MCP 配置**：产品策略为 **禁止硬删**；实现上先 `COUNT` 绑定行，大于 0 则 409，**不**依赖 DB ON DELETE RESTRICT 亦可，但 DB 层 **`ON DELETE RESTRICT`** 可双保险。

**一致性**

- 插入时校验：`KnowledgeBase.userId === UserMcpConfig.userId === binding.userId`，否则拒绝（与 AC-K2 一致）。

---

## 3. 与现有实体的关系简图

```
User 1 --- * UserMcpConfig
User 1 --- * KnowledgeBase
KnowledgeBase * --- * UserMcpConfig   （经 KnowledgeBaseMcpBinding）
Assistant * --- * KnowledgeBase        （已有 AssistantKnowledgeBase）
```

对话解析链：**Assistant → AssistantKnowledgeBase → KnowledgeBase → KnowledgeBaseMcpBinding → UserMcpConfig**（去重后进入 `McpServerBinding[]`）。

---

## 4. 凭证存储策略（安全）

| 项 | 建议 |
| --- | --- |
| 存储形态 | 字段 **`credentialsCipher`**：应用层使用 **AES-256-GCM**（或 libsodium sealed box）加密后 Base64 入库；**禁止明文**。 |
| 密钥材料 | 加密主密钥来自 **环境变量**（如 `MCP_CREDENTIALS_MASTER_KEY`），未配置时创建带凭证的 MCP 应 **503/VALIDATION_ERROR** 明确「服务端未配置密钥加密」；**禁止**落默认硬编码密钥。 |
| 日志 | **禁止** `console.log` / 结构化日志输出 `endpoint` 内 query token、`credentialsCipher` 解密结果。 |
| API 回显 | GET/PATCH 响应中不包含解密明文；编辑态用 **`credentialsConfigured: boolean`** 或列表不返回该布尔仅依赖「用户曾填过」的 UX 由前端约定（与 `spec-mcp-console.md`「已配置」占位一致）。 |
| 连接测试 | 内存中短时解密 → 建立 MCP 客户端 → **尽快释放**字符串引用；异常消息经脱敏写入 `lastErrorSummary`。 |

---

## 5. `data-source.ts` 登记

阶段 3B 需在 `src/server/db/data-source.ts` 的 `entities: [...]` 数组中加入新实体类；当前 `synchronize: true`（开发友好），生产若改为迁移需单独评估。

---

## 6. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-04-21 | 3A 初稿 |
