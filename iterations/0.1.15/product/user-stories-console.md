# 用户故事与验收标准：控制台 i18n（version 0.1.15 愿景 · 批次 2 交付）

本文档为 `prd.md` 子文档，覆盖 `/console/*` 页面、`ConsoleShell`、菜单及各子页 ProComponents 文案。**建议交付批次：0.1.16**（非 0.1.15 MVP）。

---

## Epic A：控制台路由与 Shell

### US-A1 控制台路由迁入 `[locale]`

**作为** 已登录用户  
**我想要** 通过 `/{locale}/console/**` 访问控制台  
**以便** 与站点 locale 策略一致  

**验收标准：**

- [ ] **AC-A1**：`/en/console/profile`、`/zh/console/models` 等子路径可访问。
- [ ] **AC-A2**：裸 `/console/**` → 302 至 locale 前缀路径。
- [ ] **AC-A3**：未登录 → `/{locale}/login?redirect=/{locale}/console/...`。
- [ ] **AC-A4**：`console` 从 `KNOWN_APP_SEGMENTS` 移除。

### US-A2 ConsoleShell 壳层双语

**作为** 用户  
**我想要** 控制台 Shell 标题、加载态、无障碍链接、顶栏操作双语  
**以便** 识别当前模块  

**验收标准：**

- [ ] **AC-A5**：Shell 标题（现网「控制台」）、加载态「验证会话…」、skip link「跳到主要内容」双语。
- [ ] **AC-A6**：顶栏「对话」链接文案双语；href locale 感知。
- [ ] **AC-A7**：`ConfigProvider locale` 随 `en`/`zh` 切换（antd 分页、Empty、DatePicker 等内置文案同步）。
- [ ] **AC-A8**：`dayjs.locale` 随站点 locale 切换。

### US-A3 侧栏菜单双语

**作为** 用户  
**我想要** 控制台侧栏菜单项以当前语言展示  
**以便** 导航各功能  

**验收标准：**

- [ ] **AC-A9**：`console-menu.tsx` 五项菜单（账号与偏好、模型管理、助手管理、知识库管理、MCP 管理）改为 i18n key，无硬编码中文。
- [ ] **AC-A10**：菜单 path 为 `/{locale}/console/...` 或 Link 自动携带 locale。

### US-A4 Shell 语言切换

**作为** 用户  
**我想要** 在控制台顶栏切换语言  
**以便** 无需返回首页  

**验收标准：**

- [ ] **AC-A11**：`ConsoleShell` actionsRender 嵌入 `LanguageSwitcher`。
- [ ] **AC-A12**：切换语言后 URL 更新为 `/{locale}/console/{当前子路径}`，query 保留。

---

## Epic B：账号与偏好（profile）

### US-B1 个人资料表单双语

**作为** 用户  
**我想要** 账号信息、偏好设置表单 label、提示、按钮双语  
**以便** 管理个人配置  

**验收标准：**

- [ ] **AC-B1**：ProForm 字段 label、Tooltip、保存/编辑按钮双语。
- [ ] **AC-B2**：模型选择下拉选项中的「公有/私有」、provider 标签双语（用户模型名不译）。
- [ ] **AC-B3**：加载失败、保存成功/失败 toast 双语。
- [ ] **AC-B4**：`parseApiError` fallback（现网「请求失败（status）」）改为 i18n。

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
- [ ] **AC-C4**：校验错误、API 错误 toast 双语。

---

## Epic D：助手管理（assistants）

### US-D1 助手列表与编辑双语

**作为** 用户  
**我想要** 助手表格、编辑表单、关联知识库/MCP 配置文案双语  
**以便** 管理 AI 助手  

**验收标准：**

- [ ] **AC-D1**：列头、状态 Tag、操作列双语。
- [ ] **AC-D2**：编辑 Drawer 内表单字段、系统提示词 label（提示词**内容**为用户数据不译）双语。
- [ ] **AC-D3**：删除确认、引用冲突提示双语。

---

## Epic E：知识库管理（knowledge）

### US-E1 知识库 CRUD 与向量化双语

**作为** 用户  
**我想要** 知识库列表、编辑、预览、向量化状态、分片测试文案双语  
**以便** 管理知识库  

**验收标准：**

- [ ] **AC-E1**：列头（名称、标签、向量状态、更新时间等）双语。
- [ ] **AC-E2**：向量状态 Tag（pending/success/failed）及错误展示 label 双语（`vectorError` 内容不译）。
- [ ] **AC-E3**：新建/编辑 Modal、Markdown 预览 Drawer 操作按钮双语。
- [ ] **AC-E4**：分片测试 Drawer 表单与结果区 label 双语。
- [ ] **AC-E5**：预览链至 `/knowledge/[id]` 改为 locale 感知（`/en/knowledge/[id]`）。

---

## Epic F：MCP 管理（mcp）

### US-F1 MCP 配置 CRUD 与连接测试双语

**作为** 用户  
**我想要** MCP 表格、编辑表单、连接测试文案双语  
**以便** 管理 MCP 集成  

**验收标准：**

- [ ] **AC-F1**：列头、凭证字段 label、测试连接按钮及结果提示双语。
- [ ] **AC-F2**：名称冲突、加密不可用等 API 错误展示双语。

---

## Epic G：设置页（settings）

### US-G1 设置占位页双语

**作为** 用户  
**我想要** settings 页若有可见文案则双语  
**以便** 一致性  

**验收标准：**

- [ ] **AC-G1**：settings 页用户可见字符串（若有）纳入 `page/console`；纯跳转页可仅 metadata。

---

## 依赖

- `user-stories-shared-infra.md`：antd locale、UserAvatarMenu、ConfirmProvider。
- `user-stories-api-i18n.md`：`/api/console/**` 错误双语。
- `user-stories-routing-locale.md`：路由迁移与 redirect。
