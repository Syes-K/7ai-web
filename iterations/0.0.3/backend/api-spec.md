# API 规格说明（迭代 0.0.3 — 管理后台壳）

## 1. 本迭代结论：无新增 API

**本版本（0.0.3）不新增、不修改任何 Route Handler 契约。**  
管理后台（`/admin/**`）依赖 **0.0.2 已存在的认证与会话能力**；与 PRD「不强制新后端 API」一致。

---

## 2. 与 admin 壳衔接的既有接口

以下路径均为工程内既有实现（`src/app/api/auth/**`），admin 前端（CSR）可与 **控制台 `ConsoleView`** 采用同一模式：**先拉取当前用户，再渲染受保护界面**。

### 2.1 `GET /api/auth/me`

| 项 | 说明 |
| --- | --- |
| 用途 | 校验会话是否仍有效（含 Cookie 存在但服务端会话已失效的场景）。 |
| 成功 `200` | 响应体：`{ user: PublicUser }`（字段与 `toPublicUser` 一致：`id`、`email`、`nickName`、`telNo`）。 |
| 未登录 `401` | 响应体：`{ error: { code: "UNAUTHORIZED", message: "未登录" } }`（`Content-Type: application/json; charset=utf-8`）。 |

**与 admin（设计 §9 / US-ADM-004）的衔接建议：**

- 在 **未拿到 200** 前，仅展示全页轻量加载（如「验证会话…」），**不渲染** ProLayout/占位业务区，避免「看似已登录」。
- 收到 **401** 时：`router.replace("/login?redirect=<当前路径含 query>")`，与 console 使用 `redirect=/console` 的模式一致，将 `redirect` 改为实际访问的 admin 路径（如 `/admin/config`）。

### 2.2 `POST /api/auth/login`

| 项 | 说明 |
| --- | --- |
| 用途 | 登录并下发会话 Cookie。 |
| 请求体 | `LoginRequestBody`（含 `email`、`password`、`captchaId`、`captcha`，及可选 `redirect`）。 |
| 成功 `200` | `{ ok: true, user: PublicUser, redirectUrl }`，且 `Set-Cookie` 写入会话。 |
| 常见错误 | `400`：`VALIDATION_ERROR`、`CAPTCHA_*`、`AUTH_INVALID_CREDENTIALS` 等；`403`：`AUTH_ACCOUNT_DISABLED`；`429`：`RATE_LIMITED`。错误体：`{ error: { code, message } }`。 |

**与 admin 的衔接说明：**  
登录/注册成功后的 `redirectUrl` 经 `safeRedirectUrl` 校验（`src/common/utils/redirect.ts`）。**3B 已扩展**：允许 **`/`、`/chat`、`/console`、`/admin`** 精确路径，以及 **`/admin/...`** 前缀路径（禁止路径中含 `..`）。从 `/login?redirect=/admin/config` 登录成功后应回到对应 admin 路径。

### 2.3 `POST /api/auth/logout`

| 项 | 说明 |
| --- | --- |
| 用途 | 销毁服务端会话并清除 Cookie。 |
| 成功 `200` | `{ ok: true }`，`Set-Cookie` 清除会话。 |

与 design §4 Header 下拉「退出」一致：前端调用后跳转登录或首页即可。

### 2.4 其他匿名可访问认证相关接口（admin 壳一般不直接依赖）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/auth/captcha` | 图形验证码签发。 |
| `POST` | `/api/auth/register` | 注册（成功后同样可能带 `redirectUrl`，受 `safeRedirectUrl` 白名单约束）。 |

`middleware` 对 `/api/auth/*` **仅放行 + 限流**，不因无 Cookie 重定向到登录页。

---

## 3. 中间件与「无 Cookie」重定向

`src/middleware.ts` 的 `config.matcher` 包含：

- `/chat`、`/chat/:path*`
- `/console`、`/console/:path*`
- **`/admin`、`/admin/:path*`**（**3B**：与 console 对齐，无会话 Cookie 时重定向 `/login?redirect=<pathname+search>`）
- `/api/auth/:path*`（仅放行 + 限流，不因无 Cookie 重定向）

无 `SESSION_COOKIE` 时，受 matcher 覆盖的页面路由（含 `/admin/**`）与 chat/console 行为一致。

---

## 4. 错误码与 HTTP 状态约定（沿用）

统一错误 JSON：

```json
{ "error": { "code": "<ErrorCode>", "message": "<人类可读文案>" } }
```

常用 `ErrorCode`（节选）：`UNAUTHORIZED`、`VALIDATION_ERROR`、`RATE_LIMITED`、`CAPTCHA_REQUIRED`、`CAPTCHA_INVALID`、`AUTH_INVALID_CREDENTIALS`、`AUTH_ACCOUNT_DISABLED` 等（定义见 `@/common/enums`）。

---

## 5. 修订记录

| 版本 | 日期 | 说明 |
| --- | --- | --- |
| 0.0.3 | 2026-04-10 | 3A：无新增 API；罗列既有 auth 与 admin 衔接及中间件/redirect 注意点 |
| 0.0.3 | 2026-04-10 | 3B：middleware 纳入 `/admin`；`safeRedirectUrl` 允许 `/admin` 与 `/admin/**` |
