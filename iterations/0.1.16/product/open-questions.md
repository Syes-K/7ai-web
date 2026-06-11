# 开放问题与待确认项（version 0.1.16 · 控制台 i18n）

本文档列出需求阶段尚未定稿、需**产品/用户确认**或交由**设计/开发评审**的决策。确认结果应回写至 `prd.md` 或设计规格后再进入实现。

---

## 须用户确认（产品决策）

### Q1：knowledge-bases API 是否纳入 0.1.16？

| 选项 | 说明 |
| --- | --- |
| **A（本轮任务默认）** | **不纳入**；仅 `/api/console/**`（12 routes）；knowledge 管理页 UI 双语，但 `/api/knowledge-bases/**` 延至 **0.1.18+** |
| B | 纳入 knowledge-bases API（5 routes），与 0.1.15 open-questions Q3 原结论一致 |
| C | 仅纳入 knowledge-bases 中与 console 页直接相关的子集（如 CRUD，不含 chunk-tests） |

**背景：** `/console/knowledge/page.tsx` 调用 `API_BASE = "/api/knowledge-bases"`。选 A 时英文 UI 下知识库 API 错误可能仍为中文。

**默认建议**：**A**（与本轮任务 In Scope 一致）。若选 B，须扩展 API 故事与工期。

**状态**：待用户确认（与 0.1.15 Q3 结论 B 存在差异，以本轮为准）。

---

### Q2：0.1.16 是否默认全量子页，还是允许 MVP 子集？

| 选项 | 说明 |
| --- | --- |
| **A（推荐）** | **全量** profile/models/assistants/knowledge/mcp/settings + Shell |
| B | MVP 仅 shell + profile + models，其余延至 0.1.16.1 |
| C | 按中文匹配倒序 defer mcp/knowledge |

**默认建议**：**A**。PRD 已按全量编写 AC；若工期不足再书面砍 scope。

**状态**：待用户确认。

---

### Q3：AdminShell / admin 页内链至 console 是否在本期一并 locale 化？

| 选项 | 说明 |
| --- | --- |
| A | **是**；`AdminShell`「控制台」、`admin/users` 无权跳转 `/{locale}/console?notice=...` 在本期修改 |
| **B（推荐）** | **否**；admin 全量 i18n 在 0.1.17；本期仅保证 console 端能正确处理带/不带 locale 的 inbound 链 |
| C | 仅改 admin 跳链，不改 AdminShell 其他文案 |

**默认建议**：**B**。减少跨模块 diff；admin 跳转裸 `/console` 仍可通过 legacy redirect 到达 locale 路径。

**状态**：待用户确认。

---

## 设计/开发评审项（继承 0.1.15，console 批次定稿）

### Q4：parseApiError 本地 fallback 统一

**背景：** console 各子页多处 `请求失败（${status}）` 硬编码。

| 选项 | 说明 |
| --- | --- |
| **A（推荐）** | 抽 `@/common/utils/parse-api-error` 接受 `t` 或 locale，统一 fallback key |
| B | 各页保留本地函数，仅改字符串为 `t()` |
| C | 仅依赖 API message，删除本地 fallback |

**默认建议**：**A**（0.1.15 open-questions Q11）。

**状态**：留待设计/开发定稿。

---

### Q5：MCP test-connection 响应体 `lastErrorSummary`

**背景：** `test-connection/route.ts` 可能写入中文 `lastErrorSummary`（如「凭证解密失败…」）供 UI 展示。

| 选项 | 说明 |
| --- | --- |
| **A（推荐）** | 写入前 `tApiMessage(locale, key)`；或返回结构化 `errorCode` 由前端 `t()` |
| B | 保持中文 summary，仅 REST jsonError 双语 |
| C | 不展示 summary 自然语言，仅显示成功/失败 Tag |

**默认建议**：**A**。

**状态**：留待设计/开发定稿。

---

### Q6：console message 文件拆分粒度

