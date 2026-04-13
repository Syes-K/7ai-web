# 数据模型：助手管理（version 0.1.1）

## 文档信息

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.1` |
| 对应 PRD | `iterations/0.1.1/product/prd-assistant-management.md` |
| 对应设计 | `iterations/0.1.1/design/spec-assistant-management.md` |
| 存储 | SQLite + TypeORM（与 `UserModelConfig` 等实体一致）；`data-source.ts` 注册新实体 |

---

## 1. 实体：`Assistant`（建议表名 `assistants`）

### 1.1 用途

统一存储 **系统助手** 与 **个人助手**，通过 **`scope`** 区分；控制台列表查询为「系统 **或** 当前用户的个人记录」。

### 1.2 字段

| 字段 | TypeORM 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | `varchar(36)` | PK，UUID | 与现有实体主键风格一致。 |
| `scope` | `varchar(16)` | 非空；枚举见 §2 | `system` = 全站系统助手；`personal` = 用户自有。 |
| `userId` | `varchar(36)` | 可空 | **个人助手** 必填，为创建者用户 id；**系统助手** 建议 **`NULL`**（表示无终端用户归属）。若需审计「由哪位管理员创建」，可另加 `createdByUserId`（本期可选，见 §4）。 |
| `name` | `varchar(64)` | 非空 | trim 后存储；与 PRD/设计 maxlength 对齐。 |
| `prompt` | `text` | 非空 | 提示词正文（system 行为说明）。 |
| `icon` | `varchar(16)` | 可空 | emoji 或短展示串。 |
| `openingMessage` | `text` | 可空 | 开场白；空则前端/对话侧用默认策略。 |
| `tags` | `simple-json` 或 `text` | 可空 | 字符串数组 JSON；读取时 `null` 当 `[]`。 |
| `createdAt` | `datetime` | 非空 | `CreateDateColumn`。 |
| `updatedAt` | `datetime` | 非空 | `UpdateDateColumn`。 |

### 1.3 索引（建议）

| 索引 | 列 | 用途 |
| --- | --- | --- |
| `IDX_assistants_scope_updated` | `scope`, `updatedAt` | 管理后台仅列 `system`、按时间排序。 |
| `IDX_assistants_user_updated` | `userId`, `updatedAt` | 个人助手按用户分页、排序。 |

可选复合：控制台合并列表以 `(scope, userId, updatedAt)` 查询为主时，由 3B 根据实际 SQL 再微调索引。

### 1.4 业务不变式

- `scope === personal` ⇒ `userId` **必须非空**。
- `scope === system` ⇒ `userId` **必须为 `NULL`**（若采用本方案）；避免与「个人」混淆。
- `tags`：持久化前 **trim**、去空串、列表内去重（大小写策略与 API 层一致）。

---

## 2. 枚举：`AssistantScope`

建议置于 `@/common/enums`（或专用模块导出）：

| 值 | 语义 |
| --- | --- |
| `system` | 系统（公有）助手，管理后台维护。 |
| `personal` | 个人助手，仅 `userId` 对应用户可写。 |

API JSON 与前端类型使用同一字符串字面量，与 `ModelConfigVisibility` 并列存在、语义类比但不共用（避免混淆密钥与助手域）。

---

## 3. DTO 形态（列表/详情，供 API 规范引用）

### 3.1 `AssistantListItem`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | UUID |
| `scope` | `AssistantScope` | `system` \| `personal` |
| `name` | string | |
| `prompt` | string | 详情与编辑必返；若列表页不需完整提示词可 3B 评估省略以减负载，**默认与 PRD「列表可展示」一致时保留或截断策略由实现定**。 |
| `icon` | string \| null | |
| `openingMessage` | string \| null | |
| `tags` | string[] | 空数组 |
| `createdAt` | string (ISO 8601) | |
| `updatedAt` | string (ISO 8601) | |

控制台列表若需减轻体积，可对 `prompt` 做 `preview` 截断字段，**须在 `api-spec.md` 中写死**，前后端一致。

---

## 4. 可选扩展（本期不强制）

| 项 | 说明 |
| --- | --- |
| `createdByUserId` | 系统助手记录「哪位管理员创建」，仅审计；不参与控制台权限判断。 |
| 软删除 `deletedAt` | PRD 为物理删除；若未来需要回收站再引入。 |

---

## 5. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-04-13 | 初稿：单表 + `scope` + 可空 `userId` |
