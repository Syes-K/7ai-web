# PRD：控制台 i18n（version 0.1.16）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.16` |
| 范围 | **`/console/*` 页面全量 UI 双语** + **`/api/console/**` API 错误双语** + **Console Shell 共享 infra 完整接入** |
| 状态 | **已完成**（2026-06-11） |
| 前置迭代 | `0.1.13`（i18n 基础）；`0.1.14`（auth 双语 + `[locale]`）；`0.1.15`（chat 全量 + 共享 infra 模式） |
| 默认语言 | `en` |
| 支持语言 | `zh`、`en` |
| 关联页面 | `/console/*`（迁入 `/[locale]/console/*`） |
| 关联 API | `/api/console/**`（12 个 route 文件） |

## 背景与目标

0.1.15 已完成对话工作台 `/[locale]/chat` 全量 UI 双语、`/api/chat/conversations/**` 错误双语，并落地 antd/dayjs 动态 locale 工具、`LanguageSwitcher`（chat 顶栏）、`UserAvatarMenu` shell 变体、`ConfirmProvider`/`modal-shell`、`ConsoleForbiddenNotice`、`withReadOnlyApi` 等共享能力。

**当前缺口：** 控制台仍为裸路径 `/console/**`，`ConsoleShell` 硬编码 `zh_CN` 与中文标题/加载态；侧栏菜单 5 项中文常量；各子页 ProTable/ProForm 合计约 **367** 处中文匹配（profile 54、models 48+11、assistants 72、knowledge 89、mcp 82、settings 1）；`/api/console/**` 全部 `jsonError(code, 中文 message)` 未走 `tApiMessage`。

**业务动机：**

1. 英语用户从 `/en/chat` 进入控制台后，不应突然回到全中文界面。
2. 控制台 CRUD（模型、助手、知识库、MCP）的表单校验、表格操作、确认弹窗、API 错误须与界面语言一致。
3. 消除「chat 有 locale、console 无 locale」的双轨结构，为 0.1.17 admin 批次铺路。
4. Console Shell 完整接入 0.1.15 已建立的共享 i18n 模式（antd/dayjs、LanguageSwitcher、UserAvatarMenu）。

**本轮目标（0.1.16）：**

1. **`/[locale]/console/**` 全量子页**（profile、models、assistants、knowledge、mcp、settings）及 `ConsoleShell`、菜单、Forbidden 提示完整双语。
2. **`/api/console/**`（12 routes）** 错误 `error.message` 双语；补全 console 域 `api/message.json` key。
3. **路由迁移**：`/console/**` → `/[locale]/console/**`；middleware legacy redirect；跨页链接 locale 感知。
4. **message 组织**：`messages/{en,zh}/page/console/*.json` 按子模块拆分；扩展 `src/i18n/request.ts` 注册。
5. **Console Shell 完整接入**：`LanguageSwitcher`、`getAntdLocale`/`getDayjsLocaleName`、locale 感知 login redirect。

**成功指标（可验收）：**

| 指标 | 说明 |
| --- | --- |
| 页面双语覆盖率 | console 范围内用户可见 UI 文案 100% 具备中英 key（含 metadata、菜单、列头、表单、按钮、空状态、toast） |
| 入口 locale 一致 | 从 `/en/chat` 或 `/en` 进入 console，URL 与 UI 保持 `en` |
| API 错误双语 | `/api/console/**` 触发的错误在 `en`/`zh` 下 `error.message` 与界面语言一致 |
| 旧链兼容 | `/console/profile` 等 → 302 至解析后的 locale 前缀路径 |
| antd 联动 | ProLayout/ProTable/ProForm 内置文案随 locale 切换 |
| 主流程不回归 | profile 保存、models/assistants/knowledge/mcp CRUD、MCP 连接测试冒烟通过 |

## In Scope / Out of Scope

### In Scope（本期 0.1.16）

