# 共享 i18n 基础设施 — Admin Shell 接入（version 0.1.17）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.17` |
| 范围 | AdminShell 接入 0.1.15/0.1.16 已落地共享能力 |
| 上游 | `0.1.16/design/spec-shared-infra-console.md`、`design-spec-i18n-admin.md` |
| 决策 | Q5-A 服务端鉴权；Q7-A Forbidden 继续 `page.shell` |

---

## 1. 复用矩阵（0.1.16 Console → 0.1.17 Admin）

| 能力 | 0.1.16 落点 | 0.1.17 Admin 用法 |
| --- | --- | --- |
| `getAntdLocale` / `getDayjsLocaleName` | `antd-locale.ts` | AdminShell `ConfigProvider`；删除 `zhCN` 硬编码 |
| `DayjsLocaleSync` | `[locale]/layout.tsx` | Admin 继承；删除 Shell 内 `dayjs.locale("zh-cn")` |
| `LanguageSwitcher` | `LanguageSwitcher.tsx` | `namespace="page.admin.shell"`、`variant="shell"` |
| `UserAvatarMenu` | `page/shell.json` | `variant="shell"` |
| `ConfirmProvider` | `page.shell.confirm.*` | 子页危险操作传 `page.admin.*.confirm.*` |
| `parseApiError` | `parse-api-error.ts` | `useTranslations('page.admin.shell')` |
| Console layout 鉴权 | `[locale]/console/layout.tsx` | 复制模式至 `[locale]/admin/layout.tsx` + `gateAdminPageAccess` |
| Legacy redirect | `handleLegacyConsoleRedirect` | 新增 `handleLegacyAdminRedirect`、`handleLegacyKnowledgeRedirect` |
| Forbidden notice | `ConsoleForbiddenNotice` + `page.shell` | admin forbidden **redirect 目标**带 locale；组件本身不改 |
| `getConsoleForbiddenUrl` | —（新增） | layout + 子页 403 跳转 |

---

## 2. AdminShell 改造清单

### 2.1 移除 / 替换

| 现网 | 目标 |
| --- | --- |
| `import zhCN from "antd/locale/zh_CN"` | `getAntdLocale(locale)` |
| `dayjs.locale("zh-cn")` 模块级 | 删除 |
| `adminHeaderTitleText = "管理后台"` | `t('title')` |
| 加载态「验证会话…」+ `/api/auth/me` | **删除**（Q5-A） |
| `href="/chat"`、`href="/console"` | next-intl `Link` → `/chat`、`/console/profile` |
| `route.path: "/admin"` + 静态中文 routes | `getAdminMenuRoutes(t)` |
| `loginRedirectTarget()` | 删除（鉴权上移 layout） |
| `UserAvatarMenu` 无 variant | `variant="shell"` |
| `import Link from "next/link"` | `@/i18n/navigation` 的 `Link` |

### 2.2 新增

| 项 | 说明 |
| --- | --- |
| `displayName: string` prop | layout 传入 |
| `useLocale()` | `AppLocale` |
| `useTranslations('page.admin.shell')` | Shell 文案 |
| `LanguageSwitcher` | actionsRender **首位** |
| `getAdminMenuRoutes(t)` | `admin-menu.tsx` factory |

### 2.3 Props 签名（定稿）

```typescript
export default function AdminShell({
  children,
  displayName,
}: {
  children: React.ReactNode;
  displayName: string;
}) {
```

与 `ConsoleShell` 对齐；**无** `user` 对象、**无** 客户端 session state。

### 2.4 ConfigProvider 层级

内层 `ConfigProvider locale={getAntdLocale(locale)} theme={shellDarkTheme}` 嵌套于 `[locale]/layout` 外层，与 ConsoleShell 一致。

---

## 3. LanguageSwitcher — Admin 接入

### 3.1 Props 扩展

```typescript
type SwitcherNamespace =
  | "page.home"
  | "page.login"
  | "page.register"
  | "page.chat"
  | "page.console.shell"
  | "page.admin.shell";  // 新增

<LanguageSwitcher namespace="page.admin.shell" variant="shell" />
```

### 3.2 `page.admin.shell.json` 必填块

须含完整 `langSwitcher.*`（结构与 `page.console.shell` 一致），见 `copy-admin-en-zh.md` §1.4。

---

## 4. Forbidden 与 admin 入站（Q3-A / Q7-A）

### 4.1 文案源

**不变：** `page.shell.forbiddenNotice.*`（由 **Console** 页 `ConsoleForbiddenNotice` 展示）。

Admin layout **不渲染** ForbiddenNotice；非管理员在 **进入 admin 前** 被 redirect 至 console。

### 4.2 Redirect 目标（本期修正）

| 之前 | 之后 |
| --- | --- |
| `/console?notice=admin_forbidden` | `/${locale}/console?notice=admin_forbidden` |

console 根路径 redirect profile 时**保留** `notice` query（0.1.16 已实现）。

### 4.3 子页 API 403

客户端 `window.location.replace(getConsoleForbiddenUrl(locale))` → 同上 URL → Console 展示 Forbidden。

---

## 5. UserAvatarMenu

```tsx
<UserAvatarMenu variant="shell" displayName={displayName} />
```

登出 → `/${locale}/login`（组件内已 locale 感知，回归验证）。

---

## 6. ConfirmProvider / 危险操作

| 默认按钮 | 来源 |
| --- | --- |
| 未传 ok/cancel | `page.shell.confirm.ok` / `cancel` |
| 标题/描述 | `page.admin.{module}.confirm.*` |

---

## 7. parseApiError（继承 Q4-A）

```typescript
const tShell = useTranslations("page.admin.shell");
const msg = await parseApiError(res, (key, values) => tShell(key, values));
```

| key | 场景 |
| --- | --- |
| `errors.requestFailed` | 无 API message |
| `errors.networkRetry` | catch 网络异常 |

各子页删除内联 `` `请求失败（${status}）` `` 与「网络异常，请稍后重试」硬编码。

---

## 8. Provider 树（Admin 子树）

```
ConfirmProvider
└── [locale]/layout
    └── NextIntlClientProvider
        └── ConfigProvider + DayjsLocaleSync
            └── [locale]/admin/layout     ← gateAdminPageAccess
                └── AntdRegistry
                    └── AdminShell
                        └── ConfigProvider (shellDarkTheme)
                            └── ProLayout + pages
```

**对比 Console：** Admin **无** `ConsoleForbiddenNotice` 于 Shell 内（forbidden 在 layout 层 redirect）。

---

## 9. 验收要点

| # | 项 | 期望 |
| --- | --- | --- |
| 1 | `/en/admin` ProTable 分页 | 英文 |
| 2 | LanguageSwitcher | 在「对话」左侧；样式同 console |
| 3 | 切换 `/en` ↔ `/zh` | URL 与子路径保持 |
| 4 | 无「验证会话…」闪屏 | 服务端 layout 已鉴权 |
| 5 | 顶栏控制台 | → `/en/console/profile` |
| 6 | 非管理员进 admin | → `/zh/console?notice=admin_forbidden` + 中文 Forbidden |
| 7 | UserAvatarMenu 登出 | → `/en/login` |
