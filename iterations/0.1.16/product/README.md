# 迭代说明（version 0.1.16 · 产品）

在 0.1.15（Chat MVP i18n + 共享 infra）之上，本迭代交付 **控制台（Console）全量 i18n**：页面迁入 `[locale]`、`/api/console/**` 错误双语、Console Shell 完整接入 `LanguageSwitcher` 与 antd/dayjs 动态 locale。

## 文档索引

| 文档 | 说明 |
| --- | --- |
| [`prd.md`](prd.md) | 主 PRD：In/Out Scope、路由迁移、message 组织、API 映射、验收 |
| [`user-stories-console.md`](user-stories-console.md) | 控制台 Shell、菜单、各子页 UI i18n |
| [`user-stories-api-i18n.md`](user-stories-api-i18n.md) | `/api/console/**` 错误双语、ErrorCode 映射 |
| [`open-questions.md`](open-questions.md) | 待确认项（含 knowledge-bases API 边界） |

## 本期交付摘要

| 纳入 | 不纳入（后续批次） |
| --- | --- |
| `/[locale]/console/**` 全量 UI 双语 | `/admin/*` 页面与菜单（0.1.17） |
| `/api/console/**`（12 routes）错误双语 | `/api/admin/**`（0.1.17） |
| `page/console/*.json` 按子模块拆分 | `/knowledge/[id]` 预览页（0.1.18+） |
| Console Shell：`LanguageSwitcher`、antd/dayjs | `/api/knowledge-bases/**`（0.1.18+，见 open-questions Q1） |
| legacy `/console/**` → 302 | API 成功消息、UGC 翻译 |

## 子页体量参考（中文匹配约数）

| 子页 | 约匹配 | message 文件 |
| --- | --- | --- |
| shell + menu | ~10 | `shell.json` |
| profile | 54 | `profile.json` |
| models | 59 | `models.json` |
| assistants | 72 | `assistants.json` |
| knowledge | 89 | `knowledge.json` |
| mcp | 82 | `mcp.json` |
| settings | 1 | `settings.json` |

## 上游依赖

- `iterations/0.1.15/product/prd.md` — 分期交付表批次 2
- `iterations/0.1.15/product/user-stories-shared-infra.md` — antd/dayjs、Confirm、Forbidden
- `iterations/0.1.15/product/user-stories-routing-locale.md` — legacy redirect 模式

## 状态

- **已完成**（2026-06-11）：需求 → 设计 → 服务端 3A/3B → 前端 → 验收期微调
- 迭代总览见 [`../README.md`](../README.md)