| 类别 | 范围 |
| --- | --- |
| **页面路由** | `/console/**` 迁入 `/[locale]/console/**`；legacy 302；未登录 redirect locale 感知 |
| **Console Shell** | `ConsoleShell.tsx`、`console-menu.tsx`、`ConsoleForbiddenNotice`（接入 next-intl，替代 cookie 直读） |
| **子页** | profile、models（含 `model-provider-ui.ts`）、assistants、knowledge、mcp、settings（redirect 页 metadata） |
| **message 文件** | `page/console/{shell,profile,models,assistants,knowledge,mcp,settings}.json` |
| **API** | `/api/console/**` 全部 12 个 route 文件 |
| **共享 infra** | Console Shell：`LanguageSwitcher`、`getAntdLocale`、`getDayjsLocaleName`；复用 `page/shell.json` 中 Confirm/UserMenu/Forbidden（或 console shell 引用） |
| **跨页链接（console 相关）** | `ConsoleShell`「对话」→ `/{locale}/chat`；`PunkLanding`/`ChatWorkspace` 控制台入口 → `/{locale}/console/profile`；console 内 Link（如 profile→models）；knowledge 预览链 → `/{locale}/knowledge/{id}`（壳层未 i18n 亦可带 locale 前缀） |
| **middleware** | `handleLegacyConsoleRedirect`；`console` 从 `KNOWN_APP_SEGMENTS` 移除；`isProtectedPath` 匹配 `/{locale}/console` |

### Out of Scope（本期不做）

| 类别 | 范围 | 建议批次 |
| --- | --- | --- |
| **Admin 页面** | `/admin/*`、`AdminShell`、`admin-menu.tsx` | 0.1.17 |
| **Admin API** | `/api/admin/**` | 0.1.17 |
| **Knowledge 预览页** | `/knowledge/[id]` 路由迁移与壳层 i18n | 0.1.18+ |
| **Knowledge-bases API** | `/api/knowledge-bases/**`（5 routes） | 0.1.18+ |
| **API 成功响应** | 成功体 `message` 字段 | 全迭代不变 |
| **UGC 翻译** | 昵称、助手名、知识库 name/description/content、MCP 配置名 | 全迭代不变 |
| **账号级语言云端同步** | 用户偏好写入服务端 | 后续 |
| **第三语言 / RTL / hreflang** | — | 后续 |

> **边界说明：** `/console/knowledge` **管理页 UI** 纳入本期；其调用的 **`/api/knowledge-bases/**` 不在本期**（见 `open-questions.md` Q1）。英文界面下知识库 CRUD 的 **页面文案** 为英文，但 knowledge-bases API 错误在 0.1.18 前可能仍为中文——须在验收中标注为已知限制。

## 用户与核心场景

### 用户角色

| 角色 | 描述 |
| --- | --- |
| 英语用户（已登录） | 从 `/en/chat` 进入控制台，期望 ProTable/表单/API 错误均为英文 |
| 中文用户（已登录） | 从 `/zh` 进入，期望与现网中文体验一致 |
| 只读测试账号 | 控制台写操作被 `withReadOnlyApi` 拦截，文案与界面语言一致（0.1.15 已双语） |
| 非白名单用户 | 从 admin 跳回 console 时 `ConsoleForbiddenNotice` 与 locale 一致 |
| 开发者 | 按 console 子模块增量维护 message key 与 `tApiMessage` 映射 |

### 核心场景

1. **Chat → Console（locale 保持）**：`/en/chat` 点控制台 → `/en/console/profile`；Shell 标题、菜单、表格均为英文。
2. **语言切换**：`/en/console/models` 切中文 → `/zh/console/models`，ProTable 分页等 antd 内置文案同步切换。
3. **未登录访问**：`/console/mcp` → 302 `/en/console/mcp` → 未登录 → `/en/login?redirect=/en/console/mcp`。
4. **API 错误**：英文界面删除不存在模型 → `error.message` 为英文 `modelConfigNotFound` 等价文案。
5. **旧书签**：`/console/assistants` → `/en/console/assistants`（按 cookie）。
6. **Admin 无权跳转**：`/zh/console?notice=admin_forbidden` 展示中文 Forbidden 提示；切换语言保留 query。

## 功能范围

### 模块 A：路由迁移与 middleware

**现状：** Console 在 `src/app/console/`（未迁入 `[locale]`）；`KNOWN_APP_SEGMENTS` 含 `console`；无 `handleLegacyConsoleRedirect`。

**目标：**

| 旧路径 | 新路径 |
| --- | --- |
| `/console` | `/{locale}/console` → 默认 redirect `/{locale}/console/profile` |
| `/console/profile` 等 | `/{locale}/console/profile` 等 |
| `/console/settings` | `/{locale}/console/settings` → redirect profile |

**middleware 调整（对齐 0.1.15 chat 模式）：**

1. 新增 `handleLegacyConsoleRedirect`：`/console` 或 `/console/*` → `/{locale}/console...`，path + query 保留。
2. 从 `KNOWN_APP_SEGMENTS` 移除 `console`。
3. `isProtectedPath` 增加 `/^\/(en|zh)\/console(\/|$)/`。
4. `config.matcher`：保留 `/console`、`/console/:path*` 以触发 legacy redirect；迁移后可评估是否保留。
5. 未登录：`handleProtectedRoute` 对 locale 前缀 console 路径 → `/{locale}/login?redirect={完整路径含 locale}`。

