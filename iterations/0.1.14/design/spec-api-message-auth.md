# API 错误消息规格 — 认证域（version 0.1.14）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.14` |
| 命名空间 | `api.message`（`messages/{locale}/api/message.json`） |
| 策略 | **Q1-A**：服务端 `resolveRequestLocale` 后填充已翻译 `error.message` |
| 映射 | **Q4-B**：前端 `map*ApiError` 优先 `error.code` |
| 上游 | `user-stories-api-i18n.md`、`prd.md` §C |

---

## 1. Locale 解析（服务端）

### 1.1 顺序（Q5-A / AC-A1）

| 优先级 | 来源 |
| --- | --- |
| 1 | Cookie `NEXT_LOCALE` |
| 2 | Header `Accept-Language`（`zh*` → `zh`，否则 `en`） |
| 3 | 默认 `en` |

### 1.2 调用点（实现参考，非本期代码）

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `GET /api/auth/captcha`（错误路径）
- `middleware.ts` `jsonError`（`RATE_LIMITED`、`UNAUTHORIZED`）
- `server/auth/admin.ts`

### 1.3 构造方式（设计约定）

```typescript
// 示意
const locale = resolveRequestLocale(request);
const message = tApi(locale, "authInvalidCredentials");
return jsonError(ErrorCode.AUTH_INVALID_CREDENTIALS, message, status);
```

客户端**继续**直接展示 `error.message`，无需 `useTranslations('api.message')`。

---

## 2. ErrorCode ↔ message key 映射表

| ErrorCode | message key | 字段映射（前端） | 本期必达 |
| --- | --- | --- | --- |
| `RATE_LIMITED` | 见 §2.1 细分 | `general` | ✓ |
| `UNAUTHORIZED` | `unauthorized` | `general` / 非表单 | ✓ |
| `FORBIDDEN` | `forbidden` | `general` | ✓ |
| `VALIDATION_ERROR` | §2.2 细分 | 按场景/子串 | 渐进 |
| `CAPTCHA_REQUIRED` | `captchaRequired` | `captcha` | ✓ |
| `CAPTCHA_INVALID` | `captchaInvalid` | `captcha` | ✓ |
| `AUTH_INVALID_CREDENTIALS` | `authInvalidCredentials` | `password` | ✓ |
| `AUTH_ACCOUNT_DISABLED` | `authAccountDisabled` | `general` | ✓ |
| `AUTH_EMAIL_TAKEN` | `authEmailTaken` | `email` | ✓ |
| `AUTH_TEL_TAKEN` | `authTelTaken` | `telNo` | ✓ |
| —（注册 gate） | `authAdminLoginRequired` | `general` | ✓ |
| —（注册 gate） | `authAdminOnly` | `general` | ✓ |
| `RATE_LIMITED`（登录锁定） | `authLoginLocked` | `general` | ✓ |

### 2.1 `RATE_LIMITED` 细分 key

| 场景 | key | 现网中文 |
| --- | --- | --- |
| 通用 API 频控 | `rateLimited` | 请求过于频繁，请稍后再试 |
| Middleware 站点频控 | `rateLimitedSite` | 站点访问过于频繁，请稍后再试 |
| 登录失败锁定 | `authLoginLocked` | 登录失败次数过多，请 {minutes} 分钟后再试 |

服务端按调用场景选择 key；响应 `code` 仍为 `RATE_LIMITED`。

### 2.2 `VALIDATION_ERROR` 细分 key（Q9 定稿）

| 场景 | key | 现网中文 |
| --- | --- | --- |
| 通用回退 | `validationError` | 请求参数不合法（或原 message） |
| 邮箱格式 | `validation.invalidEmail` | 请输入有效邮箱 |
| 密码必填 | `validation.passwordRequired` | 请输入密码 |
| 请求体非 JSON | `validation.invalidJson` | 请求体须为 JSON |
| 昵称长度 | `validation.nickNameLength` | 昵称为 1～32 个字符 |
| 密码最短 | `validation.passwordMinLength` | 密码至少 8 位 |
| 密码字母数字 | `validation.passwordNeedsLetterAndNumber` | 密码须同时包含字母与数字 |
| 密码同邮箱 | `validation.passwordSameAsEmail` | 密码不能与邮箱相同 |
| 两次密码不一致 | `validation.passwordMismatch` | 两次密码不一致 |
| 手机号格式 | `validation.telNoInvalid` | 手机号须为 11 位数字 |

