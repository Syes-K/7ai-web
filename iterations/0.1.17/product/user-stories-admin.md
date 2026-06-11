# 用户故事与验收标准：管理后台页面 i18n（version 0.1.17）

本文档为 `prd.md` 子文档，覆盖 `/admin/*` 页面迁入 `[locale]`、`AdminShell`、菜单及各子页 ProComponents 文案。**交付批次：0.1.17**。

---

## Epic A：管理后台路由与 Shell

### US-A1 管理后台路由迁入 `[locale]`

**作为** 管理员  
**我想要** 通过 `/{locale}/admin/**` 访问管理后台  
**以便** 与站点 locale 策略一致  

**验收标准：**

- [ ] **AC-A1**：`/en/admin/config`、`/zh/admin/users` 等子路径可访问。
- [ ] **AC-A2**：裸 `/admin/**` → 302 至 locale 前缀路径（path + query 保留）。
- [ ] **AC-A3**：未登录访问 `/{locale}/admin/**` → `/{locale}/login?redirect=/{locale}/admin/...`（redirect 含 locale 前缀）。
- [ ] **AC-A4**：`admin` 从 `KNOWN_APP_SEGMENTS` 移除。
- [ ] **AC-A5**：`/[locale]/admin/layout.tsx` 服务端 `gateAdminPageAccess` + locale 感知 login/forbidden redirect；无效 locale 不渲染。
- [ ] **AC-A6**：`/admin` 与 `/{locale}/admin` redirect 至 `/{locale}/admin/config`。

### US-A2 AdminShell 壳层双语

**作为** 管理员  
**我想要** 管理后台 Shell 标题、无障碍链接、顶栏操作双语  
**以便** 识别当前模块  

**验收标准：**

- [ ] **AC-A7**：Shell 标题（现网「管理后台」）、skip link「跳到主要内容」走 `page.admin.shell` key。
- [ ] **AC-A8**：顶栏「对话」链接文案双语；href 为 `/{locale}/chat`。
- [ ] **AC-A9**：顶栏「控制台」链接文案双语；href 为 `/{locale}/console/profile`（非裸 `/console`）。
- [ ] **AC-A10**：`ConfigProvider locale={getAntdLocale(locale)}`；移除硬编码 `zhCN`。
- [ ] **AC-A11**：`dayjs.locale(getDayjsLocaleName(locale))`；移除模块级固定 `zh-cn`。
- [ ] **AC-A12**：移除客户端 `fetch /api/auth/me` 鉴权；由 layout 传入 `displayName`（对齐 ConsoleShell 0.1.16 模式）。

### US-A3 侧栏菜单双语

**作为** 管理员  
**我想要** 管理后台侧栏六项菜单以当前语言展示  
**以便** 导航各功能  

**验收标准：**

- [ ] **AC-A13**：`admin-menu.tsx` 六项菜单（配置管理、用户管理、模型管理、提示词模版、日志查询、系统助手管理）改为 `getAdminMenuRoutes(t)`，无硬编码中文。
- [ ] **AC-A14**：菜单 path locale 感知；当前路由高亮正确。
- [ ] **AC-A15**：ProLayout `route.path` 为 `/{locale}/admin` 或等价配置；`Link` 使用 `@/i18n/navigation`。

### US-A4 Shell 语言切换

**作为** 管理员  
**我想要** 在管理后台顶栏切换语言  
**以便** 无需返回首页  

**验收标准：**

- [ ] **AC-A16**：`AdminShell` actionsRender 嵌入 `LanguageSwitcher`（`variant="shell"`，`namespace="page.admin.shell"`）。
- [ ] **AC-A17**：切换语言后 URL 更新为 `/{locale}/admin/{当前子路径}`，query 保留。
- [ ] **AC-A18**：切换后 antd ProTable 分页、Empty、Popconfirm 默认按钮随 locale 变化。

### US-A5 非管理员 forbidden 跳转 locale 化

**作为** 已登录非白名单用户  
**我想要** 访问 admin 或被 API 403 拒绝时跳转到带 locale 的控制台并看到 Forbidden 提示  
**以便** 语言与当前会话一致  

**验收标准：**

- [ ] **AC-A19**：`layout.tsx` forbidden redirect 为 `/{locale}/console?notice=admin_forbidden`（解析请求 locale）。
- [ ] **AC-A20**：users/config/prompts/assistants 等子页 API 403 时 `window.location.replace` 目标含 locale 前缀。
- [ ] **AC-A21**：`ConsoleForbiddenNotice` 在目标 URL 正确展示（0.1.16 已 i18n，回归验证）。

---

## Epic B：配置管理（config）

### US-B1 对话摘要配置双语

**作为** 管理员  
**我想要** 对话摘要 ProForm 的 label、说明、校验提示、保存反馈双语  
**以便** 调整系统行为  

