# PRD：i18n 剩余页面与 API（version 0.1.15）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.15` |
| 范围 | **全站剩余页面与业务域 API 的 i18n 完整愿景**；**本期交付边界**见下文「分期交付」 |
| 状态 | **已完成**（2026-06-10） |
| 前置迭代 | `0.1.13`（next-intl 基础架构、首页双语）；`0.1.14`（登录/注册页 + 认证 API 双语 + 路由迁入 `[locale]`） |
| 默认语言 | `en`（延续 0.1.13/0.1.14） |
| 支持语言 | `zh`、`en` |
| 关联页面 | `/chat`、`/console/*`、`/admin/*`、`/knowledge/[id]` 及共享 Shell / 组件 |

## 背景与目标

0.1.13 已建立站点级 i18n 基础设施（next-intl、`/[locale]/` 前缀、cookie `NEXT_LOCALE`、`LanguageSwitcher`、首页完整双语）。0.1.14 已完成登录/注册页双语、认证域 API 错误双语、`resolveRequestLocale` + `tApiMessage` 机制，以及 `login`/`register` 路由迁入 `[locale]`。

**当前缺口：** 除首页与认证页外，核心业务页面仍为硬编码中文；业务域 API（chat、console、admin、knowledge-bases，共 **31** 个 route 文件、auth 4 个已做）的 `jsonError(code, message)` 仍以中文 `message` 为主；`ConsoleShell` / `AdminShell` 固定 `antd/locale/zh_CN` 与 `dayjs/locale/zh-cn`；侧栏菜单（`console-menu.tsx`、`admin-menu.tsx`）为中文常量。

用户明确要求「**i18n the remaining pages and APIs**」。鉴于 chat 单页组件体量（`ChatWorkspace.tsx` 约 1900 行、**154** 处中文匹配）及 console/admin 各子页 ProTable/ProForm 文案面广，**须分批交付**；本 PRD 覆盖**完整愿景**，并标注 **0.1.15 本期 MVP 边界**与后续批次。

**业务动机：**

1. 英语用户从 `/en` 首页或 `/en/login` 进入对话/控制台后，不应突然回到全中文界面。
2. 对话、配置、管理等核心流程中的表单校验、表格操作、确认弹窗、API 错误须与界面语言一致。
3. 将剩余应用路由迁入 `[locale]`，消除「部分页面有 locale、部分无」的双轨结构。
4. 为 antd / ProComponents 内置文案（分页、空状态、日期等）建立与站点 locale 联动的统一模式。
5. 扩展 `api/message.json`，使业务域 ErrorCode 与服务端 `tApiMessage` 机制对齐。

**本轮目标（完整愿景）：**

1. **对话工作台** `/chat` 完整中英双语（含 metadata、侧栏、消息区、助手选择、流式状态、确认弹窗、只读提示、免费模型 hint）。
2. **控制台** `/console/*` 各子页（profile、models、assistants、knowledge、mcp、settings）及 `ConsoleShell`、菜单、Forbidden 提示完整双语。
3. **管理后台** `/admin/*` 各子页及 `AdminShell`、菜单完整双语。
4. **知识库详情** `/knowledge/[id]` 迁入 `[locale]`、鉴权跳转 locale 感知；页面壳层文案双语（正文不译）。
5. **业务域 API**（`/api/chat/**`、`/api/console/**`、`/api/admin/**`、`/api/knowledge-bases/**`）错误 message 双语；`withReadOnlyApi` 拦截文案双语。
6. **共享基础设施**：antd/dayjs 动态 locale、`UserAvatarMenu` shell 变体、`ConfirmProvider`/`modal-shell`、跨 Shell 顶栏链接（对话/控制台）locale 感知。

**成功指标（可验收，按分期分别验收）：**

| 指标 | 说明 |
| --- | --- |
| 页面双语覆盖率 | 各批次范围内用户可见 UI 文案（含 metadata、菜单、表格列头、表单 label、按钮、空状态、toast）100% 具备中英 key |
| 入口 locale 一致 | 从 `/en` 经首页/登录进入 chat/console，URL 与 UI 保持 `en` |
| API 错误双语 | 各批次范围内 API 触发的错误在 `en`/`zh` 下 `error.message` 与界面语言一致 |
| 旧链兼容 | 直接访问 `/chat`、`/console/profile` 等无 locale 路径 → 302 至解析后的 locale 前缀路径 |
| antd 联动 | ProLayout/ProTable/ProForm 内置文案随 locale 切换（分页「条/页」、Empty 等） |
| 架构可扩展 | 新增页面/API 错误仅需增 message 文件 key + 服务端 `tApiMessage` 映射 |
| 主流程不回归 | 对话收发、控制台 CRUD、管理端配置、知识库预览冒烟通过 |

