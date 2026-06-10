# 迭代说明（version 0.1.14）

本迭代在 0.1.13 i18n 基础上，完成**登录/注册页双语**、**认证域 API 错误双语**、**路由迁入 `[locale]`**；默认语言为 **英语**（无 cookie 时不读 `Accept-Language`）。

## 文档索引

| 阶段 | 路径 |
| --- | --- |
| 产品 | `product/prd.md`、`product/user-stories-*.md`、`product/open-questions.md` |
| 设计 | `design/design-spec-i18n-auth.md`、`design/copy-login-register-en-zh.md`、`design/spec-*.md` |
| 服务端 | `backend/api-spec.md`、`backend/data-models.md`、`backend/implementation-plan.md`、`backend/implementation-notes.md` |
| 前端 | `frontend/implementation-notes.md`、`frontend/test-checklist.md` |

## 本轮关键决策

1. **范围**：登录 + 注册 UI 双语；`/api/auth/*` 与 middleware 通用错误双语；chat/console/admin 留 0.1.15+。
2. **默认语言**：**cookie / URL → 默认 `en`**（`localeDetection: false`，不根据浏览器语言自动切中文）。
3. **API 错误**：服务端 `resolveRequestLocale` + `tApiMessage` 翻译 `error.message`（Q1-A）。
4. **路由**：`/[locale]/login|register`；旧 `/login`、`/register` → 302；未登录跳转 `/{locale}/login`。
5. **文案 key**：延续 `page` / `api` 分组；新增 `page/login`、`page/register`；填充 `api/message.json`。

## 代码落点（摘要）

- **服务端**：`src/server/i18n/*`、`src/common/utils/i18n.ts`、认证 routes、`middleware.ts`、`admin.ts`
- **前端**：`src/app/[locale]/login|register/`、`AuthShell` + `LanguageSwitcher variant="auth"`、表单 i18n、`map-api-errors.ts`
- **文案**：`messages/{en,zh}/page/login.json`、`page/register.json`、`api/message.json`

## 实现后微调

| 项 | 说明 |
| --- | --- |
| 默认 locale | `localeDetection: false`；无 cookie 时固定 `en`（见 `src/i18n/routing.ts`、`src/common/utils/i18n.ts`） |
| 测试账号邮箱 | `LoginForm` 默认 email 读 `testAccount.email`（非硬编码） |

## 当前状态

- **已完成**：需求 → 设计 → 服务端文档 → 服务端代码 → 前端实现
- **未做（非目标）**：`/chat`、`/console/*`、`/admin/*` 全量 i18n；API `messageKey` 客户端渲染
- **后续迭代建议（0.1.15）**：`/chat` 壳层 + `ConsoleForbiddenNotice` + antd 动态 locale

## 验收

见 `frontend/test-checklist.md`、`backend/implementation-notes.md` §3。