| 选项 | 说明 |
| --- | --- |
| A | 单文件 `page/console.json` |
| **B（推荐）** | 目录 `page/console/{shell,profile,models,...}.json` |
| C | top-level `page/console-profile.json` 等 |

**默认建议**：**B**（0.1.15 open-questions Q8）。

**状态**：建议采纳 B；设计阶段确认 key 树。

---

### Q7：ConsoleForbiddenNotice 文案源

| 选项 | 说明 |
| --- | --- |
| **A（推荐）** | 继续 `page.shell.forbiddenNotice`（跨 Shell 共用） |
| B | 迁至 `page.console.shell.forbiddenNotice`（console 专用副本） |

**默认建议**：**A**，避免与 admin 批次重复维护。

**状态**：留待设计定稿。

---

### Q8：ProTable 列定义 i18n 实现方式

| 选项 | 说明 |
| --- | --- |
| A | 各 page 内 `useTranslations` + `useMemo` 内联 columns |
| **B（推荐）** | 抽 `getXxxColumns(t)` factory |
| C | Server 传 columns |

**默认建议**：**B**（0.1.15 open-questions Q10）。

**状态**：留待开发定稿。

---

### Q9：validation details 内 field.message 是否全部 key 化？

| 选项 | 说明 |
| --- | --- |
| **A（推荐）** | 全部改为 `tApiMessage(locale, 'validation.xxx')` |
| B | 仅顶层 message 双语，details 保持中文 |
| C | details 仅返回 field key，前端翻译 |

**默认建议**：**A**；console API validation 场景有限，可枚举。

**状态**：留待 backend 3A 文档细化。

---

### Q10：`/[locale]/console` layout 鉴权 vs ConsoleShell 客户端鉴权

**背景：** 现网 `ConsoleShell` 客户端 fetch `/api/auth/me`；chat 已用 `[locale]/chat/layout.tsx` 服务端鉴权。

| 选项 | 说明 |
| --- | --- |
| **A（推荐）** | 服务端 layout 鉴权 + 简化 Shell 加载态（与 chat 一致） |
| B | 保留客户端鉴权，仅改文案与 locale |
| C | 双重鉴权（服务端 + 客户端） |

**默认建议**：**A**，减少英文界面闪中文「验证会话…」前的竞态。

**状态**：留待设计/开发定稿。

---

## 已继承（前序迭代已定稿）

| 项 | 结论 |
| --- | --- |
| API 错误形态 | 方案 A：服务端翻译 `error.message` |
| 默认语言 | `en`；`localeDetection: false` |
| locale 解析 | cookie → Accept-Language → `en` |
| LanguageSwitcher 切换 | 保留 query（0.1.15 Q5） |
| UGC 不译 | 助手名、KB 内容、用户模型名等 |
| 路由最终目标 | 分批评迁 `[locale]`（0.1.15 Q4） |

---

## 确认记录

| ID | 确认人 | 结论 | 日期 |
| --- | --- | --- | --- |
| Q1 | 产品 | **A** — 不含 knowledge-bases API | 2026-06-11 |
| Q2 | 产品 | **A** — 全量 console | 2026-06-11 |
| Q3 | 产品 | **B** — admin 链延至 0.1.17 | 2026-06-11 |
| Q4 | 设计/开发 | **A** — `parse-api-error.ts` | 2026-06-11 |
| Q5 | 设计/开发 | **A** — lastErrorSummary `tApiMessage` | 2026-06-11 |
| Q6 | 设计 | **B** — `page/console/*.json` 子模块 | 2026-06-11 |
| Q7 | 设计 | **A** — Forbidden 继续 `page.shell` | 2026-06-11 |
| Q8 | 开发 | **B** — `getXxxColumns(t)` | 2026-06-11 |
| Q9 | Backend 3A | **A** — validation details 全 key 化 | 2026-06-11 |
| Q10 | 设计/开发 | **A** — 服务端 layout 鉴权 | 2026-06-11 |
