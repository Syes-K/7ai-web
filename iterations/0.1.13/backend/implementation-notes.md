# 阶段 3B 实现说明（version 0.1.13 · i18n）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.13` |
| 阶段 | 3B — 代码实现 |
| 依赖 | `next-intl@^4.13.0` |

## 已实现

### 基础设施

- `src/i18n/routing.ts` — `locales: ['en','zh']`，`defaultLocale: 'en'`，`localePrefix: 'always'`
- `src/i18n/request.ts` — 按 locale 加载 `messages/{locale}/page/home.json` 与 `api/message.json`，嵌套为 `page.home` / `api.message` namespace
- `src/i18n/navigation.ts` — `createNavigation(routing)` 供 LanguageSwitcher 使用
- `src/common/constants/i18n.ts`、`src/common/enums/locale.ts` — locale 常量与枚举
- `next.config.ts` — `createNextIntlPlugin('./src/i18n/request.ts')`

### middleware 合并

- **顺序**：非法 locale → 302 `/en` → 受保护路由（限流 + 会话）→ next-intl → `next()`
- **修复**：现网 auth middleware 末尾 `res = NextResponse.next()` 覆盖 redirect 的问题，改为各分支 **early return**
- **matcher**：扩展 `/`、`/(en|zh)`、非法单 segment；保留 chat/console/admin/api auth 路径

### 路由

- 删除 `src/app/page.tsx`；首页迁至 `src/app/[locale]/page.tsx` + `layout.tsx`
- 根 `src/app/layout.tsx` 默认 `html lang="en"`；locale 页由 `LocaleHtmlLang` 客户端同步 `zh-CN` / `en`

### 文案

- `messages/en|zh/page/home.json` — 28 leaf keys（见 design copy 文档）
- `messages/en|zh/api/message.json` — 空占位 `{}`

## 未改动（符合 PRD）

- `src/app/api/**` REST 响应文案仍为中文
- `/chat`、`/console`、`/login`、`/admin` 无 locale 前缀
- TypeORM / SQLite 无变更

## 构建验证

```bash
npm run build
```

已通过（2026-06-10）。

## 冒烟建议（手动）

| # | 操作 | 期望 |
| --- | --- | --- |
| 1 | 访问 `/` | 302 → `/en` 或 `/zh`（视 cookie / Accept-Language） |
| 2 | `/en` ↔ `/zh` 切换 | 文案全量更新，cookie 保持 |
| 3 | 访问 `/fr` | 302 → `/en` |
| 4 | 未登录访问 `/chat` | 302 → `/login?redirect=/chat` |
| 5 | `GET /api/auth/me` | 不受 locale 影响 |

## 与前端共担项（本迭代一并落地）

首页 UI i18n（`PunkLanding`、`PunkHomeHeader`、`LanguageSwitcher`、`UserAvatarMenu` home variant）已在同批提交中完成，详见 `../frontend/implementation-notes.md`。
