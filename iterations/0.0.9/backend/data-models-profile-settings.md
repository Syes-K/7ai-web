# 数据模型：个人信息与默认模型偏好（0.0.9）

## 文档信息

| 项 | 内容 |
| --- | --- |
| 版本 | `0.0.9` |
| 阶段 | 3A（文档-only） |
| 上游 | PRD §5、design 默认语义 (a) |

---

## 1. 方案选型：**方案 A（推荐）**

在 **`users`（`User` 实体）** 增加 **可空** 外键式字段：

| 字段（建议名） | 类型 | 约束 |
| --- | --- | --- |
| `preferredModelConfigId` | `varchar(36)`，与 `UserModelConfig.id` 一致 | **可空**、`NULL` 表示未设置默认偏好 |

**推荐理由（相对方案 B）**：

1. **与 PRD 方案 A 一致**，产品已明确指针为「每用户最多一个」；单列即可表达，无需额外表。
2. **查询简单**：读取控制台聚合页时 **一次** 读 `User` + 可选 `LEFT JOIN` / 二次查询 `UserModelConfig`，无额外 `user_preferences` 行是否存在之分支。
3. **与现有实体对齐**：`UserModelConfig` 已按 `userId` 隔离；指针仅引用 `id`，归属校验在业务层 `userId` 一致即可。
4. **方案 B（独立表）** 适合未来「多类偏好键值、版本化、扩展元数据」；本期仅一项指针，独立表多一次 JOIN/查询，**收益不足**。

**方案 B 适用时机（后续迭代）**：若出现多条偏好记录、或非模型类偏好与账号配置并列扩展，再拆 `user_preferences` 或键值表。

---

## 2. `User` 表 / 实体变更说明

| 变更 | 说明 |
| --- | --- |
| 新增列 `preferredModelConfigId` | 可空；指向 `user_model_configs.id` |
| **不**新增邮箱相关列 | 邮箱只读为产品规则，仍用现有 `email` |
| 可选 TypeORM 关系 | `@ManyToOne(() => UserModelConfig, …, { nullable: true })` 或仅存字符串 id 由服务层校验（二选一，3B 与现有代码风格对齐） |

**SQLite / TypeORM**：若启用外键，删除 `UserModelConfig` 时建议 **`ON DELETE SET NULL`**，自动清空用户侧指针，避免悬空 id。

---

## 3. 与删除 `UserModelConfig` 的行为

| 策略 | 行为 | 与产品/设计 |
| --- | --- | --- |
| **推荐** | 删除某条 `UserModelConfig` 时，若 `users.preferredModelConfigId` 等于该 id，**同一事务内置为 `NULL`** | 用户无需先改偏好再删；与 design §8.3「失效后可重选」一致 |
| **备选** | 若产品坚持「占用中不可删」，`DELETE` 返回 **`409 Conflict`** + 明确错误码 | 需产品确认；实现与文案成本更高 |

本迭代文档 **推荐自动清空**，**不推荐**对「当前默认」删行返回 409，除非 PRD 修订。

---

## 4. `PATCH` 偏好时的校验

1. `preferredModelConfigId` 非空 → 必须存在 `UserModelConfig` 且 **`userId === 当前用户`**。
2. 若传入已删除 id → **`MODEL_CONFIG_NOT_FOUND`**（与列表不存在一致）。
3. 若数据库中存在**脏指针**（历史 bug 或并发）：`GET` 侧标记 `preferenceStale: true`；可选在 GET 或 PATCH 时 **顺带写回 `NULL`** 修复。

---

## 5. 枚举与常量（3B 落地时）

- **不**为指针单独建业务 `enum`（其为 UUID 引用）。
- 手机号长度、昵称长度等若与注册共享，放在 **`@/common/constants`**；错误码用现有 **`ErrorCode`**，新增仅在必要时经评审加入 **`@/common/enums`**。

---

## 6. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-04-12 | 3A 初稿：推荐方案 A |
