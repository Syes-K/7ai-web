# 设计文档索引 — 控制台 i18n（version 0.1.16）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.16` |
| 阶段 | 设计（阶段 2）✅ · 迭代 **已完成** |
| 上游需求 | `iterations/0.1.16/product/` |
| 风格基线 | `iterations/0.1.15/design/` |

---

## 文档清单

| 文档 | 用途 | 主要读者 |
| --- | --- | --- |
| [design-spec-i18n-console.md](./design-spec-i18n-console.md) | **总设计规格**：Shell、路由摘要、message 树、列 factory、鉴权、knowledge 过渡 UX | 全员 |
| [spec-routing-locale-console.md](./spec-routing-locale-console.md) | 路由迁移、middleware、`KNOWN_APP_SEGMENTS`、跨页链接、login redirect | Backend + Frontend |
| [spec-shared-infra-console.md](./spec-shared-infra-console.md) | Console Shell 接入 0.1.15 共享 infra（antd/dayjs、LanguageSwitcher、Forbidden） | Frontend |
| [spec-api-message-console.md](./spec-api-message-console.md) | `/api/console/**` ErrorCode ↔ key、`lastErrorSummary`、validation 扩展 | Backend（3A）+ Frontend |
| [copy-console-en-zh.md](./copy-console-en-zh.md) | 各子页中英 copy 清单（实现时填入 `messages/{en,zh}/page/console/*.json`） | Frontend + 翻译校对 |

---

## 已确认产品决策

| ID | 结论 |
| --- | --- |
| Q1 | **A** — 不含 `/api/knowledge-bases/**`（0.1.18+） |
| Q2 | **A** — 全量 6 子页 + Shell |
| Q3 | **B** — admin 跳链 locale 化延至 0.1.17 |

## 设计阶段定稿（Q4–Q10）

| ID | 结论 | 文档 |
| --- | --- | --- |
| Q4 | **A** — `@/common/utils/parse-api-error` + `page.console.shell.errors.*` | design-spec §7 |
| Q5 | **A** — `lastErrorSummary` 服务端 `tApiMessage` | spec-api-message §5 |
| Q6 | **B** — `page/console/{shell,profile,...}.json` | design-spec §3 |
| Q7 | **A** — Forbidden 继续 `page.shell.forbiddenNotice` | spec-shared-infra §4 |
| Q8 | **B** — `getXxxColumns(t)` factory | design-spec §5.1 |
| Q9 | **A** — validation details 全 key 化 | spec-api-message §3 |
| Q10 | **A** — 服务端 layout 鉴权；Shell 去掉客户端 session 轮询 | design-spec §2.2、spec-routing §4.4 |

---

## ProTable 列 factory 命名

| 子页 | 函数名 |
| --- | --- |
| models | `getModelColumns(t, ctx)` |
| assistants | `getAssistantColumns(t, ctx)` |
| knowledge | `getKnowledgeColumns(t, ctx)` |
| mcp | `getMcpColumns(t, ctx)` |

---

## message 文件布局

```
messages/{en,zh}/page/console/
  shell.json
  profile.json
  models.json
  assistants.json
  knowledge.json
  mcp.json
  settings.json
```

命名空间：`page.console.{module}.*`

---

## 下游交接

| 下一阶段 | 输入 |
| --- | --- |
| **Backend 3A** | `spec-api-message-console.md`、本目录 design-spec 模块 D |
| **Backend 3B** | 3A 确认后的 API 实现 + 12 route 改造 |
| **Frontend** | 全部设计文档 + `copy-console-en-zh.md` |

---

## 已知限制（验收标注）

1. **knowledge-bases API**：英文 UI 下 `/api/knowledge-bases/**` 错误 message 可能仍为中文（0.1.18 前）。
2. **admin 跳链**：裸 `/console?notice=...` 依赖 legacy redirect；admin 侧 locale 链 0.1.17。
3. **knowledge 预览页**：URL 带 locale 前缀；壳层 i18n 0.1.18+。

---

## 验收对照（设计覆盖）

- [x] US-A1–A20 路由与 Shell（routing + shared-infra + copy §1）
- [x] US-B1–B6 profile（copy §2）
- [x] US-C1–C5 models（copy §3 + provider）
- [x] US-D1–D4 assistants（copy §4）
- [x] US-E1–E6 knowledge（copy §5 + design-spec §6）
- [x] US-F1–F3 mcp（copy §6 + api §5）
- [x] US-G1–G2 settings（copy §7）
- [x] US-H1–H3 跨页入口（routing §5）
- [x] API Epic A–F（spec-api-message-console.md）
