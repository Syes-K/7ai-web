# 实现记录：API 统一包装与日志（迭代 0.1.5）

## 1. 模块与职责

### 1.1 `withApiWrapper`（`src/server/http/with-api-wrapper.ts`）

- **作用**：Route Handler 统一入口；**默认最外层**为 `withApiLog`（见下），内层可按数组顺序组合 `extras`（如 `withAdminApi`）。
- **用法**：
  - 仅日志：`export const POST = withApiWrapper(async (req: Request) => { ... });`
  - 管理端：`export const GET = withApiWrapper([withAdminApi], async (user, request, ctx) => { ... });`
- **类型**：单参数重载保留 handler 签名；带 `extras` 的重载返回 `any`，以兼容 `withAdminApi` 与 App Router 导出签名差异（见文件内注释）。

### 1.2 `withApiLog`（`src/server/http/with-api-log.ts`）

- **作用**：包装第一个参数为 `Request` 的 handler，在调用前打 **`api.request`**。
- **字段**：`method`、`href`、`referer`、`contentType`、`contentLength`、`hasBody`（`request.body != null`）。
- **说明**：`request.body` 为 **ReadableStream**，`JSON.stringify` 常为 `{}`，且读取会消费流，故**不**记录原始 `body`。
- **注意**：当前实现仅记录请求开始；若需 **`api.response` / 耗时 / 异常** 与 `withApiWrapper` 文档对齐，可在本文件补全 try/catch/finally（以仓库代码为准）。

### 1.3 日志落盘（`src/server/logs/*`）

- **`@/server/logs`**（`index.ts` → `log-handlers.ts`）：控制台 + **`appendLogFileLine`**（`log-file-append.ts`），按本地时区小时文件 `.logs/YYYY-MM-DD-HH.log`。
- **`logger-console.ts`**：仅控制台，供 **Edge** 等不能使用 `fs` 的场景预留；当前 **Middleware 已不再引用**。

### 1.4 Middleware（`src/middleware.ts`）

- 已删除 `logger.info("request.start" | "request.end", …)`，避免与 Node API 日志重复。
- 仍包含：全站/接口限流、未登录重定向、`/admin` 下 `x-admin-login-redirect` 等。

### 1.5 协作约定（`.cursor/agents/backend.md`）

- 新增 **API 包装约束**：`src/app/api/**/route.ts` 导出应经 `withApiWrapper`；管理端组合 `withApiWrapper([withAdminApi], …)`。

---

## 2. 涉及的主要路径

| 路径 | 说明 |
| --- | --- |
| `src/server/http/with-api-wrapper.ts` | 统一包装 |
| `src/server/http/with-api-log.ts` | API 请求日志 |
| `src/server/logs/log-handlers.ts` | Node logger |
| `src/server/logs/log-file-append.ts` | 按小时追加文件 |
| `src/server/logs/logger-console.ts` | Edge 专用控制台 logger（预留） |
| `src/middleware.ts` | 无 request 级 logger |
| `src/app/api/**/route.ts` | 已改用 `withApiWrapper` |

---

## 3. 变更记录

| 日期 | 说明 |
| --- | --- |
| 2026-04-16 | 初稿：同步 withApiWrapper、withApiLog 元数据、Middleware 去日志、迭代文档 0.1.5。 |
