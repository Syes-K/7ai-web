# PRD：管理后台 i18n（version 0.1.17）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.17` |
| 范围 | **`/admin/*` 页面全量 UI 双语** + **`/api/admin/**` API 错误双语** + **Admin Shell 共享 infra** + **admin→console 跨页链 locale 化** + **`/knowledge/[id]` 预览页迁入 `[locale]`** + **`/api/knowledge-bases/**` API 错误双语** |
| 状态 | **已完成**（2026-06-11） |
| 前置迭代 | `0.1.13`（i18n 基础）；`0.1.14`（auth）；`0.1.15`（chat + 共享 infra）；`0.1.16`（console 全量，commit 4dd99ab） |
| 默认语言 | `en` |
| 支持语言 | `zh`、`en` |
| 关联页面 | `/admin/*`（迁入 `/[locale]/admin/*`）；`/knowledge/[id]`（迁入 `/[locale]/knowledge/[id]`） |
| 关联 API | `/api/admin/**`（9 个 route 文件）；`/api/knowledge-bases/**`（5 个 route 文件） |

## 背景与目标

0.1.16 已完成控制台 `/[locale]/console/**` 全量 UI 双语、`/api/console/**` 错误双语，并落地 Console Shell 完整接入 `LanguageSwitcher`、antd/dayjs 动态 locale、`handleLegacyConsoleRedirect` 等模式。

**当前缺口：** 管理后台仍为裸路径 `/admin/**`，`AdminShell` 硬编码 `zh_CN` 与中文标题/加载态；侧栏菜单 6 项中文常量；各子页 ProTable/ProForm 合计约 **225** 处中文匹配（users 53、config 50、models/assistants 各 44、prompts 24、logs 3、AdminShell 5、admin-menu 6）；`/api/admin/**` 除 `withAdminApi` 门禁的 `unauthorized`/`forbidden` 外，业务 handler 仍大量 `jsonError(code, 中文 message)` 未走 `tApiMessage`；`layout.tsx` 与非管理员 redirect 仍裸 `/console?notice=admin_forbidden`；`AdminShell` 顶栏「对话」「控制台」链仍为裸 `/chat`、`/console`。

**业务动机：**

1. 英语管理员从 `/en/console` 或 `/en/chat` 进入管理后台后，不应突然回到全中文界面。
2. 用户管理、系统配置、模型/助手/提示词运维的表单校验、表格操作、确认弹窗、API 错误须与界面语言一致。
3. 消除「console 有 locale、admin 无 locale」的双轨结构，完成 0.1.15 分期交付表**批次 3**。
4. Admin Shell 完整接入 0.1.15/0.1.16 已建立的共享 i18n 模式（antd/dayjs、LanguageSwitcher、UserAvatarMenu）。
5. 兑现 0.1.16 open-questions **Q3-B 延后项**：admin→console 跨页链全面 locale 感知。
6. **Knowledge 预览页** `/knowledge/[id]` 迁入 `[locale]`，修正鉴权 redirect；metadata 双语（壳层；`kb.name`/`content` 不译）。
7. **`/api/knowledge-bases/**`（5 routes）** 错误双语，消除 0.1.16 console knowledge 页英文 UI 下 API 错误仍为中文的已知限制。

**本轮目标（0.1.17）：**

1. **`/[locale]/admin/**` 全量子页**（config、users、models、prompts、logs、assistants）及 `AdminShell`、菜单完整双语。
2. **`/api/admin/**`（9 routes）** 错误 `error.message` 双语；补全 admin 域 `api/message.json` key。
3. **路由迁移**：`/admin/**` → `/[locale]/admin/**`；middleware legacy redirect；跨页链接 locale 感知。
4. **message 组织**：`messages/{en,zh}/page/admin/*.json` 按子模块拆分；扩展 `src/i18n/request.ts` 注册。
5. **Admin Shell 完整接入**：`LanguageSwitcher`、`getAntdLocale`/`getDayjsLocaleName`、locale 感知 login redirect。
6. **跨页链（0.1.16 延后）**：`AdminShell`「控制台」→ `/{locale}/console/profile`；非管理员 forbidden → `/{locale}/console?notice=admin_forbidden`（layout + 各子页 403 客户端跳转）。
7. **`/[locale]/knowledge/[id]`** 预览页路由迁移、metadata、鉴权 redirect locale 感知；`page/knowledge.json`。
8. **`/api/knowledge-bases/**`（5 routes）** 错误双语；消除 0.1.16 console knowledge API 中文错误限制。