服务端校验失败时返回**具体 key 对应译文**，而非统一 `validationError`。

---

## 3. 带参数文案 — ICU 格式（Q7 定稿）

### 3.1 `authLoginLocked`

| locale | 值 |
| --- | --- |
| **en** | `Too many failed sign-in attempts. {minutes, plural, one {Try again in # minute.} other {Try again in # minutes.}}` |
| **zh** | `登录失败次数过多，请 {minutes} 分钟后再试` |

- 参数：`minutes`（整数，≥1，由 `Math.ceil(lockRemainMs / 60_000)` 传入）。
- 英文 **本期处理单复数**（ICU plural）。
- 中文无 plural 变形。

### 3.2 其它 key

本期除 `authLoginLocked` 外均为静态字符串，无占位符。

---

## 4. 前端 `map*ApiError`（Q4-B）

### 4.1 仅依赖 `code`（本期必达）

```text
CAPTCHA_REQUIRED, CAPTCHA_INVALID     → captcha
AUTH_INVALID_CREDENTIALS              → password
AUTH_ACCOUNT_DISABLED                 → general
AUTH_EMAIL_TAKEN                      → email
AUTH_TEL_TAKEN                        → telNo
RATE_LIMITED                          → general
UNAUTHORIZED, FORBIDDEN               → general
```

### 4.2 `VALIDATION_ERROR` 渐进策略

**登录 `mapLoginApiError`：**

| 条件 | 字段 |
| --- | --- |
| `code === VALIDATION_ERROR` && message 含 `邮箱` 或 `email`（不区分大小写） | `email` |
| `code === VALIDATION_ERROR` && message 含 `密码` 或 `password` | `password` |
| 其它 | `general` |

**注册 `mapRegisterApiError`：**

在既有中文 keyword 基础上**增加英文 keyword**：

| keyword（中/英） | 字段 |
| --- | --- |
| 两次密码 / mismatch / confirm | `passwordConfirm` |
| 手机号 / phone / tel | `telNo` |
| 昵称 / display name / nick | `nickName` |
| 密码 / password（含 policy 文案） | `password` |
| 邮箱 / email（且非密码语境） | `email` |

### 4.3 技术债（实现说明须记录）

- 仍依赖 message 子串的 case 列表与清理计划（目标：`details[].field` 或细分 ErrorCode）。
- 英文环境下复杂注册校验若 keyword 未命中，落入 `general` 但 message 仍为可读 API 译文。

### 4.4 客户端 fallback 与 API 分工

| 场景 | 文案来源 |
| --- | --- |
| API 返回 `message` | 服务端 `api.message` 翻译结果 |
| API 无 message | `page.login.errors.loginFailed` 等 |
| 网络异常 | `page.*.errors.networkRetry` |

---

## 5. `readApiErrorPayload`（Q10 定稿）

| 项 | 本期 |
| --- | --- |
| 扩展 `messageKey` / `params` | **不做** |
| 回退 | 继续 `error.message` 字符串 |
| 文档 | backend 实现说明记录未来字段：`error.messageKey`、`error.params` |

---

## 6. 完整 JSON 终稿 — `messages/en/api/message.json`

