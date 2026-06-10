# 迭代说明（version 0.1.15 · 产品）

在 0.1.13（i18n 基础架构 + 首页）与 0.1.14（登录/注册 + 认证 API）之上，本迭代完成 **Chat MVP** 的 i18n 交付；console/admin/knowledge 按 PRD 批次 2–4 规划至后续版本。

## 文档索引

| 文档 | 说明 |
| --- | --- |
| [`prd.md`](prd.md) | 主 PRD：背景、分期交付、模块范围、API 映射、风险、验收 |
| [`user-stories-chat.md`](user-stories-chat.md) | 对话工作台 UI、顶栏、客户端错误（**0.1.15 MVP**） |
| [`user-stories-console.md`](user-stories-console.md) | 控制台 Shell、菜单、各子页（**建议 0.1.16**） |
| [`user-stories-admin.md`](user-stories-admin.md) | 管理后台 Shell、菜单、各子页（**建议 0.1.17**） |
| [`user-stories-knowledge.md`](user-stories-knowledge.md) | 知识库预览页路由与壳层（**建议 0.1.18+**） |
| [`user-stories-api-i18n.md`](user-stories-api-i18n.md) | 业务域 API 错误双语、ErrorCode 映射、只读拦截 |
| [`user-stories-routing-locale.md`](user-stories-routing-locale.md) | 路由迁移、legacy redirect、跨页链接 |
| [`user-stories-shared-infra.md`](user-stories-shared-infra.md) | antd/dayjs、UserAvatarMenu、Confirm、Forbidden |
| [`open-questions.md`](open-questions.md) | 开放问题与确认记录 |

## 本期交付摘要（0.1.15 MVP）

| 纳入 | 不纳入（后续批次） |
| --- | --- |
| `/[locale]/chat` 全量 UI 双语 | `/console/*`、`/admin/*` 页面与菜单 |
| `/api/chat/conversations/**` 错误双语 | `/api/console/**`、`/api/admin/**`、`/api/knowledge-bases/**` |
| `page/chat.json`、`page/shell.json`；扩展 `api/message.json` | `/knowledge/[id]` 预览页 |
| antd/dayjs 动态 locale；Chat 顶栏 `LanguageSwitcher` | Console/Admin Shell 完整 i18n |
| 共享 Confirm / Forbidden / UserAvatarMenu shell | 账号级语言云端同步 |
| 旧 `/chat` → 302；locale 感知 login redirect | LLM 输出 / UGC 翻译（UI 层） |

## 状态

- **当前**：四阶段已完成；开放问题 Q1–Q6、Q9 已按推荐项落地（见 `open-questions.md` 确认记录）