**成功指标（可验收）：**

| 指标 | 说明 |
| --- | --- |
| 页面双语覆盖率 | admin 范围内用户可见 UI 文案 100% 具备中英 key（含 metadata、菜单、列头、表单、按钮、空状态、toast、Modal） |
| 入口 locale 一致 | 从 `/en/console` 或 `/en/chat` 进入 admin，URL 与 UI 保持 `en` |
| API 错误双语 | `/api/admin/**` 与 `/api/knowledge-bases/**` 触发的错误在 `en`/`zh` 下 `error.message` 与界面语言一致 |
| 旧链兼容 | `/admin/config`、`/knowledge/{id}` 等 → 302 至解析后的 locale 前缀路径 |
| antd 联动 | ProLayout/ProTable/ProForm 内置文案随 locale 切换 |
| 跨页链 | admin forbidden 与 Shell「控制台」跳转保留 locale + query |
| 主流程不回归 | users 只读/重置密码、config 保存、models/assistants CRUD、prompts 保存冒烟通过 |

## In Scope / Out of Scope

### In Scope（本期 0.1.17）

| 类别 | 范围 |
| --- | --- |
| **页面路由** | `/admin/**` 迁入 `/[locale]/admin/**`；legacy 302；未登录 redirect locale 感知 |
| **Admin Shell** | `AdminShell.tsx`、`admin-menu.tsx`（接入 next-intl；移除客户端 `/api/auth/me` 鉴权，改服务端 layout 模式） |
| **子页** | config、users、models、prompts、logs、assistants；`/admin` index redirect |
| **message 文件** | `page/admin/{shell,config,users,models,prompts,logs,assistants}.json` |
| **API** | `/api/admin/**` 全部 9 个 route 文件（handler 层硬编码中文 → `tApiMessage`） |
| **共享 infra** | Admin Shell：`LanguageSwitcher`、`getAntdLocale`、`getDayjsLocaleName`；复用 `page/shell.json` 中 UserMenu、Confirm（若子页使用） |
| **跨页链** | `AdminShell`「对话」→ `/{locale}/chat`；「控制台」→ `/{locale}/console/profile`；`layout.tsx` forbidden → `/{locale}/console?notice=admin_forbidden`；各子页 API 403 `window.location.replace` 同步 locale 化 |
| **middleware** | `handleLegacyAdminRedirect`；`handleLegacyKnowledgeRedirect`；`admin`/`knowledge` 从 `KNOWN_APP_SEGMENTS` 移除；`isProtectedPath` 匹配 `/{locale}/admin`、`/{locale}/knowledge` |
| **Knowledge 预览** | `/knowledge/[id]` → `/[locale]/knowledge/[id]`；服务端鉴权 redirect locale 感知；`page/knowledge.json`；可选 breadcrumb/返回链（设计定稿） |
| **Knowledge-bases API** | `/api/knowledge-bases/**` 全部 5 个 route 文件 → `tApiMessage`；补全 `knowledgeBaseNotFound` 等 key（见 user-stories-api-i18n.md Epic D） |

### Out of Scope（本期不做）

| 类别 | 范围 | 建议批次 |
| --- | --- | --- |
| **Console / Chat 增量** | 0.1.16 已交付范围的重构（除非 admin/knowledge 迁移连带修复裸链） | — |
| **API 成功响应** | 成功体 `message` 字段 | 全迭代不变 |
| **UGC 翻译** | 用户昵称、助手名/描述/提示词正文、prompt 模版 value、日志正文 | 全迭代不变 |
| **账号级语言云端同步** | 用户偏好写入服务端 | 后续 |
| **第三语言 / RTL / hreflang** | — | 后续 |
| **管理端 API 鉴权层改造** | `withAdminApi` / `requireAdminApi` 已双语，仅回归验证 | — |

