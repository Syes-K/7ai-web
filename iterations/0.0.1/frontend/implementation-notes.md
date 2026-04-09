# 前端实现说明 - version 0.0.1

## 1. 文档定位

- 对应全流程**阶段 4（前端）**，`version=0.0.1`。
- 本迭代前端为**四页面静态占位**，与 `iterations/0.0.1/product/`、`iterations/0.0.1/design/` 及 `iterations/0.0.1/backend/api-spec.md` 对齐。
- **无接口对接**：`0.0.1` 不调用任何业务 API（见 api-spec §2、§6）。

## 2. 技术栈与代码位置

| 项目 | 说明 |
| --- | --- |
| 框架 | Next.js 15 App Router、React 19 |
| 样式 | Tailwind CSS、`src/app/globals.css` |
| 源码根 | `src/app/`（路由与页面）、`src/components/placeholders/`（占位组件） |

本迭代**未**引入 `antd` / `@ant-design/pro-components`；控制台占位以 Tailwind 静态壳层实现，与后续管理端可接入 Pro 组件不冲突。

## 3. 路由一览

| 路径 | 页面 | 页面组件 |
| --- | --- | --- |
| `/` | 首页 | `src/app/page.tsx` |
| `/login` | 登录页 | `src/app/login/page.tsx` |
| `/chat` | 对话页 | `src/app/chat/page.tsx` |
| `/console` | 控制台 | `src/app/console/page.tsx` → `ConsolePageLoader` → `ConsoleView` |

四路由与 **FR-001**、设计 **§2.1 页面清单** 一致；无其他业务子路由。

## 4. 渲染策略（与 api-spec §3 对齐）

| 路由 | 策略 | 实现要点 |
| --- | --- | --- |
| `/`、`/login`、`/chat` | **SSR（默认 RSC）** | 页面文件为 Server Component（无 `"use client"`），由服务端输出 HTML；占位文案与结构在服务端参与渲染。 |
| `/console` | **CSR** | `page.tsx` 仅渲染 `ConsolePageLoader`；其内 `next/dynamic` 引入 `ConsoleView` 且 **`ssr: false`**，主界面仅在客户端挂载，并带简短「加载中…」占位。 |

说明：控制台内 `ConsoleShellPlaceholder` 等使用 `"use client"` 是为落在 **客户端子树** 内、与 `dynamic(..., { ssr: false })` 一致；**无**全局状态、请求或鉴权。

## 5. 与需求文案（FR-002～FR-005）的对应

| 需求 | 实现位置 |
| --- | --- |
| 首页标题「首页」+ 固定占位文案 | `PageShell` 的 `title` + `EmptyStateCard` 子节点文案 |
| 登录页「登录」+ 固定占位文案 | `src/app/login/page.tsx` |
| 对话页「对话」+ 固定占位文案 | `src/app/chat/page.tsx` |
| 控制台「控制台」+ 固定占位文案 | `ConsoleView` 内 `h1` + `EmptyStateCard` |

**FR-006**：代码侧无业务逻辑封装、无 `fetch`/Server Action 业务调用、无鉴权与路由守卫、无 Redux/Zustand 等状态库、无 `localStorage`/DB 访问。

## 6. 与设计文档的对应

- **design-spec.md**：通用壳层（顶栏 + 主内容 + 主占位卡片）、固定 H1 与主文案、浅色背景与居中主内容，由 `PageShell`、`NavPlaceholder`、`EmptyStateCard` 及各页占位组件体现。
- **spec-placeholder-pages.md**：首页模块块、登录表单外观、对话消息/输入外观、控制台统计/配置区块，分别由 `ModuleBlockPlaceholder`、`FormShellPlaceholder`、`ChatShellPlaceholder`、`ConsoleShellPlaceholder` 体现。

组件命名与逐页规范中的建议名不完全一一对应处，见同目录 **`deviations.md`**。

## 7. 占位组件职责（摘要）

- **`PageShell`**：SSR 三页共用；顶栏 + H1 + 主内容区。
- **`NavPlaceholder`**：四页顶栏；`Link` 指向四路由，**无权限判断**（仅静态导航）。
- **`EmptyStateCard`**：承载各页主占位说明文案。
- **`ConsolePageLoader` / `ConsoleView`**：控制台 CSR 入口与页面内容。

## 8. 运行与构建

```bash
npm install
npm run dev
```

- 开发默认 `http://localhost:3000`，依次访问 `/`、`/login`、`/chat`、`/console` 验收。
- 生产：`npm run build` && `npm run start`。

## 9. 后续版本（非 0.0.1）

- 接口对接以更新后的 `api-spec`（非 Draft）为准。
- 控制台若引入 antd / Pro Components，建议在 `src/app/console/layout.tsx`（或等价边界）挂载 `AntdRegistry` 与 `ConfigProvider`，避免影响 C 端路由；详见仓库前端协作约定。
