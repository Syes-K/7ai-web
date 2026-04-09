# 数据模型（认证域）- version 0.0.2

## 1. 文档信息

| 项 | 内容 |
| --- | --- |
| 版本 | 0.0.2 |
| 持久化 | **TypeORM + SQLite** |
| 上游 | `iterations/0.0.2/product/requirements.md` |

---

## 2. 实体：User（用户）

存储注册用户的账户信息；**登录账号为邮箱**。

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | string (UUID) 或 integer | PK | 主键；UUID 利于合并环境，自增整数亦可，实现择一并统一 |
| `email` | string | **UNIQUE NOT NULL** | 登录账号；格式校验在应用层 |
| `telNo` | string \| null | **UNIQUE**（SQLite 多 NULL 行为须在迁移中验证） | 可选；若填写则 11 位数字且唯一 |
| `passwordHash` | string | NOT NULL | 密码哈希（算法见 `implementation-plan.md`），**禁止**存明文 |
| `nickName` | string | NOT NULL | 展示昵称；长度与字符集约束在应用层（建议 1–32） |
| `status` | enum / string | NOT NULL，默认 `active` | 如：`active`、`disabled`；用于 FR-AUTH-005 账号不可用 |
| `createdAt` | datetime | NOT NULL | 创建时间 |
| `updatedAt` | datetime | NOT NULL | 更新时间 |

**索引**

- 唯一索引：`email`
- 唯一索引：`telNo`（SQLite 下对多 NULL 的唯一性：通常允许多条 NULL，与「可选手机」一致）

**业务规则（与库表互补）**

- 密码策略：`requirements.md`（≥8、字母+数字、不得与邮箱全文相同）。
- `telNo` 为空：不参与唯一冲突；有值则与他人冲突时报 `AUTH_TEL_TAKEN`。

---

## 3. 实体：Session（会话）

将「已登录态」与浏览器 Cookie 绑定；具体形态二选一，实现阶段在 `implementation-plan.md` 定稿。

### 方案 A：服务端会话表（推荐与 TypeORM 一致）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | string | PK | 随机高熵 **session id**，放入 Cookie |
| `userId` | User.id 类型 | FK NOT NULL | 关联用户 |
| `expiresAt` | datetime | NOT NULL | 过期时间 |
| `createdAt` | datetime | NOT NULL | 创建时间 |
| `lastSeenAt` | datetime | 可选 | 滑动过期时可更新 |

**索引**：`userId`（便于登出所有设备时可扩展）；`expiresAt`（定时清理）。

Cookie 中存 **`id`**（或签名后的 token，若采用 HMAC 则另述）。

### 方案 B：仅 JWT（无服务端存储）

- 若团队选择 JWT：**仍须**在文档中说明刷新、吊销与登出策略（如黑名单或短 TTL + refresh）；本迭代若无强需求，**优先方案 A** 以便登出即失效。

---

## 4. 图形验证码：存储模型

验证码需 **短时保存正确答案**，与 `captchaId` 绑定。

### 方案 A：数据库表 `CaptchaChallenge`（简单、可审计）

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | string | PK（即 API 的 `captchaId`） |
| `answerHash` 或 `answerNormalized` | string | 存哈希或规范化后的答案（推荐哈希防拖库） |
| `expiresAt` | datetime | NOT NULL |
| `consumedAt` | datetime | NULL，校验成功置非空 |

### 方案 B：进程内 LRU + Redis 类（本仓库若仅 SQLite，可先用内存 + TTL，多实例部署时需改为共享存储）

- 0.0.2 单实例开发：**可**用内存 Map；**须在实现说明中写明**生产多节点必须外置存储或回退方案 A。

---

## 5. 非本迭代实体占位（与架构约束）

以下**不**在本迭代建完整业务表，仅作后续衔接说明：

| 领域 | 说明 |
| --- | --- |
| **对话 / LangChain** | 对话消息、链路与工具调用等由后续版本建模；本迭代**不**为 LangChain 增加持久化表，仅在架构上保留「后续对话能力」扩展点。 |

---

## 6. 与 API 响应 DTO 的映射

- `GET /api/auth/me` 的 `user`：**不得**返回 `passwordHash`。
- 对外字段：`id`、`email`、`nickName`、`telNo`（nullable）。

---

## 7. 控制台角色

- **不区分 admin / user**：`User` 表**无** `role` 字段；若未来需要 RBAC，再迁移新增表或字段。

---

## 8. 修订记录

| 版本 | 说明 |
| --- | --- |
| 0.0.2 | 初版：User、Session、验证码存储选项 |