> **边界说明：** admin **models/assistants** 与 console 域 UI 相似但数据源为**系统级/公有**配置；message 使用 `page.admin.*` 独立命名空间，可复用 console 英文措辞模式但**不**共用 console json 文件。API validation 子 key 优先**复用** 0.1.16 已建立的 `validation.*`（如 `invalidId`、`paginationParamsInvalid`），admin 特有场景再增 key。

## 用户与核心场景

### 用户角色

| 角色 | 描述 |
| --- | --- |
| 英语管理员 | 从 `/en/chat` 或 `/en/console` 进入 admin，期望 ProTable/表单/API 错误均为英文 |
| 中文管理员 | 从 `/zh` 进入，期望与现网中文体验一致 |
| 已登录非白名单用户 | 访问 admin 被 redirect 至 console，`ConsoleForbiddenNotice` 与 URL locale 一致 |
| 开发者 | 按 admin 子模块增量维护 message key 与 `tApiMessage` 映射 |

### 核心场景

1. **Console → Admin（locale 保持）**：`/en/console/profile` 经顶栏或外链进入 `/en/admin/config`；Shell 标题、菜单、表格均为英文。
2. **语言切换**：`/en/admin/users` 切中文 → `/zh/admin/users`，ProTable 分页等 antd 内置文案同步切换。
3. **未登录访问**：`/admin/users` → 302 `/en/admin/users` → 未登录 → `/en/login?redirect=/en/admin/users`。
4. **非管理员访问**：`/zh/admin/config` → redirect `/zh/console?notice=admin_forbidden` → 中文 Forbidden 提示。
5. **API 错误**：英文界面重置不存在用户密码 → `error.message` 为英文 `userNotFound` 等价文案。
6. **旧书签**：`/admin/assistants` → `/en/admin/assistants`（按 cookie）。
7. **跨 Shell 导航**：admin 顶栏「控制台」→ `/en/console/profile`（非裸 `/console`）。
8. **Knowledge 预览**：console knowledge 页「预览」→ `/en/knowledge/{id}`；未登录 → `/en/login?redirect=/en/knowledge/{id}`；metadata 英文，正文保持用户原文。
9. **Knowledge API**：英文 console knowledge 页 CRUD/向量化失败时 `error.message` 为英文（消除 0.1.16 已知限制 L1）。

## 功能范围

### 模块 A：路由迁移与 middleware

**现状：** Admin 在 `src/app/admin/`（未迁入 `[locale]`）；`KNOWN_APP_SEGMENTS` 含 `admin`；无 `handleLegacyAdminRedirect`；`layout.tsx` login redirect 裸 `/login?redirect=/admin/...`；forbidden redirect 裸 `/console?notice=admin_forbidden`。

**目标：**

| 旧路径 | 新路径 |
| --- | --- |
| `/admin` | `/{locale}/admin` → 默认 redirect `/{locale}/admin/config` |
| `/admin/users` 等 | `/{locale}/admin/users` 等 |

**middleware 调整（对齐 0.1.16 console 模式）：**

1. 新增 `handleLegacyAdminRedirect`：`/admin` 或 `/admin/*` → `/{locale}/admin...`，path + query 保留。
2. 从 `KNOWN_APP_SEGMENTS` 移除 `admin`。
3. `isProtectedPath` 增加 `/^\/(en|zh)\/admin(\/|$)/`。
4. `config.matcher`：保留 `/admin`、`/admin/:path*` 以触发 legacy redirect。
5. 未登录：`handleProtectedRoute` 对 locale 前缀 admin 路径 → `/{locale}/login?redirect={完整路径含 locale}`。
6. middleware 对裸 `/admin` 请求设置 `x-admin-login-redirect` 时，须改为 locale 感知目标（或改由 `[locale]/admin/layout.tsx` 自行构造 redirect）。

**页面 layout 结构（建议，与设计定稿）：**

