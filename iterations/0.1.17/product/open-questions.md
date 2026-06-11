# 开放问题与待确认项（version 0.1.17 · 管理后台 i18n）

> **迭代状态（2026-06-11）**：全流程已完成。本文档保留决策记录；未决项已在实现中按「默认建议」或验收期微调落地，详见 `../README.md`。

本文档列出需求阶段尚未定稿、需**产品/用户确认**或交由**设计/开发评审**的决策。确认结果应回写至 `prd.md` 或设计规格后再进入实现。

---

## 须用户确认（产品决策）

### Q1：0.1.17 是否默认全量子页 + API，还是允许 MVP 子集？

| 选项 | 说明 |
| --- | --- |
| **A（推荐）** | **全量** admin 6 子页 + admin API 9 routes + **knowledge 预览 + knowledge-bases API 5 routes** |
| B | MVP 仅 admin shell + users + config，knowledge 延至 0.1.17.1 |
| C | 按中文匹配倒序 defer logs/prompts |

**默认建议**：**A**（含用户确认的 Knowledge 批次）。

**状态**：待用户确认。

---

### Q11：Knowledge 预览 + knowledge-bases API 纳入本期（用户 2026-06-11 确认）

| 选项 | 说明 |
| --- | --- |
| **A（已确认）** | **纳入** `/[locale]/knowledge/[id]` + `/api/knowledge-bases/**`；消除 0.1.16 console knowledge API 中文错误限制 |
| B | 仅预览页路由，API 仍延至 0.1.18 |

**结论**：**A** — 用户明确要求「Knowledge 预览页也一起做了」（含 knowledge-bases API 以闭环 console knowledge 体验）。

**状态**：**已确认**。

---

### Q2：prompt-config / conversation-summary GET 坏 JSON 说明文案由谁翻译？

**背景：** GET 成功响应可能含用户可见 `statusMessage`（如「promptConfig.json 无法解析…」），非 `jsonError` 形态。

| 选项 | 说明 |
| --- | --- |
| A | 服务端 GET handler 按 `resolveRequestLocale` 返回已翻译 `statusMessage` |
| **B（推荐）** | 响应仅返回机器可读 `status: invalid_json`；前端 `page.admin.prompts` / `page.admin.config` 用 key 映射展示 Alert |
| C | 保持中文 statusMessage，仅 REST 错误双语 |

**默认建议**：**B**。与 0.1.16 前端 i18n 优先策略一致；减少 API 成功体多语言维护面。

**状态**：待用户确认。

---

### Q3：admin→console 跨页链是否全部纳入本期？（0.1.16 Q3-B 兑现）

| 选项 | 说明 |
| --- | --- |
| **A（推荐 · 本轮任务默认）** | **是**；`AdminShell` 控制台链、`layout` forbidden、各子页 403 跳转全部 locale 化 |
| B | 仅 layout forbidden，Shell 顶栏与 403 客户端跳转延至 0.1.17.1 |
| C | 仅改 Shell 顶栏，403 仍 legacy redirect 依赖 middleware |

**背景：** 0.1.16 产品确认 Q3-B 将 admin 链延至 0.1.17；本轮任务背景已明确纳入。

**默认建议**：**A**。

**状态**：待用户确认（与任务背景一致，预期快速通过）。

---

## 设计/开发评审项

### Q4：prompt-config `tmpl.message` 动态校验映射（继承 0.1.15 Q7）

**背景：** `prompt-config/route.ts` 部分 `jsonError(VALIDATION_ERROR, tmpl.message)` 使用运行时模板字符串。

| 选项 | 说明 |
| --- | --- |
| A | 保留中文 tmpl，仅顶层 message 双语 |
| **B（推荐）** | 改为 ErrorCode + 有限 `validation.promptConfig.template.*` key 枚举 |
| C | 返回 `errorCode` + `templateKey`，前端 `t()` |

**默认建议**：**B**（0.1.15 原结论；admin 批次实施）。

**状态**：留待 backend 3A 文档细化。

---

### Q5：Admin layout 鉴权模式（继承 0.1.16 Q10）

**背景：** 现网 `AdminShell` 客户端 fetch `/api/auth/me`；0.1.16 console 已改服务端 layout 鉴权。

