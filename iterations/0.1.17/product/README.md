# 迭代说明（version 0.1.17 · 产品）

在 0.1.16（Console 全量 i18n）之上，本迭代交付 **管理后台（Admin）全量 i18n** + **Knowledge 预览页与 knowledge-bases API i18n**：Admin 迁入 `[locale]`、`/api/admin/**` 与 `/api/knowledge-bases/**` 错误双语、Admin Shell 完整接入，并兑现 0.1.16 延后的 admin→console 跨页链 locale 化。

## 文档索引

| 文档 | 说明 |
| --- | --- |
| [`prd.md`](prd.md) | 主 PRD：In/Out Scope、路由迁移、message 组织、API 映射、验收 |
| [`user-stories-admin.md`](user-stories-admin.md) | Admin Shell、菜单、各子页 UI i18n |
| [`user-stories-knowledge.md`](user-stories-knowledge.md) | Knowledge 预览页路由 + 预览链 + API 关联 |
| [`user-stories-api-i18n.md`](user-stories-api-i18n.md) | `/api/admin/**` + `/api/knowledge-bases/**` 错误双语 |
| [`open-questions.md`](open-questions.md) | 待确认项 |

## 本期交付摘要

| 纳入 | 不纳入 |
| --- | --- |
| `/[locale]/admin/**` 全量 UI 双语 | API 成功消息、UGC 翻译 |
| `/[locale]/knowledge/[id]` 预览页（路由 + metadata + 鉴权 redirect） | 账号级语言云端同步 |
| `/api/admin/**`（9 routes）+ `/api/knowledge-bases/**`（5 routes）错误双语 | Console/Chat 已交付范围重构 |
| `page/admin/*.json` + `page/knowledge.json` | 第三语言 / RTL |
| Admin Shell：`LanguageSwitcher`、antd/dayjs | |
| legacy `/admin/**`、`/knowledge/**` → 302 | |
| admin→console 跨页链 locale 化（Q3-B 兑现） | |

## 子页体量参考

| 模块 | 约中文匹配 | message 文件 |
| --- | --- | --- |
| admin shell + menu | ~11 | `page/admin/shell.json` |
| users / config / models / assistants / prompts / logs | 53 / 50 / 44 / 44 / 24 / 3 | `page/admin/*.json` |
| knowledge 预览 | ~0（壳层/metadata） | `page/knowledge.json` |

## API 路由清单

**Admin（9）：** users、model-configs、assistants、prompt-config、config/conversation-summary 等。

**Knowledge-bases（5）：** CRUD、vectorization、vectorization/retry、chunk-tests。

## 上游依赖

- `iterations/0.1.16/` — console 模式参考
- `iterations/0.1.15/product/user-stories-knowledge.md` — 预览页愿景
- `iterations/0.1.16/product/open-questions.md` Q3-B — admin 跨页链延至本期

## 状态

- **已完成**：需求 → 设计 → 服务端（3A/3B）→ 前端（4）；详见 `../README.md`
