# 设计说明 — 管理后台 i18n（version 0.1.17）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.17` |
| 阶段 | 设计（阶段 2） |
| 上游 | `iterations/0.1.17/product/prd.md`、用户故事、`open-questions.md` |
| 风格基线 | `iterations/0.1.16/design/design-spec-i18n-console.md` |
| 文案终稿 | `copy-admin-en-zh.md` |
| API 文案 | `spec-api-message-admin.md` |
| 路由规格 | `spec-routing-locale-admin-knowledge.md` |
| 共享 infra | `spec-shared-infra-admin.md` |

---

## 1. 已确认 / 设计定稿决策

| 编号 | 决策 | 设计落点 |
| --- | --- | --- |
| **Q1-A** | 全量 admin + knowledge-bases API | 本文档全范围 |
| **Q2-B** | GET 坏 JSON 前端 `fileState` 映射 Alert | §6 |
| **Q3-A** | admin→console 跨页链 locale 化 | §2.3、`spec-routing` §5 |
| **Q4-B** | prompt-config `tmpl.message` → 有限 validation key | `spec-api-message-admin` §4 |
| **Q5-A** | 服务端 layout 鉴权 + 简化 Shell | §2.2 |
| **Q6-B** | `page/admin/*.json` 按子模块拆分 | §3 |
| **Q7-B** | 复用 `validation.invalidId` | API spec |
| **Q8-B** | `getXxxColumns(t)` factory | §5 |
| **Q9-A** | `getConsoleForbiddenUrl(locale)` helper | `spec-routing` §5.2 |
| **Q10-B** | layout 构造 login redirect；移除 `x-admin-login-redirect` | `spec-routing` §4.4 |

**继承 0.1.14–0.1.16：** 默认语言 `en`；`localeDetection: false`；API 方案 A；`parseApiError`；Forbidden 继续 `page.shell.forbiddenNotice`；menu path **不含 locale**（next-intl `Link` 自动前缀）。

---

## 2. 信息架构与路由（摘要）

### 2.1 路由树（本期变更）

```
/en/admin/config、/zh/admin/users  …  → 管理后台各子页
/admin、/admin/*                     → 302 → /{resolvedLocale}/admin/*
/en/knowledge/{id}                   → 知识库预览（见 knowledge 设计说明）
/api/admin/**、/api/knowledge-bases/** → 无 locale 前缀
```

完整 middleware / redirect 见 **`spec-routing-locale-admin-knowledge.md`**。

### 2.2 Layout 与鉴权（Q5-A / Q10-B 定稿）

| 项 | 定稿 |
| --- | --- |
| 管理后台 layout | **新建** `src/app/[locale]/admin/layout.tsx` |
| 鉴权 | **服务端** `gateAdminPageAccess()`；未登录 → `redirect(\`/${locale}/login?redirect=${fullPath}\`)` |
| 非管理员 | `redirect(getConsoleForbiddenUrl(locale))` |
| Provider | 继承 `[locale]/layout.tsx` 的 `NextIntlClientProvider` |
| Shell 内鉴权 | **移除** 客户端 `/api/auth/me` 轮询与「验证会话…」全屏 |
| Shell props | layout 传入 `displayName`（对齐 `ConsoleShell`） |
| 旧目录 | **删除** `src/app/admin/` 树 |
| metadata | 各子页 `generateMetadata` + `getTranslations('page.admin.{module}')` |

**目标文件结构：**

```
src/app/
  [locale]/
    admin/
      layout.tsx              # gateAdminPageAccess + AdminShell
      page.tsx                # redirect → /admin/config（path 无 locale）
      config/page.tsx
      users/page.tsx
      models/page.tsx
      prompts/page.tsx
      logs/page.tsx
      assistants/page.tsx
      admin-menu.tsx          # getAdminMenuRoutes(t)
      AdminShell.tsx
  admin/                      # 删除
```

**index redirect：** `[locale]/admin/page.tsx` 使用 `redirect({ href: '/admin/config', locale })`（next-intl）或等价 `/${locale}/admin/config`。

### 2.3 跨页 locale 链路（Q3-A）

