# 共享 i18n 基础设施 — Console Shell 接入（version 0.1.16）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.16` |
| 范围 | ConsoleShell 接入 0.1.15 已落地共享能力 |
| 上游 | `0.1.15/design/spec-shared-infra-i18n.md`、`design-spec-i18n-console.md` |
| 决策 | Q7-A Forbidden 继续 `page.shell`；Q10-A 服务端鉴权 |

---

## 1. 复用矩阵（0.1.15 → 0.1.16）

| 能力 | 0.1.15 落点 | 0.1.16 Console 用法 |
| --- | --- | --- |
| `getAntdLocale` / `getDayjsLocaleName` | `src/common/utils/antd-locale.ts` | `ConsoleShell` `ConfigProvider`；**移除**硬编码 `zhCN` |
| `DayjsLocaleSync` | `[locale]/layout.tsx` | Console 继承，Shell **不再** `dayjs.locale("zh-cn")` |
| `LanguageSwitcher` | `components/home/LanguageSwitcher.tsx` | `actionsRender`；`namespace="page.console.shell"`、`variant="shell"` |
| `UserAvatarMenu` shell | `page/shell.json` | `variant="shell"`；登出 → `/${locale}/login` |
| `ConfirmProvider` / `confirm` | `page/shell.json` `confirm.*` | 子页危险操作传入 `page.console.*.confirm.*` 标题/内容 |
| `modal-shell` | `page.shell.modal.closeOverlay` | 若子页使用 `ModalShell` |
| `ConsoleForbiddenNotice` | `page/shell.json` + cookie | 改为 `useTranslations('page.shell')` + **URL locale** |
| `withReadOnlyApi` | `tApiMessage('readOnlyAccountBlocked')` | 回归验证；无改动 |
| `resolveRequestLocale` / `tApiMessage` | `src/server/i18n/*` | 全部 `/api/console/**` routes |
| Chat layout 鉴权模式 | `[locale]/chat/layout.tsx` | 复制至 `[locale]/console/layout.tsx` |
| Legacy redirect | `handleLegacyChatRedirect` | 新增 `handleLegacyConsoleRedirect` |

---

## 2. ConsoleShell 改造清单

### 2.1 移除 / 替换

| 现网 | 目标 |
| --- | --- |
| `import zhCN from "antd/locale/zh_CN"` | `getAntdLocale(locale)` |
| `dayjs.locale("zh-cn")` 模块级 | 删除；依赖 layout `DayjsLocaleSync` |
| `consoleHeaderTitleText = "控制台"` | `useTranslations('page.console.shell')` → `t('title')` |
| 加载态「验证会话…」+ `/api/auth/me` | Q10-A：删除客户端鉴权；可选删除全屏加载 |
| `href="/chat"` | `/${locale}/chat` |
| `route.path: "/console"` | `/${locale}/console` |
| `consoleMenuRoutes` 静态中文 path | `getConsoleMenuRoutes(locale, t)` |
| `loginRedirectTarget()` 裸路径 | 删除（鉴权上移 layout） |
| `UserAvatarMenu` 无 variant | `variant="shell"` |

### 2.2 新增

| 项 | 说明 |
| --- | --- |
| `useLocale()` | 解析当前 locale |
| `LanguageSwitcher` | 顶栏第一位（对话链之前） |
| `useTranslations('page.console.shell')` | Shell 文案 |
| skip link | `t('skipToMain')` |

### 2.3 ConfigProvider 层级

**定稿：** Shell 内保留 `ConfigProvider locale={getAntdLocale(locale)} theme={shellDarkTheme}`，与 `[locale]/layout` 外层 **嵌套**（内层覆盖确保 ProLayout 子树 antd 文案正确）。与现网行为一致，仅 locale 动态化。

---

## 3. LanguageSwitcher — Console 接入

### 3.1 Props（扩展）

```typescript
type SwitcherNamespace =
  | "page.home"
  | "page.login"
  | "page.register"
  | "page.chat"
  | "page.console.shell";  // 新增

<LanguageSwitcher namespace="page.console.shell" variant="shell" />
```

### 3.2 与 chat 对齐

| 属性 | chat | console |
| --- | --- | --- |
| `variant` | `shell` | `shell` |
| 触发器样式 | `text-zinc-400/90` → `hover:text-cyan-200/90` | **相同** |
| 切换 API | `router.replace(pathname, { locale })` | **相同** |
| query | 保留 | 保留（含 `notice=admin_forbidden`） |

### 3.3 `page.console.shell.json` 必填块

