# 数据模型 — i18n 认证域与 API message（version 0.1.14）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.14` |
| 阶段 | 3A 文档 |
| 持久化 | **无 SQLite / TypeORM 变更** |

---

## 1. 数据库变更声明

> **本期无数据库 schema 变更。**

| 项 | 结论 |
| --- | --- |
| 新增/修改 Entity | **无** |
| Migration | **无** |
| User 表「界面语言」字段 | **非目标**（延续 0.1.13） |
| 语言偏好存储 | **浏览器 Cookie `NEXT_LOCALE` only** |

---

## 2. Locale 枚举与类型（延续 0.1.13）

现网已存在，**3B 不新增 enum 文件**，复用：

| 符号 | 路径 | 说明 |
| --- | --- | --- |
| `SUPPORTED_LOCALES` | `@/common/constants/i18n` | `["en", "zh"]` |
| `AppLocale` | `@/common/constants/i18n` | `"en" \| "zh"` |
| `DEFAULT_LOCALE` | `@/common/constants/i18n` | `"en"` |
| `LOCALE_COOKIE` | `@/common/constants/i18n` | `"NEXT_LOCALE"` |
| `isAppLocale()` | `@/common/constants/i18n` | cookie / segment 校验 |
| `localeToHtmlLang()` | `@/common/constants/i18n` | `en`→`en`，`zh`→`zh-CN` |
| `AppLocaleEnum` | `@/common/enums/locale` | 与 `AppLocale` 值一致 |

**不支持**：`zh-TW`、`ja`、`en-US` 作为独立 locale（`Accept-Language: zh-TW` **映射**为 `zh`）。

---

## 3. 服务端 locale 解析模型（新增逻辑，非 DB）

### 3.1 `resolveRequestLocale` 输入输出

| 输入 | 类型 | 说明 |
| --- | --- | --- |
| `request` | `Request` \| `NextRequest` | Route Handler、middleware 均可传入 |
| cookie | `NEXT_LOCALE` | 值须 `isAppLocale()` |
| header | `Accept-Language` | 标准 BCP47 列表 |

| 输出 | 类型 | 约束 |
| --- | --- | --- |
| `locale` | `AppLocale` | 恒为 `en` 或 `zh` |

### 3.2 解析顺序（Q5-A）

| 优先级 | 来源 | 规则 |
| --- | --- | --- |
| 1 | Cookie `NEXT_LOCALE` | 值 ∈ `{ en, zh }` 则采用；非法值**忽略** |
| 2 | `Accept-Language` | 按 q 降序取首个 tag；主 tag **以 `zh` 开头**（不区分大小写）→ `zh`；**否则** → `en` |
| 3 | 默认 | `en`（`DEFAULT_LOCALE`） |

**与 next-intl middleware 的差异（须文档化、实现时对齐）：**

| 场景 | next-intl（0.1.13） | `resolveRequestLocale`（0.1.14 API/middleware） |
| --- | --- | --- |
| URL 含 `/en/...` | URL prefix 优先 | **不适用**（API 无 locale 前缀） |
| 仅 cookie + API | cookie 参与 | cookie 优先 |
| 旧 `/login` 302 | 无 URL locale | cookie → Accept-Language → en |

**不适用 URL segment 的场景：** `/api/*`、middleware 对 `/login` 的 302、受保护页未登录跳转（无 locale 前缀的 `/chat` 等）。

**适用 URL segment 的场景：** 注册页 RSC gate（`/[locale]/register` 的 `params.locale`）——由 **页面层** 读取 URL，**非** `resolveRequestLocale`。

### 3.3 `Accept-Language` 算法

与 0.1.13 `data-models.md` §6 一致：

| 输入 header 示例 | 输出 locale |
| --- | --- |
| （缺失） | 跳过，进入下一优先级 |
| `zh-CN,en;q=0.9` | `zh` |
| `zh-TW` | `zh` |
| `en-US,en;q=0.9` | `en` |
| `ja-JP,en;q=0.5` | `en` |

**3B 建议**：将解析函数放在 `@/common/utils/i18n.ts`（纯函数、无 Node 依赖），`resolveRequestLocale` 在 `@/server/i18n/` 内组合 cookie + header 读取。

---

## 4. API message 数据模型

### 4.1 物理布局（本期扩展）