- `src/app/[locale]/admin/layout.tsx`：服务端 `gateAdminPageAccess` + locale 感知 login/forbidden redirect + `AntdRegistry` + `AdminShell`。
- 删除旧 `src/app/admin/` 树（或等价迁移，不保留 re-export 裸路径页）。
- 各子页 `generateMetadata` 使用 `getTranslations('page.admin.{module}')`。
- **鉴权模式**：对齐 0.1.16 console——服务端 layout 校验会话与管理员白名单；`AdminShell` 移除客户端 `fetch /api/auth/me` 与「验证会话…」竞态，改为接收 layout 传入的 `displayName`（参考 `ConsoleShell`）。

### 模块 B：Admin Shell 与菜单

**源码：** `AdminShell.tsx`、`admin-menu.tsx`。

| 区域 | 现网中文 | message 归属 |
| --- | --- | --- |
| Shell 标题 | 管理后台 | `page.admin.shell.title` |
| Skip link | 跳到主要内容 | `page.admin.shell.skipToMain` |
| 顶栏「对话」 | 对话 | `page.admin.shell.chatLink` |
| 顶栏「控制台」 | 控制台 | `page.admin.shell.consoleLink` |
| 菜单 6 项 | 配置管理、用户管理… | `page.admin.shell.menu.*` |

**Shell infra 接入：**

- `ConfigProvider locale={getAntdLocale(locale)}`；移除硬编码 `zhCN`。
- `dayjs.locale(getDayjsLocaleName(locale))`；移除模块级 `dayjs.locale("zh-cn")`。
- `actionsRender` 嵌入 `<LanguageSwitcher namespace="page.admin.shell" variant="shell" />`。
- `UserAvatarMenu variant="shell"`（0.1.15 已 i18n，直接复用）。
- `adminMenuRoutes` 改为 `getAdminMenuRoutes(t)` factory；path 为 `/{locale}/admin/...`；`Link` 使用 `@/i18n/navigation`。
- 顶栏 href：`/{locale}/chat`、`/{locale}/console/profile`。

### 模块 C：各子页 UI i18n

**默认策略：全量交付，不分 MVP 子集。** 各子页按中文匹配体量排序（实施参考）：

| 优先级 | 子页 | 约中文匹配 | 主要 UI | message 文件 |
| --- | --- | --- | --- | --- |
| P0 | shell + menu | ~11 | ProLayout、顶栏 | `shell.json` |
| P1 | users | 53 | Table、只读开关、重置密码 Modal | `users.json` |
| P2 | config | 50 | 对话摘要 ProForm、保存 | `config.json` |
| P3 | models | 44 | ProTable CRUD（公有模型） | `models.json` |
| P4 | assistants | 44 | ProTable、系统助手 Drawer | `assistants.json` |
| P5 | prompts | 24 | 提示词模版表单、Alert | `prompts.json` |
| P6 | logs | 3 | 日志 Table、筛选 | `logs.json` |

**须纳入翻译的范围（各子页含但不限于）：**

- ProTable/Table 列头、操作列、ToolBar、Popconfirm、Empty、Pagination 文案。
- ProForm/Modal/Drawer label、placeholder、Tooltip、extra、Alert。
- 状态 Tag（只读/读写、启用/停用、锁定剩余时间等）；**日志正文、用户 email、助手 prompt 正文不译**。
- Toast / Modal：`message.success/error`、`modal.confirm` 须走 `page.admin.*` key。
- `parseApiError` 使用 `@/common/utils/parse-api-error`（0.1.16 已落地），传入 `t` 统一 fallback。
- **403 跳转**：各子页 `window.location.replace("/console?notice=admin_forbidden")` → `/{locale}/console?notice=admin_forbidden`（解析 pathname locale 或 `useLocale()`）。
- **不译：** 用户 email/昵称、助手 name/prompt、prompt 模版 value、provider 枚举 key、`ADMIN_USER` 字面量、日志 message 字段原文。

**ProTable 列定义：** 建议 `getXxxColumns(t)` factory + `useMemo`（延续 0.1.16 模式）。

**users 页特例：** `formatLockRemain` 等相对时间文案须 i18n（如「约 N 分钟」「不到 1 分钟」）。

### 模块 D：`/api/admin/**` 错误 i18n

**范围（9 files）：**

