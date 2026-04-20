# API 规格：Chat Turn Step 状态与 Reasoning 可见化（v0.1.8 / 阶段 3A）

## 1. 目标与范围

- 在保持现有 `POST /api/chat/conversations/:conversationId/messages` 可用的前提下，扩展流式（SSE）与非流式（JSON）协议，统一承载 `turn` 与 `step` 状态。
- 与 `0.1.7` 既有事件兼容：`meta`、`user_message`、`assistant_delta`、`assistant_done`、`error` 不移除。
- 新协议仅增加字段/事件，不在 3A 改动实现代码。

## 2. 基础对象定义

### 2.1 Turn

```json
{
  "turnId": "uuid",
  "conversationId": "uuid",
  "finalStatus": "completed|failed|interrupted",
  "interruptionReason": "user_cancelled|network_disconnected|server_timeout|unknown|null",
  "startedAt": "ISO8601",
  "endedAt": "ISO8601|null",
  "durationMs": 0
}
```

### 2.2 Step（主阶段与子阶段共用结构）

```json
{
  "stepKey": "A1|B2|D3|...",
  "mainStage": "A|B|C|D|E|F",
  "subStage": "A1|A2|...|F3",
  "name": "可读名称",
  "status": "pending|running|completed|failed|skipped|interrupted",
  "reasonTag": "可选：kb_not_needed|summary_not_triggered|...",
  "message": "可选，脱敏后的短说明",
  "startedAt": "ISO8601|null",
  "endedAt": "ISO8601|null",
  "durationMs": 0,
  "error": {
    "code": "MODEL_ERROR|...",
    "userMessage": "面向用户的错误文案"
  }
}
```

### 2.3 Reasoning（仅 Level 0 可展开）

```json
{
  "visibilityLevel": 0,
  "status": "not_triggered|running|completed|failed|interrupted",
  "allowedFields": {
    "mainStage": "D",
    "subStage": "D3",
    "durationMs": 0,
    "reasonTag": "可选",
    "safeSummary": "可选模板化短摘要"
  }
}
```

## 3. SSE 协议扩展

### 3.1 事件序列（建议）

1. `meta`（兼容保留，新增 `turnId` 可选字段）
2. `user_message`（兼容保留）
3. `turn_started`（新增）
4. `turn_step_delta`（新增，重复发送，直到终态）
5. `assistant_delta`（兼容保留）
6. `assistant_done`（兼容保留）
7. `turn_completed`（新增终态快照）或 `turn_interrupted` / `turn_failed`
8. `error`（兼容保留，错误兜底）

### 3.2 新增事件载荷

`event: turn_started`

```json
{
  "turn": {
    "turnId": "uuid",
    "conversationId": "uuid",
    "startedAt": "ISO8601"
  },
  "initialSteps": []
}
```

`event: turn_step_delta`

```json
{
  "turnId": "uuid",
  "seq": 12,
  "step": {
    "stepKey": "D3",
    "mainStage": "D",
    "subStage": "D3",
    "status": "running",
    "startedAt": "ISO8601"
  },
  "reasoning": {
    "visibilityLevel": 0,
    "status": "running"
  }
}
```

`event: turn_completed`（`turn_failed` / `turn_interrupted` 同结构，`finalStatus` 不同）

```json
{
  "turn": {
    "turnId": "uuid",
    "conversationId": "uuid",
    "finalStatus": "completed",
    "interruptionReason": null,
    "startedAt": "ISO8601",
    "endedAt": "ISO8601",
    "durationMs": 1234
  },
  "steps": [],
  "reasoning": {
    "visibilityLevel": 0,
    "status": "completed"
  }
}
```

## 4. JSON（非流式）响应扩展

在现有返回基础上新增 `turn` 与 `steps` 完整快照，满足“非流式一次性完整终态”要求：

```json
{
  "userMessage": {},
  "assistantMessage": {},
  "conversation": {},
  "turn": {
    "turnId": "uuid",
    "conversationId": "uuid",
    "finalStatus": "completed|failed|interrupted",
    "interruptionReason": "user_cancelled|network_disconnected|server_timeout|unknown|null",
    "startedAt": "ISO8601",
    "endedAt": "ISO8601",
    "durationMs": 1234
  },
  "steps": [],
  "reasoning": {
    "visibilityLevel": 0,
    "status": "completed",
    "allowedFields": {}
  }
}
```

## 5. 状态机与一致性约束

- 状态迁移仅允许：`pending -> running -> completed|failed|interrupted`，以及 `pending -> skipped`。
- 任意终态（`completed|failed|skipped|interrupted`）必须冻结，不允许回退到 `running/pending`。
- 中断原因必须限定四类：`user_cancelled`、`network_disconnected`、`server_timeout`、`unknown`。
- 主阶段状态由子阶段聚合：`failed` 优先于 `interrupted`，其后 `running`，最后 `completed/pending`。

## 6. 流式增量与非流式完整快照合并规则

- 同一 `turnId` 下，终态快照优先级高于中间增量事件。
- 同一 `stepKey` 冲突按优先级覆盖：`failed/interrupted > completed > running > pending`。
- 若存在 `endedAt`，较晚时间覆盖较早时间；不存在时按 `seq` 较大者覆盖。
- 终态事件到达后，前端应将该 `turn` 标记为冻结态，不再接受后续 `turn_step_delta` 变更。

## 7. 兼容策略

- 旧客户端：忽略未知事件与未知字段，仍可依赖 `assistant_delta/assistant_done` 渲染正文。
- 新客户端：优先消费 `turn_*` + `turn_step_delta`，无则退化为旧模式（仅消息与错误）。
- 读接口兼容：历史数据无 `turn` 时，返回 `turn: null`、`steps: []`（或不返回该字段，由前端容错）。
- 写路径兼容：3B 推荐进入 `turn + message` 双写；3A 仅定义协议与落地策略。

## 8. 错误与安全约束

- 对外错误信息分离：
  - `error.code`：机器可观测；
  - `error.userMessage`：用户可读；
- Reasoning 默认仅 `visibilityLevel=0`，不返回原始 chain-of-thought、系统提示词、工具入参原文、密钥与隐私正文。
- 协议字段采用白名单输出，未知字段不透传模型原始响应。