```json
{
  "rateLimited": "Too many requests. Please try again later.",
  "rateLimitedSite": "Too many visits to this site. Please try again later.",
  "unauthorized": "You are not signed in.",
  "forbidden": "You do not have permission to access this resource.",
  "validationError": "Invalid request.",
  "validation": {
    "invalidEmail": "Enter a valid email address.",
    "passwordRequired": "Enter your password.",
    "invalidJson": "Request body must be JSON.",
    "nickNameLength": "Display name must be 1–32 characters.",
    "passwordMinLength": "Password must be at least 8 characters.",
    "passwordNeedsLetterAndNumber": "Password must include both letters and numbers.",
    "passwordSameAsEmail": "Password cannot be the same as your email.",
    "passwordMismatch": "Passwords do not match.",
    "telNoInvalid": "Phone number must be 11 digits."
  },
  "captchaRequired": "Complete the verification code.",
  "captchaInvalid": "Verification code is incorrect or expired. Refresh and try again.",
  "authInvalidCredentials": "Incorrect email or password. Please check and try again.",
  "authAccountDisabled": "This account is unavailable. Contact an administrator.",
  "authEmailTaken": "This email is already registered. Sign in instead.",
  "authTelTaken": "This phone number is already in use.",
  "authAdminLoginRequired": "Sign in with an administrator account first.",
  "authAdminOnly": "Only administrators can create accounts.",
  "authLoginLocked": "Too many failed sign-in attempts. {minutes, plural, one {Try again in # minute.} other {Try again in # minutes.}}"
}
```

---

## 7. 完整 JSON 终稿 — `messages/zh/api/message.json`

```json
{
  "rateLimited": "请求过于频繁，请稍后再试",
  "rateLimitedSite": "站点访问过于频繁，请稍后再试",
  "unauthorized": "未登录",
  "forbidden": "无权访问该资源",
  "validationError": "请求参数不合法",
  "validation": {
    "invalidEmail": "请输入有效邮箱",
    "passwordRequired": "请输入密码",
    "invalidJson": "请求体须为 JSON",
    "nickNameLength": "昵称为 1～32 个字符",
    "passwordMinLength": "密码至少 8 位",
    "passwordNeedsLetterAndNumber": "密码须同时包含字母与数字",
    "passwordSameAsEmail": "密码不能与邮箱相同",
    "passwordMismatch": "两次密码不一致",
    "telNoInvalid": "手机号须为 11 位数字"
  },
  "captchaRequired": "请完成图形验证码",
  "captchaInvalid": "验证码错误或已过期，请刷新后重试",
  "authInvalidCredentials": "邮箱或密码错误，请检查后重试",
  "authAccountDisabled": "账号不可用，请联系管理员",
  "authEmailTaken": "该邮箱已注册，请直接登录",
  "authTelTaken": "该手机号已被占用",
  "authAdminLoginRequired": "请先登录管理员账号",
  "authAdminOnly": "仅管理员可创建账号",
  "authLoginLocked": "登录失败次数过多，请 {minutes} 分钟后再试"
}
```

---

## 8. Key 树

```
api.message
├── rateLimited
├── rateLimitedSite
├── unauthorized
├── forbidden
├── validationError
├── validation
│   ├── invalidEmail
│   ├── passwordRequired
│   ├── invalidJson
│   ├── nickNameLength
│   ├── passwordMinLength
│   ├── passwordNeedsLetterAndNumber
│   ├── passwordSameAsEmail
│   ├── passwordMismatch
│   └── telNoInvalid
├── captchaRequired
├── captchaInvalid
├── authInvalidCredentials
├── authAccountDisabled
├── authEmailTaken
├── authTelTaken
├── authAdminLoginRequired
├── authAdminOnly
└── authLoginLocked          ← ICU {minutes}
```

---

## 9. 安全与语义等价

| key | 约束 |
| --- | --- |
| `authInvalidCredentials` | 中英文均**不**暗示邮箱是否存在 |
| `authLoginLocked` | 仅披露等待时间，不披露阈值细节 |
| `authAccountDisabled` | 不披露内部 status 枚举 |

---

## 10. 验收检查表

- [ ] `en` UI + `NEXT_LOCALE=en` → API 错误为英文
- [ ] `zh` UI → API 错误为中文且与现网语义一致
- [ ] 登录锁定 `minutes=1` → 英文 `Try again in 1 minute.`
- [ ] 登录锁定 `minutes=5` → 英文 `Try again in 5 minutes.`
- [ ] middleware 站点频控 → `rateLimitedSite` 译文
- [ ] 注册 gate → `authAdminLoginRequired` / `authAdminOnly`
- [ ] `mapLoginApiError` 凭 code 映射 captcha/password/general
- [ ] 注册邮箱占用 → `email` 字段下展示 `authEmailTaken` 译文