| Route | 方法 | 主要 ErrorCode / 场景 |
| --- | --- | --- |
| `users/route.ts` | GET | VALIDATION_ERROR(pagination) |
| `users/[id]/route.ts` | PATCH | VALIDATION_ERROR, FORBIDDEN(self), USER_NOT_FOUND |
| `users/[id]/reset-password/route.ts` | POST | RATE_LIMITED, VALIDATION_ERROR, FORBIDDEN(self), USER_NOT_FOUND |
| `model-configs/route.ts` | GET, POST | VALIDATION_ERROR, INTERNAL_ERROR |
| `model-configs/[id]/route.ts` | GET, PATCH, DELETE | VALIDATION_ERROR, MODEL_CONFIG_NOT_FOUND, INTERNAL_ERROR |
| `assistants/route.ts` | GET, POST | VALIDATION_ERROR, INTERNAL_ERROR |
| `assistants/[id]/route.ts` | GET, PATCH, DELETE | VALIDATION_ERROR, ASSISTANT_NOT_FOUND, INTERNAL_ERROR |
| `prompt-config/route.ts` | GET, PUT | VALIDATION_ERROR, INTERNAL_ERROR |
| `config/conversation-summary/route.ts` | GET, PUT | VALIDATION_ERROR, INTERNAL_ERROR |

**机制（延续 0.1.14–0.1.16）：** 各 handler 顶部 `const locale = await resolveRequestLocale(request)`；`jsonError(code, tApiMessage(locale, key, params), status, details?)`。

**已有双语（回归验证）：** `withAdminApi` → `requireAdminApi` 的 `UNAUTHORIZED`/`FORBIDDEN` 已用 `tApiMessage`。

**ErrorCode → `api/message.json` key 映射（本期须补全/复用）：**

| ErrorCode / 场景 | message key | 备注 |
| --- | --- | --- |
| `UNAUTHORIZED` | `unauthorized` | 已有（withAdminApi） |
| `FORBIDDEN` | `forbidden` | 已有（withAdminApi）；admin 业务 FORBIDDEN 见下 |
| `RATE_LIMITED` | `rateLimited` | 已有；reset-password 复用 |
| `USER_NOT_FOUND` | `userNotFound` | 已有 |
| `MODEL_CONFIG_NOT_FOUND` | `modelConfigNotFound` | 已有（0.1.16） |
| `ASSISTANT_NOT_FOUND` | `assistantNotFound` | 已有 |
| `VALIDATION_ERROR`（分页） | `validation.paginationParamsInvalid` | 已有；admin 列表 GET 复用 |
| `VALIDATION_ERROR`（通用 JSON） | `validation.invalidJson` | 已有 |
| `VALIDATION_ERROR`（id） | `validation.invalidId` | 已有 |
| `VALIDATION_ERROR`（用户 id） | `validation.invalidUserId` | **新增**（或与 invalidId 合并，开发定稿） |
| `VALIDATION_ERROR`（顶层参数） | `validation.invalidParams` | 已有 |
| `VALIDATION_ERROR`（provider） | `validation.invalidModelProvider` | 已有 |
| `VALIDATION_ERROR`（required/maxLength 等） | `validation.*` | 已有；details field message 全 key 化 |
| `FORBIDDEN`（重置自己密码） | `admin.cannotResetOwnPassword` | **新增** |
| `FORBIDDEN`（变更自己 status） | `admin.cannotChangeOwnStatus` | **新增** |
| `VALIDATION_ERROR`（status 枚举） | `validation.invalidUserStatus` | **新增** |
| `VALIDATION_ERROR`（readOnly 类型） | `validation.readOnlyMustBeBoolean` | **新增** |
| `VALIDATION_ERROR`（PATCH 无字段） | `validation.atLeastOneUpdateField` | **新增** |
| `INTERNAL_ERROR`（通用保存失败） | `saveFailedRetry` | 已有 |
| `INTERNAL_ERROR`（保存失败-磁盘） | `admin.saveFailedCheckPermissions` | **新增**（prompt-config） |
| `INTERNAL_ERROR`（读配置失败） | `admin.readConfigFailed` | **新增**（prompt / conversation-summary） |
| `INTERNAL_ERROR`（写入后验证失败） | `admin.writeVerifyFailed` | **新增** |
| `INTERNAL_ERROR`（conversation-summary 保存） | `admin.conversationSummarySaveFailed` | **新增** |
| `VALIDATION_ERROR`（prompt-config 专项） | `validation.promptConfig.*` | **新增**子树（见 user-stories-api-i18n.md） |
| `VALIDATION_ERROR`（conversation-summary 专项） | `validation.conversationSummary.*` | **新增**子树 |

