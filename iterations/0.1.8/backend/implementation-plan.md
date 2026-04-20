# 实施计划：Turn/Step 协议与存储落地（v0.1.8 / 阶段 3A）

## 1. 目标

- 在不破坏既有消息收发链路的前提下，落地 turn+step 观测能力。
- 同时满足流式增量展示与非流式完整快照。
- 通过灰度、双写、回退机制控制风险。

## 2. 分阶段落地方案（建议进入 3B 后执行）

## Phase 0：准备与开关

- 增加功能开关（建议）：
  - `CHAT_TURN_PROTOCOL_ENABLED`
  - `CHAT_TURN_DUAL_WRITE_ENABLED`
  - `CHAT_TURN_SSE_STEP_EVENTS_ENABLED`
  - `CHAT_REASONING_LEVEL0_ENABLED`
- 补齐枚举常量：状态枚举、中断原因枚举、主子阶段 key。
- 定义统一 DTO（SSE + JSON）与序列化白名单。

## Phase 1：只写 turn，不改前端消费

- 在 `POST /messages` 单轮流程开始时生成 `turnId`。
- 关键步骤（A-F）更新 `stepsSnapshotJson`；终态时冻结。
- 保持现有 `meta/user_message/assistant_delta/assistant_done/error` 行为不变。
- 非流式 JSON 增加 `turn + steps + reasoning` 字段（前端可先忽略）。

## Phase 2：SSE 步骤增量上线（灰度）

- 增加 `turn_started`、`turn_step_delta`、`turn_completed/failed/interrupted` 事件。
- 旧事件并行保留，确保旧客户端可用。
- 灰度策略建议：
  - 先按内部用户/测试租户；
  - 再按会话创建时间窗口；
  - 最后全量开启。

## Phase 3：读路径升级与回填

- 新读取路径优先返回 turn 快照。
- turn 缺失时回退 message 推断。
- 执行惰性回填（访问触发）+ 可选离线批处理回填。

## Phase 4：收敛与优化

- 指标达标后将诊断、耗时统计统一切到 turn 维度。
- 评估是否保留 step 事件明细表（依据存储成本与排障收益）。

## 3. 状态机一致性落地规则

- 单轮全程只允许一个 `turnId`。
- 终态冻结：`completed|failed|interrupted|skipped` 后禁止状态回退。
- 中断原因固定四类：`user_cancelled`、`network_disconnected`、`server_timeout`、`unknown`。
- 主子阶段聚合规则固化到服务端，前端仅消费结果，避免多端分歧。

## 4. 流式增量与非流式快照合并落地

- 服务端为每个 step 更新附带单调 `seq`。
- 终态快照始终完整覆盖增量中间态。
- SSE 中断后，客户端通过下一次拉取 JSON 快照补齐最终态。
- 非流式返回必须一次性给出完整 `steps[]` 与 `finalStatus`，不能仅返回局部。

## 5. 迁移策略（turn 与 2-message 共存）

- 双写：新轮次同时写 `Message` 与 `Turn`，保证历史兼容。
- 读优先：有 turn 用 turn；无 turn 回退 message。
- 历史数据：不做阻塞式全量迁移，避免发布窗口拉长。
- 一致性校验：每日抽样比对 `turn.finalStatus` 与 assistant message 结果。

## 6. 回滚方案

- 快速回滚：关闭 `CHAT_TURN_PROTOCOL_ENABLED`，系统退回旧协议（仅消息事件）。
- 局部回滚：保留 turn 持久化，关闭 SSE 新事件，避免前端解析风险。
- 数据回滚：不删除已写 turn 数据，仅停止新写入，避免二次损坏。
- 应急原则：任何回滚都不影响 user/assistant 消息主链路可用。

## 7. 监控与告警

## 7.1 指标

- `chat_turn_total{finalStatus}`
- `chat_turn_step_duration_ms{stepKey,status}`
- `chat_turn_interruption_total{reason}`
- `chat_turn_snapshot_merge_conflict_total`
- `chat_turn_dual_write_fail_total`
- `chat_reasoning_level0_exposed_total`

## 7.2 日志

- 关联键：`conversationId` + `turnId` + `stepKey` + `seq`
- 关键日志点：turn 创建、step 状态变更、终态冻结、双写失败、回滚开关变更。
- 日志脱敏与字段白名单与 API 输出一致。

## 7.3 告警建议

- 5 分钟窗口 `dual_write_fail_rate > 1%`
- `turn_final_status_mismatch` 出现即告警
- `unknown` 中断原因占比异常升高告警

## 8. 自测与验收清单（3B 执行时）

- 流式成功路径：step 增量完整、终态冻结。
- 非流式成功路径：JSON 完整快照可单独渲染。
- 失败路径：失败步骤可定位，后续步骤标记一致。
- 中断路径：四类中断原因枚举一致。
- 历史会话：无 turn 仍可读，不报错。
- 安全路径：reasoning 仅 Level 0 可展示字段，无敏感泄露。
