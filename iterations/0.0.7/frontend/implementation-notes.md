# 控制台 ProLayout 壳与占位 — 实现说明（0.0.7）

## 需求摘要

- 与用户约定迭代版本 **`0.0.7`**（在既有 `0.0.6` 基础上 PATCH+1）。
- 普通用户控制台 **`/console`** 对齐管理后台 **`/admin`** 的 **ProLayout + 深色主题（`adminTheme`）+ `AntdRegistry`**；二者通过路由与顶栏标题（「控制台」/「管理后台」）区分。
- 一级占位模块：**个人信息**、**用户配置**、**模型管理**、**助手管理**、**知识库管理**。
- 保留从管理后台无权访问时跳转 `?notice=admin_forbidden` 的提示行为。

## 路由

| 路径 | 说明 |
| --- | --- |
| `/console` | 重定向至 `/console/profile`，并透传 `notice` 查询参数 |
| `/console/profile` | 个人信息 |
| `/console/settings` | 用户配置 |
| `/console/models` | 模型管理 |
| `/console/assistants` | 助手管理 |
| `/console/knowledge` | 知识库管理 |

## 主要文件

- `src/app/console/layout.tsx`：`AntdRegistry` + `ConsoleShell`
- `src/app/console/ConsoleShell.tsx`：ProLayout、顶栏（对话、管理后台、用户菜单）
- `src/app/console/console-menu.tsx`：侧栏菜单定义
- `src/app/console/ConsoleForbiddenNotice.tsx`：`admin_forbidden` 提示
- 各子目录 `page.tsx`：`PageContainer` + `ProModulePlaceholder`（控制台 Empty 文案通过 `emptyDescription` 区分）
- `src/components/pro-layout/ProModulePlaceholder.tsx`：ProLayout 通用占位（由旧 `AdminModulePlaceholder` 重命名迁移）

## 移除

- 原 CSR 单页 `ConsoleView.tsx`、`ConsolePageLoader.tsx`（由与服务端子路由 + 壳替代；会话仍由 `ConsoleShell` 内 `GET /api/auth/me` 校验）。
