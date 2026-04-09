# API 规范（认证域）- version 0.0.2

## 1. 文档信息

| 项 | 内容 |
| --- | --- |
| 版本 | 0.0.2 |
| 范围 | 图形验证码、注册、登录、会话、登出、当前用户查询（供前端对接） |
| 上游 | `iterations/0.0.2/product/*.md`、`iterations/0.0.2/design/spec-auth-pages.md` |
| 技术约束 | **Next.js** Route Handlers（`app/api/**/route.ts`）为主；需与页面交互处可用 **Server Actions**；**TypeORM + SQLite** 持久化；**LangChain** 仅作后续对话等能力占位，本迭代认证接口不依赖 LangChain |

## 2. 通用约定

### 2.1 传输与格式

- **Base path**：`/api`（与 Next.js App Router 惯例一致）。
- **Content-Type**：`application/json; charset=utf-8`（除验证码图片为 `image/png` 的专用响应外）。
- **字符编码**：UTF-8。
- **时间字段**：建议使用 ISO 8601 字符串（UTC 或带偏移，全项目统一一种并在实现说明中固定）。

### 2.2 认证与会话

- **会话载体**：HTTP **Cookie**（服务端签发、校验），实现阶段约定 Cookie 名（例如 `session` 或带项目前缀），属性建议：
  - `HttpOnly`、`Path=/`、`SameSite=Lax`（若全站 HTTPS 且子域无跨站需求可评估 `Strict`）；
  - `Secure`：生产环境为 **true**；
  - **不设**长期「记住我」分轨时，采用统一 `Max-Age`/`Expires`（具体秒数在实现阶段与 `implementation-plan.md` 一致）。
- **登录/注册成功**：响应中通过 `Set-Cookie` 建立会话；**登出成功**：`Set-Cookie` 清除或过期会话 Cookie。
- **与渲染策略关系**：
  - **首页 `/`、登录 `/login`、对话 `/chat`**：按产品约束为 **SSR**；服务端在渲染前可读取 Cookie 判断登录态（具体见 `implementation-plan.md`）。
  - **控制台 `/console`**：为 **CSR**；首屏可在客户端请求「当前用户」接口以同步导航/菜单态（见 §4.6）。

### 2.3 查询参数 `redirect`（登录/注册成功后）

- **参数名**：建议统一为 `redirect`（与 `requirements.md` FR-AUTH-006 一致）。
- **语义**：登录或注册 **302/303 重定向** 或 JSON 响应携带 `redirectUrl` 时，目标须落在 **服务端维护的允许列表（白名单）** 内；否则回退默认 **`/`**。
- **白名单建议**（实现可配置）：本站路径前缀下的 **`/`、`/chat`、`/console`**（按需可含 `/login`、`/register` 一般不应作为登录成功落地，可排除）；**禁止**开放协议相对 URL 跳转到外站（如 `//evil.com`）。
- **编码**：对 `redirect` 做 URL 解码后再校验；仅允许 **path** 形式（以 `/` 开头），拒绝绝对 URL 与外域。

### 2.4 错误响应体（统一信封）

成功时 HTTP 状态码 **2xx**，正文为业务 JSON（见各接口）。

