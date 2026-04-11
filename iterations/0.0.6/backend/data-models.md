# 数据模型建议：对话页（0.0.6）

## 1. 技术对齐

| 项 | 说明 |
| --- | --- |
| ORM | **TypeORM** |
| 数据库 | **SQLite**（`better-sqlite3`） |
| 连接 | 全局 **`getDataSource()`** 单例（`src/server/db/data-source.ts`） |
| 实体目录 | **`src/server/db/entities/`** |
| 用户主键 | 与既有 **`User`** 一致：`varchar(36)` UUID |

新增实体需注册进 `DataSource` 的 `entities` 数组（3B 实现时修改 `data-source.ts`）。

---

## 2. 建议实体：`Conversation`（或 `ChatSession`）

命名二选一，推荐 **`Conversation`**，表名如 **`conversations`**。

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | `varchar(36)` | PK | UUID |
| `userId` | `varchar(36)` | **FK → `users.id`**，**索引** | 会话归属；所有查询先按 `userId` 过滤 |
| `title` | `varchar`（如 255） | NOT NULL | 展示用；规则见设计 §6.1 / API 文档 |
| `createdAt` | `datetime` | 创建时间 | |
| `updatedAt` | `datetime` | 更新时间 | **列表排序主键**（`DESC`） |

### 2.1 索引

- **`(userId, updatedAt DESC)`**：列表「当前用户 + 最近在上」覆盖索引（SQLite 下可 `(userId, updatedAt)`）。
- **PK `id`**：详情与消息外键。

### 2.2 与用户表关系

- **多对一**：多个 `Conversation` 对应一个 `User`。
- **删除用户**（若业务未来支持）：可选 `ON DELETE CASCADE` 或软删；当前 PRD 未要求删用户级联，可在 3B 与既有用户模块对齐。

---

## 3. 建议实体：`Message`

表名如 **`messages`**。

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | `varchar(36)` | PK | UUID |
| `conversationId` | `varchar(36)` | **FK → `conversations.id`**，**索引** | |
| `userId` | `varchar(36)` | **FK → `users.id`**，索引（可选） | **冗余隔离**：便于审计与防御性查询；写入时与 `Conversation.userId` 一致性校验 |
| `role` | `varchar`（如 16） | NOT NULL | `user` / `assistant` / `system`（与 `@/common/enums` 枚举对齐） |
| `content` | `text` | NOT NULL | 全文；大文本注意 SQLite 性能 |
| `sortOrder` | `integer` | NOT NULL | **会话内顺序**（从 0 或 1 递增）；或仅用 `createdAt` 排序，二选一须固定 |
| `createdAt` | `datetime` | NOT NULL | |

### 3.1 索引

- **`(conversationId, sortOrder)`** 或 **`(conversationId, createdAt)`**：分页与顺序扫描。
- **`conversationId`**：清空时 `DELETE WHERE conversationId = ?`。

### 3.2 外键

- `Message.conversationId` → `Conversation.id`，建议 **`ON DELETE CASCADE`**：若未来支持「删会话」可自动清消息；**本版本**不提供删会话 API，清空走显式 `DELETE` 消息语句亦可，不依赖级联。

---

## 4. 「清空」语义（PRD 与设计对齐）

| 操作 | 行为 |
| --- | --- |
| 目标 | 删除该会话下 **所有 `Message` 行** |
| 保留 | **`Conversation` 行不删除** |
| 标题 | 无用户消息后 **`title`** 回退为默认（「新对话」等），与设计 §6.1 一致 |
| `updatedAt` | **更新**为清空操作时间（推荐），便于列表反映最近操作；若产品要求清空不改变排序，可只改 `title` —— 以产品最终决策为准 |

**级联**：推荐在事务中执行：

1. `DELETE FROM messages WHERE conversationId = ?`（或 ORM 等价）。
2. `UPDATE conversations SET title = ?, updatedAt = ? WHERE id = ? AND userId = ?`。

---

## 5. 用户隔离校验

所有读写必须满足：

- `Conversation.userId === currentUser.id`。
- 写入 `Message` 时：`Message.conversationId` 所属会话的 `userId` 与当前用户一致；可选 `Message.userId` 同步写入为 `currentUser.id`。

非法 `conversationId`：**不暴露是否存在** —— 返回 **404**（与 API 规格一致）。

---

## 6. 类型与枚举（仅命名建议，本阶段不写代码）

| 归类 | 建议位置 | 示例 |
| --- | --- | --- |
| `MessageRole` | `@/common/enums` | `user`、`assistant`、`system` |
| 请求/响应 DTO 类型 | `@/common/types` | `ConversationDTO`、`MessageDTO`、列表分页元数据 |
| 分页默认值、标题长度 | `@/common/constants` | `CHAT_PAGE_SIZE`、`CHAT_TITLE_MAX_CHARS` |

---

## 7. PRD 开放问题 O3（清空与模型侧上下文）

当前持久层仅 **SQLite 消息表** 时，「模型记忆」完全来自 **请求时组装的 message 列表**。清空 DB 消息后，只要 **后续请求不再包含已删内容**，模型即不会「记得」。

若 3B 以后引入 **摘要表 / 向量缓存 / Redis 会话上下文**，则 **清空须同步删除** 这些派生数据；本 3A 文档在 [implementation-plan.md](./implementation-plan.md) 中列为实现风险与检查项。