**页面 layout 结构（建议，与设计定稿）：**

- `src/app/[locale]/console/layout.tsx`：服务端会话校验（参考 `[locale]/chat/layout.tsx`）+ `AntdRegistry` + `ConsoleShell`。
- 删除旧 `src/app/console/` 树（或等价迁移，不保留 re-export 裸路径页）。
- 各子页 `generateMetadata` 使用 `getTranslations('page.console.{module}')`。

**客户端 401 跳转：** `ConsoleShell` 及子页内 `window.location`/`router.replace` 登录跳转须解析当前 pathname locale，生成 `/{locale}/login?redirect=/{locale}/console/...`（替换现网裸 `/login?redirect=/console/...`）。

### 模块 B：Console Shell 与菜单

**源码：** `ConsoleShell.tsx`、`console-menu.tsx`、`ConsoleForbiddenNotice.tsx`。

| 区域 | 现网中文 | message 归属 |
| --- | --- | --- |
| Shell 标题 | 控制台 | `page.console.shell.title` |
| 加载态 | 验证会话… | `page.console.shell.verifyingSession` |
| Skip link | 跳到主要内容 | `page.console.shell.skipToMain` |
| 顶栏「对话」 | 对话 | `page.console.shell.chatLink` |
| 菜单 5 项 | 账号与偏好、模型管理… | `page.console.shell.menu.*` |
| Forbidden | 已双语（`page.shell` + cookie） | 迁入 `useTranslations` / `page.console.shell` 或继续引用 `page.shell.forbiddenNotice` |

**Shell infra 接入：**

- `ConfigProvider locale={getAntdLocale(locale)}`；移除硬编码 `zhCN`。
- `dayjs.locale(getDayjsLocaleName(locale))`；移除模块级 `dayjs.locale("zh-cn")`。
- `actionsRender` 嵌入 `<LanguageSwitcher namespace="page.console.shell" variant="shell" />`（与 chat 一致）。
- `UserAvatarMenu variant="shell"`（0.1.15 已 i18n，无需改文案源）。
- `consoleMenuRoutes` path 改为 `/{locale}/console/...` 或通过 next-intl `Link`/pathname 解析动态生成。

**settings 页：** 仅 server redirect + 可选 metadata；无独立菜单项。

### 模块 C：各子页 UI i18n

**默认策略：全量交付，不分 MVP 子集。** 各子页按中文匹配体量排序（实施参考，非砍 scope）：

| 优先级 | 子页 | 约中文匹配 | 主要 UI | message 文件 |
| --- | --- | --- | --- | --- |
| P0 | shell + menu | ~10 | ProLayout、顶栏 | `shell.json` |
| P1 | profile | 54 | ProForm 账号/偏好、模型选择 | `profile.json` |
| P2 | models | 48 + 11 | ProTable CRUD、`model-provider-ui.ts` | `models.json` |
| P3 | assistants | 72 | ProTable、编辑 Drawer、KB/MCP 关联 | `assistants.json` |
| P4 | knowledge | 89 | ProTable、Markdown 预览、向量化、分片测试 | `knowledge.json` |
| P5 | mcp | 82 | ProTable、凭证、连接测试 | `mcp.json` |
| P6 | settings | 1 | redirect only | `settings.json`（metadata） |

**须纳入翻译的范围（各子页含但不限于）：**

- ProTable 列头、操作列、ToolBar、Popconfirm、Empty。
- ProForm/Modal/Drawer label、placeholder、Tooltip、extra。
- 状态 Tag（向量状态 pending/success/failed 等）；**`vectorError` 字段内容不译**。
- Toast：`message.success/error` 须走 `page.console.*` key。
- `parseApiError` / 本地 fallback（如「请求失败（status）」）须 i18n 或统一工具（见 open-questions Q4）。
- **不译：** 用户模型名、助手名、知识库 name/description/content、MCP 配置名、provider 枚举 key（ALYUN 等）、`ADMIN_USER` 字面量。

**ProTable 列定义：** 建议 `getXxxColumns(t)` factory + `useMemo`（0.1.15 open-questions Q10 推荐项）。

**knowledge 预览链接：** `href="/knowledge/{id}"` → `/{locale}/knowledge/{id}`（预览页壳层 0.1.18 再 i18n，URL 须带 locale）。

