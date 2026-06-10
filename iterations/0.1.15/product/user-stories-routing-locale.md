# 用户故事与验收标准：路由与 locale 一致性（version 0.1.15）

本文档为 `prd.md` 子文档，覆盖剩余应用路由迁入 `[locale]`、middleware、跨页链接与 redirect 策略。

---

## Epic A：Legacy 路径重定向（分批次）

### US-A1 Chat legacy redirect — **0.1.15**

**作为** 用户  
**我想要** 书签 `/chat` 仍能访问对话页  
**以便** 旧链接不失效  

**验收标准：**

- [ ] **AC-A1**：`GET /chat` → 302 `/{locale}/chat`，locale 解析链与 0.1.14 login 一致。
- [ ] **AC-A2**：`GET /chat?*` query 保留（若未来有 query）。
- [ ] **AC-A3**：`chat` 从 `KNOWN_APP_SEGMENTS` 移除后，`/fr/chat` 等非法 locale 仍按既有规则处理。

### US-A2 Console legacy redirect — **批次 2**

**验收标准：**

- [ ] **AC-A4**：`GET /console/**` → 302 `/{locale}/console/**`，path + query 保留。

### US-A3 Admin legacy redirect — **批次 3**

**验收标准：**

- [ ] **AC-A5**：`GET /admin/**` → 302 `/{locale}/admin/**`。

### US-A4 Knowledge legacy redirect — **批次 4**

**验收标准：**

- [ ] **AC-A6**：`GET /knowledge/{id}` → 302 `/{locale}/knowledge/{id}`。

---

## Epic B：受保护路由与登录跳转

### US-B1 未登录跳转 locale 感知 — **0.1.15 起逐步**

**作为** 未登录访客  
**我想要** 访问受保护页时被导向带 locale 的登录页  
**以便** 登录后语言一致  

**验收标准：**

- [ ] **AC-B1**：middleware `handleProtectedRoute` 对 `/chat`、`/{locale}/chat` 未登录 → `/{locale}/login?redirect=...`。
- [ ] **AC-B2**：`redirect` 参数值为**完整目标路径**（含 locale 前缀），如 `/en/chat` 而非 `/chat`。
- [ ] **AC-B3**：`ConsoleShell`/`AdminShell`/`ChatPage` 客户端 401 跳转同步改为 locale 感知（读 cookie 或 pathname 解析 locale）。
- [ ] **AC-B4**：各批次迁移完成后，对应路径均满足 AC-B1–B3。

### US-B2 登录成功回跳

**作为** 用户  
**我想要** 登录成功后回到带 locale 的原目标页  
**以便** 继续任务  

**验收标准：**

- [ ] **AC-B5**：`redirect=/en/chat` 登录成功 → `/en/chat`。
- [ ] **AC-B6**：`safeRedirectUrl`（若有）允许 locale 前缀路径。

---

## Epic C：跨页链接 locale 感知

### US-C1 首页导航 — **0.1.15 更新 chat 链**

**验收标准：**

- [ ] **AC-C1**：`PunkHomeHeader` 中「对话」链为 `/{locale}/chat`（或 next-intl `Link` 等价）。
- [ ] **AC-C2**：「控制台」链在 console 迁移前可暂为裸路径并记录债；**0.1.16 后**须为 `/{locale}/console/profile`（或默认子页）。

### US-C2 Shell 顶栏互链

**验收标准：**

- [ ] **AC-C3**：`ConsoleShell`「对话」→ `/{locale}/chat`。
- [ ] **AC-C4**：`AdminShell`「对话」「控制台」→ locale 前缀路径。
- [ ] **AC-C5**：`ChatWorkspace` 控制台入口 → locale 前缀（见 chat user stories）。

### US-C3 页内 Link

**验收标准：**

- [ ] **AC-C6**：console knowledge 预览 `href="/knowledge/..."` 改为 locale 感知（批次 2/4）。
- [ ] **AC-C7**：AuthShell「返回首页」已为 `/{locale}`（0.1.14）；其它 Shell 无需重复。

---

## Epic D：LanguageSwitcher 与 URL

### US-D1 应用内切换保留路径

**作为** 用户  
**我想要** 在 chat/console/admin 切换语言时留在当前功能页  
**以便** 不丢失上下文  

**验收标准：**

- [ ] **AC-D1**：`/en/chat` → 切中文 → `/zh/chat`。
- [ ] **AC-D2**：`/en/console/models` → 切中文 → `/zh/console/models`（批次 2 后）。
- [ ] **AC-D3**：query string（如 `notice=admin_forbidden`）切换语言时保留或按设计 strip（见 open-questions Q5）。

---

## Epic E：非法 locale 与 404

### US-E1 非法 locale 前缀

**验收标准：**

- [ ] **AC-E1**：`/fr/chat` → 302 `/en/chat`（或 `/en` + 等价策略，延续 0.1.13）。
- [ ] **AC-E2**：迁移后各模块行为与 home/login 一致。

---

## Epic F：html lang 与 layout

### US-F1 各模块 layout metadata

**验收标准：**

- [ ] **AC-F1**：迁入 `[locale]` 的页面走 `[locale]/layout.tsx`，`html lang` 正确。
- [ ] **AC-F2**：chat 若保留独立 layout，须嵌套在 locale layout 下或自行设置 `LocaleHtmlLang`。

---

## 依赖

- `src/middleware.ts`：`KNOWN_APP_SEGMENTS`、legacy handlers、`isProtectedPath`。
- `src/i18n/routing.ts`、`src/common/utils/i18n.ts`。
