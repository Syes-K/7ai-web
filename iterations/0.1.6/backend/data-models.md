# 数据模型：知识库管理与向量检索（version 0.1.6 / 阶段 3A）

## 文档信息
| 项 | 内容 |
|---|---|
| 版本 | `0.1.6` |
| 持久化 | TypeORM + SQLite（当前项目 `data-source.ts` 使用 `synchronize: true`） |
| 目标 | 本期新增：知识库实体、知识库向量分片表、以及控制台助手对知识库的多选绑定关系表 |

> 说明：当前项目 `Assistant / Conversation / Message` 等实体多数不设 SQLite 外键约束；本期也建议保持同一风格（通过业务代码做权限过滤与级联清理）。

---

## 1. 新增表：知识库实体表 `knowledge_bases`
> 一条知识库条目 = 一份可检索内容（对齐 PRD：本期不引入“容器+多文档”模型）。

### 1.1 字段定义（建议）
| 字段 | TypeORM/SQLite | 必填 | 说明 |
|---|---|---|---|
| `id` | `varchar(36)` PK | 是 | UUID（系统生成） |
| `userId` | `varchar(36)` + index | 是 | 所属用户（用于鉴权与列表分页） |
| `name` | `varchar(64)` | 是 | 1~64 字符；同一用户建议唯一 |
| `description` | `text` nullable | 否 | 0~500 字符；用于意图识别/选择器展示 |
| `tags` | `simple-json` nullable | 否 | `string[]|null`；最多 20 个 |
| `contentFormat` | `varchar(16)` | 是 | `"markdown"` \| `"plain"` |
| `content` | `text` | 是 | 直接文本输入（本期文件上传不落库） |
| `sourceType` | `varchar(16)` | 是 | 本期固定 `"text"` |
| `vectorStatus` | `varchar(16)` | 是 | `"pending"` \| `"success"` \| `"failed"` |
| `vectorError` | `text` nullable | 否 | **脱敏失败原因摘要** |
| `vectorUpdatedAt` | `datetime` nullable | 否 | 最近一次成功向量化时间 |
| `vectorLastStartedAt` | `datetime` nullable | 否 | 最近一次开始向量化时间（便于 UI 展示 pending） |
| `vectorContentHash` | `varchar(64)` nullable | 否 | 版本化口径：本期用内容 hash 绑定当前向量空间 |
| `createdAt` | `datetime` | 是 | TypeORM `CreateDateColumn` |
| `updatedAt` | `datetime` | 是 | TypeORM `UpdateDateColumn` |

### 1.2 索引建议
- `@Index(["userId", "updatedAt"])`：知识库列表按时间倒序
- （可选）`unique(userId, name)`：若团队决定“强制唯一”（PRD 建议）

### 1.3 vectorStatus/向量化状态转换建议
- 初建/编辑：`pending`（`vectorError=null`，`vectorLastStartedAt=now`）
- 成功：`success`（`vectorUpdatedAt=now`，`vectorContentHash` 与写入 chunks 一致）
- 失败：`failed`（`vectorError` 写脱敏摘要）

### 1.4 删除/禁用策略（本期默认）
- PRD 明确本期可不做删除：建议仅支持编辑与“允许 vectorStatus failed”
- 若未来需要删除：建议级联删除 `knowledge_base_vector_chunks`，或保留但检索层过滤 `vectorContentHash`（需全局策略一致性）

---

## 2. 新增表：知识库向量分片表 `knowledge_base_vector_chunks`
> 存储每条知识库的 chunk 内容及其 embedding。用于聊天侧向量检索与分片测试。

### 2.1 字段定义（建议）
| 字段 | TypeORM/SQLite | 必填 | 说明 |
|---|---|---|---|
| `id` | `varchar(36)` PK | 是 | UUID（系统生成） |
| `knowledgeBaseId` | `varchar(36)` + index | 是 | 关联知识库（业务代码级过滤） |
| `vectorContentHash` | `varchar(64)` + index（建议） | 是 | 与 `knowledge_bases.vectorContentHash` 对齐，用于防混入旧内容 |
| `chunkIndex` | `integer` | 是 | 从 0 开始递增（与测试 UI 展示的 `chunkIndex` 对齐） |
| `chunkContent` | `text` | 是 | chunk 正文（用于分片测试预览/复制） |
| `chunkMeta` | `simple-json` nullable | 否 | 预留：分片起止字符、标题层级等 |
| `embeddingModel` | `varchar(255)` | 是 | 记录使用的向量化模型标识（便于排障/兼容） |
| `embedding` | `simple-json` | 是 | `number[]`（embedding 向量；具体维度由 embedding model 决定） |
| `createdAt` | `datetime` | 是 | TypeORM `CreateDateColumn` |

