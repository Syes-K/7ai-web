# 需求摘要：API 统一包装与可观测（0.1.5）

## 背景

- 全站 API Route 需要**一致的请求日志**与后续可扩展的通用逻辑（鉴权组合、埋点等）。
- Edge Middleware 与 Node Route Handler 运行环境不同，日志策略需区分。

## 目标

1. 提供 **`withApiWrapper`**：默认叠加 **`withApiLog`**（Node 下落盘 + 控制台），并支持可选中间层数组（如 **`withAdminApi`**）。
2. **`withApiLog`** 记录请求元数据；**不**将 `Request.body`（ReadableStream）直接写入日志对象，避免序列化为 `{}` 或误消费流。
3. **Middleware** 不再输出高频 request 日志，减少与 API 层重复；保留限流与会话拦截行为。

## 非目标

- 本迭代不要求在日志中记录请求体明文（密码等敏感字段需业务侧脱敏，若未来需要再单独设计）。
