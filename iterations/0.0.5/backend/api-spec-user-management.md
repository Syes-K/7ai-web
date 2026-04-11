# API 规范：用户管理（管理端）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.0.5` |
| 前缀 | `/api/admin/users` |
| 鉴权 | 所有端点必须经 `withAdminApi`（见 `src/server/auth/with-admin-api.ts`），等价于先 `requireAdminApi`（`src/server/auth/admin.ts`） |
| 技术对齐 | Next.js Route Handlers；错误体与既有 admin API 一致（`src/server/http/json-response.ts` 的 `jsonError`） |
| 输入依据 | `iterations/0.0.5/product/prd-user-management.md`（含 §5.3 操作者约定）、`iterations/0.0.5/design/spec-user-management.md`（密码重置 **方案 A**：一次性临时密码） |

---

## 1. 通用约定

### 1.0 操作者（operator）记录

凡由本模块写接口（`PATCH` 状态、`POST` 重置密码）触发的、对用户数据或登录态产生变更的处理，在**需要记录操作者**的场合（结构化日志、审计扩展字段、未来审计表），**操作者标识写入当前会话管理员的邮箱**（即 `requireAdminApi` / `withAdminApi` 通过后得到的 `User.email`，建议存小写规范化形式，与 `admin.ts` 比较策略一致）。来源为**管理后台用户管理**可通过模块/路由元数据另行标注（与 PRD §5.3 一致）。

### 1.1 鉴权与环境

- **管理员判定**：会话用户邮箱在环境变量 **`ADMIN_USER`**（逗号分隔，忽略大小写）白名单内；见 `src/server/auth/admin.ts`（注释中「`ADMIN_USER`」为实际变量名）。
- **非管理员、未登录**：与现有行为一致 — `401` + `ErrorCode.UNAUTHORIZED`；`403` + `ErrorCode.FORBIDDEN`（`message` 如「无管理员权限」）。

### 1.2 成功响应

- `Content-Type: application/json; charset=utf-8`
- 业务数据置于 JSON 根级（与 `prompt-config` GET 类似），错误时**不**混用 HTTP 200 包错误业务码（错误一律走 `jsonError`）。

### 1.3 错误响应体结构