## 分期交付（本期边界 vs 后续）

| 批次 | 版本 | 页面 | API | 共享基础设施 |
| --- | --- | --- | --- | --- |
| **MVP（本期 0.1.15）** | `0.1.15` | **`/chat` 全量 UI**；`/chat` 迁入 `[locale]` | **`/api/chat/conversations/**`** | **antd/dayjs 动态 locale 模式**；`UserAvatarMenu` shell i18n；`ConfirmProvider`/`modal-shell`；`withReadOnlyApi`；`ConsoleForbiddenNotice`；locale 感知 login redirect 模式（Shell 侧 preparatory） |
| 批次 2 | `0.1.16`（建议） | **`/console/*` 全量**（含 menu、各子页、Shell） | **`/api/console/**`** | Console Shell 完整接入 `LanguageSwitcher`；`page/console/*.json` 按子模块拆分 |
| 批次 3 | `0.1.17`（建议） | **`/admin/*` 全量** | **`/api/admin/**`** | Admin Shell 完整接入 |
| 批次 4 | `0.1.18+`（建议） | **`/knowledge/[id]`** | **`/api/knowledge-bases/**`**（若未在 0.1.16 顺带完成 console 侧 knowledge API，则此处补齐） |

> **说明：** knowledge 管理 UI 在 console 子页 `/console/knowledge`，其页面 i18n 随 **0.1.16**；独立预览页 `/knowledge/[id]` 与 knowledge-bases API 体量相对较小，可置于批次 4。若 0.1.16 已覆盖 knowledge-bases API，批次 4 仅补预览页路由与壳层。

### 0.1.15 本期交付边界（In Scope for MVP）

- `/[locale]/chat` 对话工作台完整 UI 双语 + 旧 `/chat` → 302。
- `page/chat.json`；扩展 `api/message.json` 中 **chat 域 + 跨域通用** key（含 `conversationNotFound`、`readOnlyAccountBlocked` 等）。
- `/api/chat/conversations/**`（4 个 route 文件）服务端 `tApiMessage` 改造。
- 共享组件：`UserAvatarMenu`（shell）、`ConfirmProvider`/`confirm`/`modal-shell`、`ConsoleForbiddenNotice`。
- `withReadOnlyApi` 硬编码中文 message 改为 ErrorCode + `tApiMessage`。
- **antd/dayjs 动态 locale 工具/Provider 模式**落地（chat 页若用 antd 组件则接入；为 console/admin 预留）。
- Chat 顶栏 `LanguageSwitcher`（或等效入口）；`html lang`、metadata 随 chat locale。
- 更新 `KNOWN_APP_SEGMENTS`、middleware 对 `/chat` 的 legacy redirect。
- 首页/Shell 链至 `/chat` 的 href 改为 locale 感知（在 chat 迁移后）。

### 0.1.15 本期不做（Deferred）

- `/console/*`、`/admin/*` **页面与菜单**全量文案（列批次 2/3）。
- `/knowledge/[id]` 路由迁移与壳层（列批次 4；console 内 knowledge **管理**页列 0.1.16）。
- **`/api/console/**`、`/api/admin/**`、`/api/knowledge-bases/**`** 全量改造（列对应批次）。
- API **成功**响应体、SSE 流式内容、LLM 生成内容多语言。
- 账号级「界面语言」云端同步。
- 第三语言、RTL、`hreflang`。
- 用户生成内容（昵称、对话正文、知识库 name/description/content、助手名）翻译。
- 备案号、测试账号邮箱等字面量翻译。
- ProComponents **列定义动态生成**的大规模重构（仅要求文案 key 化，结构可保持）。

## 目标 / 非目标

### 目标（Goals · 完整愿景）