| 场景 | 行为 |
| --- | --- |
| `/en/console/profile` → 管理后台 | 外链或书签 `/en/admin/config`；Shell 英文 |
| `/en/admin/users` 切中文 | `/zh/admin/users`（query 保留） |
| 未登录 `GET /admin/users` | 302 `/en/admin/users` → `/en/login?redirect=/en/admin/users` |
| 非管理员 `GET /zh/admin/config` | redirect `/zh/console?notice=admin_forbidden` |
| AdminShell「控制台」 | `/{locale}/console/profile`（**非**裸 `/console`） |
| AdminShell「对话」 | `/{locale}/chat` |
| 子页 API 403 | `window.location.replace(getConsoleForbiddenUrl(locale))` |
| config → prompts 内链 | next-intl `Link href="/admin/prompts"` |

---

## 3. message 组织与 key 树（Q6-B）

### 3.1 文件与命名空间

```
messages/{en,zh}/page/admin/
  shell.json       → page.admin.shell.*
  config.json      → page.admin.config.*
  users.json       → page.admin.users.*
  models.json      → page.admin.models.*
  prompts.json     → page.admin.prompts.*
  logs.json        → page.admin.logs.*
  assistants.json  → page.admin.assistants.*
```

**`src/i18n/request.ts` 扩展：**

```typescript
messages: {
  page: {
    // …home, login, chat, shell, console
    admin: {
      shell: shell.default,
      config: config.default,
      users: users.default,
      models: models.default,
      prompts: prompts.default,
      logs: logs.default,
      assistants: assistants.default,
    },
    knowledge: knowledge.default,  // 预览页，见 knowledge 设计说明
  },
  api: { message: apiMessage.default },
}
```

**加载策略：** 与 console 批次相同——request config 注入 admin 子树；非 admin 路由不额外加载（next-intl 单 config 模式）。

### 3.2 key 树约定（`page.admin.*`）

| 前缀 | 用途 | 示例 |
| --- | --- | --- |
| `meta.*` | `generateMetadata` | `meta.title`、`meta.description` |
| `langSwitcher.*` | LanguageSwitcher（**仅 shell.json**） | `langSwitcher.ariaLabel` |
| `menu.*` | 侧栏六项（**仅 shell.json**） | `menu.config`、`menu.users` |
| `title` | PageContainer 标题 | `title` |
| `subTitle` | PageContainer 副标题 | `users.subTitle` |
| `columns.*` | Table/ProTable 列头与列内固定文案 | `columns.email`、`columns.actions.resetPassword` |
| `form.*` | ProForm / Modal / Drawer | `form.enabled.label`、`form.enabled.hint` |
| `toolbar.*` | 新建、刷新、搜索 | `toolbar.createPublicModel` |
| `modal.*` | Modal 标题、按钮、正文 | `modal.resetPassword.title` |
| `confirm.*` | `modal.confirm` / Popconfirm 内容 | `confirm.disableUser.title` |
| `toast.*` | message.success/error | `toast.saved` |
| `errors.*` | 客户端 fallback（**shell.json 共用**） | `errors.networkRetry` |
| `alert.*` | Alert 横幅 | `alert.invalidJsonFile` |
| `tag.*` | 状态 Tag | `tag.readOnly`、`tag.public` |
| `provider.*` | 模型 Provider 展示名 | `provider.aliyun` |
| `fileState.*` | GET 坏 JSON 前端映射（Q2-B） | `fileState.invalidJson.title` |
| `hint.*` | 页脚说明、Tooltip | `hint.lockDistributed` |
| `lockRemain.*` | users 锁定剩余时间（D6） | `lockRemain.aboutMinutes`、`lockRemain.lessThanOneMinute` |

**与 `page/shell.json` 分工：**

| 归属 | 内容 |
| --- | --- |
| `page.shell` | Confirm 默认按钮、`UserAvatarMenu`、`ConsoleForbiddenNotice` |
| `page.admin.shell` | 管理后台标题、菜单、顶栏链、`langSwitcher`、`errors.*`（供 `parseApiError`） |
| `page.admin.{子页}` | 子页专属 UI |

**与 `page.console.*` 关系：** key 树**独立**；英文措辞可参考 console（models/assistants/provider），**不**共用 json 文件或 namespace。

### 3.3 Admin 术语 vs Console（D4 定稿）

| 概念 | Console（用户级） | Admin（系统级） |
| --- | --- | --- |
| 模型 | Models / 模型管理 | **Public models** / 模型管理（公有） |
| 助手 | Assistants / 助手管理 | **System assistants** / 系统助手管理 |
| 类型 Tag | Public / Private | **Public** / **System** |
| 删除影响文案 | 个人偏好 | 全站用户默认偏好清空 |

