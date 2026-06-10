# 开放问题与待确认项（version 0.1.15 · i18n 剩余页面与 API）

本文档列出需求阶段尚未定稿、需**产品/用户确认**或交由**设计/开发评审**的决策。确认结果应回写至 `prd.md` 或设计规格后再进入实现。

---

## 须用户确认（产品决策）

### Q1：0.1.15 MVP 范围 — 是否仅 chat + 共享 infra？

| 选项 | 说明 |
| --- | --- |
| **A（推荐）** | **0.1.15 仅交付 chat 全量 + chat API + 共享 infra**；console/admin/knowledge 按 PRD 批次 2–4 排后续版本 |
| B | 0.1.15 同时交付 chat + console 全量（工作量大，风险高） |
| C | 0.1.15 仅 chat UI，API 与 infra 延至 0.1.16 |

**默认建议**：**A**。与 0.1.14 README「下一批 chat」一致；chat 单组件 154+ 处中文，单独迭代可验收。

---

### Q2：Console/Admin 是否拆分为两个版本？

| 选项 | 说明 |
| --- | --- |
| **A（推荐）** | console **0.1.16**、admin **0.1.17** 分两版交付 |
| B | console + admin 合并为一版（面过大） |
| C | admin 优先级高于 console（与现网用户量不符，不推荐） |

**默认建议**：**A**。console 为普通用户自助配置入口；admin 为内部运维，优先级低于 console。

---

### Q3：knowledge-bases API 与预览页批次

| 选项 | 说明 |
| --- | --- |
| **A（推荐）** | API 与 console `/console/knowledge` 页同在 **0.1.16**；独立预览页 `/knowledge/[id]` 在 **0.1.18+** |
| B | API 全部延至预览页同一批次 |
| C | 0.1.15 顺带改造 knowledge-bases API（扩大 MVP） |

**默认建议**：**A**。管理页调用 API 最频繁，预览页壳层改动小。

---

### Q4：应用路由是否最终全部迁入 `[locale]/app/*` 单树？

| 选项 | 说明 |
| --- | --- |
| **A（推荐）** | 是；最终 `KNOWN_APP_SEGMENTS` 仅留 `api` 或清空；分四批迁移 |
| B | chat/console/admin 保留裸路径，页内读 cookie 渲染双语（与 0.1.13/14 URL 策略不一致） |
| C | 仅 chat 迁入，console/admin 长期裸路径 |

**默认建议**：**A**，与 login/register 迁移模式一致。

---

### Q5：LanguageSwitcher 切换时 query 处理（如 `notice=admin_forbidden`）

| 选项 | 说明 |
| --- | --- |
| **A（推荐）** | 切换语言**保留** query，避免丢失一次性提示状态 |
| B | 切换语言 strip 所有 query |
| C | 仅保留 `redirect` 类白名单 query |

**默认建议**：**A**。

---

## 设计/开发评审项

### Q6：SSE 流式错误与中断 reason 是否 i18n？

**背景：** `ChatWorkspace` / messages route 流式路径可能存在用户可见中文 status/reason。

| 选项 | 说明 |
| --- | --- |
| **A（推荐）** | 用户可见的 interruption reason、流式错误 fallback **纳入** `page.chat` 或 `api.message` |
| B | 仅非流式 REST 错误 i18n；流式保持中文直至重构 |
| C | 流式错误统一英文技术码，不展示自然语言 |

**默认建议**：**A**，至少覆盖主流程可见错误。

---

### Q7：prompt-config 等动态 validation message

**背景：** `admin/prompt-config` 部分 `jsonError(VALIDATION_ERROR, tmpl.message)` 使用运行时模板字符串。

| 选项 | 说明 |
| --- | --- |
| A | 改为 messageKey + params，服务端 `tApiMessage` |
| **B（推荐）** | 管理端批次时梳理 tmpl 为有限枚举 key |
| C | 保留中文 tmpl.message，仅静态 route message i18n |

