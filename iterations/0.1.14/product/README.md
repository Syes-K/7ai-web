# 迭代说明（version 0.1.14 · 产品阶段）

在 0.1.13 i18n 基础架构与首页双语之上，本期推进**登录/注册页双语**、**认证域 API 错误双语**及 **`login`/`register` 路由迁入 `[locale]`**；chat/console/admin 全量迁移列为后续迭代。

## 文档索引

| 文档 | 说明 |
| --- | --- |
| [`prd.md`](prd.md) | 主 PRD：背景、范围、API i18n 策略、风险、验收 |
| [`user-stories-auth-pages.md`](user-stories-auth-pages.md) | 登录/注册 UI、AuthShell、message 文件 |
| [`user-stories-api-i18n.md`](user-stories-api-i18n.md) | 认证 API 与 middleware 错误双语、ErrorCode 映射 |
| [`user-stories-routing-locale.md`](user-stories-routing-locale.md) | 路由迁移、旧路径重定向、跨页 locale 一致性 |
| [`open-questions.md`](open-questions.md) | 待用户/设计/开发确认项 |

## 本期范围摘要（产品判断）

| 纳入 | 不纳入（后续） |
| --- | --- |
| `/[locale]/login`、`/[locale]/register` 全量 UI 双语 | `/chat` 全量文案（建议 0.1.15） |
| `page/login`、`page/register` message 文件 | `/console/*`、`/admin/*` 全量文案 |
| 认证 API + middleware 通用错误双语 | 业务域 API（chat/console/admin/knowledge）全量 |
| `api/message.json` 认证相关 key | API 成功消息、LLM 内容 |
| AuthShell 嵌入 `LanguageSwitcher` | 账号级语言云端同步 |
| 旧 `/login`、`/register` → locale 前缀 302 | `/knowledge/[id]` |

## 上游依赖

- `iterations/0.1.13/`：next-intl、middleware、`LanguageSwitcher`、`messages/page/home.json`
- 代码：`src/i18n/*`、`src/app/[locale]/`、`src/middleware.ts`

## 建议下一迭代（0.1.15）

- `/chat` 工作台壳层与核心 UI 双语
- `ConsoleShell` / `AdminShell` 的 antd `ConfigProvider` 动态 locale
- `with-readonly-api` 只读提示双语
