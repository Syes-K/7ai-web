# 迭代 0.1.5：API 可观测与统一包装（日志 / withApiWrapper）

## 文档索引

| 阶段 | 路径 |
| --- | --- |
| 需求 | [`product/prd-api-infrastructure.md`](./product/prd-api-infrastructure.md) |
| 后端实现记录 | [`backend/implementation-notes.md`](./backend/implementation-notes.md) |

本迭代以**工程化与可观测**为主，无独立设计稿；前端无专项交付（沿用既有页面）。

## 实现要点（与代码一致）

- **统一 API 包装**：`withApiWrapper`（`src/server/http/with-api-wrapper.ts`），默认内层含 `withApiLog`；管理端路由使用 `withApiWrapper([withAdminApi], handler)`。
- **请求日志**：`withApiLog`（`src/server/http/with-api-log.ts`）记 `api.request`（method、href、referer、content-type/length、hasBody）；**不记录** `request.body` 流（避免序列化为 `{}` 且避免消费流）。
- **文件日志**：Node 侧 `import { logger } from "@/server/logs"` → 控制台 + `.logs/YYYY-MM-DD-HH`（`log-file-append.ts`）；`.logs/` 已加入 `.gitignore`。
- **Middleware**：已移除 `request.start` / `request.end` 控制台日志，保留限流与登录重定向逻辑。
- **Subagent**：`.cursor/agents/backend.md` 约定 `src/app/api/**/route.ts` 统一经 `withApiWrapper` 导出。