| 选项 | 说明 |
| --- | --- |
| **A（推荐）** | 服务端 `[locale]/admin/layout.tsx` 鉴权 + 简化 Shell（与 ConsoleShell 一致） |
| B | 保留客户端鉴权，仅改文案与 locale |
| C | 双重鉴权 |

**默认建议**：**A**。

**状态**：留待设计/开发定稿。

---

### Q6：admin message 文件拆分粒度（继承 0.1.16 Q6）

| 选项 | 说明 |
| --- | --- |
| A | 单文件 `page/admin.json` |
| **B（推荐）** | 目录 `page/admin/{shell,config,users,...}.json` |
| C | top-level `page/admin-users.json` 等 |

**默认建议**：**B**（对齐 console 0.1.16）。

**状态**：建议采纳 B；设计阶段确认 key 树。

---

### Q7：`validation.invalidUserId` vs 复用 `validation.invalidId`

| 选项 | 说明 |
| --- | --- |
| A | 新增 `validation.invalidUserId`（语义更明确） |
| **B（推荐）** | 复用 `validation.invalidId`（admin users 与 console 资源 id 校验统一） |

**默认建议**：**B**，减少 key 膨胀；若产品要求区分「用户 id」措辞可选 A。

**状态**：留待 backend 3A 定稿。

---

### Q8：ProTable 列定义 i18n 实现方式（继承 0.1.16 Q8）

| 选项 | 说明 |
| --- | --- |
| A | 各 page 内 `useTranslations` + `useMemo` 内联 columns |
| **B（推荐）** | 抽 `getXxxColumns(t)` factory |
| C | Server 传 columns |

**默认建议**：**B**。

**状态**：留待开发定稿。

---

### Q9：403 forbidden 跳转 helper 统一

**背景：** users/config/prompts/assistants 等多处 `window.location.replace("/console?notice=admin_forbidden")`。

| 选项 | 说明 |
| --- | --- |
| **A（推荐）** | 抽 `@/common/utils/admin-forbidden-redirect` 或 `getConsoleForbiddenUrl(locale)` |
| B | 各页 inline 改 URL |
| C | 改用 `router.replace` + `@/i18n/navigation` |

**默认建议**：**A**，与 locale 解析单点维护。

**状态**：留待开发定稿。

---

### Q10：middleware `x-admin-login-redirect` header 是否 locale 感知

**背景：** 现网 middleware 对裸 `/admin` 设置 `x-admin-login-redirect` 为裸路径；迁入 `[locale]` 后 login redirect 须含 locale。

| 选项 | 说明 |
| --- | --- |
| **A（推荐）** | middleware 设置 `/{locale}/admin...`；legacy redirect 优先于 header |
| B | 移除 header，完全由 `[locale]/admin/layout.tsx` 构造 redirect |
| C | 保留裸路径 header，layout 再补 locale 前缀 |

**默认建议**：**A** 或 **B**（开发评估 middleware 与 layout 职责边界）。

**状态**：留待开发定稿。

---

## 已继承（前序迭代已定稿）

| 项 | 结论 |
| --- | --- |
| API 错误形态 | 方案 A：服务端翻译 `error.message` |
| 默认语言 | `en`；`localeDetection: false` |
| locale 解析 | cookie → Accept-Language → `en` |
| LanguageSwitcher 切换 | 保留 query（0.1.15 Q5） |
| UGC 不译 | 助手 prompt、用户 email、日志正文、prompt value 等 |
| validation details | 全 key 化（0.1.16 Q9-A） |
| parseApiError | 统一工具（0.1.16 Q4-A） |
| Forbidden 文案源 | 继续 `page.shell.forbiddenNotice`（0.1.16 Q7-A） |
| admin 跨页链时机 | 0.1.17（0.1.16 Q3-B） |

---

## 确认记录

| ID | 确认人 | 结论 | 日期 |
| --- | --- | --- | --- |
| Q1 | — | 待确认（默认 A：含 knowledge） | — |
| Q2 | — | 待确认 | — |
| Q3 | — | 待确认（默认 A） | — |
| Q11 | 用户 | **A** — Knowledge 预览 + knowledge-bases API 纳入本期 | 2026-06-11 |
| Q4–Q10 | — | 留待设计/开发 | — |