英文示例见 `copy-admin-en-zh.md` §4、§7。

---

## 4. Admin Shell 与顶栏（D2）

### 4.1 渲染树

```
RootLayout
└── ConfirmProvider                    # page.shell
    └── [locale]/layout.tsx
        └── NextIntlClientProvider + ConfigProvider + DayjsLocaleSync
            └── [locale]/admin/layout.tsx   # gateAdminPageAccess
                └── AntdRegistry
                    └── AdminShell (client, displayName from layout)
                        └── ProLayout
                            ├── 侧栏 menu（path 无 locale 前缀）
                            ├── actionsRender: LanguageSwitcher → Chat → Console → UserAvatarMenu
                            └── main: children（无 ForbiddenNotice——forbidden 在 layout redirect）
```

### 4.2 顶栏 actionsRender 顺序（对齐 ConsoleShell）

```
┌────────────────────────────────────────────────────────────────────────────┐
│  [Brand] 管理后台      [ English ▾ ]  💬 对话  ⚙ 控制台   [Avatar ▾]        │
├──────────┬─────────────────────────────────────────────────────────────────┤
│ 侧栏菜单 │  子页内容                                                        │
└──────────┴─────────────────────────────────────────────────────────────────┘
```

| 元素 | message key | href |
| --- | --- | --- |
| LanguageSwitcher | `page.admin.shell.langSwitcher.*` | — |
| 对话 | `chatLink` | `/chat`（Link 自动加 locale） |
| 控制台 | `consoleLink` | `/console/profile` |
| UserAvatarMenu | `page.shell.userMenu.*` | `variant="shell"` |

**Shell 标题：** `page.admin.shell.title` — en: **Admin**；zh: **管理后台**。

### 4.3 侧栏菜单（六项）

`getAdminMenuRoutes(t)` — path **不含 locale**（与 `getConsoleMenuRoutes` 一致）：

| key | path | en | zh |
| --- | --- | --- | --- |
| config | `/admin/config` | Configuration | 配置管理 |
| users | `/admin/users` | Users | 用户管理 |
| models | `/admin/models` | Models | 模型管理 |
| prompts | `/admin/prompts` | Prompt templates | 提示词模版 |
| logs | `/admin/logs` | Logs | 日志查询 |
| assistants | `/admin/assistants` | System assistants | 系统助手管理 |

`ProLayout route.path`：`/admin`（无 locale）。`menuItemRender` 使用 `@/i18n/navigation` 的 `Link`。

---

## 5. 子页 UI 模式

### 5.1 ProTable / Table 列 factory（Q8-B）

| 子页 | 函数 | 文件建议 |
| --- | --- | --- |
| users | `getAdminUserColumns(t, ctx)` | `users/admin-user-columns.tsx` 或页内 |
| models | `getAdminModelColumns(t, ctx)` | 同 console 模式 |
| assistants | `getAdminAssistantColumns(t, ctx)` | 同 console 模式 |

`ctx` 含：`currentUserId`、`rowBusyId`、操作回调、`formatLockRemain` 等。

**useMemo：** `const columns = useMemo(() => getAdminUserColumns(t, ctx), [t, …ctxDeps])`。

### 5.2 通用客户端模式

| 能力 | 定稿 |
| --- | --- |
| API 错误展示 | `parseApiError(res, tShell)`，`tShell = useTranslations('page.admin.shell')` |
| 401 | `buildLocaleLoginRedirect(locale, pathname+search)` 或 `window.location.href` |
| 403 | `getConsoleForbiddenUrl(locale)` |
| Toast / Modal | `page.admin.{module}.toast.*` / `modal.*` / `confirm.*` |
| Popconfirm 按钮 | 显式 `okText`/`cancelText` 或依赖 antd locale + `page.shell.confirm` |
| 分页 `showTotal` | `t('pagination.total', { count: total })` |
| dayjs 列 | 继承 `DayjsLocaleSync`；格式串 `YYYY-MM-DD HH:mm` 不变 |

### 5.3 users 相对时间（D6）

**定稿：** 分 key + ICU 参数（非运行时拼接中文）。

```typescript
function formatLockRemain(t: TFn, remainingMs: number): string {
  const mins = Math.ceil(remainingMs / 60_000);
  return mins >= 1
    ? t('lockRemain.aboutMinutes', { minutes: mins })
    : t('lockRemain.lessThanOneMinute');
}
```

