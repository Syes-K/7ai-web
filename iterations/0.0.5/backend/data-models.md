# 数据模型：用户管理（0.0.5）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.0.5` |
| 持久化 | TypeORM + SQLite（`src/server/db/data-source.ts`） |
| 实体 | `src/server/db/entities/User.ts` |

---

## 1. 现有 `User` 实体字段（只读事实）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `varchar(36)` PK | UUID |
| `email` | `varchar(255)` unique | 登录账号 |
| `telNo` | `varchar(20)` nullable unique | 手机号 |
| `passwordHash` | `varchar(255)` | bcrypt 哈希 |
| `nickName` | `varchar(64)` | 昵称 |
| `status` | `varchar(32)` default `"active"` | 业务状态字符串 |
| `createdAt` / `updatedAt` | `datetime` | TypeORM 时间戳 |

- **无**独立「锁定」列；登录失败锁定在 **`src/server/auth/login-fail-lock.ts`** 中为 **进程内 `Map`**，key 为 `email|ip`，**非**数据库字段。

---

## 2. 业务状态 `status`（与 PRD/设计对齐）

当前登录逻辑（`src/app/api/auth/login/route.ts`、`src/server/auth/session-user.ts`）以 **`status === "active"`** 作为账号可用条件。

**本迭代推荐约定：**

| 值 | 含义 |
| --- | --- |
| `active` | 正常，允许登录（在未被登录失败锁拦截时） |
| `disabled` | 停用，拒绝登录（展示层「启用/停用」） |

> 若历史数据仅有 `active`，迁移/默认值在 3B 处理；新代码应通过 **`@/common/enums`** 中 **TypeScript `enum`（或常量对象）** 统一定义用户状态，避免散落字符串（工作流「枚举建模约束」）。

---

## 3. 是否新增表字段？

### 3.1 `lockedUntil` 或独立「锁定」列

| 方案 | 说明 | 本迭代建议 |
| --- | --- | --- |
| **A. 不改表** | 账号停用仅用 `status`；临时「登录失败锁」继续只存内存 | **推荐**：与设计/PRD 及现有实现一致，**零迁移** |
| **B. 新增 `lockedUntil`（或布尔+时间）** | 持久化锁定，利于多实例一致与审计 | **非必须**；若未来要多实例共享锁定或合规审计，再开迁移 |

**结论（3A）**：优先 **方案 A — 本迭代不新增列**；`User` 表保持现状，`reset-password` 仅更新 `passwordHash` 与 `updatedAt`。

### 3.2 操作者字段（与 PRD §5.3 对齐）

若 3B 在**日志或审计**中记录「谁触发了管理端变更」，**操作者标识为当前会话管理员的邮箱**（与 `withAdminApi` 注入的 `user.email` 一致，建议规范化小写）。若未来在用户表增加 `lastUpdatedBy`（或等价列），管理端写操作应写入**该邮箱字符串**；具体是否加列以 3B 实现为准，**本 3A 文档不强制改表**。

### 3.3 若未来采用方案 B（预留说明）

- 需 TypeORM migration（或 `synchronize` 策略与团队约定一致时的变更说明）。
- 与内存锁并存时需定义**优先级**（通常 DB 锁定优先于内存锁），避免双轨语义冲突 — **不在 0.0.5 强制实现**。

---

## 4. API 层 DTO 与存储边界

- **列表/详情 DTO**：见 `api-spec-user-management.md` §2；其中 `accountDisabled`、`loginFailureLocked`、`loginFailureLockRemainingMs` 为 **计算字段**，不直接对应单列；**不提供**管理端「解锁」写接口，仅用于列表只读展示。
- **`loginFailureLocked`**：由 `login-fail-lock` 模块对给定 `email` **扫描/聚合**所有相关 key 得到（3B 需新增辅助函数，见 `implementation-plan.md`）。

---

## 5. ErrorCode 扩展建议（3B）

当前 `src/common/enums/http.ts` 中 `ErrorCode` 无资源不存在类码。建议新增其一：

- `USER_NOT_FOUND` — 管理端操作用户 id 不存在；或
- 通用 `RESOURCE_NOT_FOUND` — 便于其它 admin 资源复用。

并在 `HttpStatus` 中保证 `404` 与 body `error.code` 一致使用。

---

## 6. 阶段声明

**本文件为迭代 0.0.5 阶段 3A 产出；未修改或新增任何项目源码文件。**
