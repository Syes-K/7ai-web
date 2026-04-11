# 用户管理 — 前端实现说明（0.0.5）

## 代码位置

- 页面：`src/app/admin/users/page.tsx`（CSR，`App` 来自 `AdminShell` 的 `ConfigProvider` 包裹，可使用 `App.useApp()`）

## 行为摘要

- 列表：`GET /api/admin/users`，分页、关键字搜索、刷新；失败时 `Alert` + 重试。
- 行操作：启用/停用（`PATCH`）、重置密码（`POST`）；二次确认文案对齐 `iterations/0.0.5/design/spec-user-management.md`。
- 当前登录用户行：禁用「启用/停用」「重置密码」（与后端禁止自操作一致）。
- 重置成功：独立 `Modal` 展示一次性临时密码，`Input.Password` 只读 +「复制密码并关闭」。
- 401 / 403：与 `admin/prompts` 一致（跳转登录或控制台 `admin_forbidden`）。

## 自测

1. `ADMIN_USER` 含当前账号，访问 `/admin/users`。
2. 搜索、翻页、刷新；对非己用户停用/启用、重置密码并验证登录。
