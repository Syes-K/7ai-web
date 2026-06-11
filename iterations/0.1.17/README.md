# 迭代说明（version 0.1.17）

本迭代在 0.1.16（Console 全量 i18n）之上，完成 **管理后台（Admin）全量双语**、**Knowledge 预览页路由迁入 `[locale]`**，以及 **`/api/admin/**`（9 routes）+ `/api/knowledge-bases/**`（5 routes）** API 错误双语；兑现 0.1.16 延后的 admin→console 跨页链 locale 化。默认语言仍为 **英语**（`localeDetection: false`）。

## 文档索引

| 阶段 | 路径 |
| --- | --- |
| 产品 | `product/prd.md`、`product/user-stories-*.md`、`product/open-questions.md` |
| 设计 | `design/design-spec-i18n-admin.md`、`design/design-spec-i18n-knowledge-preview.md`、`design/copy-*.md`、`design/spec-*.md` |
| 服务端 | `backend/api-spec.md`、`backend/data-models.md`、`backend/implementation-plan.md`、`backend/implementation-notes.md` |
| 前端 | `frontend/implementation-notes.md`、`frontend/test-checklist.md`、`frontend/deviations.md` |

## 本轮关键决策

1. **范围（Q1-A、Q11-A）**：Admin 6 子页 + admin API 9 routes + Knowledge 预览 + knowledge-bases API 5 routes；**不含** API 成功消息、UGC 翻译、账号级语言云端同步。
2. **路由**：`/admin/**`、`/knowledge/**` → 302 `/{locale}/...`；Admin layout 服务端鉴权（Q10-A）；Knowledge 预览 SSR + locale 感知 redirect。
3. **文案**：`messages/{en,zh}/page/admin/{shell,config,users,models,prompts,logs,assistants}.json` + `page/knowledge.json`；扩展 `api/message.json`（~38 新增 key）。
4. **Shell**：AdminShell 接入 `LanguageSwitcher`、`getAntdLocale`；菜单 path 不含 locale；移除客户端 `/api/auth/me` 轮询。
5. **跨页链（Q3-A）**：AdminShell「控制台」→ `/{locale}/console/profile`；非管理员 forbidden → `/{locale}/console?notice=admin_forbidden`。
6. **坏 JSON（Q2-B）**：GET 仅返回 `fileState: invalid_json`；前端 `page.admin.*` 映射 Alert。

## 代码落点（摘要）

- **服务端**：14 个 API route → `tApiMessage`；`middleware.ts`（`handleLegacyAdminRedirect`、`handleLegacyKnowledgeRedirect`）；共享 helper：`validate-tags.ts`、`map-template-error.ts`、`console-forbidden-url.ts`
- **前端**：`src/app/[locale]/admin/**`（删除旧 `src/app/admin/`）、`src/app/[locale]/knowledge/[id]/page.tsx`（删除旧 `src/app/knowledge/`）；`*Client.tsx` + `getXxxColumns(t)`、`admin-api-guards.ts`
- **文案**：14 个 `page/admin/*.json` + `page/knowledge.json` + `api/message.json` admin/knowledge 域

## 当前状态

- **已完成**：需求 → 设计 → 服务端文档（3A）→ 服务端代码（3B）→ 前端实现（4）→ 验收期微调；`npm run build` 通过（2026-06-11，含收尾复验）
- **已知限制**：Knowledge 预览页 `kb.name`/`content` 不译（UGC）；API 成功消息仍为中文/固定文案；prompt 模版**已保存**自定义正文不随 locale 自动翻译
- **后续建议**：全站 i18n 分期表（0.1.15）主体已闭环；若有新模块按 console/admin 模式扩展

## 验收期微调（迭代收尾）

| 项 | 说明 |
| --- | --- |
| 模型 tags | 存库/API 改为英文 key（`free`/`embedding`/…）；展示走 `tag.model.*`；读库兼容旧中文 |
| LanguageSwitcher | 顶栏 hover 与 ProLayout 冲突修复；下拉展示全部语言并高亮当前项；`top-full mt-1` 定位 |
| 顶栏操作链 | `header-action-link.ts` + `globals.css` 统一 Console/Admin/Home/Chat 高度与 hover |
| ProTable 操作列 | `table-row-actions.tsx`：组间距 16px、图标↔文字 4px；Users 页固定两行布局 |
| Knowledge 测试按钮 | 图标与 MCP 统一为 `ThunderboltOutlined` |
| Admin prompts i18n | `localize-prompt-config-item.ts` + `items.*` 消息；内置/带 `{content}` 变体映射 locale 默认正文 |
| prompts 表单间距 | `extra` 区 `mt-3`，Config key 与 textarea 间距加大 |

## 验收

见 `frontend/test-checklist.md`、`backend/implementation-notes.md` §3。