### 2.2 约束与索引建议
- 唯一性（建议用组合唯一约束，避免重复写入）：
  - `unique(knowledgeBaseId, vectorContentHash, chunkIndex)`
- 索引建议：
  - `@Index(["knowledgeBaseId", "vectorContentHash"])`：检索与测试读取
  - `@Index(["chunkIndex"])`：非强制（chunkIndex 多用于测试展示的行级定位）

### 2.3 embedding 存储与空间口径（3A 设定）
- `embedding` 建议使用 `simple-json` 存储 `number[]`
- score 计算口径（0~1）由 `implementation-plan.md` 定稿的“归一化规则”保证；本表只存原始向量数值。

---

## 3. 新增表：助手-知识库关系表 `assistant_knowledge_bases`
> 仅用于“控制台助手管理页”多选配置。对话时按该关系表取 `knowledgeBaseIds` 作为检索范围。
说明：当前 `Assistant` 实体仅包含助手基础配置（如 `scope/userId/name/prompt/tags` 等），不包含知识库多选结果字段，因此本期必须通过 `assistant_knowledge_bases` 关系表承载助手级 `knowledgeBaseIds`。

### 3.1 字段定义（建议）
| 字段 | TypeORM/SQLite | 必填 | 说明 |
|---|---|---|---|
| `id` | `varchar(36)` PK | 是 | UUID（系统生成） |
| `assistantId` | `varchar(36)` + index | 是 | 绑定到现有 `assistants.id`（业务级关联） |
| `userId` | `varchar(36)` + index | 是 | 冗余：用于快速做鉴权过滤（减少全表扫描） |
| `knowledgeBaseId` | `varchar(36)` + index | 是 | 绑定到 `knowledge_bases.id`（业务级关联） |
| `createdAt` | `datetime` | 是 | TypeORM `CreateDateColumn` |
| `updatedAt` | `datetime` | 是 | TypeORM `UpdateDateColumn` |

### 3.2 索引/唯一性建议
- `unique(assistantId, knowledgeBaseId)`：防止重复选中
- 索引建议：
  - `@Index(["assistantId", "createdAt"])`：获取某 assistant 的配置
  - `@Index(["userId", "assistantId"])`：权限过滤

### 3.3 级联/一致性策略（因为当前项目多实体无外键）
- 删除或改 scope 的 assistant：
  - 建议在 3B 实现中由业务代码清理对应 `assistant_knowledge_bases` 行
- “禁用”策略：
  - 本期不要求对 knowledge base 做“禁用/归档”字段；failed 状态由 `knowledge_bases.vectorStatus` 决定
  - 聊天检索层应跳过 `vectorStatus!=success` 的知识库（即便在 relation 表中被选中）

---

## 4. “编辑后不混入旧内容”的口径（关键）
本期的核心一致性要求是：编辑保存后，不应检索到旧正文对应分片。

建议实现口径（文档约束到 3B 落地）：
1. 编辑/重向量化触发时：
   - 更新 `knowledge_bases.vectorStatus=pending`
   - 生成新的 `vectorContentHash`（例如对 `content + contentFormat + sourceType` 的 SHA256）
2. 写入新 chunk 时：
   - 所有 `knowledge_base_vector_chunks` 记录写入相同的 `vectorContentHash`
3. 聊天检索/分片测试只读取：
   - 当前 knowledge base 的 `vectorStatus=success` 且 `vectorContentHash` 匹配的 chunks

这样即便旧 chunks 仍存在，也不会被检索到，避免“混入旧内容”的可观测问题。

---

## 5. 本 3A 阶段的新增/更新范围声明
- 本文件为阶段 3A：仅产出数据库表设计文档
- 不包含 TypeORM Entity / migration 的代码变更

