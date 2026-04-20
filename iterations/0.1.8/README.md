# Iteration 0.1.8 概览

## 目标

- 将“单次问答仅最终回复可见”升级为“可见全过程（step/状态/reasoning）”。
- 支持一次问答一条 `turn` 记录，并与现有 `message` 模型兼容共存。
- 在前端实现可读、可追溯、可重试的 AI 回复流程展示。

## 产物清单

- Product：
  - `product/prd-chat-step-status-and-reasoning-visibility.md`
  - `product/open-questions-chat-step-status-and-reasoning.md`
- Design：
  - `design/design-spec-chat-step-status-and-turn-visibility.md`
  - `design/state-machine-chat-turn-main-sub-stages.md`
  - `design/copy-and-interaction-guidelines-chat-turn-status.md`
- Backend：
  - `backend/api-spec.md`
  - `backend/data-models.md`
  - `backend/implementation-plan.md`
  - `backend/risks-and-open-items.md`
  - `backend/implementation-notes.md`
- Frontend：
  - `frontend/implementation-notes.md`

## 最终实现摘要

- 数据层：
  - 新增 `ChatTurn` 实体，`Message` 增加可空 `turnId`。
  - `turn.stepsSnapshotJson` 持久化主/子阶段与 reasoning level0 数据。
- 接口层：
  - `POST /messages` 支持流式 `turn_*` 事件与非流式 `turn` 完整快照。
  - 新增 `GET /conversations/:id/turns` 查询历史 turn。
  - `GET /messages` 返回 `turnId`，用于前端绑定轮次。
  - 新增 `retryUserMessageId` 协议，实现“重试不新增用户消息”。
- 前端层：
  - AI 回复区整合为“流程 + 最终回复”统一展示。
  - 阶段支持分层展开（阶段 -> 细节块）。
  - 失败/中断样式区分，支持重试。
  - 同问题重试成功后，旧失败卡禁用重试并弱化显示。
  - 对话发送异常仅在对话流内展示，不再额外顶部提醒。

## 关键体验修复

- 修复发送后用户消息显示延迟（本地乐观写入 + 服务端事件去重）。
- 修复失败时用户消息/失败信息丢失问题（失败轮次强制渲染）。
- 修复“重试新增一条用户消息”问题（复用原用户消息）。
- 修复“重试成功前旧失败卡仍可重试（需刷新才生效）”问题（SSE 事件补齐时间字段）。
- 修复“知识库未命中却说根据知识库”的误导话术（系统约束防护）。

## 已知留待后续

- `step` 明细事件表未落库（当前仅快照）。
- `user_cancelled` / `network_disconnected` / `server_timeout` 细粒度归因仍待链路补齐。
- Tools/MCP 事件已可采集基础轨迹，后续可继续增强别名映射与脱敏策略。
