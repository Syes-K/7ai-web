# 用户故事与验收标准：控制台页面 i18n（version 0.1.16）

本文档为 `prd.md` 子文档，覆盖 `/console/*` 页面迁入 `[locale]`、`ConsoleShell`、菜单及各子页 ProComponents 文案。**交付批次：0.1.16**。

---

## Epic A：控制台路由与 Shell

### US-A1 控制台路由迁入 `[locale]`

**作为** 已登录用户  
**我想要** 通过 `/{locale}/console/**` 访问控制台  
**以便** 与站点 locale 策略一致  

**验收标准：**

- [ ] **AC-A1**：`/en/console/profile`、`/zh/console/models` 等子路径可访问。
- [ ] **AC-A2**：裸 `/console/**` → 302 至 locale 前缀路径（path + query 保留）。
- [ ] **AC-A3**：未登录访问 `/{locale}/console/**` → `/{locale}/login?redirect=/{locale}/console/...`（redirect 含 locale 前缀）。
- [ ] **AC-A4**：`console` 从 `KNOWN_APP_SEGMENTS` 移除。
- [ ] **AC-A5**：`/[locale]/console/layout.tsx` 服务端会话校验（参考 chat layout）；无效 locale 不渲染。
- [ ] **AC-A6**：`/console` 与 `/console/settings` redirect 至 `/{locale}/console/profile`（保留 `notice` 等 query）。

### US-A2 ConsoleShell 壳层双语

**作为** 用户  
**我想要** 控制台 Shell 标题、加载态、无障碍链接、顶栏操作双语  
**以便** 识别当前模块  

**验收标准：**

- [ ] **AC-A7**：Shell 标题（现网「控制台」）、加载态「验证会话…」、skip link「跳到主要内容」走 `page.console.shell` key。
- [ ] **AC-A8**：顶栏「对话」链接文案双语；href 为 `/{locale}/chat`。
- [ ] **AC-A9**：`ConfigProvider locale={getAntdLocale(locale)}`；移除硬编码 `zhCN`。
- [ ] **AC-A10**：`dayjs.locale(getDayjsLocaleName(locale))`；移除模块级固定 `zh-cn`。
- [ ] **AC-A11**：客户端 401 跳转 login 时 redirect 参数含 locale 前缀。

### US-A3 侧栏菜单双语

**作为** 用户  
**我想要** 控制台侧栏菜单项以当前语言展示  
**以便** 导航各功能  

**验收标准：**

- [ ] **AC-A12**：`console-menu.tsx` 五项菜单（账号与偏好、模型管理、助手管理、知识库管理、MCP 管理）改为 i18n key，无硬编码中文。
- [ ] **AC-A13**：菜单 path 为 `/{locale}/console/...`；当前路由高亮正确。
- [ ] **AC-A14**：ProLayout `route.path` 为 `/{locale}/console` 或等价 locale 感知配置。

### US-A4 Shell 语言切换

**作为** 用户  
**我想要** 在控制台顶栏切换语言  
**以便** 无需返回首页  

**验收标准：**

- [ ] **AC-A15**：`ConsoleShell` actionsRender 嵌入 `LanguageSwitcher`（`variant="shell"`，`namespace="page.console.shell"`）。
- [ ] **AC-A16**：切换语言后 URL 更新为 `/{locale}/console/{当前子路径}`，query 保留（含 `notice=admin_forbidden`）。
- [ ] **AC-A17**：切换后 antd ProTable 分页、Empty、Popconfirm 默认按钮随 locale 变化。

### US-A5 ConsoleForbiddenNotice locale 一致

**作为** 非白名单用户  
**我想要** 从 admin 跳回控制台时 Forbidden 提示与 URL locale 一致  
**以便** 理解无法进入 admin 的原因  

**验收标准：**

- [ ] **AC-A18**：`ConsoleForbiddenNotice` 使用 next-intl `useTranslations`（或 pathname locale），不再仅依赖 cookie 与 URL 不一致。
- [ ] **AC-A19**：文案复用 `page.shell.forbiddenNotice.*` 或 `page.console.shell.forbiddenNotice.*`（设计定稿）。
- [ ] **AC-A20**：`ADMIN_USER` code 字面量不译。

---

## Epic B：账号与偏好（profile）

### US-B1 个人资料表单双语

**作为** 用户  
**我想要** 账号信息、偏好设置表单 label、提示、按钮双语  
**以便** 管理个人配置  

**验收标准：**

- [ ] **AC-B1**：ProForm 字段 label、Tooltip、保存/编辑按钮双语。
- [ ] **AC-B2**：模型选择下拉中「公有/私有」、provider 标签双语（用户模型名、apiKey 掩码不译）。
- [ ] **AC-B3**：加载失败、保存成功/失败 toast 双语。
- [ ] **AC-B4**：`parseApiError` fallback 改为 i18n 或统一工具。
- [ ] **AC-B5**：链至「模型管理」的 Link 为 `/{locale}/console/models`。
- [ ] **AC-B6**：页面 metadata（title/description）随 locale。

---

## Epic C：模型管理（models）

### US-C1 模型列表与 CRUD 双语