- 剩余应用页面 UI 完整双语（见「功能范围」清单）。
- 剩余应用路由迁入 `[locale]`；更新 `KNOWN_APP_SEGMENTS`、middleware legacy redirect、跨页链接。
- 业务域 API 错误 message 双语；ErrorCode → `api/message.json` key 映射表补全。
- `ConsoleShell` / `AdminShell` / Chat 工作台：`ConfigProvider locale`、`dayjs.locale` 随当前 locale 动态切换。
- 各 Shell 顶栏嵌入 `LanguageSwitcher`（或等效）；切换后 URL 更新并保留 pathname/query。
- 新增 `page/chat`、`page/console/*`、`page/admin/*`、`page/knowledge`、`page/shell`（共享壳层）message 文件。
- 迭代文档记录各批次验收与扩展步骤。

### 非目标（Non-goals · 全迭代不变）

- API 成功消息、流式 SSE 事件文案、LLM 输出内容多语言。
- 账号级语言偏好云端同步与用户配置中心字段。
- 第三语言、RTL、Geo/IP 语言检测（延续 `localeDetection: false`）。
- 翻译管理平台（Crowdin 等）接入。
- 邮件/短信模板多语言。
- 管理端日志内容、数据库原始错误栈翻译。

## 用户与核心场景

### 用户角色

| 角色 | 描述 |
| --- | --- |
| 英语用户（已登录） | 从 `/en` 进入对话/控制台，期望全流程英文 UI 与 API 错误 |
| 中文用户（已登录） | 从 `/zh` 或 cookie 偏好进入，期望与现网中文体验一致 |
| 只读测试账号 | 尝试写操作时看到与界面语言一致的只读拦截提示 |
| 管理员 | 使用 `/admin/*` 配置系统，期望英文环境下可完成运维 |
| 开发者 | 按分期模式为新增页面/API 增量接入 message 与 `tApiMessage` |

### 核心场景

1. **首页 → 对话（locale 保持）**：`/en` 首页点 Chat → `/en/chat`；侧栏、输入框、按钮均为英文。
2. **登录后进入对话**：`/en/login?redirect=/chat` 成功后 → `/en/chat`（非裸 `/chat`）。
3. **对话 API 错误**：创建会话时助手不存在 → 英文界面展示英文 `error.message`。
4. **只读账号发消息**：英文界面下 API 返回英文只读拦截文案；Chat UI 只读态提示亦为英文。
5. **控制台切换语言（批次 2）**：在 `/en/console/profile` 切换中文 → `/zh/console/profile`，ProTable 分页等 antd 内置文案同步切换。
6. **管理后台 Forbidden（批次 2/3）**：非白名单用户被 redirect 至 console 时，`ConsoleForbiddenNotice` 以当前 locale 展示。
7. **知识库预览（批次 4）**：`/en/knowledge/{id}` 壳层英文；`kb.name`/`kb.content` 保持用户原文。
8. **旧 URL 兼容**：书签 `/chat` → `/en/chat` 或 `/zh/chat`（按 cookie）；query 保留。

## 功能范围

### 模块 A：对话工作台（Chat）— **0.1.15 MVP**

**路由：** `/[locale]/chat`；旧 `/chat` → 302。

**须纳入 `page/chat` 翻译的范围（含但不限于）：**

| 区域 | 示例（现网中文） | 源码参考 |
| --- | --- | --- |
| metadata | 对话页 title/description | `src/app/chat/` |
| 侧栏 | 新建对话、会话列表、空状态、删除确认 | `ChatWorkspace.tsx` |
| 消息区 | 「用户」「助手」fallback 标签、流式加载态 | 同上 |
| 输入区 | 占位、发送、清空、只读提示 | 同上 |
| 助手选择 | 弹窗标题、搜索、无结果 | 同上 |
| 确认弹窗 | 删除会话、清空消息 | `confirm` + `modal-shell` |
| 错误/Toast | 网络异常、操作失败 fallback | `chat-api.ts` |
| 免费模型 hint | 免费/共享模型提示块 | `ChatPage` props |
| 顶栏 | 链至控制台、LanguageSwitcher | `ChatWorkspace` header |

**组件范围：** `src/app/chat/**`（迁入 `[locale]/chat`）、`src/components/chat/**`。

**API 范围（0.1.15）：** `/api/chat/conversations`、`/[id]`、`/[id]/messages`、`/[id]/turns`。

**典型 ErrorCode：** `UNAUTHORIZED`、`CONVERSATION_NOT_FOUND`、`ASSISTANT_NOT_FOUND`、`VALIDATION_ERROR`、`MODEL_ERROR`、`INTERNAL_ERROR`、`FORBIDDEN`（只读）。

