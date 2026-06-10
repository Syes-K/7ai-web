# 用户故事与验收标准：API 错误消息 i18n（version 0.1.14）

本文档为 `prd.md` 子文档，覆盖认证域及 middleware 通用错误的双语机制。

---

## Epic A：locale 解析与基础设施

### US-A1 服务端可解析请求 locale

**作为** 开发者  
**我想要** API 层能读取与 UI 一致的 locale  
**以便** 返回匹配语言的 `error.message`  

**验收标准：**

- [ ] **AC-A1**：服务端 locale 解析顺序为：`NEXT_LOCALE` cookie → `Accept-Language` → 默认 `en`（与 0.1.13 检测链对齐）。
- [ ] **AC-A2**：`fetch('/api/auth/login', { credentials: 'include' })` 在已设置 `NEXT_LOCALE` 时，错误 message 为对应语言。
- [ ] **AC-A3**：无 cookie 且 `Accept-Language: zh-CN` 时，认证 API 错误为中文。
- [ ] **AC-A4**：实现说明文档记录 `resolveRequestLocale`（或等价工具）的调用位置与扩展方式。

### US-A2 api/message.json 填充本期 key

**作为** 开发者  
**我想要** 认证相关 ErrorCode 在 `api/message.json` 中有中英条目  
**以便** 集中维护 API 文案  

**验收标准：**

- [ ] **AC-A5**：`messages/en/api/message.json` 与 `messages/zh/api/message.json` 包含本期全部 ErrorCode 映射 key（见下表）。
- [ ] **AC-A6**：key 命名为英文 camelCase；结构与 `prd.md` 映射表一致。
- [ ] **AC-A7**：带参数文案（如登录锁定分钟数）使用约定占位格式，中英文件结构对称。

**本期至少覆盖的 key（与 ErrorCode 对应）：**

| message key | ErrorCode |
| --- | --- |
| `rateLimited` | `RATE_LIMITED` |
| `rateLimitedSite` | middleware 站点频控（若与路径频控分文案） |
| `unauthorized` | `UNAUTHORIZED` |
| `forbidden` | `FORBIDDEN` |
| `validationError` | `VALIDATION_ERROR`（通用回退） |
| `validation.invalidEmail` | 登录/注册邮箱校验 |
| `validation.passwordRequired` | 密码必填 |
| `validation.invalidJson` | 请求体非 JSON |
| `captchaRequired` | `CAPTCHA_REQUIRED` |
| `captchaInvalid` | `CAPTCHA_INVALID` |
| `authInvalidCredentials` | `AUTH_INVALID_CREDENTIALS` |
| `authAccountDisabled` | `AUTH_ACCOUNT_DISABLED` |
| `authEmailTaken` | `AUTH_EMAIL_TAKEN` |
| `authTelTaken` | `AUTH_TEL_TAKEN` |
| `authAdminLoginRequired` | 注册页「请先登录管理员账号」 |
| `authAdminOnly` | 注册页「仅管理员可创建账号」 |
| `authLoginLocked` | 登录失败次数过多（含 `{minutes}` 占位） |

---

## Epic B：认证 API 错误双语

### US-B1 登录 API 错误本地化

**作为** 访客  
**我想要** `POST /api/auth/login` 返回的错误消息与我的界面语言一致  
**以便** 理解失败原因  

**验收标准：**

- [ ] **AC-B1**：`en` UI 下，验证码错误返回英文 `captchaInvalid` 等价文案。
- [ ] **AC-B2**：`en` UI 下，凭据错误返回英文 `authInvalidCredentials` 等价文案（不泄露账号是否存在）。
- [ ] **AC-B3**：`en` UI 下，账号禁用、频控、邮箱格式错误均为英文。
- [ ] **AC-B4**：`zh` UI 下上述场景为中文，语义与现网一致。
- [ ] **AC-B5**：登录锁定消息中分钟数正确插值，中英文语法自然。

### US-B2 注册 API 错误本地化

**作为** 管理员  
**我想要** `POST /api/auth/register` 错误消息双语  
**以便** 英文环境下完成开户  

