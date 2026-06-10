# 迭代说明（version 0.1.15）

本迭代在 0.1.13/0.1.14 i18n 基础上，完成 **Chat 对话工作台双语**、**Chat 域 API 错误双语**、**路由迁入 `[locale]/chat`** 及 **共享 shell 基础设施**；默认语言仍为 **英语**（`localeDetection: false`）。

## 文档索引

| 阶段 | 路径 |
| --- | --- |
| 产品 | `product/prd.md`、`product/user-stories-*.md`、`product/open-questions.md` |
| 设计 | `design/design-spec-i18n-chat.md`、`design/copy-chat-en-zh.md`、`design/spec-*.md` |
| 服务端 | `backend/api-spec.md`、`backend/data-models.md`、`backend/implementation-plan.md`、`backend/implementation-notes.md` |
| 前端 | `frontend/implementation-notes.md`、`frontend/test-checklist.md`、`frontend/deviations.md` |

## 本轮关键决策

1. **范围（Q1-A）**：0.1.15 MVP = `/[locale]/chat` 全量 UI + `/api/chat/conversations/**` + 共享 infra；console/admin/knowledge 留 0.1.16+。
2. **API 错误**：延续 0.1.14 — `resolveRequestLocale` + `tApiMessage`；SSE `modelError` 不透传 provider 栈（Q6-A）。
3. **路由**：`/[locale]/chat`；旧 `/chat` → 302；未登录 → `/{locale}/login?redirect=/{locale}/chat`。
4. **文案 key**：新增 `page/chat.json`、`page/shell.json`；扩展 `api/message.json`（+13 REST + 12 `turnSafe.*`）。
5. **LLM 回复语言**：UI i18n 不翻译模型输出；默认系统提示改为语言中立，并追加「随用户最新消息语言回复」（见实现后微调 §3）。

## 代码落点（摘要）

- **服务端**：4 个 chat route、`post-message-pipeline.ts`、`with-readonly-api.ts`、`middleware.ts`、`langchain-agent.ts`、`CHAT_SYSTEM_PROMPT`
- **前端**：`src/app/[locale]/chat/`、`ChatWorkspace` i18n、`LanguageSwitcher`、`ConfirmProvider`、`UserAvatarMenu` shell、`ConsoleForbiddenNotice`、antd/dayjs 动态 locale
- **文案**：`messages/{en,zh}/page/chat.json`、`page/shell.json`、`api/message.json`

## 实现后微调（迭代验收期）

| 项 | 说明 |
| --- | --- |
| AI 回复语言 | `CHAT_SYSTEM_PROMPT` 改为语言中立；`CHAT_LANGUAGE_REPLY_SUFFIX` 追加至所有 Agent 系统提示，模型随用户输入语言回复 |
| AI 输出尾注 | `AssistantOutputRenderer` 接入 `page.chat.output.disclaimer`（修复 English UI 下仍显示中文免责声明） |
| 首页登录链 | `PunkHomeHeader` 使用 next-intl `Link` 时 `href` 不再手动加 `/${locale}`，修复 `/en/en/login` 双重前缀 |

## 当前状态

- **已完成**：需求 → 设计 → 服务端文档 → 服务端代码 → 前端实现 → 验收期微调
- **未做（非目标 / 后续批次）**：`/console/*`、`/admin/*`、`/knowledge/[id]` 页面与对应 API；账号级语言云端同步
- **后续迭代建议（0.1.16）**：Console 全量 i18n + `/api/console/**` + knowledge-bases API

## 验收

见 `frontend/test-checklist.md`、`backend/implementation-notes.md` §3。
