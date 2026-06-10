# 用户故事与验收标准：路由迁移与 locale 一致性（version 0.1.14）

本文档为 `prd.md` 子文档，覆盖 `login`/`register` 迁入 `[locale]`、旧路径兼容与跨页链路。

---

## Epic A：路由迁入 [locale]

### US-A1 登录注册使用 locale 前缀

**作为** 访客  
**我想要** 通过 `/en/login`、`/zh/register` 访问认证页  
**以便** URL 与首页语言策略一致  

**验收标准：**

- [ ] **AC-A1**：存在 `src/app/[locale]/login/page.tsx`（或由等价结构提供），在 `en`/`zh` 下正常渲染。
- [ ] **AC-A2**：存在 `src/app/[locale]/register/page.tsx`，在 `en`/`zh` 下正常渲染。
- [ ] **AC-A3**：原 `src/app/login/page.tsx`、`src/app/register/page.tsx` 改为重定向或移除并由 middleware/next-intl 处理（以实现为准，行为须满足 AC-A4）。
- [ ] **AC-A4**：`KNOWN_APP_SEGMENTS` 不再包含 `login`、`register`。

### US-A2 旧路径兼容重定向

**作为** 持有旧链接的用户  
**我想要** 访问 `/login`、`/register` 仍能到达正确页面  
**以便** 书签与外部文档不失效  

**验收标准：**

- [ ] **AC-A5**：`GET /login` → 302 至 `/{resolvedLocale}/login`。
- [ ] **AC-A6**：`GET /register` → 302 至 `/{resolvedLocale}/register`。
- [ ] **AC-A7**：`?redirect=` 及其它 query 在重定向后完整保留。
- [ ] **AC-A8**：`resolvedLocale` 符合 cookie → Accept-Language → 默认 `en` 链。

---

## Epic B：跨页 locale 一致性

### US-B1 首页 → 登录链路

**作为** 英语访客  
**我想要** 从 `/en` 首页点击登录进入 `/en/login`  
**以便** 语言不中断  

**验收标准：**

- [ ] **AC-B1**：`PunkHomeHeader` 登录链接 href 为 `/{locale}/login`（或 next-intl `Link` 等价写法）。
- [ ] **AC-B2**：已登录用户首页头像菜单不受影响。
- [ ] **AC-B3**：首页 CTA「进入对话」等仍未 i18n 的链接可保持 `/chat`（延续 0.1.13 静默策略）。

### US-B2 受保护路由未登录跳转

**作为** 未登录访客  
**我想要** 访问 `/chat` 被导向 locale 感知的登录页  
**以便** 登录后体验连贯  

**验收标准：**

- [ ] **AC-B4**：无 session 访问 `/chat` → redirect `/en/login?redirect=/chat`（当 cookie 为 `en`）。
- [ ] **AC-B5**：cookie 为 `zh` 时 → `/zh/login?redirect=/chat`。
- [ ] **AC-B6**：`redirect` 参数值仍为无 locale 前缀的 app 路径（与现网一致），登录成功后 `safeRedirectUrl` 正常工作。

### US-B3 注册页 gate 跳转

**作为** 未登录用户  
**我想要** 访问注册页时被导向带 locale 的登录页  
**以便** 完成管理员登录后再注册  

**验收标准：**

- [ ] **AC-B7**：未登录访问 `/en/register` → 跳转 `/en/login?redirect=...`（redirect 含 register 路径）。
- [ ] **AC-B8**：跳转目标 locale 与访问 register 时解析的 locale 一致。

### US-B4 AuthShell 返回首页

**作为** 访客  
**我想要** 认证页「返回首页」回到当前语言的首页  
**以便** 不意外切回默认语言  

**验收标准：**

- [ ] **AC-B9**：在 `/zh/login` 点击返回首页 → `/zh`（或 `/zh/`）。
- [ ] **AC-B10**：在 `/en/login` 点击返回首页 → `/en`。

---

## Epic C：登录成功与 redirect

### US-C1 登录成功跳转保留意图

**作为** 访客  
**我想要** 登录成功后进入 `redirect` 指定页面或合理默认页  
**以便** 完成原本要进行的操作  

**验收标准：**

- [ ] **AC-C1**：`redirect=/chat` 登录成功后进入 `/chat`（仍为中文 UI，符合非目标）。
- [ ] **AC-C2**：`redirect=/en` 或 `redirect=/%locale%` 登录成功后进入对应语言首页。
- [ ] **AC-C3**：无 redirect 时行为与现网一致（如回 `/` 或解析后的首页）。

---

## Epic D：middleware 与 matcher

### US-D1 middleware 与 next-intl 协同

**作为** 开发者  
**我想要** 迁入 login/register 后 middleware 规则清晰  
**以便** i18n 与 auth 不冲突  

**验收标准：**

- [ ] **AC-D1**：`/(en|zh)/login`、`/(en|zh)/register` 由 intl middleware 处理 locale cookie。
- [ ] **AC-D2**：`/api/*` 不受 locale 前缀影响（延续 0.1.13）。
- [ ] **AC-D3**：非法 locale 前缀（如 `/fr/login`）→ `/en` 或等价兜底，无 500。
- [ ] **AC-D4**：matcher 更新后，`/login`、`/register` 重定向与 `/(en|zh)/login` 匹配均正常。

---

## Epic E：未接入页面（本期边界）

### US-E1 chat/console/admin 仍为无 locale 路径

**作为** 产品  
**我想要** 本期仅迁移认证页路由  
**以便** 控制变更面  

**验收标准：**

- [ ] **AC-E1**：`/chat`、`/console`、`/admin`、`/knowledge` 仍在 `KNOWN_APP_SEGMENTS` 或无 locale 前缀路径下可访问。
- [ ] **AC-E2**：登录后进入 `/chat` 不因本期改造 404 或 middleware 死循环。
- [ ] **AC-E3**：`ConsoleShell` / `AdminShell` / `ChatWorkspace` 本期不要求嵌入 `LanguageSwitcher`。

### US-E2 语言偏好跨未翻译页保持

**作为** 访客  
**我想要** 在认证页选择的语言偏好在进入 `/chat` 后仍写入 cookie  
**以便** 后续迭代可读取  

**验收标准：**

- [ ] **AC-E4**：从 `/en/login` 登录后进 `/chat`，`NEXT_LOCALE` 仍为 `en`。
- [ ] **AC-E5**：不在 `/chat` 展示「尚未翻译」banner（延续 0.1.13 Q4-A）。
