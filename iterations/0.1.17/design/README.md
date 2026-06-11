# 设计文档索引 — 管理后台 + Knowledge 预览 i18n（version 0.1.17）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.17` |
| 阶段 | 设计（阶段 2）✅ |
| 上游需求 | `iterations/0.1.17/product/` |
| 风格基线 | `iterations/0.1.16/design/`、`src/app/[locale]/console/**` |

---

## 文档清单

| 文档 | 用途 | 主要读者 |
| --- | --- | --- |
| [design-spec-i18n-admin.md](./design-spec-i18n-admin.md) | **Admin 总设计规格**：Shell、子页、message 树、列 factory、鉴权、跨页链 | 全员 |
| [design-spec-i18n-knowledge-preview.md](./design-spec-i18n-knowledge-preview.md) | **Knowledge 预览页**路由、壳层、metadata、与 console 预览链 | Frontend + Backend |
| [spec-routing-locale-admin-knowledge.md](./spec-routing-locale-admin-knowledge.md) | admin + knowledge 路由迁移、middleware、login/forbidden redirect | Backend + Frontend |
| [spec-shared-infra-admin.md](./spec-shared-infra-admin.md) | Admin Shell 接入 0.1.15/0.1.16 共享 infra | Frontend |
| [spec-api-message-admin.md](./spec-api-message-admin.md) | `/api/admin/**` ErrorCode ↔ key、prompt-config validation 子树 | Backend（3A）+ Frontend |
| [spec-api-message-knowledge-bases.md](./spec-api-message-knowledge-bases.md) | `/api/knowledge-bases/**` ErrorCode ↔ key | Backend（3A）+ Frontend |
| [copy-admin-en-zh.md](./copy-admin-en-zh.md) | admin 各子页中英 copy（填入 `messages/{en,zh}/page/admin/*.json`） | Frontend + 校对 |
| [copy-knowledge-en-zh.md](./copy-knowledge-en-zh.md) | knowledge 预览壳层 copy（填入 `page/knowledge.json`） | Frontend |

---

## 已确认 / 设计定稿产品决策

| ID | 结论 | 文档 |
| --- | --- | --- |
| Q1 | **A** — 全量 admin 6 子页 + admin API 9 routes + knowledge 预览 + knowledge-bases API 5 routes | 全部 |
| Q2 | **B** — GET 坏 JSON：`status: invalid_json` + 前端 `page.admin.*` Alert 映射 | design-spec §6、copy §config/prompts |
| Q3 | **A** — admin→console 跨页链全部 locale 化（0.1.16 Q3-B 兑现） | spec-routing §5、spec-shared-infra §4 |
| Q11 | **A** — Knowledge 预览 + knowledge-bases API 纳入本期 | design-spec-knowledge、spec-api-message-knowledge-bases |

## 设计阶段定稿（Q4–Q10）

| ID | 结论 | 文档 |
| --- | --- | --- |
| Q4 | **B** — `tmpl.message` → 有限 `validation.promptConfig.template.*` key | spec-api-message-admin §4 |
| Q5 | **A** — 服务端 `[locale]/admin/layout.tsx` 鉴权；Shell 去掉客户端 session 轮询 | design-spec §2.2、spec-shared-infra §2 |
| Q6 | **B** — `page/admin/{shell,config,...}.json` 拆分 | design-spec §3 |
| Q7 | **B** — 复用 `validation.invalidId`（用户 id 与资源 id 统一措辞） | spec-api-message-admin §2 |
| Q8 | **B** — `getXxxColumns(t)` factory | design-spec §5 |
| Q9 | **A** — `getConsoleForbiddenUrl(locale)` 单点 helper | spec-routing §5.2 |
| Q10 | **B** — 移除 middleware `x-admin-login-redirect`；layout 用 `params.locale` + 请求 path 构造 login redirect | spec-routing §4.4 |

---

## ProTable 列 factory 命名

| 子页 | 函数名 |
| --- | --- |
| users | `getAdminUserColumns(t, ctx)` |
| models | `getAdminModelColumns(t, ctx)` |
| assistants | `getAdminAssistantColumns(t, ctx)` |

logs 为占位页，无列 factory。

---

## message 文件布局

```
messages/{en,zh}/page/admin/
  shell.json
  config.json
  users.json
  models.json
  prompts.json
  logs.json
  assistants.json
messages/{en,zh}/page/
  knowledge.json          # 预览页 metadata + 壳层（非 console.knowledge）
```

命名空间：`page.admin.{module}.*`、`page.knowledge.*`

---

## 下游交接

| 下一阶段 | 输入 |
| --- | --- |
| **Backend 3A** | `spec-api-message-admin.md`、`spec-api-message-knowledge-bases.md`、routing §middleware |
| **Backend 3B** | 3A 确认后的 API 实现 + 14 route 改造 |
| **Frontend** | 全部设计文档 + `copy-admin-en-zh.md` + `copy-knowledge-en-zh.md` |

---

## 相对 0.1.16 的闭环项

| 0.1.16 已知限制 | 0.1.17 设计落点 |
| --- | --- |
| knowledge-bases API 英文 UI 下错误仍为中文 | `spec-api-message-knowledge-bases.md` |
| admin 跳链裸 `/console` | `spec-routing-locale-admin-knowledge.md` §5 |
| knowledge 预览 URL 无 locale | `design-spec-i18n-knowledge-preview.md` |

---

## 验收对照（设计覆盖）

- [x] US-A1–A21 admin 路由与 Shell（routing + shared-infra + copy §1）
- [x] US-B1 config（copy §2 + Q2-B Alert 映射）
- [x] US-C1 users（copy §3 + formatLockRemain）
- [x] US-D1 models（copy §4）
- [x] US-E1 prompts（copy §5）
- [x] US-F1 logs（copy §6）
- [x] US-G1 assistants（copy §7）
- [x] US-H1 metadata + request.ts（design-spec §3）
- [x] Knowledge US-A1–C2（design-spec-knowledge + copy-knowledge）
- [x] API Epic A–G admin + Epic D knowledge-bases（两份 api spec）
