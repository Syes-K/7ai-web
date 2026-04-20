# 3B 实现说明（v0.1.8）

## 已完成范围

- 数据模型：
  - 新增 `ChatTurn`（一次问答一条记录）。
  - `Message` 增加可空 `turnId`。
- 协议与接口：
  - `POST /messages` 流式支持 `turn_started` / `turn_step_delta` / `turn_completed` / `turn_failed`。
  - `POST /messages` 非流式返回 `turn` 完整快照。
  - `GET /messages` 返回 `turnId`。
  - 新增 `GET /conversations/:conversationId/turns`。
- 重试机制：
  - 新增 `retryUserMessageId`，重试时复用原用户消息，不新增用户 message。
- 细节能力：
  - step 支持 `details` 结构化信息（阶段可分层展开）。
  - 知识库阶段支持命中库/理由/片段明细。
  - 模型阶段支持 tools/mcp 基础事件轨迹（start/end/error）。

## 关键实现决策

- 采用 `message.turnId` 直连方案（不建映射表）。
- 目前以 `stepsSnapshotJson` 为主，不落 step 明细事件表。
- reasoning 仅 level0 安全字段，`safeSummary` 截断 200 字。
- 中断原因协议固定四类，当前默认 `unknown` 兜底。

## 增量修复（迭代中后期）

- 修复流式用户消息显示延迟：前端乐观写入，服务端回包去重。
- 修复失败轮次未展示问题：即使无 assistant 正文，也可渲染失败流程。
- 修复“重试成功前旧失败卡仍可重试（刷新后才恢复）”：补齐 SSE 终态时间字段。
- 增加“知识库未命中”系统约束，禁止模型使用“根据知识库”误导表述。

## 与 3A 差异说明

- 3A 计划中的灰度开关、历史回填任务、step 明细事件落库未实现。
- 中断原因精细归因（user_cancelled/network_disconnected/server_timeout）仍需链路补充。

## 后续建议

- 为 tools/mcp 事件增加工具别名映射与输入输出脱敏。
- 增加首包耗时、首 token 耗时与 turn 成功率指标埋点。
- 评估 `chat_turn_step_event` 明细表落库，提升审计与排障能力。
