# 用户故事与验收标准：对话工作台 i18n（version 0.1.15）

本文档为 `prd.md` 子文档，覆盖 `/chat` 页面、`ChatWorkspace` 及 chat 相关组件的 UI 双语。**交付批次：0.1.15 MVP。**

---

## Epic A：对话页路由与 metadata

### US-A1 对话页迁入 `[locale]` 路由

**作为** 已登录用户  
**我想要** 通过 `/{locale}/chat` 访问对话工作台  
**以便** URL 与首页/登录页 locale 策略一致  

**验收标准：**

- [ ] **AC-A1**：`/en/chat`、`/zh/chat` 可正常加载对话工作台。
- [ ] **AC-A2**：直接访问 `/chat` → 302 至 `/{locale}/chat`，locale 由 `NEXT_LOCALE` cookie / Accept-Language / 默认 `en` 解析。
- [ ] **AC-A3**：未登录访问 `/en/chat` → 重定向 `/en/login?redirect=/en/chat`（或等价 locale 感知 redirect）。
- [ ] **AC-A4**：`chat` 从 `KNOWN_APP_SEGMENTS` 移除，由 next-intl 处理。

### US-A2 对话页 metadata 随 locale 变化

**作为** 用户  
**我想要** 对话页浏览器标签标题与描述与当前语言一致  
**以便** 正确识别页面  

**验收标准：**

- [ ] **AC-A5**：`zh` 下 metadata 为中文；`en` 下为英文。
- [ ] **AC-A6**：metadata 通过 `page.chat` key 加载，无硬编码。

---

## Epic B：对话工作台 UI 双语

### US-B1 侧栏与会话列表

**作为** 已登录用户  
**我想要** 侧栏新建对话、会话列表、空状态、时间格式相关文案以当前语言展示  
**以便** 管理会话  

**验收标准：**

- [ ] **AC-B1**：新建对话按钮、侧栏标题、空列表提示在 `zh`/`en` 下均有翻译。
- [ ] **AC-B2**：会话删除确认弹窗（标题、正文、确认/取消）双语。
- [ ] **AC-B3**：移动端抽屉侧栏文案与桌面一致双语。
- [ ] **AC-B4**：「最后一次沟通」等标签双语；日期格式可沿用 `YYYY-MM-DD HH:mm`（数字不译）。

### US-B2 消息区与气泡

**作为** 用户  
**我想要** 消息区角色标签、流式加载态、空状态以当前语言展示  
**以便** 阅读对话  

**验收标准：**

- [ ] **AC-B5**：无昵称时用户 fallback 标签（现网「用户」）在 `en` 下有对应文案（如 "You"）。
- [ ] **AC-B6**：无绑定助手时助手 fallback（现网「助手」）在 `en` 下有对应文案（如 "Assistant"）。
- [ ] **AC-B7**：流式生成中、等待、中断等状态提示双语。
- [ ] **AC-B8**：LLM 输出正文、用户输入内容、助手名称**不翻译**。

### US-B3 输入区与操作

**作为** 用户  
**我想要** 输入框占位、发送按钮、清空消息等操作文案双语  
**以便** 发送与管理消息  

**验收标准：**

- [ ] **AC-B9**：输入框 placeholder、发送按钮、快捷键提示（若有）双语。
- [ ] **AC-B10**：清空消息确认弹窗双语。
- [ ] **AC-B11**：只读账号输入区 disabled 提示与 `readOnly` 态说明双语。

### US-B4 助手选择与配置

**作为** 用户  
**我想要** 助手选择弹窗、搜索、配置入口文案双语  
**以便** 切换对话助手  

**验收标准：**

- [ ] **AC-B12**：助手选择 Modal/Drawer 标题、搜索 placeholder、无结果提示双语。
- [ ] **AC-B13**：助手不可用、加载失败等状态提示双语。
- [ ] **AC-B14**：助手列表展示名称为用户配置数据，**不翻译**。

### US-B5 免费/共享模型 hint

**作为** 免费档用户  
**我想要** 模型限制提示以当前语言展示  
**以便** 理解使用约束  

**验收标准：**

- [ ] **AC-B15**：`freeTierAssistantHint` 相关 UI 文案（若页面展示）纳入 `page.chat`。
- [ ] **AC-B16**：hint 关闭/展开控件（若有）双语。

---

## Epic C：Chat 顶栏与跨页导航

### US-C1 顶栏 LanguageSwitcher

**作为** 用户  
**我想要** 在对话页切换语言  
**以便** 无需返回首页  

**验收标准：**

- [ ] **AC-C1**：Chat 顶栏可见 `LanguageSwitcher`（或等效控件），样式与站点协调。
- [ ] **AC-C2**：在 `/en/chat` 切换为中文后导航至 `/zh/chat`，工作台文案全部更新。
- [ ] **AC-C3**：切换语言时保留当前会话 id（若 URL/query 携带）或合理重置策略（由设计/开发定稿并文档化）。

### US-C2 链至控制台

**作为** 用户  
**我想要** 从对话页进入控制台的链接携带 locale  
**以便** 语言偏好在跨页导航中延续（console 接入 i18n 后生效）  

**验收标准：**

- [ ] **AC-C4**：Chat 顶栏「控制台」链为 `/{locale}/console/...` 或 locale 感知 href（console 未 i18n 前可仍指向裸路径，但须记录技术债；**推荐** 0.1.15 即改为 locale 前缀以便 0.1.16 无缝衔接）。

---

## Epic D：Chat 客户端错误与 API 展示

### US-D1 chat-api 客户端 fallback

**作为** 用户  
**我想要** 网络异常或解析失败时的 fallback 提示与界面语言一致  
**以便** 理解错误  

**验收标准：**

- [ ] **AC-D1**：`chat-api.ts` 中用户可见 fallback 字符串改为 `page.chat` 或展示 API 已翻译 `message`。
- [ ] **AC-D2**：流式 SSE 错误、超时、中断 reason（若用户可见）双语。

### US-D2 对话 API 错误展示

**作为** 用户  
**我想要** 创建会话、发消息、删会话等 API 错误以当前语言展示  
**以便** 修正操作  

**验收标准：**

- [ ] **AC-D3**：`CONVERSATION_NOT_FOUND`、`ASSISTANT_NOT_FOUND` 等错误在英文界面展示英文 message。
- [ ] **AC-D4**：`VALIDATION_ERROR`（如空消息）在英文界面有可读英文提示。
- [ ] **AC-D5**：`MODEL_ERROR` 等大模型失败提示双语。

---

## 不在本 Epic 范围

- `/console/*`、`/admin/*` 页面（见 `user-stories-console.md`、`user-stories-admin.md`）。
- 非 chat 域 API（见 `user-stories-api-i18n.md`）。
- LLM 生成内容翻译。