### 模块 D：`/api/console/**` 错误 i18n

**范围（12 files）：**

| Route | 方法 | 主要 ErrorCode |
| --- | --- | --- |
| `profile/route.ts` | GET | UNAUTHORIZED, INTERNAL_ERROR |
| `profile/personal/route.ts` | PATCH | UNAUTHORIZED, VALIDATION_ERROR, AUTH_TEL_TAKEN, INTERNAL_ERROR |
| `profile/preference/route.ts` | PATCH | UNAUTHORIZED, VALIDATION_ERROR, MODEL_CONFIG_NOT_FOUND, INTERNAL_ERROR |
| `models/route.ts` | GET, POST | UNAUTHORIZED, VALIDATION_ERROR, INTERNAL_ERROR |
| `models/[id]/route.ts` | GET, PATCH, DELETE | UNAUTHORIZED, VALIDATION_ERROR, MODEL_CONFIG_NOT_FOUND, INTERNAL_ERROR |
| `assistants/route.ts` | GET, POST | UNAUTHORIZED, VALIDATION_ERROR, INTERNAL_ERROR |
| `assistants/[id]/route.ts` | GET, PATCH, DELETE | UNAUTHORIZED, VALIDATION_ERROR, ASSISTANT_NOT_FOUND, INTERNAL_ERROR |
| `assistants/[id]/knowledge-bases/route.ts` | GET, PUT | UNAUTHORIZED, VALIDATION_ERROR, ASSISTANT_NOT_FOUND |
| `assistants/[id]/mcp-configs/route.ts` | GET, PUT | UNAUTHORIZED, VALIDATION_ERROR, ASSISTANT_NOT_FOUND |
| `mcp-configs/route.ts` | GET, POST | UNAUTHORIZED, VALIDATION_ERROR, MCP_*, INTERNAL_ERROR |
| `mcp-configs/[id]/route.ts` | GET, PATCH, DELETE | UNAUTHORIZED, VALIDATION_ERROR, MCP_*, INTERNAL_ERROR |
| `mcp-configs/[id]/test-connection/route.ts` | POST | UNAUTHORIZED, VALIDATION_ERROR, RATE_LIMITED, MCP_CONFIG_NOT_FOUND |

**机制（延续 0.1.14/0.1.15）：** 各 handler 顶部 `const locale = await resolveRequestLocale(request)`（或 sync 等价）；`jsonError(code, tApiMessage(locale, key, params), status, details?)`。

**ErrorCode → `api/message.json` key 映射（本期须补全）：**

| ErrorCode | message key | 备注 |
| --- | --- | --- |
| `UNAUTHORIZED` | `unauthorized` | 已有 |
| `RATE_LIMITED` | `rateLimited` | 已有；MCP test-connection 复用 |
| `VALIDATION_ERROR`（通用） | `validationError` | 已有；details 内 field message 见下 |
| `AUTH_TEL_TAKEN` | `authTelTaken` | 已有 |
| `MODEL_CONFIG_NOT_FOUND` | `modelConfigNotFound` | **新增** |
| `ASSISTANT_NOT_FOUND` | `assistantNotFound` | 已有 |
| `MCP_CONFIG_NOT_FOUND` | `mcpConfigNotFound` | **新增** |
| `MCP_CONFIG_NAME_CONFLICT` | `mcpConfigNameConflict` | **新增** |
| `MCP_CONFIG_REFERENCED_BY_ASSISTANT` | `mcpConfigReferencedByAssistant` | **新增** |
| `MCP_CREDENTIALS_ENCRYPTION_UNAVAILABLE` | `mcpCredentialsEncryptionUnavailable` | **新增** |
| `INTERNAL_ERROR`（通用） | `internalError` | **新增** |
| `INTERNAL_ERROR`（加载 profile） | `loadFailed` | **新增** |
| `INTERNAL_ERROR`（保存失败） | `saveFailedRetry` | **新增** |
| `INTERNAL_ERROR`（用户不存在） | `userNotFound` | **新增**（console 上下文） |
| `INTERNAL_ERROR`（密钥加密失败） | `credentialEncryptionFailed` | **新增** |
| `INTERNAL_ERROR`（服务端配置异常） | `serverConfigCannotSaveSecrets` | **新增** |

**`validation.*` 子 key 扩展（console 域高频）：**