**验收标准：**

- [ ] **AC-B1**：enabled/mode/threshold 等字段 label、helper text、Radio/Select 选项双语。
- [ ] **AC-B2**：保存成功/失败 toast 双语。
- [ ] **AC-B3**：GET 坏 JSON 回退 Alert 文案双语（服务端或前端映射，见 open-questions Q2）。
- [ ] **AC-B4**：`parseApiError` 使用统一工具 + `t` fallback。

---

## Epic C：用户管理（users）

### US-C1 用户列表与账号操作双语

**作为** 管理员  
**我想要** 用户表格、搜索、只读开关、重置密码等操作文案双语  
**以便** 管理账号  

**验收标准：**

- [ ] **AC-C1**：列头（邮箱、昵称、角色、状态、只读、锁定等）双语。
- [ ] **AC-C2**：只读 Tag（「只读」「读写」）、启用/停用 Tag 双语。
- [ ] **AC-C3**：操作按钮（「设为只读」「取消只读」「重置密码」「启用」「停用」等）双语。
- [ ] **AC-C4**：确认弹窗标题、正文、按钮双语。
- [ ] **AC-C5**：成功/失败 toast 双语。
- [ ] **AC-C6**：不能变更当前登录账号只读/status 的 tooltip 双语。
- [ ] **AC-C7**：重置密码 Modal：临时密码展示、复制提示、关闭按钮双语。
- [ ] **AC-C8**：账号锁定剩余时间 `formatLockRemain` 双语（如「约 N 分钟」）。
- [ ] **AC-C9**：搜索 placeholder、分页、空状态双语。

---

## Epic D：模型管理（models）

### US-D1 公有模型配置双语

**作为** 管理员  
**我想要** 全局（公有）模型配置表格与编辑表单双语  
**以便** 管理系统级模型  

**验收标准：**

- [ ] **AC-D1**：列头、可见性、provider、tags、操作列双语。
- [ ] **AC-D2**：新建/编辑/删除 Drawer 或 Modal label、placeholder、校验提示双语。
- [ ] **AC-D3**：provider 展示名可走 `page.admin.models.providers.*`；枚举 key（ALYUN 等）不译。
- [ ] **AC-D4**：删除确认、保存 toast 双语。

---

## Epic E：提示词模版（prompts）

### US-E1 提示词配置 UI 双语

**作为** 管理员  
**我想要** 提示词模版列表与编辑 UI 双语  
**以便** 管理系统提示词  

**验收标准：**

- [ ] **AC-E1**：各配置项 label、描述、保存按钮双语。
- [ ] **AC-E2**：`invalid_json` Alert 与文件状态说明双语。
- [ ] **AC-E3**：模版 **value 正文** 为系统配置数据，**不翻译**。
- [ ] **AC-E4**：校验失败 toast / 表单错误双语。

---

## Epic F：日志查询（logs）

### US-F1 日志页双语

**作为** 管理员  
**我想要** 日志查询页表格与筛选文案双语  
**以便** 排查问题  

**验收标准：**

- [ ] **AC-F1**：列头、筛选 placeholder、空状态、加载态双语。
- [ ] **AC-F2**：日志 **message 正文** 不翻译。
- [ ] **AC-F3**：日期/级别筛选 label 双语（若存在）。

---

## Epic G：系统助手管理（assistants）

### US-G1 系统助手 CRUD 双语

**作为** 管理员  
**我想要** 系统助手列表与编辑双语  
**以便** 管理内置助手  

**验收标准：**

- [ ] **AC-G1**：列头、新建/编辑 Drawer、删除确认双语。
- [ ] **AC-G2**：区分「系统助手」相关 label（与 console 个人助手措辞区分）。
- [ ] **AC-G3**：助手 name、description、prompt、openingMessage **内容不译**。
- [ ] **AC-G4**：403 forbidden 跳转 locale 感知（同 US-A5）。

---

## Epic H：metadata 与 i18n 注册

### US-H1 页面 metadata 双语

**作为** 管理员  
**我想要** 浏览器标签页标题随 locale 变化  
**以便** 识别当前页面  

**验收标准：**

- [ ] **AC-H1**：各子页 `generateMetadata` 使用 `getTranslations('page.admin.{module}')`。
- [ ] **AC-H2**：`src/i18n/request.ts` 注册全部 `page/admin/*.json` 命名空间。

---

## 依赖

- `iterations/0.1.16/product/user-stories-console.md` — Shell/layout 模式参考
- `iterations/0.1.15/product/user-stories-shared-infra.md` — LanguageSwitcher、antd-locale
- `user-stories-api-i18n.md` — `/api/admin/**` 错误双语

## 不在范围

- `/knowledge/[id]`、`/api/knowledge-bases/**`（0.1.18+）
- Console 页面增量（0.1.16 已交付）
- UGC 内容翻译