| key | en | zh |
| --- | --- | --- |
| `lockRemain.aboutMinutes` | ~{minutes} min left | 约 {minutes} 分钟 |
| `lockRemain.lessThanOneMinute` | Less than 1 min | 不到 1 分钟 |

### 5.4 logs 页（体量小）

保持 `ProModulePlaceholder`；文案走 `page.admin.logs.*`。无表格、无 API 调用。后续扩展时复用列 factory 约定。

### 5.5 models / assistants

- Provider 选项：`getModelProviderOptions(t)`（可复用 `model-provider-ui.ts` 模式，message 来自 `page.admin.models.provider.*`）。
- **不译：** `modelName`、助手 `name`/`prompt`/`openingMessage`、用户 email、日志 message、prompt 模版 `value`、provider 枚举 key `ALYUN` 等。

---

## 6. GET 坏 JSON Alert（Q2-B 定稿）

### 6.1 API 响应契约（成功体）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `fileState` | `"ok" \| "invalid_json"` | 机器可读状态 |
| `fileHint` | `string \| undefined` | **本期废弃用户可见用途**；可移除或仅 debug |
| `config` / `items` | 数据 | 回退默认后的配置 |

**服务端：** GET handler **不再**返回中文 `fileHint` 给用户展示；仅 `fileState: "invalid_json"`。

### 6.2 前端映射

| 子页 | fileState | Alert |
| --- | --- | --- |
| config | `invalid_json` | `t('fileState.invalidJson.title')` + `t('fileState.invalidJson.description')` |
| prompts | `invalid_json` | `t('fileState.invalidJson.title')` + `t('fileState.invalidJson.description')` |

key 定义见 `copy-admin-en-zh.md` §2.5、§5.3。

---

## 7. 子页状态说明（交互）

### 7.1 通用状态

| 状态 | 表现 |
| --- | --- |
| 默认 | 服务端 layout 已鉴权，Shell 直接渲染子页 |
| 加载 | Table `loading` / `Spin`；**无** Shell 级「验证会话…」 |
| 空态 | `locale.emptyText` 或 ProTable `locale.emptyText` |
| 列表错误 | `Alert` + 重试按钮 |
| 保存中 | 按钮 `loading`；表单 `disabled` |
| 行操作中 | 操作列 `loading={rowBusyId === row.id}` |
| 网络错误 | `toast` + `errors.networkRetry` fallback |

### 7.2 users 特化

| 交互 | 说明 |
| --- | --- |
| 自操作禁用 | 当前登录用户行：只读/启停/重置密码 `disabled` + Tooltip |
| 重置密码 Modal | 展示临时密码；复制成功/失败 toast；关闭后不可再看 |
| 搜索 | 邮箱/昵称；Enter 或点搜索触发 |

### 7.3 config / prompts

| 交互 | 说明 |
| --- | --- |
| 恢复默认 | config：表单回填常量；prompts：二次确认后回填内置默认 |
| 保存 | prompts：先表单校验 → 二次确认 Modal → PUT |
| 内链 | config 页脚链至 `/admin/prompts`（locale 感知 Link） |

---

## 8. 可访问性

| 项 | 要求 |
| --- | --- |
| `html lang` | `[locale]/layout` → `LocaleHtmlLang` |
| skip link | `page.admin.shell.skipToMain` |
| 表单错误 | 与界面语言一致 |
| prompts 说明按钮 | `aria-label={t('form.item.ariaViewDesc', { name: item.name })}` — **item.name 不译** |

---

## 9. 与需求 AC 映射

| Epic | 设计落点 |
| --- | --- |
| A 路由与 Shell | §2、`spec-routing`、`spec-shared-infra`、`copy` §1 |
| B config | §6、`copy` §2 |
| C users | §5.3、`copy` §3 |
| D models | §5.5、`copy` §4 |
| E prompts | §6、`copy` §5 |
| F logs | `copy` §6 |
| G assistants | §5.5、`copy` §7 |
| H metadata | §3、`copy` 各节 meta |

---

## 10. 实施顺序建议（前端）

1. 路由 + layout + Shell + menu + request.ts 注册
2. users（体量最大、403/parseApiError 模板）
3. config + prompts（Q2-B Alert）
4. models + assistants（列 factory + provider）
5. logs（占位文案）
6. 全站 grep 中文残留 + 冒烟

API 可与前端并行，见 `spec-api-message-admin.md`。