### 模块 B：控制台（Console）— **批次 2（0.1.16 建议）**

**路由：** `/[locale]/console/**`；子路径 profile、models、assistants、knowledge、mcp、settings。

**菜单（`console-menu.tsx`）：** 账号与偏好、模型管理、助手管理、知识库管理、MCP 管理。

**各子页规模（中文匹配约数，供排期参考）：**

| 子页 | 约匹配数 | 主要 UI |
| --- | --- | --- |
| profile | 54 | ProForm 账号/偏好、模型选择 |
| models | 48 + 11 (provider-ui) | ProTable CRUD、provider 标签 |
| assistants | 72 | ProTable、助手编辑 Drawer |
| knowledge | 89 | ProTable、Markdown 预览、向量化状态 |
| mcp | 82 | ProTable、连接测试 |
| settings | 1 | 占位/跳转 |

**Shell：** `ConsoleShell` 标题「控制台」、加载态「验证会话…」、skip link「跳到主要内容」、顶栏「对话」、`ConsoleForbiddenNotice`。

**message 文件建议：** `page/console/shell.json`、`page/console/profile.json`、`page/console/models.json`、`page/console/assistants.json`、`page/console/knowledge.json`、`page/console/mcp.json`（或合并为 `page/console.json` 子命名空间，由设计定稿）。

**API 范围：** `/api/console/profile/**`、`/api/console/models/**`、`/api/console/assistants/**`、`/api/console/mcp-configs/**`。

### 模块 C：管理后台（Admin）— **批次 3（0.1.17 建议）**

**路由：** `/[locale]/admin/**`。

**菜单（`admin-menu.tsx`）：** 配置管理、用户管理、模型管理、提示词模版、日志查询、系统助手管理。

**各子页规模：**

| 子页 | 约匹配数 |
| --- | --- |
| users | 53 |
| config | 50 |
| models | 44 |
| assistants | 44 |
| prompts | 24 |
| logs | 3 |

**Shell：** `AdminShell` 标题「管理后台」、顶栏「对话」「控制台」链接。

**API 范围：** `/api/admin/users/**`、`/api/admin/model-configs/**`、`/api/admin/assistants/**`、`/api/admin/prompt-config/**`、`/api/admin/config/**`。

### 模块 D：知识库详情（Knowledge Preview）— **批次 4（0.1.18+ 建议）**

**路由：** `/[locale]/knowledge/[id]`；旧 `/knowledge/[id]` → 302。

**页面特点：** 当前几乎无壳层文案（仅 `kb.name`、`kb.description`、`kb.content` 展示）；须修正未登录 `redirect` 至 `/{locale}/login`（现为裸 `/login`）。

**不翻译：** 知识库名称、描述、正文（用户生成内容）。

**API：** `/api/knowledge-bases/**`（6 个 route；console knowledge 管理页亦调用，建议在 0.1.16 一并改造 API，0.1.18 仅补预览页路由）。

### 模块 E：共享基础设施 — **0.1.15 起逐步落地**

| 项 | 说明 | 首批 |
| --- | --- | --- |
| antd ConfigProvider | `zh_CN` / `en_US` 随 locale 切换 | 0.1.15 建立模式；0.1.16+ Shell 接入 |
| dayjs locale | `zh-cn` / `en` 随 locale 切换 | 同上 |
| LanguageSwitcher | Chat 顶栏；Console/Admin Shell actionsRender | Chat 0.1.15；Shell 0.1.16/17 |
| UserAvatarMenu | shell 变体「退出登录」、aria-label | 0.1.15 |
| ConfirmProvider | 确认框默认按钮「确定」「取消」 | 0.1.15 |
| modal-shell | 通用 Modal 壳层文案 | 0.1.15 |
| withReadOnlyApi | `READ_ONLY_BLOCK_MESSAGE` → i18n | 0.1.15 |
| ConsoleForbiddenNotice | 管理后台白名单提示 | 0.1.15（组件双语，路由触发在 admin 批次） |
| locale 感知链接 | 首页/Shell 内 `/chat`、`/console` href | 随各模块路由迁移 |

### 模块 F：API 错误消息国际化（业务域）

**机制（延续 0.1.14）：** 服务端 `resolveRequestLocale` + `tApiMessage`；响应 `error.message` 为已翻译文案（方案 A）。

