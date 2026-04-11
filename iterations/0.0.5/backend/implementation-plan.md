# 实现计划与风险（阶段 3B 预览）— 用户管理 0.0.5

本文档供 **阶段 3B（编码）** 执行时对照；**阶段 3A 未产生任何代码变更**（见文末声明）。

**输入依据**：`iterations/0.0.5/product/prd-user-management.md`、`iterations/0.0.5/design/spec-user-management.md`、`iterations/0.0.5/backend/api-spec-user-management.md`、`iterations/0.0.5/backend/data-models.md`。

---

## 1. 建议文件与模块布局

| 职责 | 建议路径 |
| --- | --- |
| 列表 + 分页 + `q` 搜索 | `src/app/api/admin/users/route.ts`（`GET`） |
| 按 id 更新 `status` | `src/app/api/admin/users/[id]/route.ts`（`PATCH`） |
| 重置密码（方案 A） | `src/app/api/admin/users/[id]/reset-password/route.ts`（`POST`） |
| 用户状态枚举 | `src/common/enums/user-status.ts`（示例名）+ `src/common/enums/index.ts` 导出 |
| 用户管理共享类型/DTO | `src/common/types/user-admin.ts`（示例名）+ `types/index.ts` 导出 |
| 列表查询与 DTO 组装（可选拆分） | `src/server/user-admin/*` 或 `src/server/db/repositories/user.ts`（与项目惯例对齐） |
| 登录失败锁：按 email **聚合**列表展示用锁定状态 | 扩展 `src/server/auth/login-fail-lock.ts`（**不提供**管理员按 email 全量清理 bucket 的对外 API） |

**约定**：所有 Route 的 `GET`/`PATCH`/`POST` 使用 **`withAdminApi`**；`export const runtime = "nodejs"`（与 `prompt-config` 一致，确保 TypeORM/bcrypt 在 Node 运行时）。

### 1.1 操作者（当前管理员邮箱）

凡本模块写操作在**结构化日志**（或后续审计）中需要 `operator` / `actor` 字段时，取值为 **`withAdminApi` 回调入参中的 `user.email`**（与 `requireAdminApi` 通过后实体一致），建议 **`trim().toLowerCase()`** 后与全站邮箱比较习惯对齐；**禁止**用固定字面量 `"admin"` 代替真实经办人邮箱（与 `api-spec-user-management.md` §1.0、PRD §5.3 一致）。

---

## 2. `login-fail-lock.ts` 扩展（列表只读聚合）

**现状**（只读事实）：

- `failBuckets: Map<string, FailBucket>`，key = `lockKey(email, ip)`。
- `clearLoginFailures(email, ip)` 仅删除**单一** `email|ip`（成功登录时调用）。
- 本迭代**不**增加「按 email 删除所有 bucket」的管理员 API（产品已取消解锁能力）。

**3B 建议**：

1. **`getLoginFailureAggregateForEmail(email: string): { locked: boolean; remainingMsMax: number }`**  
   - 遍历相关 key，若任一 `lockUntil > Date.now()` 则 `locked = true`，`remainingMsMax = max(lockUntil - now)`。  
   - 供 `GET /api/admin/users` 列表 DTO 填充 `loginFailureLocked` / `loginFailureLockRemainingMs`。

2. **中文注释**：新导出函数须在文件中用简短中文说明「多实例下仅本进程可见」，见 §4。

---

## 3. 迁移与数据库步骤

- **本迭代（推荐）**：**无表结构变更**（`data-models.md` 方案 A）。  
- **3B 自检**：确认 `User.status` 可写入 `disabled`；若 SQLite 中历史数据异常，按需一次性脚本修正（一般不需要）。

---

## 4. 风险与假设

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| **多实例部署 — 内存锁不一致** | `login-fail-lock` 为**进程内** Map | 列表上「锁定」展示仅反映**当前实例**视角，可能与用户实际登录命中实例不一致。长期方案：Redis / DB 字段 / 网关粘滞会话（超出 0.0.5）。 |
| **列表聚合开销** | 用户量大时，对每个用户遍历 Map 可能偏慢 | MVP 用户量可控时可接受；后续可维护 `email -> 聚合状态` 二级索引或限缩遍历范围。 |
| **临时密码泄露** | 方案 A 依赖运维安全传递 | HTTPS、一次性展示、前端 Modal 关闭后不保留（设计已定）；后端日志**禁止**打印 `temporaryPassword`。 |
| **管理员自操作** | 误停用/重置自己 | API 层拒绝自身 id 的高危操作（与 PRD §5.2 一致）。 |

---

## 5. 自测用例清单（3B 完成后执行）

### 5.1 鉴权

- [ ] 未带会话 / 未登录：`GET /api/admin/users` → `401` + `UNAUTHORIZED`。
- [ ] 已登录非白名单邮箱：`403` + `FORBIDDEN`。

### 5.2 列表

- [ ] 分页：`page=1&pageSize=10` 返回 `items.length <= 10`，`total` 正确。
- [ ] `q` 能匹配 `email` / `nickName` 子串；清空 `q` 恢复全量（第一页）。
- [ ] `status=disabled` 的用户 `accountDisabled === true`。

### 5.3 状态变更

- [ ] `PATCH` 将用户改为 `disabled` 后，该用户**登录失败**应返回与现网一致的「账号不可用」类错误（`AUTH_ACCOUNT_DISABLED` 等，以登录路由为准）。
- [ ] 不存在的 `id`：`404` + 拟定 `USER_NOT_FOUND`。

### 5.4 重置密码

- [ ] 响应含 `temporaryPassword`，且数据库 `passwordHash` 更新；用新密码可登录。
- [ ] 再次 `GET` 用户详情/列表：**无**明文密码字段。
- [ ] 可选：对**自身**重置被拒绝。

### 5.5 多实例（若有 staging）

- [ ] 两实例下列表「锁定」展示可能不一致 — 记录为**已知限制**（只读聚合，无解锁 API）。

---

## 6. 与既有代码对齐检查表

- [ ] `withAdminApi` + `jsonError` + `ErrorCode`/`HttpStatus`（`src/common/enums`）。
- [ ] 密码：`hashPassword`（`src/server/auth/password.ts`）。
- [ ] `getDataSource()` + `User` 实体查询/更新。
- [ ] 环境变量文档：**`ADMIN_USER`**（非 `ADMIN_EMAILS`）— 以 `src/server/auth/admin.ts` 为准。

---

## 7. 阶段 3A 声明

**迭代 0.0.5 阶段 3A（本文档所属阶段）未修改或新增任何项目源码文件**；仅创建/更新 `iterations/0.0.5/backend/` 下设计实现类 Markdown 文档。
