# Backend 实现说明（3B）- version 0.0.1

## 1. 本版本交付范围

- 初始化 **Next.js（App Router）+ TypeScript** 工程骨架。
- 实现四页面**静态占位**（无业务逻辑、无 API、无鉴权、无数据库读写、无模型调用）。
- 渲染策略对齐约定：
  - `首页`、`登录页`、`对话页`：默认 **RSC**，**SSR** 输出静态 HTML。
  - `控制台`：`dynamic(..., { ssr: false })` + 客户端组件，整页按 **CSR** 方案挂载占位。
- 依赖层占位：
  - `typeorm`、`reflect-metadata`、`better-sqlite3`：已声明依赖；代码仅在 `src/server/db/index.ts` 留注释占位，**未初始化连接**。
  - `@langchain/core`：已声明依赖；代码仅在 `src/server/llm/index.ts` 留注释占位，**未创建 Chain**。

## 2. 关键路径

| 说明 | 路径 |
| --- | --- |
| 首页 | `src/app/page.tsx` |
| 登录页 | `src/app/login/page.tsx` |
| 对话页 | `src/app/chat/page.tsx` |
| 控制台（CSR） | `src/app/console/page.tsx`、`src/app/console/ConsolePageLoader.tsx`（`dynamic` + `ssr:false`）、`src/app/console/ConsoleView.tsx` |
| 数据层占位 | `src/server/db/index.ts` |
| LangChain 占位 | `src/server/llm/index.ts` |

## 3. 本地运行

```bash
npm install
npm run dev
```

浏览器访问：`/`、`/login`、`/chat`、`/console`。

## 4. 与 3A 文档关系

- 未实现 `iterations/0.0.1/backend/api-spec.md` 中任何 Draft 接口。
- 数据模型见 `data-models.md`，本版本未创建 Entity、未执行 migration。

## 5. 已知注意点

- `better-sqlite3` 为原生模块，若安装失败需本机具备对应 Node 构建环境；当前代码路径未在运行时加载该模块。
- 控制台使用 `ssr: false` 时会出现简短 `loading` 占位文案，仅为框架级加载提示，不含业务逻辑。