**作为** 用户  
**我想要** 模型表格列头、操作按钮、新建/编辑 Drawer 双语  
**以便** 管理模型配置  

**验收标准：**

- [ ] **AC-C1**：ProTable 列头（名称、provider、可见性、标签等）双语。
- [ ] **AC-C2**：新建、编辑、删除、Popconfirm 文案双语。
- [ ] **AC-C3**：`model-provider-ui.ts` 中 provider 展示 label 双语（provider 枚举 key 不变）。
- [ ] **AC-C4**：校验错误、API 错误 toast 双语（优先 API `error.message`）。
- [ ] **AC-C5**：Drawer/Modal 表单字段（modelName、apiKey、provider 等）label 与校验提示双语。

---

## Epic D：助手管理（assistants）

### US-D1 助手列表与编辑双语

**作为** 用户  
**我想要** 助手表格、编辑表单、关联知识库/MCP 配置文案双语  
**以便** 管理 AI 助手  

**验收标准：**

- [ ] **AC-D1**：列头、状态 Tag、操作列双语。
- [ ] **AC-D2**：编辑 Drawer 内表单字段、系统提示词 label 双语（**提示词内容**为用户数据不译）。
- [ ] **AC-D3**：删除确认、引用冲突提示双语。
- [ ] **AC-D4**：关联知识库、MCP 多选/穿梭框 label 与空状态双语。

---

## Epic E：知识库管理（knowledge）

### US-E1 知识库 CRUD 与向量化双语

**作为** 用户  
**我想要** 知识库列表、编辑、预览、向量化状态、分片测试文案双语  
**以便** 管理知识库  

**验收标准：**

- [ ] **AC-E1**：列头（名称、标签、向量状态、更新时间等）双语。
- [ ] **AC-E2**：向量状态 Tag（pending/success/failed）及错误展示 label 双语（**`vectorError` 内容不译**）。
- [ ] **AC-E3**：新建/编辑 Modal、Markdown 预览 Drawer 操作按钮双语。
- [ ] **AC-E4**：分片测试 Drawer 表单与结果区 label 双语。
- [ ] **AC-E5**：预览链至 `/{locale}/knowledge/{id}`（locale 感知）。
- [ ] **AC-E6（已知限制）**：`/api/knowledge-bases/**` 错误 message 在 0.1.18 前可能仍为中文；页面 UI 须全英文，文档标注例外。

---

## Epic F：MCP 管理（mcp）

### US-F1 MCP 配置 CRUD 与连接测试双语

**作为** 用户  
**我想要** MCP 表格、编辑表单、连接测试文案双语  
**以便** 管理 MCP 集成  

**验收标准：**

- [ ] **AC-F1**：列头、凭证字段 label、测试连接按钮及结果提示双语。
- [ ] **AC-F2**：名称冲突、加密不可用等 API 错误展示双语（console API 范围）。
- [ ] **AC-F3**：连接测试 UI 展示的 `lastErrorSummary` 若为用户可见中文，须 i18n 或 API 返回已翻译文案（见 open-questions Q5）。

---

## Epic G：设置页（settings）

### US-G1 设置 redirect 页

**作为** 用户  
**我想要** settings 路径行为与现网一致且 locale 感知  
**以便** 旧链不失效  

**验收标准：**

- [ ] **AC-G1**：`/{locale}/console/settings` redirect 至 `/{locale}/console/profile`。
- [ ] **AC-G2**：若有 metadata，须双语；无可见 UI 则仅验证 redirect。

---

## Epic H：跨页入口与链接

### US-H1 从 Chat / 首页进入 Console

**作为** 英语用户  
**我想要** 从 chat 或首页点「控制台」进入带 locale 的控制台  
**以便** 语言不中断  

**验收标准：**

- [ ] **AC-H1**：`ChatWorkspace` 控制台入口 → `/{locale}/console/profile`（修正 0.1.15 deviation D1）。
- [ ] **AC-H2**：`PunkLanding` 控制台入口 → `/{locale}/console/profile`。
- [ ] **AC-H3**：从 `/en/chat` 进入后 Shell、菜单、默认 profile 页均为英文。

---

## 子页实施优先级（全量交付，供排期参考）

| 顺序 | 子页 | 约中文匹配 | 说明 |
| --- | --- | --- | --- |
| 1 | shell + menu | ~10 | 阻塞所有子页体验 |
| 2 | profile | 54 | 默认 landing |
| 3 | models | 59 | 含 provider-ui |
| 4 | assistants | 72 | 含 KB/MCP 关联 UI |
| 5 | knowledge | 89 | 最大；API 错误部分 deferred |
| 6 | mcp | 82 | 含连接测试 |
| 7 | settings | 1 | redirect only |

> **默认不分 MVP 子集**；若工期不足，仅允许按上表**倒序**临时 defer settings/mcp，须产品书面确认（非默认）。

---

## 依赖

- `user-stories-api-i18n.md`：`/api/console/**` 错误双语。
- `iterations/0.1.15/product/user-stories-shared-infra.md`：antd locale、UserAvatarMenu、ConfirmProvider。
- `iterations/0.1.15/product/user-stories-routing-locale.md`：legacy redirect、跨页链接模式。