**验收标准：**

- [ ] **AC-B6**：邮箱已占用、手机号已占用在 `en`/`zh` 下均有对应 message。
- [ ] **AC-B7**：管理员未登录/非管理员门禁错误在 `en` 下为英文。
- [ ] **AC-B8**：字段级 `VALIDATION_ERROR`（昵称、密码强度、两次密码不一致等）在 `en` 下有对应翻译。

### US-B3 认证态查询与其它 auth 端点

**作为** 前端  
**我想要** `GET /api/auth/me` 等端点的标准错误也为双语  
**以便** 全局 session 检测一致  

**验收标准：**

- [ ] **AC-B9**：`GET /api/auth/me` 未登录时 `UNAUTHORIZED` message 随 locale 变化。
- [ ] **AC-B10**：`GET /api/auth/captcha` 若有用户可见错误，纳入本期范围。

---

## Epic C：Middleware 与共享鉴权

### US-C1 Middleware 错误双语

**作为** 访客  
**我想要** 中间件返回的频控、未登录错误与语言偏好一致  
**以便** API 客户端展示正确提示  

**验收标准：**

- [ ] **AC-C1**：middleware `RATE_LIMITED`（站点级、路径级）message 随 locale 双语。
- [ ] **AC-C2**：`/api/admin/*`、`/api/console/*` 未登录时 `UNAUTHORIZED` message 双语（本期不要求调用方 UI 改造，但 message 须正确）。

### US-C2 admin 鉴权辅助模块

**作为** 开发者  
**我想要** `server/auth/admin.ts` 等共享模块使用统一 i18n 错误构造  
**以便** 避免遗漏硬编码中文  

**验收标准：**

- [ ] **AC-C3**：`server/auth/admin.ts` 中 `未登录` 等字符串改为 locale 感知构造。
- [ ] **AC-C4**：新增 API 错误时可通过 ErrorCode → message key 单一入口生成（文档说明）。

---

## Epic D：前端展示与 ErrorCode 映射

### US-D1 登录/注册表单展示 API 错误

**作为** 访客  
**我想要** API 返回的错误显示在正确表单字段旁且语言正确  
**以便** 快速修正输入  

**验收标准：**

- [ ] **AC-D1**：`mapLoginApiError` / `mapRegisterApiError` 在 `en` 环境下仍将 `CAPTCHA_*` 映射到 captcha 字段、`AUTH_INVALID_CREDENTIALS` 映射到 password 字段。
- [ ] **AC-D2**：`VALIDATION_ERROR` 在英文 message 下尽可能正确映射字段；若仍依赖中文子串，须在实现说明标注已知限制与后续改进。
- [ ] **AC-D3**：`errors.general` 展示的消息语言与当前页面 locale 一致。

### US-D2 ErrorCode 优先于 message 字符串匹配

**作为** 开发者  
**我想要** 字段映射优先依据 `error.code`  
**以便** 双语下不依赖中文关键词  

**验收标准：**

- [ ] **AC-D4**：登录表单错误分支中，`CAPTCHA_INVALID`、`AUTH_INVALID_CREDENTIALS`、`RATE_LIMITED` 等仅凭 code 即可映射字段（本期必达）。
- [ ] **AC-D5**：迭代文档列出仍依赖 message 文本匹配的 case 与清理计划。

---

## Epic E：范围边界（本期不做）

### US-E1 非认证 API 保持现状

**作为** 产品  
**我想要** 本期不改控制台/聊天/知识库 API 错误  
**以便** 控制范围、按期交付  

**验收标准：**

- [ ] **AC-E1**：`POST /api/chat/*`、`/api/console/*`、`/api/admin/*`（除 middleware 未登录拦截外）业务错误本期可为中文。
- [ ] **AC-E2**：`with-readonly-api` 只读拦截 message 本期可不双语（列 0.1.15）；若 chat 页触发再跟进。
- [ ] **AC-E3**：`error.details[].message` 管理端字段级错误本期不要求双语。
