# 数据模型设计：Turn 记录、Step 快照与 Message 兼容（v0.1.8 / 阶段 3A）

## 1. 设计原则

- 推荐“单次问答一条 turn 记录”作为聚合主实体，承载步骤轨迹与终态。
- 保持与现有 `Message`（user + assistant 两条）模型共存，支持双写与读回退。
- `reasoning` 仅支持 Level 0 可展开信息，采用严格字段白名单与脱敏规则。

## 2. 逻辑实体

## 2.1 ChatTurn（新增推荐）

```ts
type ChatTurn = {
  id: string; // turnId
  conversationId: string;
  userId: string;
  userMessageId?: string | null;
  assistantMessageId?: string | null;
  finalStatus: "completed" | "failed" | "interrupted";
  interruptionReason?: "user_cancelled" | "network_disconnected" | "server_timeout" | "unknown" | null;
  reasoningVisibilityLevel: 0;
  startedAt: Date;
  endedAt?: Date | null;
  durationMs?: number | null;
  stepsSnapshotJson: string; // 聚合快照（主阶段+子阶段）
  createdAt: Date;
  updatedAt: Date;
};
```

## 2.2 ChatTurnStepEvent（可选增强）

用于保留增量轨迹，便于排障与审计；若成本受限可仅存 `stepsSnapshotJson`。

```ts
type ChatTurnStepEvent = {
  id: string;
  turnId: string;
  seq: number;
  stepKey: string;
  mainStage: "A" | "B" | "C" | "D" | "E" | "F";
  subStage: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped" | "interrupted";
  reasonTag?: string | null;
  safeMessage?: string | null;
  errorCode?: string | null;
  errorUserMessage?: string | null;
  occurredAt: Date;
};
```

## 2.3 Message（既有）

- 延续现有 `Message` 表结构与写入语义（先 user，后 assistant）。
- 新增兼容字段（推荐二选一）：
  - 方案 A：`message.turnId`（可空）
  - 方案 B：新增映射表 `chat_turn_messages(turnId, messageId, role)`

## 3. Step 快照结构（`stepsSnapshotJson`）

```json
{
  "version": "0.1.8",
  "mainStages": [
    {
      "stage": "A",
      "status": "completed",
      "startedAt": "ISO8601",
      "endedAt": "ISO8601",
      "durationMs": 12
    }
  ],
  "subSteps": [
    {
      "stepKey": "D3",
      "mainStage": "D",
      "subStage": "D3",
      "status": "running",
      "reasonTag": null,
      "safeMessage": null,
      "startedAt": "ISO8601",
      "endedAt": null,
      "durationMs": null,
      "error": null
    }
  ],
  "frozen": true
}
```

约束：

- `frozen=true` 后禁止更新状态字段（仅允许补充审计元数据）。
- 子阶段冲突合并遵循：`failed/interrupted > completed > running > pending`。
- `interruptionReason` 仅四类固定枚举。

## 4. Reasoning Level 0 字段白名单与脱敏

## 4.1 服务端允许持久化/返回的字段（白名单）

- `visibilityLevel`（固定 `0`）
- `status`（`not_triggered|running|completed|failed|interrupted`）
- `mainStage` / `subStage`
- `durationMs`
- `reasonTag`
- `safeSummary`（可选、模板化、长度上限）

## 4.2 明确禁止字段

- 原始 chain-of-thought 文本
- 系统提示词全文
- 工具调用入参/出参原文
- 用户隐私正文、密钥、token、连接串
- 可逆推出内部策略细节的高敏调试字段

## 4.3 脱敏规则

- 长文本截断：`safeSummary` 建议 <= 200 字。
- 关键字掩码：命中密钥/凭证模式时整体替换为 `[REDACTED]`。
- PII 识别后删除：邮箱、手机号、身份证号等敏感模式不落库。
- 错误信息双通道：`errorCode` 可观测，`errorUserMessage` 对外展示。

## 5. 单条 Turn 记录推荐实现

- 一次问答生命周期创建唯一 `turnId`，贯穿流式/非流式分支。
- user message 落库后关联 `turn.userMessageId`。
- assistant message 落库后关联 `turn.assistantMessageId`，并冻结 `turn.finalStatus` 与 `stepsSnapshotJson`。
- 摘要回调、知识库步骤、模型步骤均只更新同一 `turn` 快照，不再分散到多个临时状态源。

## 6. 与现有 2-message 模型共存迁移路径

1. **阶段 M1（双写启用）**  
   新会话写 `Message` 同时写 `ChatTurn`；任一失败记录告警并重试，不阻塞核心消息返回。
2. **阶段 M2（读优先 turn）**  
   新前端优先读取 `turn`；若缺失则回退 `message` 推断，保证历史可读。
3. **阶段 M3（惰性回填）**  
   访问旧会话时按需回填 turn；可选离线批处理补齐。
4. **阶段 M4（收敛）**  
   turn 覆盖率达到阈值后，诊断与统计全部以 turn 为主；message 保留为渲染兼容层。

## 7. 索引与查询建议

- `chat_turn`: `(conversationId, createdAt desc)`、`(userId, createdAt desc)`。
- `chat_turn_step_event`: `(turnId, seq asc)`。
- `message.turnId`（若采用方案 A）建立普通索引，加速 turn-message 联查。

## 8. 一致性要求

- `turn.finalStatus` 与助手消息是否成功返回必须一致。
- 流式断连但服务端已完成时，允许 `assistantMessage` 与 `turn` 终态存在，前端以下次读取快照纠偏。
- 任意终态冻结后不得被后续异步回调改写（避免“已完成 turn 被改回 running”）。
