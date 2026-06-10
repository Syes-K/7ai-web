# 设计产出索引 — version 0.1.14

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.14` |
| 阶段 | 设计（阶段 2） |
| 范围 | 登录/注册 i18n、认证 API 错误双语、路由迁入 `[locale]` |

---

## 文档清单

| 文件 | 说明 | 主要读者 |
| --- | --- | --- |
| [design-spec-i18n-auth.md](./design-spec-i18n-auth.md) | **总规格**：路由、layout、组件职责、状态交互、字段映射、AC 对照 | backend、frontend |
| [copy-login-register-en-zh.md](./copy-login-register-en-zh.md) | `page/login`、`page/register` 完整 key 树与中英文 JSON 终稿 | frontend |
| [spec-auth-shell-language-switcher.md](./spec-auth-shell-language-switcher.md) | AuthShell 顶栏布局、LanguageSwitcher 嵌入与视觉差异 | frontend |
| [spec-api-message-auth.md](./spec-api-message-auth.md) | `api/message.json` key 清单、ErrorCode 映射、ICU 带参 | backend、frontend |
| [design-spec-routing-locale.md](./design-spec-routing-locale.md) | 旧 URL 302、middleware、跨页链接、gate | backend、frontend |

---

## 上游需求

- `../product/prd.md`
- `../product/user-stories-auth-pages.md`
- `../product/user-stories-api-i18n.md`
- `../product/user-stories-routing-locale.md`
- `../product/open-questions.md`

## 设计基线（0.1.13）

- `../../0.1.13/design/design-spec-i18n.md`
- `../../0.1.13/design/spec-language-switcher.md`
- `../../0.1.13/design/copy-home-en-zh.md`

---

## 已确认决策摘要

| 编号 | 决策 |
| --- | --- |
| Q1-A | 服务端翻译 `error.message` |
| Q2-A | 登录 + 注册同步双语 |
| Q3-A | 旧路径 302，无过渡页 |
| Q4-B | code 优先 + 渐进改进 map*ApiError |
| Q5-A | middleware locale：cookie → **`en`**（`localeDetection: false`） |
| Q6-A | 测试账号说明双语，字面量不译 |
| Q7 | ICU `{minutes}` + 英文 plural |
| Q8 | 复用 `[locale]/layout.tsx` |
| Q9 | 注册校验独立 `validation.*` key |
| Q10 | 本期不改 `readApiErrorPayload` |
| Q11 | 认证页无 antd 表单，layout ConfigProvider 足够 |

---

## 实现交付检查（设计 → 开发）

### Frontend

- [ ] `messages/{en,zh}/page/login.json`、`page/register.json` 按 `copy-login-register-en-zh.md` §15–18
- [ ] `src/app/[locale]/login|register/page.tsx`
- [ ] `AuthShell` + `LanguageSwitcher variant="auth"`
- [ ] `LoginForm` / `RegisterForm` / `CaptchaField` 无硬编码中文
- [ ] `map*ApiError` 按 `spec-api-message-auth.md` §4

### Backend

- [ ] `resolveRequestLocale` + `tApiMessage`
- [ ] `messages/{en,zh}/api/message.json` 按 `spec-api-message-auth.md` §5–6
- [ ] 认证路由 / middleware / admin.ts 错误双语
- [ ] `KNOWN_APP_SEGMENTS` 移除 login/register；旧路径 302

---

## 下一迭代建议（0.1.15）

- `/chat` 壳层 i18n
- `ConsoleForbiddenNotice`
- antd 动态 locale 注入控制台
- API `messageKey` 客户端渲染（可选）