**GET 响应体用户可见字符串（非 jsonError）：**

- `prompt-config` GET：`invalid_json` 时返回的 Alert 说明文案（现网中文）→ 服务端按 locale 返回已翻译 `statusMessage` 或前端用 `page.admin.prompts` key 映射 `status` 枚举（见 open-questions Q2）。
- `conversation-summary` GET：坏 JSON 回退说明 → 同上策略。

**details 数组内 `field.message`：** 须改为 `tApiMessage(locale, key)`（延续 0.1.16 Q9 结论）。

**prompt-config `tmpl.message` 动态校验：** 须映射至有限 `validation.promptConfig.*` key（延续 0.1.15 open-questions Q7 选项 B）。

### 模块 E：与 0.1.16 Console 模式复用

| 能力 | 0.1.16 Console 落点 | 0.1.17 Admin 用法 |
| --- | --- | --- |
| `getAntdLocale` / `getDayjsLocaleName` | `src/common/utils/antd-locale.ts` | `AdminShell` ConfigProvider + 子页 dayjs 格式化 |
| `LanguageSwitcher` | `components/home/LanguageSwitcher.tsx` | AdminShell `actionsRender`，namespace `page.admin.shell` |
| `UserAvatarMenu` shell | `page/shell.json` | 直接复用 |
| `parse-api-error` | `src/common/utils/parse-api-error.ts` | admin 各子页 API 错误 fallback |
| `resolveRequestLocale` / `tApiMessage` | `src/server/i18n/*` | 全部 admin API route handlers |
| Console layout 鉴权模式 | `[locale]/console/layout.tsx` | 复制至 `[locale]/admin/layout.tsx` + `gateAdminPageAccess` |
| Legacy redirect | `handleLegacyConsoleRedirect` | 新增 `handleLegacyAdminRedirect` |
| ProTable columns factory | `getXxxColumns(t)` | admin 各 Table/ProTable 页 |
| validation 子 key | `api/message.json` `validation.*` | admin 与 console 共用；admin 特有增 `validation.promptConfig.*` 等 |
| i18n Link / pathname | `@/i18n/navigation` | AdminShell 菜单与顶栏 |
| Forbidden notice | `ConsoleForbiddenNotice` + `page.shell` | admin forbidden redirect 目标须带 locale；console 端已就绪 |

**`src/i18n/request.ts` 扩展：** 动态 import `page/admin/*.json`，挂载为 `messages.page.admin.{shell,config,...}`；admin 页加载 admin 命名空间（不加载 console/chat 子模块 json，除非共享 shell）。

**与 console 页面文案关系：** admin models/assistants 与 console 功能相似，**英文翻译可参考** `page/console/models.json`、`page/console/assistants.json` 措辞，但 key 树独立，避免 cross-namespace 耦合。

### 模块 F：跨页链接更新（admin 批次责任 · 0.1.16 Q3-B 兑现）

| 位置 | 现网 | 目标 |
| --- | --- | --- |
| `AdminShell` 对话链接 | `/chat` | `/{locale}/chat` |
| `AdminShell` 控制台链接 | `/console` | `/{locale}/console/profile` |
| `admin/layout.tsx` forbidden | `/console?notice=admin_forbidden` | `/{locale}/console?notice=admin_forbidden` |
| admin 各子页 API 403 | `/console?notice=admin_forbidden` | `/{locale}/console?notice=admin_forbidden` |
| admin 内 Link | 裸 `/admin/...` | locale 感知（`@/i18n/navigation`） |
| `/admin` index redirect | `/admin/config` | `/{locale}/admin/config` |

### 模块 G：Knowledge 预览页与 knowledge-bases API

