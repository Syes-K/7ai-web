# 前端自测清单 — version 0.1.17

## 前置

- [ ] `.env` 配置 `ADMIN_USER`（管理员邮箱）
- [ ] `npm run build` 通过
- [ ] `npm run dev` 启动

---

## A. 路由与 Legacy 302

| # | 操作 | 期望 |
| --- | --- | --- |
| A1 | `GET /admin/config`（cookie=en） | 302 `/en/admin/config` |
| A2 | `GET /knowledge/{id}` | 302 `/en/knowledge/{id}`（或 zh） |
| A3 | `GET /fr/admin` | 302 `/en` |
| A4 | `GET /en/admin` | redirect `/en/admin/config` |

---

## B. Admin 鉴权与 Shell

| # | 操作 | 期望 |
| --- | --- | --- |
| B1 | 未登录 `GET /en/admin/users` | redirect `/en/login?redirect=/en/admin/users` |
| B2 | 非管理员 `GET /zh/admin/config` | redirect `/zh/console?notice=admin_forbidden` + Forbidden 文案 |
| B3 | 已登录管理员进 admin | **无**「验证会话…」闪屏，直接渲染 |
| B4 | AdminShell「控制台」 | `/en/console/profile` |
| B5 | LanguageSwitcher `/en/admin/users` → 中文 | `/zh/admin/users`（query 保留） |
| B6 | 侧栏六项 | 英文 UI 下菜单为 Configuration / Users / … |

---

## C. Admin 子页 i18n

| # | 操作 | 期望 |
| --- | --- | --- |
| C1 | `/en/admin/users` | 列头、Tag、确认弹窗、分页 `N total` 为英文 |
| C2 | `/zh/admin/models` | 公有模型 Alert、工具栏、Modal 为中文 |
| C3 | config GET 坏 JSON（若可模拟） | Alert `fileState.invalidJson.*`，非 fileHint 中文 |
| C4 | prompts GET 坏 JSON（若可模拟） | 同上 |
| C5 | config 页脚链 | locale 前缀 `/en/admin/prompts` |
| C6 | users API 403（非管理员 token） | `replace('/en/console?notice=admin_forbidden')` |
| C7 | `/en/admin/logs` | 占位文案英文 |

---

## D. Knowledge 预览

| # | 操作 | 期望 |
| --- | --- | --- |
| D1 | 未登录 `GET /en/knowledge/{id}` | redirect login，`redirect` 含 locale |
| D2 | 已登录，他人 kb | 404 |
| D3 | `/en/knowledge/{id}` | title 英文模板 + kb.name；返回链英文 |
| D4 | `/en/console/knowledge` 点预览 | `/en/knowledge/{id}` |
| D5 | `/zh/console/knowledge` 点预览 | `/zh/knowledge/{id}` |
| D6 | 正文中文 kb 在 `/en/...` | 正文仍为中文原文 |

---

## E. Metadata

| # | 页面 | 期望 |
| --- | --- | --- |
| E1 | `/en/admin/config` | title 含 `Configuration \| Admin` |
| E2 | `/zh/admin/users` | title 含 `用户管理 \| 管理后台` |
| E3 | `/en/knowledge/{id}` | `{name} \| Knowledge preview` 或 fallback |

---

## F. 回归

| # | 操作 | 期望 |
| --- | --- | --- |
| F1 | `/en/console/**` | 不受 admin 迁移影响 |
| F2 | UserAvatarMenu 登出 | `/{locale}/login` |
| F3 | API `/api/admin/**` | 无 locale 前缀，错误文案双语（Backend 3B） |