与 `src/app/api/admin/prompt-config/route.ts` 及 `jsonError` 一致：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "人类可读说明",
    "details": [{ "field": "可选", "message": "可选" }]
  }
}
```

`details` 仅在校验类错误需要字段级提示时出现。

### 1.4 HTTP 状态与 ErrorCode 映射（本模块）

| HTTP | ErrorCode | 典型场景 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 分页参数非法、`status` 非法、body 非 JSON |
| 401 | `UNAUTHORIZED` | 未登录 |
| 403 | `FORBIDDEN` | 非管理员；或**业务上禁止对当前会话用户自身**执行危险操作（可与产品约定，见 §4） |
| 404 | **建议 3B 新增** `RESOURCE_NOT_FOUND` 或 `USER_NOT_FOUND`（见 `data-models.md` / `implementation-plan.md`） | 目标用户 id 不存在 |
| 429 | `RATE_LIMITED` | 对「重置密码」等敏感操作做频控时（可选，3B 定阈值） |
| 500 | `INTERNAL_ERROR` | 未捕获异常、数据库失败 |

> **说明**：当前 `src/common/enums/http.ts` 中 `ErrorCode` **尚无** `NOT_FOUND` 类枚举值；3B 实现时建议**扩展**枚举并复用，避免与其它 admin API 风格分裂。

---

## 2. 用户列表 DTO（响应中的单条用户）

供 `GET` 列表与后续扩展复用；字段需支撑设计稿「状态」「锁定」两列。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 用户主键（UUID） |
| `email` | `string` | 登录账号 |
| `nickName` | `string` | 展示名 |
| `telNo` | `string \| null` | 手机号，可空 |
| `status` | `string` | 与 `User.status` 一致（见数据模型文档；当前库默认 `active`） |
| `createdAt` | `string` | ISO 8601 |
| `updatedAt` | `string` | ISO 8601 |
| `accountDisabled` | `boolean` | **派生**：`status !== "active"` 时视为账号层不可用（与登录链路 `user.status !== "active"` 对齐，见 `src/app/api/auth/login/route.ts`） |
| `loginFailureLocked` | `boolean` | **派生**：是否存在针对该 **email** 的登录失败内存锁且仍在锁定期（跨 IP 聚合，见 `implementation-plan.md` 与 `login-fail-lock`） |
| `loginFailureLockRemainingMs` | `number` | 可选；当 `loginFailureLocked === true` 时，建议返回**所有相关 bucket 中**剩余锁定时间的**最大值**（毫秒），便于运维展示倒计时；无锁时为 `0` |

> **语义区分**：**停用账号**（`status`）与 **登录失败锁**（进程内内存）是两类机制；列表仅**只读展示**锁定派生字段，**不提供**管理端解锁接口。

---

## 3. `GET /api/admin/users`

分页用户列表；支持可选关键字，与设计 §8 一致。

### 3.1 Query 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `page` | 整数 | 否 | 从 **1** 开始；默认 `1` |
| `pageSize` | 整数 | 否 | 默认建议 `20`，上限建议 `100`（超出返回 `VALIDATION_ERROR`） |
| `q` | 字符串 | 否 | 关键字；对 **`email`、`nickName`** 做模糊匹配（大小写策略与 SQLite 一致即可）；空串视为未传 |

### 3.2 响应 200

```json
{
  "items": [ /* 用户 DTO，见 §2 */ ],
  "total": 0,
  "page": 1,
  "pageSize": 20
}
```

- `total`：符合当前 `q` 条件的总条数（分页用）。

---

## 4. `PATCH /api/admin/users/[id]`

变更指定用户的 **`status`**（启用/停用类运维操作）。

### 4.1 Path

- `id`：目标用户 UUID。

### 4.2 请求体

```json
{
  "status": "active"
}
```

- `status`：允许值与 `User.status` 及本迭代枚举约定一致（推荐在 3B 引入 `@/common/enums` 中的用户状态枚举，如 `active` / `disabled`；**禁止**魔法字符串散落）。

### 4.3 响应 200

返回更新后的**用户 DTO**（§2），便于前端刷新行数据。

### 4.4 业务错误

- 用户不存在：`404` + 建议 `USER_NOT_FOUND` / `RESOURCE_NOT_FOUND`。
- **可选（建议）**：当前管理员对**自身**执行停用等操作：返回 `403` + `FORBIDDEN` 或 `VALIDATION_ERROR`，与 PRD §5.2「禁止对自己执行危险操作」对齐（具体码值 3B 与产品确认后写死）。

---

## 5. `POST /api/admin/users/[id]/reset-password`

**方案 A**：服务端生成随机**一次性临时密码**，**仅在本次响应**返回明文；与注册一致使用 **`bcryptjs`** 哈希入库（`src/server/auth/password.ts` 的 `hashPassword`）。

### 5.1 请求体

- 可为空对象 `{}`。

### 5.2 响应 200（或 201）

```json
{
  "temporaryPassword": "xxxxxxxx",
  "user": {
    "id": "...",
    "email": "...",
    "nickName": "...",
    "status": "active",
    "updatedAt": "..."
  }
}
```

- **`temporaryPassword`**：仅**本响应**返回一次；后续任何接口**不得**再返回该用户明文密码。
- `user`：返回必要字段供前端 Modal 展示标识与刷新列表；**勿**在其它 GET 中重复临时密码。

### 5.3 与设计对齐

- 前端在独立 Modal 中展示 `temporaryPassword`；关闭后不保留明文（设计 §7）。
- 密码生成：密码学安全随机串（长度 3B 建议 ≥ 12，与项目策略一致）。

### 5.4 业务错误

- 用户不存在：`404`。
- **建议**：当前管理员对**自身**账号重置：返回 `403`（或 `VALIDATION_ERROR`）并说明禁止自助场景走管理端重置。
- 频控：可选 `429` + `RATE_LIMITED`。

### 5.5 安全说明（接口契约层）

- 传输层建议使用 HTTPS（部署约定）。
- 审计：完整审计日志非本迭代 PRD 必交付项；若需日志可在 3B 打结构化 info 日志（不落明文密码）；**操作者字段**按 §1.0 记为**当前管理员邮箱**。

---

## 6. 与仓库路径对照（只读引用）

| 内容 | 路径 |
| --- | --- |
| 管理员 API 包装 | `src/server/auth/with-admin-api.ts` |
| 管理员鉴权 | `src/server/auth/admin.ts`（`requireAdminApi`、`ADMIN_USER`） |
| JSON 错误 | `src/server/http/json-response.ts` |
| 参考 admin Route 风格 | `src/app/api/admin/prompt-config/route.ts` |
| 密码哈希 | `src/server/auth/password.ts`（`hashPassword` / `verifyPassword`，`bcryptjs` rounds=10） |
| 登录失败锁 | `src/server/auth/login-fail-lock.ts` |
| ErrorCode | `src/common/enums/http.ts`（及 `src/common/enums/index.ts` 聚合导出） |

---

## 7. 阶段声明

**本文件为迭代 0.0.5 阶段 3A 产出；未修改或新增任何项目源码文件。**
