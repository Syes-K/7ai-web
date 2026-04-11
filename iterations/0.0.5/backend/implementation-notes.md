# 用户管理 — 服务端实现说明（0.0.5 / 3B）

## 代码位置

| 能力 | 路径 |
| --- | --- |
| 用户列表 `GET` | `src/app/api/admin/users/route.ts` |
| 状态 `PATCH` | `src/app/api/admin/users/[id]/route.ts` |
| 重置密码 `POST` | `src/app/api/admin/users/[id]/reset-password/route.ts` |
| DTO 组装 | `src/server/user-admin/map-to-dto.ts` |
| 登录失败锁聚合（列表只读） | `src/server/auth/login-fail-lock.ts` → `getLoginFailureAggregateForEmail` |

## 枚举与错误码

- `UserStatus`：`src/common/enums/user-status.ts`
- `ErrorCode.USER_NOT_FOUND`、`HttpStatus.NOT_FOUND`：`src/common/enums/http.ts`

## 操作者审计

写操作打结构化 `console.info` JSON（**不含**明文密码），字段 `operator` 为当前管理员邮箱（小写）。

## 自测建议

1. 配置 `ADMIN_USER` 包含当前测试管理员邮箱。
2. `GET /api/admin/users?page=1&pageSize=10&q=xxx`
3. `PATCH /api/admin/users/{id}` body `{"status":"disabled"}`，且对**自身 id** 应 `403`。
4. `POST /api/admin/users/{id}/reset-password` body `{}`，响应含 `temporaryPassword`，用新密码登录；日志中无密码明文。

---

**阶段 3B**：已实现上述 Route 与模块；迭代文档随代码落地更新。