| 场景 | 建议 key |
| --- | --- |
| 请求体须为 JSON | `validation.invalidJson`（已有） |
| id 无效 | `validation.invalidId`（**新增**） |
| 请求参数不合法（顶层） | `validation.invalidParams`（**新增**） |
| 不能为空 | `validation.required`（**新增**） |
| 须为字符串 / null | `validation.stringOrNull`（**新增**） |
| 邮箱不可修改 | `validation.emailImmutable`（**新增**） |
| 不能在控制台创建系统助手 | `validation.systemAssistantNotCreatable`（**新增**） |
| provider 枚举 | `validation.invalidModelProvider`（**新增**） |
| MCP/KB 关联无效 | `validation.invalidMcpConfigIds` / `validation.invalidKnowledgeBaseIds`（**新增**） |
| MCP 名称上限 | `validation.mcpConfigLimitReached`（**新增**） |
| 至少需要一个偏好字段 | `validation.preferenceFieldRequired`（**新增**） |
| 请至少提供 nickName 或 telNo | `validation.profileFieldRequired`（**新增**） |

**details 数组内 `field.message`：** 须改为 `tApiMessage(locale, key)` 或有限枚举 key（与 admin Q7 策略一致，console 批次实施）。

**非 JSON 响应字段：** `test-connection` 成功/失败时写入 `lastErrorSummary` 的用户可见字符串（如「凭证解密失败…」）若展示于 UI，须纳入 i18n 或 API 返回已翻译文案（见 open-questions Q5）。

### 模块 E：与 0.1.15 共享 infra 复用

| 能力 | 0.1.15 落点 | 0.1.16 Console 用法 |
| --- | --- | --- |
| `getAntdLocale` / `getDayjsLocaleName` | `src/common/utils/antd-locale.ts` | `ConsoleShell` ConfigProvider + dayjs |
| `LanguageSwitcher` | `components/home/LanguageSwitcher.tsx`，chat `variant="shell"` | ConsoleShell `actionsRender`，namespace `page.console.shell` |
| `UserAvatarMenu` shell | `page/shell.json` `userMenu.*` | 直接复用，variant="shell" |
| `ConfirmProvider` / `confirm` / `modal-shell` | `page/shell.json` `confirm.*` | 子页危险操作确认框默认按钮 |
| `ConsoleForbiddenNotice` | `page/shell.json` + `useCookieAppLocale` | 迁入 `[locale]` 后改用 `useTranslations('page.shell')` 或 next-intl locale |
| `withReadOnlyApi` | `tApiMessage('readOnlyAccountBlocked')` | 无需改动；console 写 API 已包装 |
| `resolveRequestLocale` / `tApiMessage` | `src/server/i18n/*` | 全部 console API routes |
| Chat layout 鉴权模式 | `[locale]/chat/layout.tsx` | 复制模式至 `[locale]/console/layout.tsx` |
| Legacy redirect | `handleLegacyChatRedirect` | 新增 `handleLegacyConsoleRedirect` |

**`src/i18n/request.ts` 扩展：** 动态 import `page/console/*.json`，挂载为 `messages.page.console.{shell,profile,...}`；console 页仅加载 console 命名空间（不加载 chat/admin message）。

### 模块 F：跨页链接更新（console 批次责任）

| 位置 | 现网 | 目标 |
| --- | --- | --- |
| `ConsoleShell` 对话链接 | `/chat` | `/{locale}/chat` |
| `PunkLanding` 控制台 | `/console` | `/{locale}/console/profile` |
| `ChatWorkspace` 控制台入口 | 裸 `/console`（0.1.15 deviation D1） | `/{locale}/console/profile` |
| `AdminShell` 控制台 | `/console` | **可选** 0.1.16 一并改或留 0.1.17（见 open-questions Q3） |
| console 子页内 Link | 裸 `/console/...` | locale 感知 |
| admin users 无权跳转 | `/console?notice=admin_forbidden` | `/{locale}/console?notice=admin_forbidden`（admin 页改链可延至 0.1.17，但 console 须能正确展示 query） |

## i18n 方案约束（延续）

1. next-intl；locale 前缀 `always`；非法 locale → `/en`；`localeDetection: false`。
2. key 分组 `page.console.*` / `api.message.*`；英文 camelCase；`en` 为语义源。
3. API 路径不加 locale；服务端 cookie/header 解析。
4. Server + Client 共用 message 源；console 页走 `[locale]/layout.tsx` `NextIntlClientProvider`。
5. ProComponents 内置文案依赖 antd `ConfigProvider locale`；列头/label 由 `page.console.*` 提供。

## message 文件组织