```
messages/
├── en/
│   ├── page/
│   │   ├── home.json           # 0.1.13 已有
│   │   ├── login.json          # 0.1.14 新增（Frontend 主责）
│   │   └── register.json       # 0.1.14 新增（Frontend 主责）
│   └── api/
│       └── message.json        # 0.1.14 填充（Backend 3B 写入 + 服务端读取）
└── zh/
    ├── page/
    │   ├── home.json
    │   ├── login.json
    │   └── register.json
    └── api/
        └── message.json
```

### 4.2 Namespace 映射

| 文件 | next-intl namespace | 消费方 |
| --- | --- | --- |
| `messages/{locale}/api/message.json` | `api.message` | **服务端** `tApiMessage` + RSC `getTranslations`（若需） |
| `messages/{locale}/page/login.json` | `page.login` | 认证页 UI（Frontend） |
| `messages/{locale}/page/register.json` | `page.register` | 认证页 UI（Frontend） |

### 4.3 Key 树（`api.message`）

完整 JSON 终稿见 `../design/spec-api-message-auth.md` §6–8。摘要：

```
api.message
├── rateLimited
├── rateLimitedSite
├── unauthorized
├── forbidden
├── validationError                    ← 未知校验回退
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
├── authAdminLoginRequired             ← 注册 gate（ErrorCode: UNAUTHORIZED）
├── authAdminOnly                      ← 注册 gate（ErrorCode: FORBIDDEN）
└── authLoginLocked                    ← ICU {minutes}，ErrorCode: RATE_LIMITED
```

### 4.4 ICU 参数模型（`authLoginLocked`）

| 字段 | 类型 | 来源 |
| --- | --- | --- |
| `minutes` | `number` | `Math.ceil(lockRemainMs / 60_000)`，≥ 1 |

| locale | 模板（message.json 值） |
| --- | --- |
| `en` | `Too many failed sign-in attempts. {minutes, plural, one {Try again in # minute.} other {Try again in # minutes.}}` |
| `zh` | `登录失败次数过多，请 {minutes} 分钟后再试` |

---

## 5. ErrorCode ↔ message key 映射表

> **重要**：同一 `ErrorCode` 在不同业务场景可使用**不同 message key**（由调用方按场景选择 key，非自动单射）。

### 5.1 主映射（认证域）

| ErrorCode | 默认 / 场景 message key | HTTP 状态（现网） | 响应 `code` 不变 |
| --- | --- | --- | --- |
| `RATE_LIMITED` | `rateLimited` — 通用 API/IP 频控 | 429 | ✓ |
| `RATE_LIMITED` | `rateLimitedSite` — middleware 全站频控 | 429 | ✓ |
| `RATE_LIMITED` | `authLoginLocked` — 登录失败锁定（带 `{minutes}`） | 429 | ✓ |
| `UNAUTHORIZED` | `unauthorized` — 通用未登录 | 401 | ✓ |
| `UNAUTHORIZED` | `authAdminLoginRequired` — 注册 API 管理员 gate | 401 | ✓ |
| `FORBIDDEN` | `forbidden` — 通用无权（如 `requireAdminApi` 非管理员） | 403 | ✓ |
| `FORBIDDEN` | `authAdminOnly` — 注册 API 非管理员 | 403 | ✓ |
| `VALIDATION_ERROR` | §5.2 细分 `validation.*` 或 `validationError` | 400 | ✓ |
| `CAPTCHA_REQUIRED` | `captchaRequired` | 400 | ✓ |
| `CAPTCHA_INVALID` | `captchaInvalid` | 400 | ✓ |
| `AUTH_INVALID_CREDENTIALS` | `authInvalidCredentials` | 400 | ✓ |
| `AUTH_ACCOUNT_DISABLED` | `authAccountDisabled` | 403 | ✓ |
| `AUTH_EMAIL_TAKEN` | `authEmailTaken` | 400 | ✓ |
| `AUTH_TEL_TAKEN` | `authTelTaken` | 400 | ✓ |

**响应体 schema 不变**（Q1-A / Q10）：

```typescript
{
  error: {
    code: ErrorCode;      // 机器可读，前端 map*ApiError 优先依据
    message: string;      // 人类可读，已按 locale 翻译
    details?: { field: string; message: string }[];  // 本期认证域不使用
  }
}
```

### 5.2 `VALIDATION_ERROR` 场景 → key（Q9）

