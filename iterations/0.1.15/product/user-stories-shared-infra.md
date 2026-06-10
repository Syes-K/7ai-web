# 用户故事与验收标准：共享基础设施 i18n（version 0.1.15）

本文档为 `prd.md` 子文档，覆盖 antd/dayjs locale、Shell 共用组件、确认弹窗等跨模块能力。

---

## Epic A：antd / dayjs 动态 locale — **0.1.15 建立模式**

### US-A1 locale 映射工具

**作为** 开发者  
**我想要** 统一的 `locale → antd Locale` / `dayjs locale` 映射  
**以便** Console/Admin/Chat 一致接入  

**验收标准：**

- [ ] **AC-A1**：提供 `getAntdLocale(locale: 'en' | 'zh')`（或等价），返回 `en_US` / `zh_CN`。
- [ ] **AC-A2**：dayjs 在 locale 切换时设为 `en` / `zh-cn`，与 antd 同步。
- [ ] **AC-A3**：实现说明写入迭代 backend/frontend 文档，供 0.1.16 Shell 直接复用。

### US-A2 Chat 页接入（若使用 antd）

**验收标准：**

- [ ] **AC-A4**：Chat 子树若包裹 antd 组件，`ConfigProvider locale` 随当前 page locale 切换。
- [ ] **AC-A5**：切换 `LanguageSwitcher` 后 antd 内置文案（如 Modal 默认按钮，若未自定义）随 locale 变化。

### US-A3 Console/Admin Shell 接入 — **批次 2/3**

**验收标准：**

- [ ] **AC-A6**：移除 `ConsoleShell`/`AdminShell` 硬编码 `zhCN` 与 `dayjs.locale('zh-cn')`。
- [ ] **AC-A7**：ProTable 分页、Empty、Popconfirm 默认按钮在 `en` 下为英文。

---

## Epic B：UserAvatarMenu — **0.1.15**

### US-B1 Shell 变体双语

**作为** 已登录用户  
**我想要** 控制台/管理后台/对话顶栏的用户菜单「退出登录」以当前语言展示  
**以便** 与 home 变体一致  

**验收标准：**

- [ ] **AC-B1**：`UserAvatarMenu` `variant="shell"` 时 `logoutLabel` 来自 i18n（现网默认「退出登录」）。
- [ ] **AC-B2**：`aria-label`（「用户菜单：{name}」）双语。
- [ ] **AC-B3**：`variant="home"` 行为不变（0.1.13 已 i18n）。

---

## Epic C：ConfirmProvider / modal-shell — **0.1.15**

### US-C1 全局确认框双语

**作为** 用户  
**我想要** 删除会话等确认框的默认按钮与标题模板双语  
**以便** 危险操作可理解  

**验收标准：**

- [ ] **AC-C1**：`ConfirmProvider`、`confirm.ts`、`registry.ts` 中默认「确定」「取消」等改为 i18n key。
- [ ] **AC-C2**：`modal-shell.tsx` 中通用标题/按钮 fallback 双语。
- [ ] **AC-C3**：Chat 删除会话、清空消息等调用处传入的 title/content 已用 `page.chat` key（见 chat stories）。

---

## Epic D：ConsoleForbiddenNotice — **0.1.15 组件双语**

### US-D1 管理后台白名单提示

**作为** 非白名单用户  
**我想要** 被 redirect 到控制台时看到与界面语言一致的说明  
**以便** 理解无法进入 admin 的原因  

**验收标准：**

- [ ] **AC-D1**：提示正文、「留在当前页」「知道了」按钮双语。
- [ ] **AC-D2**：`ADMIN_USER` code 字面量不译。
- [ ] **AC-D3**：文案纳入 `page/shell.json` 或 `page/console/shell.json`。

---

## Epic E：LanguageSwitcher 扩展 — **分批次**

### US-E1 非首页 Shell 嵌入

**验收标准：**

- [ ] **AC-E1**：Chat 顶栏嵌入（0.1.15）。
- [ ] **AC-E2**：ConsoleShell、AdminShell actionsRender 嵌入（0.1.16/17）。
- [ ] **AC-E3**：样式 variant（如 `auth`）可扩展 `shell` variant，与 Punk/暗色 ProLayout 协调。

---

## Epic F：共享 message 文件组织

### US-F1 page/shell 或等价

**验收标准：**

- [ ] **AC-F1**：跨 Shell 文案（Forbidden、skip link、加载态「验证会话…」）有统一 message 来源，避免 console/admin 重复。
- [ ] **AC-F2**：各模块特有 Shell 标题（「控制台」「管理后台」）可放在 `page/console/shell`、`page/admin/shell`。

---

## 不在本 Epic

- `PunkHomeHeader` / 首页（0.1.13 已完成）。
- `AuthShell`（0.1.14 已完成）。