须含完整 `langSwitcher.*`（与 `page.chat` 结构一致），供 Switcher 读取。

---

## 4. ConsoleForbiddenNotice（Q7-A）

### 4.1 文案源

**继续** `page.shell.forbiddenNotice.*`（**不**复制到 `page.console.shell`）。

| key | 用途 |
| --- | --- |
| `page.shell.forbiddenNotice.body` | 主文案 |
| `page.shell.forbiddenNotice.bodySuffix` | 句末标点 |
| `page.shell.forbiddenNotice.stayOnPage` | 留在当前页 |
| `page.shell.forbiddenNotice.dismiss` | 知道了 |

### 4.2 Locale 来源（定稿）

| 之前 | 之后 |
| --- | --- |
| `useCookieAppLocale()` + `getPageShellMessages(locale)` | `useTranslations('page.shell')` |
| cookie 与 URL 可能不一致 | **URL pathname locale 为准**（next-intl 自动） |

**移除：** `useCookieAppLocale`、`getPageShellMessages` 在 Forbidden 组件中的使用。

### 4.3 行为不变

- 触发：`searchParams.notice === 'admin_forbidden'`
- dismiss：`router.replace` 去掉 `notice` query
- `ADMIN_USER`：字面量 `<code>` 不译
- LanguageSwitcher 切换时：若 notice 未 dismiss，**仍显示**（query 保留）

### 4.4 admin 入站链（Q3-B）

- 0.1.17 前 admin 可能仍跳 `/console?notice=...`（裸路径）
- middleware legacy redirect → `/{locale}/console?notice=...`
- console 页 redirect profile 时**保留** `notice` query（`[locale]/console/page.tsx`）

---

## 5. UserAvatarMenu（shell 变体）

0.1.15 已 i18n；Console 仅确保：

```tsx
<UserAvatarMenu variant="shell" displayName={displayName} />
```

| 项 | 行为 |
| --- | --- |
| 文案 | `page.shell.userMenu.*` |
| 登出后 | `router.replace(\`/${locale}/login\`)` |

---

## 6. ConfirmProvider / 危险操作

子页 Popconfirm / `confirm()` **显式传入**双语文案：

| 默认按钮 | 来源 |
| --- | --- |
| 未传 `okText`/`cancelText` | `page.shell.confirm.ok` / `cancel` |
| 标题/描述 | `page.console.{module}.confirm.*` |

**示例：** 删除模型 `confirm.deleteModel.title`、`confirm.deleteModel.description`（ICU 含 `{name}`）。

---

## 7. `parseApiError` 与 shell.errors（Q4-A）

共享工具读取 `page.console.shell.errors`：

| key | 调用场景 |
| --- | --- |
| `errors.requestFailed` | API 无 message |
| `errors.networkRetry` | `catch` 网络异常 |

各子页统一 `useTranslations('page.console.shell')` 传入 `parseApiError`，或工具接受 `tShell` 回调。

---

## 8. `src/i18n/request.ts`

在 0.1.15 基础上追加 console 子树动态 import（见 `design-spec-i18n-console.md` §3.1）。

**注意：** `page.shell` 仍全局加载；`page.console.*` 随 request config 一并注入（next-intl 单 config 模式下载入全部 page 命名空间——与 chat 批次相同；若未来按路由拆分 loader，console 仅 `/console` 路由加载）。

---

## 9. Provider 树（Console 子树）

```
ConfirmProvider
└── [locale]/layout
    └── NextIntlClientProvider
        └── ConfigProvider (antd en_US|zh_CN)
            └── DayjsLocaleSync
                └── [locale]/console/layout  ← 服务端鉴权
                    └── AntdRegistry
                        └── ConsoleShell
                            └── ConfigProvider (antd, shellDarkTheme)  ← 内层
                                └── ProLayout + pages
```

---

## 10. 验收要点

| # | 项 | 期望 |
| --- | --- | --- |
| 1 | `/en/console` ProTable 分页 | 英文「/ page」等 |
| 2 | 切换 `/en` ↔ `/zh` | dayjs `YYYY-MM-DD HH:mm` 格式不变（数字） |
| 3 | LanguageSwitcher | 在「对话」左侧；样式同 chat |
| 4 | UserAvatarMenu 登出 | → `/en/login` |
| 5 | `?notice=admin_forbidden` | 英文 URL 下 Forbidden 英文 |
| 6 | 切换语言保留 notice | 未 dismiss 仍显示 |
| 7 | dismiss | 去掉 notice query |
| 8 | 只读账号写 API | `readOnlyAccountBlocked` 英文 |