**推荐（0.1.15 open-questions Q8 选项 B）：**

```
messages/{en,zh}/page/console/
  shell.json
  profile.json
  models.json
  assistants.json
  knowledge.json
  mcp.json
  settings.json
```

**命名空间：** `page.console.shell.title`、`page.console.profile.form.nickName` 等。

**与 `page/shell.json` 分工：**

- 跨 Shell 共用（Confirm、UserMenu、Forbidden）：保留 `page/shell.json`。
- Console 特有（标题「控制台」、菜单项、子页文案）：`page/console/*.json`。

**不采用：** 单文件 `page/console.json`（体量将超过 chat，不利并行编辑）。

## 非功能需求

| 类别 | 要求 |
| --- | --- |
| 安全 | 错误文案不泄露敏感信息；`MODEL_CONFIG_NOT_FOUND` 等统一 404 |
| 可访问性 | `html lang` 随 locale；表单 `aria-*` 与错误语言一致 |
| 性能 | 按 locale 增量加载 console message；chat 页不加载 console json |
| 兼容 | 旧 `/console/**` 302；外部文档裸路径可用 |
| 视觉 | `LanguageSwitcher` 融入 ProLayout 顶栏 actionsRender |
| 测试 | 中英冒烟：6 子页主流程 + 典型 API 错误 + locale 切换 + legacy redirect |

## 待设计项清单

| # | 项 | 说明 |
| --- | --- | --- |
| D1 | Console 英文文案 | 各 ProTable 列头、表单、MCP 凭证说明、向量状态 Tag |
| D2 | Shell 顶栏布局 | `LanguageSwitcher` 与「对话」、UserAvatarMenu 排布 |
| D3 | message key 树 | `page.console.*` 层级约定（shell.menu.profile 等） |
| D4 | Provider 标签英文 | ALYUN/GLM 等展示名 vs 枚举 key |
| D5 | validation details | field 级 message 是否全部 key 化或顶层 message 即可 |
| D6 | knowledge 页 API 错误过渡 | knowledge-bases API 未 i18n 时的 UX 说明 |
| D7 | Forbidden notice | 继续 `page.shell` vs 迁至 `page.console.shell` |

## 风险与依赖

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 子页体量大（knowledge 89、mcp 82） | 漏翻 | 按子页 AC 分批验收；grep 中文残留 |
| ProTable 列头动态定义 | 重构面广 | factory + `useTranslations` |
| knowledge 页调 knowledge-bases API | 英文 UI + 中文 API 错误 | PRD 标注已知限制；0.1.18 补齐 API |
| 多处裸 `/login?redirect=` | 登录后 locale 丢失 | 统一 locale 解析工具 |
| ConsoleForbiddenNotice cookie vs pathname | locale 与 URL 不一致 | 迁入 next-intl 后以 URL locale 为准 |
| admin 跳链仍裸 `/console` | query 丢失 locale | 0.1.16 至少 console 端兼容；admin 改链可协同 |

**依赖：**

- 0.1.15 已交付的 chat i18n、shared infra、`handleLegacyChatRedirect` 模式。
- 设计提供各子页英文文案（可与实现并行，key 结构先定）。

## 验收要点（0.1.16）

1. `/en/console/profile`、`/zh/console/models` 等可访问；metadata 与 UI 语言正确。
2. `/console/**` → 302 至带 locale 路径；query 保留。
3. 未登录访问 console → `/{locale}/login?redirect=/{locale}/console/...`。
4. `ConsoleShell`：标题、菜单、加载态、skip link、对话链、LanguageSwitcher、antd/dayjs 联动。
5. 六子页（profile/models/assistants/knowledge/mcp/settings）用户可见文案 100% key 化。
6. `messages/{en,zh}/page/console/*.json` 与扩展后的 `api/message.json` 已填充。
7. `/api/console/**` 全部 route 错误 message 双语；backend 文档含 ErrorCode 映射表。
8. 从 `/en/chat` 进入 console 全程英文（**除 knowledge-bases API 错误——已知限制**）。
9. 控制台 CRUD + MCP 测试连接冒烟通过。
10. `console` 已从 `KNOWN_APP_SEGMENTS` 移除。

## 关联文档

- 用户故事：`user-stories-console.md`、`user-stories-api-i18n.md`
- 待确认项：`open-questions.md`
- 上游：`iterations/0.1.15/product/prd.md` 及子文档
- 路由/共享 infra 参考：`iterations/0.1.15/product/user-stories-routing-locale.md`、`user-stories-shared-infra.md`
