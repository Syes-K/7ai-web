# 数据模型：会话绑定助手（迭代 0.1.2）

## 文档信息

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.2` |
| 基线 | TypeORM + SQLite；`src/server/db/entities/Conversation.ts`、`Assistant.ts` |

---

## 1. 现状与增量

### 1.1 当前 `Conversation`（基线）

见 `src/server/db/entities/Conversation.ts`：

- `id`（PK）、`userId`、`title`、`createdAt`、`updatedAt`
- **尚无** `assistantId` 或与 `Assistant` 的关联

### 1.2 当前 `Assistant`（只读参考）

见 `src/server/db/entities/Assistant.ts`：

- `id`、`scope`、`userId`、`name`、`prompt`、`icon`、`openingMessage`、`tags`、`createdAt`、`updatedAt`

---

## 2. 建议 schema 变更

### 2.1 外键：`assistantId`

在 `conversations` 表增加：

| 列 | 类型 | 约束 |
| --- | --- | --- |
| `assistantId` | `varchar(36)` | **nullable**；有值表示与会话**永久绑定**（本期无换绑） |

**TypeORM**：`@Column({ nullable: true })`，`@ManyToOne(() => Assistant, { nullable: true, onDelete: "SET NULL" })` 或 **不级联删除助手行**（推荐保留历史会话引用，由应用层处理「助手删除」展示 —— 与 PRD / 设计开放问题一致）。

**外键策略（待 3B 二选一，建议写进迁移注释）**：

- **A（推荐）**：`ON DELETE SET NULL` — 助手行删除后会话 `assistantId` 变空，**丢失绑定语义**；需配合产品是否接受。
- **B**：不设 FK，仅保留 `assistantId` 字符串；助手删除后仍保留旧 id，接口层返回「不可用」与快照兜底。

**索引**：

- `assistantId` 单列索引（可选）：若管理端或统计按助手查会话量；**非强需求**。
- 保留现有 `@Index(["userId", "updatedAt"])`（`Conversation` 已存在）。

### 2.2 关系

- `Conversation.assistant` → `Assistant`（`ManyToOne`，nullable）
- `Assistant` 侧可选 `OneToMany` 到 `Conversation`（按需，避免循环引用可仅单向）

---

## 3. 展示用快照：是否冗余 `name` / `icon`

**问题**：PRD §3.3 AC2 — 助手改名/改图标后，历史会话是**快照**还是**实时**？

| 方案 | 做法 | 优点 | 缺点 |
| --- | --- | --- | --- |
| **实时** | 仅存 `assistantId`，列表/详情 `JOIN assistants` | 数据单一真相 | 列表 N+1 或需批量 IN 查询；助手删除后 JOIN 失败需降级 |
| **快照（推荐）** | 在 `conversations` 上冗余 `assistantName`、`assistantIcon`（或 JSON `assistantSnapshot`） | 历史列表性能稳定、与「当时身份」一致、助手删除仍可展示 | 与 `assistants` 表可能不一致；需定义是否同步 |

**推荐结论（0.1.2 backend）**：

1. **必存** `assistantId`（权限与模型链路用）。
2. **建议冗余** `assistantName`、`assistantIcon`（nullable 字符串，长度与 `Assistant` 字段上限对齐，见 `@/common/constants` 中助手相关常量），在 **POST 创建会话且绑定成功时** 从 `Assistant` 复制。
3. **不自动回写**：管理端修改助手名称/图标后，**已存在会话默认不更新**（快照语义）；与 PRD「建议二选一」中取 **绑定快照**。

若产品强需求「实时」，3B 可改为查询时 JOIN，并单独评估性能。

---

## 4. `Message` 实体

基线见 `src/server/db/entities/Message.ts`：无 `assistantId` 字段。

**本期可不增列**：会话级绑定后，**所有**助手消息共享同一身份。若未来需要「中途换助手」或按消息归因，再考虑消息级扩展。

---

## 5. `lastActivityAt` 与 `updatedAt`

- **数据库**：可不新增列；由 API 层计算 `lastActivityAt`（`MAX(messages.createdAt)`，无消息则用 `conversations.createdAt`）。
- **一致性**：确保任意用户/助手消息写入、删除后，会话 `updatedAt` 与业务「最后活跃」预期一致（现网在 `messages/route.ts` 中多处 `convRepo.update(..., { updatedAt })`）；若 `lastActivityAt` 严格等于最后消息时间，**清空全部消息后**应以「无消息」规则回退到 `createdAt` 或清空操作时间 —— 与 `api-spec` 中开放项一致，由 3B 与产品收口一种。

---

## 6. 迁移注意（SQLite）

- 使用项目现有 TypeORM 迁移/同步策略（与仓库惯例一致）。
- 已有会话：`assistantId` 及快照列为 **NULL**，表示普通对话，与 PRD 兼容。

---

## 7. 变更记录

| 日期 | 说明 |
| --- | --- |
| 2026-04-13 | 初稿：`assistantId`、关系、快照推荐、Message 不增列。 |
