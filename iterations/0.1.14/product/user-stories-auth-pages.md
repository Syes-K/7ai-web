# 用户故事与验收标准：认证页面 i18n（version 0.1.14）

本文档为 `prd.md` 子文档，覆盖登录/注册页 UI 双语与 `AuthShell` 改造。

---

## Epic A：登录页双语

### US-A1 登录页 metadata 随 locale 变化

**作为** 访客 / 搜索引擎  
**我想要** 登录页浏览器标签标题与描述与当前语言一致  
**以便** 正确理解页面用途  

**验收标准：**

- [ ] **AC-A1**：`zh` 下 `/zh/login` 的 `title`、`description` 为中文（可与现网等价或优化）。
- [ ] **AC-A2**：`en` 下 `/en/login` 的 `title`、`description` 为英文。
- [ ] **AC-A3**：metadata 通过 `page.login` message key 加载，无硬编码中英文混用。

### US-A2 登录表单完整双语

**作为** 访客  
**我想要** 登录表单所有可见文案以当前语言展示  
**以便** 完成登录操作  

**验收标准：**

- [ ] **AC-A4**：字段 label（邮箱、密码、图形验证码）、提交按钮、加载态在 `zh`/`en` 下均有翻译。
- [ ] **AC-A5**：客户端 fallback 错误（如「网络异常，请重试」「登录失败」）在 `en` 下有对应文案。
- [ ] **AC-A6**：`zh` 下文案与现网中文语义一致（允许微调措辞）。
- [ ] **AC-A7**：验证码区域辅助文案（刷新、输入提示等，若存在）已纳入 `page.login`。

### US-A3 登录页语言切换

**作为** 访客  
**我想要** 在登录页顶栏切换语言  
**以便** 无需返回首页即可改用另一种语言登录  

**验收标准：**

- [ ] **AC-A8**：`AuthShell` 顶栏可见 `LanguageSwitcher`，样式与首页协调。
- [ ] **AC-A9**：在 `/en/login` 切换为中文后导航至 `/zh/login`，表单文案全部更新。
- [ ] **AC-A10**：切换语言时 URL query（如 `redirect`）保留。
- [ ] **AC-A11**：语言选择器支持键盘操作，当前语言有选中态。

---

## Epic B：注册页双语

### US-B1 注册页 metadata 与标题双语

**作为** 管理员（创建账号）  
**我想要** 注册页标题与描述以当前语言展示  
**以便** 在英文环境下操作管理任务  

**验收标准：**

- [ ] **AC-B1**：`/zh/register`、`/en/register` 的 metadata 与 `AuthShell` 标题使用 `page.register` key。
- [ ] **AC-B2**：`en` 下页面标题、副标题（若有）为英文。

### US-B2 注册表单完整双语

**作为** 管理员  
**我想要** 注册表单字段与按钮以当前语言展示  
**以便** 正确填写并提交  

**验收标准：**

- [ ] **AC-B3**：邮箱、手机号（可选）、昵称、密码、确认密码、验证码、提交按钮在 `zh`/`en` 下均有翻译。
- [ ] **AC-B4**：客户端 fallback（「注册失败」等）在 `en` 下有对应文案。
- [ ] **AC-B5**：页面内链接（如返回登录，若存在）使用 locale 感知 href。

### US-B3 注册页管理员门禁不受影响

**作为** 运维  
**我想要** 注册页仍仅允许已登录管理员访问  
**以便** 安全策略不变  

**验收标准：**

- [ ] **AC-B6**：未登录访问 `/en/register` 时跳转 locale 感知的登录页，而非固定 `/login`。
- [ ] **AC-B7**：非管理员已登录用户仍被拒绝访问注册页（行为与现网一致）。

---

## Epic C：AuthShell 与共享组件

### US-C1 AuthShell 壳层国际化

**作为** 访客  
**我想要** 认证页顶栏「返回首页」等壳层文案以当前语言显示  
**以便** 导航清晰  

**验收标准：**

- [ ] **AC-C1**：「返回首页」文案可翻译；链接目标为 `/{locale}` 而非裸 `/`。
- [ ] **AC-C2**：`html lang` 随认证页 locale 更新（经 `[locale]/layout` 或 `LocaleHtmlLang`）。
- [ ] **AC-C3**：`BrandMark` 等非文案元素无需翻译，布局不因英文变长而严重错位。

### US-C2 CaptchaField 与 FieldError

**作为** 访客  
**我想要** 验证码组件与字段错误展示区域支持 i18n  
**以便** 错误提示语言一致  

**验收标准：**

- [ ] **AC-C4**：验证码刷新按钮、加载失败提示（若有硬编码）纳入 `page.login` / `page.register`。
- [ ] **AC-C5**：`FieldError` 本身无固定文案，展示内容来自已翻译的 error message。

---

## Epic D：message 文件与加载

### US-D1 新增 page message 文件

**作为** 开发者  
**我想要** 登录/注册翻译独立于 `page/home`  
**以便** 按页面渐进维护  

**验收标准：**

- [ ] **AC-D1**：存在 `messages/en/page/login.json`、`messages/zh/page/login.json`，结构一致。
- [ ] **AC-D2**：存在 `messages/en/page/register.json`、`messages/zh/page/register.json`，结构一致。
- [ ] **AC-D3**：key 均为英文；`en` 为语义源；`src/i18n/request.ts` 加载上述文件至 `messages.page.login`、`messages.page.register`。
- [ ] **AC-D4**：生产环境缺失 key 回退 `en`；开发环境有告警。