**预览页现状：** `src/app/knowledge/[id]/page.tsx` 为 Server Component；几乎无硬编码 UI 中文；未登录 redirect 裸 `/login?redirect=/knowledge/{id}`（**须修正**为 locale 感知）。

**预览页目标：**

| 项 | 说明 |
| --- | --- |
| 路由 | `/[locale]/knowledge/[id]`；删除旧 `src/app/knowledge/` |
| Legacy | `/knowledge/{id}` → 302 `/{locale}/knowledge/{id}` |
| 鉴权 | 未登录 → `/{locale}/login?redirect=/{locale}/knowledge/{id}` |
| metadata | `page.knowledge.meta.title` 等；title 可拼接 `kb.name`（不翻译） |
| 壳层 | 若增加返回控制台等链接，文案双语 + `@/i18n/navigation` |
| 不译 | `kb.name`、`kb.description`、`kb.content` |

**knowledge-bases API（5 files）：**

| Route | 方法 | 主要 ErrorCode |
| --- | --- | --- |
| `route.ts` | GET, POST | UNAUTHORIZED, VALIDATION_ERROR, INTERNAL_ERROR |
| `[id]/route.ts` | GET, PATCH, DELETE | KNOWLEDGE_BASE_NOT_FOUND, KNOWLEDGE_BASE_REFERENCED_BY_ASSISTANT, VALIDATION_ERROR |
| `[id]/vectorization/route.ts` | POST | KNOWLEDGE_BASE_NOT_FOUND |
| `[id]/vectorization/retry/route.ts` | POST | KNOWLEDGE_BASE_NOT_FOUND |
| `[id]/chunk-tests/route.ts` | POST | KNOWLEDGE_BASE_NOT_FOUND, KNOWLEDGE_BASE_CHUNK_TEST_UNAVAILABLE, VALIDATION_ERROR |

**机制：** 与 admin/console 相同——`resolveRequestLocale` + `tApiMessage`；validation details 全 key 化；标签校验等 helper 可抽 locale 参数或 route 层翻译。

**ErrorCode 映射（须补全/复用）：**

| ErrorCode | message key | 备注 |
| --- | --- | --- |
| `KNOWLEDGE_BASE_NOT_FOUND` | `knowledgeBaseNotFound` | **新增** |
| `KNOWLEDGE_BASE_REFERENCED_BY_ASSISTANT` | `knowledgeBaseReferencedByAssistant` | **新增** |
| `KNOWLEDGE_BASE_CHUNK_TEST_UNAVAILABLE` | `knowledgeBaseChunkTestUnavailable` | **新增** |
| 通用 validation | `validation.*` | 复用 0.1.16 |

**与 console knowledge 管理页：** 0.1.16 已 i18n UI；本期 API 双语后英文 UI 下 toast/错误与界面一致。

## i18n 方案约束（延续）

1. next-intl；locale 前缀 `always`；非法 locale → `/en`；`localeDetection: false`。
2. key 分组 `page.admin.*` / `api.message.*`；英文 camelCase；`en` 为语义源。
3. API 路径不加 locale；服务端 cookie/header 解析。
4. Server + Client 共用 message 源；admin 页走 `[locale]/layout.tsx` `NextIntlClientProvider`。
5. ProComponents 内置文案依赖 antd `ConfigProvider locale`；列头/label 由 `page.admin.*` 提供。

## message 文件组织

**推荐（对齐 0.1.16 console 选项 B）：**

```
messages/{en,zh}/page/admin/
  shell.json
  config.json
  users.json
  models.json
  prompts.json
  logs.json
  assistants.json
messages/{en,zh}/page/
  knowledge.json          # 预览页 metadata + 可选壳层链
```

**命名空间：** `page.admin.shell.title`、`page.admin.users.columns.email`、`page.knowledge.meta.title` 等。

**与 `page/shell.json` 分工：**

- 跨 Shell 共用（UserMenu、Confirm）：保留 `page/shell.json`。
- Admin 特有（标题「管理后台」、菜单项、子页文案）：`page/admin/*.json`。

**与 `page/console/*.json` 分工：** 独立文件；语义相近时可参考英文措辞，不共享 key。

## 非功能需求