**默认建议**：**B**（admin 批次实施）。

---

### Q8：console message 文件拆分粒度

| 选项 | 说明 |
| --- | --- |
| A | 单文件 `page/console.json` 大命名空间 |
| **B（推荐）** | 目录 `page/console/{shell,profile,models,...}.json` |
| C | 与路由 1:1 独立 top-level `page/console-profile.json` |

**默认建议**：**B**，避免单文件超过 login+register 体量。

---

### Q9：Chat 迁入 `[locale]` 的 layout 结构

| 选项 | 说明 |
| --- | --- |
| **A（推荐）** | `src/app/[locale]/chat/page.tsx` + 可选 `[locale]/chat/layout.tsx`（鉴权）；删除旧 `src/app/chat/` |
| B | 保留 `src/app/chat/` 作 re-export 至 locale 页 |
| C | chat 仍为裸路径，仅 Client 读 cookie i18n |

**默认建议**：**A**。

---

### Q10：ProTable 列定义 i18n 实现方式

| 选项 | 说明 |
| --- | --- |
| A | 各 page 内 `useTranslations` + `useMemo` 生成 columns |
| **B（推荐）** | 抽 `getXxxColumns(t)` factory，便于测试与复用 |
| C | Server 传 columns（不适用 client ProTable） |

**默认建议**：**B**（console/admin 批次）。

---

### Q11：parseApiError 本地 fallback 统一

**背景：** 多处 `请求失败（${status}）` 硬编码。

| 选项 | 说明 |
| --- | --- |
| **A（推荐）** | 抽 `@/common/utils/parse-api-error` 接受 `t` 或 locale，统一 fallback key |
| B | 各页保留本地函数，仅改字符串为 t() |
| C | 仅依赖 API message，删除本地 fallback |

**默认建议**：**A**。

---

### Q12：0.1.15 是否在 console 未 i18n 时仍改 href 为 `/{locale}/console`？

| 选项 | 说明 |
| --- | --- |
| **A（推荐）** | 是；console 页暂仍中文但 URL 带 locale，为 0.1.16 铺路 |
| B | 0.1.16 前链至裸 `/console`，避免 URL 与 UI 语言不一致 |
| C | 0.1.15 隐藏控制台入口直至 console 双语 |

**默认建议**：**A**，并在 PRD 注明过渡期 console UI 可能仍为中文（与 0.1.13 跨页策略类似）。

---

## 已继承（0.1.14 已定稿，本迭代沿用）

| 项 | 结论 |
| --- | --- |
| API 错误形态 | **方案 A**：服务端翻译 `error.message` |
| 默认语言 | `en`；`localeDetection: false` |
| locale 解析 | cookie `NEXT_LOCALE` → Accept-Language → `en` |
| key 规范 | `page` / `api` 分组；英文 camelCase key |

---

## 确认记录

| ID | 确认人 | 结论 | 日期 |
| --- | --- | --- | --- |
| Q1 | 产品/用户 | **A** — MVP 仅 chat + infra | 2026-06-10 |
| Q2 | 产品/用户 | **A** — console 0.1.16、admin 0.1.17 | 2026-06-10 |
| Q3 | 产品/用户 | **A** — knowledge API 随 console 0.1.16 | 2026-06-10 |
| Q4 | 产品/用户 | **A** — 分批评迁，最终仅 `api` 裸路径 | 2026-06-10 |
| Q5 | 设计/实现 | **A** — LanguageSwitcher 保留 query | 2026-06-10 |
| Q6 | 设计/实现 | **A** — SSE/turn safeMessage 纳入 i18n | 2026-06-10 |
| Q9 | 设计/实现 | **A** — `[locale]/chat` + layout 鉴权 | 2026-06-10 |
| Q12 | 实现偏差 | **B** — 0.1.15 控制台仍链裸 `/console`（见 `frontend/deviations.md` D1） | 2026-06-10 |
| Q7–Q8、Q10–Q11 | — | 留待 console/admin 批次 | — |
