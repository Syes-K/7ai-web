# 设计说明 — Admin + Knowledge 路由迁移与 locale 一致性（version 0.1.17）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.17` |
| 上游 | `prd.md` 模块 A/F/G、`user-stories-admin.md` Epic A |
| 前置 | `0.1.16/design/spec-routing-locale-console.md` |
| 决策 | Q3-A 跨页链；Q10-B layout 构造 login redirect |

---

## 1. 路由变更摘要

| 变更项 | 之前 | 之后 |
| --- | --- | --- |
| 管理后台页 | `src/app/admin/**` → `/admin/**` | `src/app/[locale]/admin/**` → `/{locale}/admin/**` |
| 知识库预览 | `src/app/knowledge/[id]` | `src/app/[locale]/knowledge/[id]` |
| 旧 URL | 直接渲染 | **302** → `/{resolvedLocale}/admin/**` 或 `/knowledge/**` |
| `KNOWN_APP_SEGMENTS` | 含 `admin`、`knowledge` | **移除** 二者 |
| 未登录 admin | `/login?redirect=/admin/...` | `/{locale}/login?redirect=/{locale}/admin/...` |
| 非管理员 admin | `/console?notice=admin_forbidden` | `/{locale}/console?notice=admin_forbidden` |

---

## 2. 旧 URL 重定向 — `/admin`

### 2.1 行为定稿

| 请求 | 响应 |
| --- | --- |
| `GET /admin` | **302** `/{resolvedLocale}/admin` |
| `GET /admin/users` 等 | **302** `/{resolvedLocale}/admin/users` 等 |
| query | **完整保留** |

### 2.2 实现

```typescript
function handleLegacyAdminRedirect(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const locale = resolveRequestLocale(request);
    const suffix = pathname.slice("/admin".length);
    const url = new URL(`/${locale}/admin${suffix}`, request.url);
    url.search = search;
    return NextResponse.redirect(url, 302);
  }
  return null;
}
```

---

## 3. 旧 URL 重定向 — `/knowledge/[id]`

```typescript
function handleLegacyKnowledgeRedirect(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/knowledge" || pathname.startsWith("/knowledge/")) {
    const locale = resolveRequestLocale(request);
    const suffix = pathname.slice("/knowledge".length);
    const url = new URL(`/${locale}/knowledge${suffix}`, request.url);
    url.search = search;
    return NextResponse.redirect(url, 302);
  }
  return null;
}
```

| 请求 | 响应 |
| --- | --- |
| `GET /knowledge/abc-uuid` | 302 `/en/knowledge/abc-uuid`（按 cookie） |
| `GET /knowledge`（若存在） | 302 `/en/knowledge` |

---

## 4. middleware 改造要点

### 4.1 处理顺序

```
非法 locale → legacy auth → legacy chat → legacy console
  → legacy admin → legacy knowledge → 受保护路径 → next-intl
```

### 4.2 `KNOWN_APP_SEGMENTS`（变更后）

```typescript
const KNOWN_APP_SEGMENTS = new Set([
  "api",
  // "admin",     ← 0.1.17 移除
  // "knowledge", ← 0.1.17 移除
]);
```

移除后 `/fr/admin` → 302 `/en`。

### 4.3 `isProtectedPath`（扩展）

```typescript
function isProtectedPath(pathname: string): boolean {
  // 裸路径（legacy redirect 优先处理）
  if (
    pathname.startsWith("/chat") ||
    pathname.startsWith("/console") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/knowledge") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/console") ||
    pathname.startsWith(AUTH_API_PREFIX)
  ) {
    return true;
  }
  if (/^\/(en|zh)\/chat(\/|$)/.test(pathname)) return true;
  if (/^\/(en|zh)\/console(\/|$)/.test(pathname)) return true;
  if (/^\/(en|zh)\/admin(\/|$)/.test(pathname)) return true;      // 新增
  if (/^\/(en|zh)\/knowledge(\/|$)/.test(pathname)) return true;  // 新增
  return false;
}
```

### 4.4 `[locale]/admin/layout.tsx` 鉴权（Q5-A / Q10-B）

**定稿：移除** middleware 对裸 `/admin` 设置 `x-admin-login-redirect` 的逻辑；locale 路径由 layout 构造完整 redirect。

```typescript
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getConsoleForbiddenUrl } from "@/common/utils/console-forbidden-url";
import { routing } from "@/i18n/routing";
import { gateAdminPageAccess } from "@/server/auth/admin";
import { userDisplayLabel } from "@/common/utils/user-display-label";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return null;

  const access = await gateAdminPageAccess();
  if (access === "login") {
    const h = await headers();
    const pathname = h.get("x-pathname") ?? h.get("x-invoke-path") ?? `/${locale}/admin/config`;
    // 推荐：middleware 或 next-intl 为 locale 路由设置 x-pathname；否则 fallback 默认子页
    const search = h.get("x-search") ?? "";
    redirect(`/${locale}/login?redirect=${encodeURIComponent(`${pathname}${search}`)}`);
  }
  if (access === "forbidden") {
    redirect(getConsoleForbiddenUrl(locale));
  }

  const reqCtx = await getRequestUserContext(); // gate 已保证存在
  const displayName = userDisplayLabel(reqCtx!.user);
  return (
    <AntdRegistry>
      <AdminShell displayName={displayName}>{children}</AdminShell>
    </AntdRegistry>
  );
}
```