**locale 解析优先级：** Cookie `NEXT_LOCALE` → `Accept-Language`（`zh*` → `zh`）→ 默认 `en`。

**须补全的 ErrorCode key（`api/message.json`）：**

| ErrorCode | 建议 key | 首批 |
| --- | --- | --- |
| `CONVERSATION_NOT_FOUND` | `conversationNotFound` | 0.1.15 |
| `ASSISTANT_NOT_FOUND` | `assistantNotFound` | 0.1.15 |
| `MODEL_CONFIG_NOT_FOUND` | `modelConfigNotFound` | 0.1.16 |
| `KNOWLEDGE_BASE_NOT_FOUND` | `knowledgeBaseNotFound` | 0.1.16 |
| `KNOWLEDGE_BASE_REFERENCED_BY_ASSISTANT` | `knowledgeBaseReferencedByAssistant` | 0.1.16 |
| `KNOWLEDGE_BASE_CHUNK_TEST_UNAVAILABLE` | `knowledgeBaseChunkTestUnavailable` | 0.1.16 |
| `MODEL_ERROR` | `modelError` | 0.1.15 |
| `USER_NOT_FOUND` | `userNotFound` | 0.1.17 |
| `MCP_CONFIG_*` 系列 | `mcpConfigNotFound` 等 | 0.1.16 |
| `INTERNAL_ERROR` | `internalError` | 各批次 |
| `FORBIDDEN`（只读） | `readOnlyAccountBlocked` | 0.1.15 |
| 通用校验 | `validation.*` 子 key 扩展 | 各批次 |

**高频中文硬编码 message（须 key 化）：** 「未登录」「会话不存在」「助手不存在」「请求体须为 JSON」「保存失败，请稍后重试」「id 无效」等——统一归入 `api/message.json` 或 `validation.*`。

**前端展示约定：**

- 各页 `parseApiError` / `readApiErrorPayload` 继续优先展示 API `error.message`（已翻译）。
- antd `message.success/error` 文案须走 `page.*` key，禁止硬编码。
- 流式对话错误：客户端 fallback 走 `page/chat` 或 `api.message`。

## i18n 方案约束（延续 0.1.13/0.1.14）

1. **库与路由**：next-intl；locale 前缀 `always`；非法 locale → `/en`；`localeDetection: false`。
2. **分组与 key**：`page` / `api`；英文 camelCase key；`en` 为语义源；缺失回退 `en`。
3. **页面 message 文件**：按模块/子页拆分，避免单文件膨胀（见模块 B/C）。
4. **API 路径**：不加 locale 前缀；服务端 cookie/header 解析 locale。
5. **双端消费**：Server Component（metadata）+ Client Component 共用 message 源。
6. **不破坏 SSR/RSC**：迁入 `[locale]` 的页面须走 `[locale]/layout.tsx` 的 `NextIntlClientProvider`。
7. **ProComponents**：表格内置文案依赖 antd `ConfigProvider locale`；列头/表单 label 由 `page.*` 提供。

## 路由迁移策略（全模块）

| 旧路径 | 新路径 | 批次 |
| --- | --- | --- |
| `/chat` | `/{locale}/chat` | 0.1.15 |
| `/console/**` | `/{locale}/console/**` | 0.1.16 |
| `/admin/**` | `/{locale}/admin/**` | 0.1.17 |
| `/knowledge/[id]` | `/{locale}/knowledge/[id]` | 0.1.18+ |

**middleware 调整（各批次）：**

- 从 `KNOWN_APP_SEGMENTS` 移除已迁移段（与 0.1.14 login/register 相同模式）。
- 新增 legacy redirect handler（如 `handleLegacyChatRedirect`）或泛化 `handleLegacyAppRedirect`。
- 受保护路由未登录跳转：`/{locale}/login?redirect=...`，`redirect` 值须 locale 感知（/chat → /en/chat）。
- `isProtectedPath` 须匹配 `/{locale}/chat` 等新路径。

## 非功能需求

| 类别 | 要求 |
| --- | --- |
| **安全** | 错误文案不泄露敏感信息（如 CONVERSATION_NOT_FOUND 统一 404）；双语语义等价 |
| **可访问性** | 各页 `html lang` 正确；表单 `aria-*` 与错误语言一致 |
| **性能** | 按 locale + 页面增量加载 message；chat 不加载 console message |
| **兼容** | 旧书签 URL 302；外部文档裸路径仍可用 |
| **视觉** | `LanguageSwitcher` 融入 Chat/Shell 顶栏，不破坏赛博黑风格 |
| **测试** | 各批次中英冒烟：主流程 + 典型 API 错误 + 只读拦截 + locale 切换 |

