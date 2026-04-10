# 服务端实现说明 — 迭代 0.0.3（3B）

## 代码变更摘要

| 文件 | 变更 |
| --- | --- |
| `src/middleware.ts` | `matcher` 增加 `/admin`、`/admin/:path*`，无会话 Cookie 时与 `/console` 同样重定向至 `/login?redirect=...` |
| `src/common/utils/redirect.ts` | `safeRedirectUrl`：精确允许 `/admin`；前缀允许 `/admin/...`（路径含 `..` 则拒绝） |

## 自测建议

1. 清除 Cookie 访问 `/admin` 或 `/admin/config` → 应 302 至 `/login?redirect=...`。
2. 从 `/login?redirect=/admin/config` 完成登录 → 响应体 `redirectUrl` 应指向带 `/admin/config` 的本站 URL。
3. `redirect=/admin/../console` 或含 `..` 的 `/admin/...` → 应回退到站点根（开放重定向防护）。

## API 契约

无新增 Route Handler；详见同目录 `api-spec.md`。