失败时正文建议统一为：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "对用户或前端可展示的简短说明（中文）"
  }
}
```

- **`message`**：须符合产品文案策略（如登录凭证错误不区分邮箱是否存在），可与 `spec-auth-pages.md` 对齐；**不得**在客户端依赖英文 `code` 做展示。
- **字段校验错误**（可选细化）：可增加 `details: [{ "field": "email", "code": "INVALID_FORMAT" }]`，便于表单级展示；若首期仅卡片级错误，可仅返回 `message`。

### 2.5 HTTP 状态码使用原则

| HTTP | 含义 |
| --- | --- |
| 200 | 成功（含 JSON 业务成功） |
| 201 | 创建成功（可用于注册成功，若与 200 二选一须全项目统一） |
| 204 | 成功无正文（可用于 DELETE/部分 logout 场景；若 logout 需清 Cookie 仍可能带 `Set-Cookie`，用 200 亦可） |
| 400 | 请求参数不合法、验证码错误、密码策略失败等 |
| 401 | 未登录访问需鉴权接口 |
| 403 | 账号被禁用等「已识别身份但禁止操作」 |
| 429 | 频控 |
| 500 | 服务器内部错误 |

---

## 3. 业务错误码（`error.code`）

以下为建议枚举，实现时保持一致并在此表增补：

| code | HTTP 倾向 | 说明 | 对外 message 策略 |
| --- | --- | --- | --- |
| `VALIDATION_ERROR` | 400 | 通用参数/格式校验失败 | 可含字段说明或汇总 |
| `CAPTCHA_INVALID` | 400 | 图形验证码错误或过期 | 与凭证错误区分，见设计规范 |
| `CAPTCHA_REQUIRED` | 400 | 未带验证码或缺少 captchaId | — |
| `AUTH_INVALID_CREDENTIALS` | 400 或 401 | 登录邮箱或密码不匹配（**含邮箱未注册**） | **统一**「邮箱或密码错误…」，不泄露枚举 |
| `AUTH_EMAIL_TAKEN` | 400 | 注册时邮箱已存在 | 明确「该邮箱已注册」+ 引导登录 |
| `AUTH_TEL_TAKEN` | 400 | 注册时手机号已被占用 | 明确占用 |
| `AUTH_ACCOUNT_DISABLED` | 403 | 用户被禁用/冻结 | 可用业务原因或通用不可用 |
| `RATE_LIMITED` | 429 | 触发频控 | 「请求过于频繁…」 |
| `INTERNAL_ERROR` | 500 | 未预期错误 | 通用失败提示，不暴露堆栈 |

> **注意**：`AUTH_INVALID_CREDENTIALS` 在邮箱不存在与密码错误时**同一 code、同一对外文案**。

---

## 4. 接口清单

### 4.1 获取图形验证码

**用途**：登录页、注册页加载或刷新验证码；**服务端生成答案并存储**，客户端仅展示图片并提交用户输入。

| 项 | 内容 |
| --- | --- |
| Method / Path | `GET /api/auth/captcha` |
| Auth | 不需要 |

**成功 200**

两种等价形态二选一（实现阶段固定一种并在实现说明中写明）：

**形态 A（推荐，JSON + Base64）**

```json
{
  "captchaId": "string（一次性标识）",
  "imageBase64": "data:image/png;base64,...."
}
```

**形态 B（图片二进制）**

- `Content-Type: image/png`
- 通过 `Set-Cookie` 下发与本次图片绑定的 `captchaId`（HttpOnly），前端提交时 Cookie 自动携带；文档须说明与形态 A 的互斥关系。

**失败**：`500` + `INTERNAL_ERROR`（或 `429`）。

**说明**

- `captchaId` 与正确答案在服务端**短时 TTL** 内有效，校验成功后**立即作废**（防重放）。
- 频控：见 `implementation-plan.md`（如对 IP/指纹限流）。

---

### 4.2 用户注册

| 项 | 内容 |
| --- | --- |
| Method / Path | `POST /api/auth/register` |
| Auth | 不需要 |

**请求体（JSON）**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `email` | string | 是 | 邮箱，登录账号，唯一 |
| `password` | string | 是 | 明文由 HTTPS 传输；服务端校验策略见需求 |
| `passwordConfirm` | string | 是 | 须与 `password` 一致 |
| `nickName` | string | 是 | 1–32 字符等非空规则见实现 |
| `telNo` | string \| null | 否 | 若提供则 11 位数字；**唯一**（库表层 nullable unique） |
| `captchaId` | string | 是 | 自 §4.1 |
| `captcha` | string | 是 | 用户输入的验证码字符（大小写策略实现约定，建议**不区分大小写**降低误伤） |
| `redirect` | string | 否 | URL 查询串亦可传，若仅 body 传需在实现中二选一并文档化 |

**成功 200 或 201**

```json
{
  "ok": true,
  "user": {
    "id": "string",
    "email": "user@example.com",
    "nickName": "string",
    "telNo": "13800138000" | null
  },
  "redirectUrl": "https://host/ 或 path"
}
```

- 同时 **`Set-Cookie`** 建立会话。
- `redirectUrl`：若请求合法 `redirect` 且在白名单内则为其规范化后的绝对 URL 或 path；否则为 `/`。

**失败**：见 §3（如 `CAPTCHA_INVALID`、`AUTH_EMAIL_TAKEN`、`AUTH_TEL_TAKEN`、`VALIDATION_ERROR`、`RATE_LIMITED`）。

---

### 4.3 用户登录

| 项 | 内容 |
| --- | --- |
| Method / Path | `POST /api/auth/login` |
| Auth | 不需要 |

**请求体（JSON）**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `email` | string | 是 | 登录账号（邮箱） |
| `password` | string | 是 | — |
| `captchaId` | string | 是 | 自 §4.1 |
| `captcha` | string | 是 | 用户输入 |
| `redirect` | string | 否 | 成功落地白名单校验 |

**成功 200**

```json
{
  "ok": true,
  "user": {
    "id": "string",
    "email": "user@example.com",
    "nickName": "string",
    "telNo": "string | null"
  },
  "redirectUrl": "/ 或合法 redirect"
}
```

- **`Set-Cookie`** 建立会话。

**失败**

- `AUTH_INVALID_CREDENTIALS`：**邮箱或密码错误**统一对外文案。
- `CAPTCHA_INVALID`：验证码错误（勿与上面混用文案）。
- `AUTH_ACCOUNT_DISABLED`：`403`。
- `RATE_LIMITED`：`429`。

---

### 4.4 登出

| 项 | 内容 |
| --- | --- |
| Method / Path | `POST /api/auth/logout` |
| Auth | 需要会话（无会话时可幂等返回成功，实现约定） |

**请求体**：可选空 JSON `{}`。

**成功 200**

```json
{ "ok": true }
```

- **`Set-Cookie`** 清除会话。

---

### 4.5 当前用户（可选但强烈建议用于 CSR 控制台与导航）

| 项 | 内容 |
| --- | --- |
| Method / Path | `GET /api/auth/me` 或 `GET /api/auth/session` |
| Auth | 需要 Cookie |

**成功 200**

```json
{
  "user": {
    "id": "string",
    "email": "string",
    "nickName": "string",
    "telNo": "string | null"
  }
}
```

**未登录 401**

```json
{ "error": { "code": "UNAUTHORIZED", "message": "未登录" } }
```

> **控制台不区分 admin/user**（延续项目约定）：响应中**不包含**角色字段；若未来扩展，再版本化 API。

---

### 4.6 与页面路由、保护范围的关系

- **产品基线**（`requirements.md` FR-AUTH-007）：**未登录**访问 **`/chat`、`/console`** 须引导至登录；**首页 `/` 默认可公开访问**。
- 若工程上中间件将 **`/`** 也纳入「需登录」范围，属**产品变更**，须修订需求后再实现；本 API 契约以 **白名单 redirect** 与 **会话存在** 能力支撑两种中间件策略。
- **受保护路由（实现默认建议）**：至少 **`/chat`**、**`/console`** 的服务端渲染或数据拉取前校验会话；**`/login`、`/register`** 对已登录用户可重定向至 `/`（可选产品优化，非必须）。

---

## 5. 安全与合规（接口侧）

- 密码不得写入 URL、不得出现在日志明文。
- 图形验证码：**仅服务端**校验；客户端比对无效。
- 登录失败：**不**在响应中区分「邮箱不存在」与「密码错误」。
- 注册失败：邮箱冲突**允许**明确提示（与登录策略不同，见需求）。

---

## 6. 与前端字段对齐（摘要）

| 前端/设计字段 | API 字段 |
| --- | --- |
| 邮箱 | `email` |
| 密码 | `password` |
| 确认密码 | `passwordConfirm` |
| 昵称 | `nickName` |
| 手机号 | `telNo`（可选） |
| 验证码输入 | `captcha` |
| 验证码实例 | `captchaId`（与 GET captcha 返回一致） |

---

## 7. 修订记录

| 版本 | 说明 |
| --- | --- |
| 0.0.2 | 初版：认证域 REST/JSON 契约、错误码、验证码与登录注册会话登出 |