| 类别 | 要求 |
| --- | --- |
| 安全 | 错误文案不泄露敏感信息；重置密码临时密码仅响应体返回，不写入日志翻译 |
| 可访问性 | `html lang` 随 locale；表单 `aria-*` 与错误语言一致 |
| 性能 | 按 locale 增量加载 admin message；非 admin 页不加载 admin json |
| 兼容 | 旧 `/admin/**` 302；外部文档裸路径可用 |
| 视觉 | `LanguageSwitcher` 融入 ProLayout 顶栏 actionsRender（与 console 一致） |
| 测试 | 中英冒烟：admin 6 子页 + knowledge 预览 + 典型 admin/knowledge-bases API 错误 + locale 切换 + legacy redirect + forbidden 跨链 |

## 待设计项清单

| # | 项 | 说明 |
| --- | --- | --- |
| D1 | Admin 英文文案 | 各 ProTable 列头、users 只读/锁定、config 对话摘要说明 |
| D2 | Shell 顶栏布局 | `LanguageSwitcher` 与「对话」「控制台」、UserAvatarMenu 排布（对齐 console） |
| D3 | message key 树 | `page.admin.*` 层级约定（shell.menu.config 等） |
| D4 | models/assistants 英文 | 与 console 措辞对齐 vs admin 专用术语（「系统助手」「公有模型」） |
| D5 | prompt-config GET Alert | `invalid_json` 展示：服务端翻译 vs 前端 status 映射 |
| D6 | users 相对时间 | `formatLockRemain` ICU 或分 key |
| D7 | logs 页筛选 | 体量小但日期/级别筛选 label 英文 |

## 风险与依赖

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| users/config 体量大（53/50） | 漏翻 | 按子页 AC 分批验收；grep 中文残留 |
| prompt-config 动态 tmpl.message | 难以枚举 | 有限 key 映射表（0.1.15 Q7-B） |
| 多处 403 裸 redirect | locale 丢失 | 统一 helper：`adminForbiddenConsoleUrl(locale)` |
| AdminShell 客户端鉴权 | 英文界面闪中文加载态 | 改服务端 layout 模式（0.1.16 Q10-A） |
| validation key 与 console 重复 | 维护两套措辞 | 共用 `validation.*`；admin 仅增域特有 key |

**依赖：**

- 0.1.16 已交付的 console i18n、`handleLegacyConsoleRedirect`、`parse-api-error`、console layout 鉴权模式。
- 0.1.15 共享 infra（LanguageSwitcher、antd-locale、UserAvatarMenu、ConsoleForbiddenNotice）。
- 设计提供各子页英文文案（可与实现并行，key 结构先定）。

## 验收要点（0.1.17）

1. `/en/admin/config`、`/zh/admin/users` 等可访问；metadata 与 UI 语言正确。
2. `/admin/**` → 302 至带 locale 路径；query 保留。
3. 未登录访问 admin → `/{locale}/login?redirect=/{locale}/admin/...`。
4. 非管理员访问 admin → `/{locale}/console?notice=admin_forbidden`；Forbidden 文案与 locale 一致。
5. `AdminShell`：标题、菜单、skip link、对话/控制台链、LanguageSwitcher、antd/dayjs 联动；无客户端鉴权闪屏。
6. 六子页 + index redirect 用户可见文案 100% key 化。
7. `messages/{en,zh}/page/admin/*.json` 与扩展后的 `api/message.json` 已填充。
8. `/api/admin/**` 全部 9 route handler 无硬编码中文 `jsonError` message（注释除外）。
9. 从 `/en/console` 进入 admin 再回控制台，全程 locale 一致。
10. `admin` 已从 `KNOWN_APP_SEGMENTS` 移除。
11. users 只读切换、重置密码、config 保存、models/assistants CRUD、prompts 保存冒烟通过。

## 关联文档

- 用户故事：`user-stories-admin.md`、`user-stories-knowledge.md`、`user-stories-api-i18n.md`
- 待确认项：`open-questions.md`
- 上游：`iterations/0.1.15/product/prd.md` 批次 3、`iterations/0.1.16/product/open-questions.md` Q3-B
- 参考实现：`iterations/0.1.16/product/prd.md`、`src/app/[locale]/console/**`