| 校验场景 | message key | 现网触发位置 |
| --- | --- | --- |
| 请求体非 JSON | `validation.invalidJson` | login/register `req.json()` catch |
| 邮箱格式 | `validation.invalidEmail` | `!isValidEmail(email)` |
| 密码必填（登录） | `validation.passwordRequired` | login `!password` |
| 昵称长度 | `validation.nickNameLength` | register `validateNickName` |
| 密码最短 8 位 | `validation.passwordMinLength` | register `validatePasswordPolicy` |
| 密码须含字母数字 | `validation.passwordNeedsLetterAndNumber` | 同上 |
| 密码不能与邮箱相同 | `validation.passwordSameAsEmail` | 同上 |
| 两次密码不一致 | `validation.passwordMismatch` | register `password !== passwordConfirm` |
| 手机号格式 | `validation.telNoInvalid` | register `!isValidTelNo(t)` |
| 未知 / 兜底 | `validationError` | 预留 |

**3B 改造要点**：`validateNickName` / `validatePasswordPolicy`（`@/common/utils/validation.ts`）**仍返回中文字符串**供控制台等未双语 API 使用；**认证 register route** 须改为在 route 内按校验分支直接选 key 调用 `tApiMessage`，**不再**将 util 返回的中文串作为 API message。

### 5.3 前端字段映射（供对照，Frontend 3B/4 实现）

| ErrorCode / 条件 | 表单字段 |
| --- | --- |
| `CAPTCHA_*` | `captcha` |
| `AUTH_INVALID_CREDENTIALS` | `password` |
| `AUTH_ACCOUNT_DISABLED` | `general` |
| `AUTH_EMAIL_TAKEN` | `email` |
| `AUTH_TEL_TAKEN` | `telNo` |
| `RATE_LIMITED` | `general` |
| `UNAUTHORIZED` / `FORBIDDEN`（gate） | `general` |
| `VALIDATION_ERROR` + keyword | 见 `spec-api-message-auth.md` §4.2 |

---

## 6. 路由 Segment 模型（变更）

| URL segment | 0.1.13 分类 | 0.1.14 分类 |
| --- | --- | --- |
| `login` | 应用路由（`KNOWN_APP_SEGMENTS`） | **移除**；`/login` → 302 `/{locale}/login` |
| `register` | 应用路由 | **移除**；`/register` → 302 `/{locale}/register` |
| `en` / `zh` | locale | 含子路由 `login`、`register` |
| `chat`、`console`、`admin`、`knowledge` | 未接入 i18n | **不变** |

`KNOWN_APP_SEGMENTS`（middleware）变更后：

```typescript
const KNOWN_APP_SEGMENTS = new Set([
  "chat",
  "console",
  "admin",
  "knowledge",
  "api",
  // login, register 已移除
]);
```

---

## 7. Cookie 数据模型（无变更）

延续 0.1.13 `data-models.md` §4：`NEXT_LOCALE` 与 `7ai_session` **不联动**；登录/登出不修改语言 cookie。

| 场景 | 行为 |
| --- | --- |
| `/en/login` 登录成功 → `/chat` | `NEXT_LOCALE` 仍为 `en`（AC-E4） |
| API 错误 locale | 读 `NEXT_LOCALE`，与 UI cookie 一致 |

---

## 8. 常量（本期新增建议）

**文件建议：** `src/common/constants/i18n.ts`（扩展现有文件，或新增子模块经 `index` 导出）

| 常量 | 值 | 说明 |
| --- | --- | --- |
| `API_MESSAGE_NAMESPACE` | `"api.message"` | 文档用；代码内可用字面量 |
| （无新增 Cookie 名） | — | 沿用 `LOCALE_COOKIE` |

**ErrorCode → key 映射表**建议放在 `src/server/i18n/api-message-keys.ts`（服务端专用，非 `@/common`，因绑定认证域双语实现）。

---

## 9. 与 0.1.13 差异摘要

| 项 | 0.1.13 | 0.1.14 |
| --- | --- | --- |
| `api/message.json` | 空占位 `{}` | 填充认证域 key |
| 后端读取 message | **不读** | **`tApiMessage` 读取** |
| `jsonError` message | 中文硬编码 | locale 感知译文 |
| `/login`、`/register` | 独立 app 路由 | 迁入 `[locale]` + 旧路径 302 |

---

## 10. 关联文档

- HTTP / API 行为与示例：`api-spec.md`
- 实现步骤：`implementation-plan.md`
- 风险与技术债：`risks-and-open-items.md`
- 设计终稿：`../design/spec-api-message-auth.md`
