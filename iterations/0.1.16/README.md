# 迭代说明（version 0.1.16）

本迭代在 0.1.13–0.1.15 i18n 基础上，完成 **控制台（Console）全量双语**：页面迁入 `/[locale]/console/**`、`/api/console/**` API 错误双语、Console Shell 完整接入 `LanguageSwitcher` 与 antd/dayjs 动态 locale。默认语言仍为 **英语**（`localeDetection: false`）。

## 文档索引

| 阶段 | 路径 |
| --- | --- |
| 产品 | `product/prd.md`、`product/user-stories-*.md`、`product/open-questions.md` |
| 设计 | `design/design-spec-i18n-console.md`、`design/copy-console-en-zh.md`、`design/spec-*.md` |
| 服务端 | `backend/api-spec.md`、`backend/data-models.md`、`backend/implementation-plan.md`、`backend/implementation-notes.md` |
| 前端 | `frontend/implementation-notes.md`、`frontend/test-checklist.md`、`frontend/deviations.md` |

## 本轮关键决策

1. **范围（Q1-A）**：`/[locale]/console/**` 全量 UI + `/api/console/**`（12 routes）；**不含** `/api/knowledge-bases/**`（0.1.18+）。
2. **路由**：`/console/**` → 302 `/{locale}/console/**`；未登录 → `/{locale}/login?redirect=...`；服务端 layout 鉴权（Q10-A）。
3. **文案**：`messages/{en,zh}/page/console/{shell,profile,models,assistants,knowledge,mcp,settings}.json`；扩展 `api/message.json`（~59 console key）。
4. **Shell**：`LanguageSwitcher`、`getAntdLocale`、菜单 path 不含 locale（next-intl `Link` 自动前缀）；Forbidden 继续 `page.shell`（Q7-A）。
5. **admin 跳链（Q3-B）**：延至 **0.1.17**；裸 `/console?notice=...` 由 middleware legacy 302 兜底。

## 代码落点（摘要）

- **服务端**：12 个 console route、4 个共享校验 helper、`middleware.ts`（`handleLegacyConsoleRedirect`）
- **前端**：`src/app/[locale]/console/**`（删除旧 `src/app/console/`）、`*Client.tsx` + `getXxxColumns(t)`、`parse-api-error.ts`
- **文案**：14 个 `page/console/*.json` + `api/message.json` console 域

## 验收期微调（迭代收尾）

| 项 | 说明 |
| --- | --- |
| 侧栏双 locale | `console-menu` path 改为 `/console/...`（不含 locale），修复 `/en/en/...` |
| Profile 表单 label | `formLayout.labelWidth` 写入 i18n；右对齐 + 冒号 |
| Profile 文案 | 英文 `Personal info` → `Base info`；编辑按钮与 Preferences 统一为 primary ghost |
| 表格空状态 | MCP 空态去掉内嵌「新建」按钮，与 knowledge 一致 |
| 模型页 | 移除「设为向量默认」列/按钮；默认 Embedding 仅在 Profile 偏好设置 |

## 当前状态

- **已完成**：需求 → 设计 → 服务端文档 → 服务端代码（3B）→ 前端实现 → 验收期微调
- **已知限制**：`/api/knowledge-bases/**` 错误可能仍为中文；admin 跳链 locale 化留 0.1.17
- **后续迭代建议（0.1.17）**：Admin 全量 i18n + `/api/admin/**`

## 验收

见 `frontend/test-checklist.md`、`backend/implementation-notes.md` §3。