**x-pathname 备选：** 若运行时无法可靠获取当前 path，middleware 对 `/(en|zh)/admin` 请求设置 `x-pathname` + `x-search`（**locale 完整路径**），替代旧 `x-admin-login-redirect` 裸路径。

**knowledge 预览 layout：** 可在 `[locale]/knowledge/[id]/page.tsx` 内联 redirect，**无需**单独 admin 式 layout；或轻量 `[locale]/knowledge/layout.tsx` 仅校验登录（可选，与 admin 解耦）。

### 4.5 未登录跳转 — redirect 值

| 场景 | redirect 参数 |
| --- | --- |
| `GET /en/admin/users`（无 session） | `/en/login?redirect=/en/admin/users` |
| `GET /admin/users`（无 session） | 先 302 `/en/admin/users`，再 `/en/login?redirect=/en/admin/users` |
| `GET /zh/knowledge/id`（无 session） | `/zh/login?redirect=/zh/knowledge/id` |

### 4.6 matcher 扩展

在现有 matcher 基础上增加：

```typescript
"/knowledge",
"/knowledge/:path*",
```

保留 `/admin`、`/admin/:path*`。

更新负向 lookahead（若使用）：

```typescript
"/((?!api|_next|_vercel|chat|console|admin|knowledge|.*\\..*)[^/]+)",
```

### 4.7 子页 redirect

| 文件 | 行为 |
| --- | --- |
| `[locale]/admin/page.tsx` | redirect → `/admin/config`（next-intl，保留 locale） |

---

## 5. 跨页链接更新（Q3-A）

### 5.1 AdminShell 与 layout

| 位置 | 之前 | 之后 |
| --- | --- | --- |
| `AdminShell` 对话 | `href="/chat"` | `Link href="/chat"`（`@/i18n/navigation`） |
| `AdminShell` 控制台 | `href="/console"` | `Link href="/console/profile"` |
| `admin/layout.tsx` forbidden | `/console?notice=admin_forbidden` | `getConsoleForbiddenUrl(locale)` |
| `admin/layout.tsx` login | `/login?redirect=裸路径` | `/${locale}/login?redirect=/${locale}/admin/...` |
| `admin/config` → prompts Link | `href="/admin/prompts"` | next-intl `Link` |

### 5.2 403 / forbidden helper（Q9-A）

**新建** `@/common/utils/console-forbidden-url.ts`：

```typescript
import type { AppLocale } from "@/common/constants/i18n";

export function getConsoleForbiddenUrl(locale: AppLocale | string): string {
  return `/${locale}/console?notice=admin_forbidden`;
}
```

**替换** 各子页：

```typescript
// 之前
window.location.replace("/console?notice=admin_forbidden");

// 之后
import { useLocale } from "next-intl";
import { getConsoleForbiddenUrl } from "@/common/utils/console-forbidden-url";

const locale = useLocale();
window.location.replace(getConsoleForbiddenUrl(locale));
```

**涉及文件（grep 替换）：** `config/page.tsx`、`users/page.tsx`、`prompts/page.tsx`、`models/page.tsx`、`assistants/page.tsx`。

### 5.3 401 login redirect

**推荐**复用或扩展 `buildLocaleLoginRedirect(locale, returnPath)`（0.1.16 console 已建则直接复用）：

```typescript
window.location.href = buildLocaleLoginRedirect(locale, `${pathname}${search}`);
```

`pathname` 来自 `usePathname()`（next-intl，**无** locale 前缀）时：

```typescript
buildLocaleLoginRedirect(locale, `/${locale}${pathname}${search}`);
```

### 5.4 Knowledge 预览链

| 位置 | 之后 |
| --- | --- |
| `KnowledgeClient` 预览 | `Link href={\`/knowledge/${id}\`}` + `@/i18n/navigation` |
| 预览页返回 | `Link href="/console/knowledge"` |

### 5.5 不受本期影响的链

- Chat / Console 内部链（0.1.16 已 locale 化）
- API 路径（无 locale）

---

## 6. LanguageSwitcher 与 URL

| 操作 | 结果 |
| --- | --- |
| `/en/admin/users` → 中文 | `/zh/admin/users` |
| `/en/knowledge/id` → 中文 | `/zh/knowledge/id` |

query 保留（0.1.15 Q5-A）。

---

## 7. 非法 locale

| 请求 | 行为 |
| --- | --- |
| `/fr/admin/config` | 302 → `/en` |
| `/de/knowledge/id` | 302 → `/en` |

---

## 8. 验收用例

| # | 操作 | 期望 |
| --- | --- | --- |
| 1 | `GET /admin/config`（cookie=en） | 302 `/en/admin/config` |
| 2 | 无 session `GET /en/admin/users` | 302 `/en/login?redirect=/en/admin/users` |
| 3 | 非管理员 `GET /zh/admin` | redirect `/zh/console?notice=admin_forbidden` |
| 4 | AdminShell「控制台」 | `/en/console/profile` |
| 5 | API 403 on users 页 | `replace('/en/console?notice=admin_forbidden')` |
| 6 | `GET /knowledge/uuid` | 302 locale 前缀路径 |
| 7 | 未登录 preview | login redirect 含 locale |
| 8 | `/en/console/knowledge` 预览 | `/en/knowledge/uuid` |
| 9 | `GET /fr/admin` | 302 `/en` |
| 10 | admin index | `/en/admin` → `/en/admin/config` |
