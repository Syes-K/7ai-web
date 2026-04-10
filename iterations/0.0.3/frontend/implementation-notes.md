# 前端实现说明 — 迭代 0.0.3（管理后台壳）

## 依赖

- `antd`、`@ant-design/pro-components`、`@ant-design/icons`、`@ant-design/nextjs-registry`、`dayjs`（`package.json` 已声明）。

## 路由与结构

| 路径 | 说明 |
| --- | --- |
| `/admin` | Server `redirect` → `/admin/config` |
| `/admin/config` … `/admin/assistants` | ProLayout 侧栏 + 顶栏 + `PageContainer` + 占位 |

源码目录：`src/app/admin/`（`layout.tsx`、`AdminShell.tsx`、`admin-menu.tsx`、`admin-theme.ts`、各 `*/page.tsx`）。

## Provider 范围

- **`AntdRegistry`** 仅包在 `admin/layout.tsx`**，不污染全站根 layout。
- 深色 **`ConfigProvider`** + **`App`**（静态 API 上下文）在 **`AdminShell`** 内。

## 会话与 US-ADM-004

- 与控制台一致：`fetch("/api/auth/me", { credentials: "include" })`；401 → `router.replace("/login?redirect=<当前 URL 编码>)`。
- 成功前仅全页「验证会话…」深底文案，**不挂载** ProLayout。

## 布局与顶栏

- **`layout="mix"`** + **`splitMenus={false}`**：顶栏为 ProLayout 内置 Header，侧栏保留五个一级模块（与 mix 下「顶 + 侧」结构一致且不拆分为仅子级侧栏）。
- **顶栏右侧 `actionsRender`**：**对话**（`/chat`）、**控制台**（`/console`）、**用户下拉（退出）**；品牌为 **`logo`（7ai + 系统管理）** + **`title`（管理后台）**，点击品牌区 **`onMenuHeaderClick`** → `/admin/config`。
- **移动端**：沿用 ProLayout `breakpoint="lg"`；未单独加自定义 Drawer（可按设计 spec §7 加强）。

## 自测建议

1. 未登录访问 `/admin/config` → middleware → 登录页；登录后 `redirect` 回 admin（依赖 3B `safeRedirectUrl`）。
2. 已登录切换五菜单 → 侧栏与顶栏保持，仅内容区变。
3. 退出登录 → `POST /api/auth/logout` 后回 `/login`。