## 待设计项清单（交给 design 阶段）

| # | 项 | 说明 |
| --- | --- | --- |
| D1 | Chat 英文文案 | 侧栏、消息区、助手选择、流式状态、只读 hint 措辞 |
| D2 | Chat 顶栏布局 | `LanguageSwitcher` 与控制台入口、BrandMark 排布 |
| D3 | Console/Admin 英文文案 | 各 ProTable 列头、表单、操作按钮、状态 Tag |
| D4 | Console 子页 message 拆分 | 单文件 vs `page/console/*.json` 目录结构 |
| D5 | antd en_US 日期/分页 | 与 Punk 暗色主题并存时的可读性 |
| D6 | 确认弹窗统一英文 | delete/clear 等危险操作措辞 |
| D7 | Forbidden / 只读提示 | 英文等价表述 |
| D8 | 跨 Shell 导航链接 | locale 前缀 href 与当前页切换语言后 Shell 状态 |
| D9 | 流式错误展示 | SSE 中断 reason 是否纳入 i18n（若存在用户可见中文） |
| D10 | Knowledge 预览页 | 极简壳层是否需 breadcrumb 等导航文案 |

## 风险与依赖

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| ChatWorkspace 体量大 | 0.1.15 漏翻或回归 | 按区域拆分 AC；test-checklist 中英对照 |
| ProTable 列头动态定义 | 重构面广 | 列定义抽离为 factory + `useTranslations` |
| 多处 `parseApiError` 硬编码 fallback | 英文环境中文 fallback | 统一 fallback key；优先 API message |
| 路由迁移破坏 redirect | 登录后回错页 | 专项测试 redirect；更新 middleware |
| antd Pro 内置中文 | 切换 en 仍见中文 | ConfigProvider locale 必测 |
| API message 膨胀 | 遗漏 ErrorCode | 维护 ErrorCode ↔ key 对照表于 backend 文档 |
| 分期跨页 locale 不一致 | 0.1.15 仅 chat 双语，console 仍中文 | PRD 明确预期；首页链 chat 用 locale href |

**依赖与假设：**

- 依赖 0.1.13/0.1.14 已上线的 next-intl、middleware、`LanguageSwitcher`、`resolveRequestLocale`、`tApiMessage`。
- 假设各批次英语文案由设计/产品在本迭代或对应批次提供。
- 假设 `/api/*` 路径不加 locale 前缀。
- 假设 chat 仍为客户端-heavy 页，迁入 `[locale]` 后 page 为 Server Component 薄壳 + Client `ChatWorkspace`。

## 验收要点（汇总）

### 0.1.15 MVP

1. `/en/chat`、`/zh/chat` 可访问，metadata 与 UI 文案语言正确。
2. `/chat` 重定向至带 locale 路径。
3. 从 `/en` 首页/登录进入 chat，全程英文（含 API 错误、只读提示、确认弹窗）。
4. `messages/{en,zh}/page/chat.json`、`api/message.json`（chat + 只读 + 通用 key）已填充。
5. `/api/chat/conversations/**` 错误 message 双语。
6. `withReadOnlyApi` 拦截文案双语。
7. `UserAvatarMenu` shell、`ConfirmProvider` 双语。
8. antd/dayjs 动态 locale 工具可复用（文档说明接入方式）。
9. 对话主流程冒烟通过。

### 完整愿景（各批次完成后）

10. console/admin/knowledge 页面与对应 API 满足成功指标表。
11. 全部剩余路由迁入 `[locale]`；`KNOWN_APP_SEGMENTS` 仅保留 `api`（或清空）。
12. 迭代 README 记载分期验收与扩展步骤。

## 关联文档

- 用户故事：`user-stories-chat.md`、`user-stories-console.md`、`user-stories-admin.md`、`user-stories-knowledge.md`、`user-stories-api-i18n.md`、`user-stories-routing-locale.md`、`user-stories-shared-infra.md`
- 待确认项：`open-questions.md`
- 上游：`iterations/0.1.13/product/prd.md`、`iterations/0.1.14/product/prd.md`
