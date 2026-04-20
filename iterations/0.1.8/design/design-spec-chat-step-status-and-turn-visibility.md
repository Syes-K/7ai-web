# 设计规格：对话 Step 状态、Reasoning 可见化与 Turn 视图并存

**迭代版本**：`0.1.8`  
**阶段**：全流程阶段 2（设计）  
**输入来源**：
- `iterations/0.1.8/product/prd-chat-step-status-and-reasoning-visibility.md`
- `iterations/0.1.8/product/open-questions-chat-step-status-and-reasoning.md`
- `iterations/0.1.7/design/spec-chat-turn-pipeline.md`
- `iterations/0.1.7/design/pipeline-branch-steps.md`

---

## 1. 设计目标与范围

本设计在不破坏现有 message 视图可用性的前提下，为单次问答（turn）建立“可诊断、可回放、可降级”的状态可视化层，重点覆盖：

1. 对话中 step 状态实时展示（主阶段 + 子阶段分层）。
2. reasoning 阶段展示（默认 Level 0，支持受限展开）。
3. 非流式 JSON 完整步骤快照的前端呈现策略。
4. “一次问答一条 turn 记录”在 UI 的展示与兼容（与 message 视图并存过渡）。
5. 失败/中断态分类文案、重试/恢复交互。

---

## 2. 信息架构与页面层级

## 2.1 页面层级

- `ConversationPage`
  - `MessageTimeline`（现有消息列表，持续保留）
  - `TurnTimeline`（新增，每次问答聚合成 1 条卡片）
    - `TurnCard`
      - `TurnHeader`（问题摘要、终态、耗时）
      - `StageOverviewBar`（主阶段 A-F 状态条）
      - `StepDetailPanel`（子阶段列表，可折叠）
      - `ReasoningPanel`（Level 0 默认可见，受限展开）
      - `TurnActions`（重试、恢复提示、复制诊断信息）

## 2.2 视图并存策略（turn + message）

- 默认进入 `ConversationPage` 时显示 `MessageTimeline`。
- 右侧或下方展示 `TurnTimeline`，与消息按同一时间轴对齐。
- 老会话（仅 message）：
  - `TurnCard` 显示“未采集步骤快照”占位；
  - 不阻断 message 正常阅读。
- 新会话（turn 可用）：
  - 优先用 `turn.steps[]` 渲染状态；
  - message 继续承载正文内容，不重复渲染步骤细节。

---

## 3. 组件拆分建议与职责

## 3.1 组件清单

1. `TurnCardContainer`
   - 接收流式增量事件或非流式完整快照；
   - 维护单 turn 视图模型（ViewModel）。
2. `StageOverviewBar`
   - 展示主阶段 A-F 的 `pending/running/completed/failed/skipped/interrupted`。
   - 仅展示总览，不承载细粒度错误文案。
3. `StepDetailPanel`
   - 按主阶段分组展示子阶段；
   - 支持按错误/耗时排序切换（默认执行顺序）。
4. `ReasoningPanel`
   - 默认显示 Level 0 状态信息；
   - 展开后仅展示允许字段（见第 7 节）。
5. `TurnFallbackNotice`
   - 处理 turn 缺失、事件乱序、字段不完整时的降级提示。

## 3.2 前端 ViewModel（建议）

```ts
type TurnViewModel = {
  turnId: string;
  conversationId: string;
  finalStatus: "completed" | "failed" | "interrupted";
  interruptionReason?: "user_cancelled" | "network_disconnected" | "server_timeout" | "unknown";
  mainStages: MainStageView[];
  subSteps: SubStepView[];
  reasoning: ReasoningView;
  userMessageRef?: string;
  assistantMessageRef?: string;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  isSnapshotComplete: boolean;
  sourceMode: "streaming" | "non_stream_snapshot";
};
```

---

## 4. 数据流与渲染时序

## 4.1 流式（SSE）渲染时序

1. `turn_started`（或等价初始化事件）到达，创建 `TurnCard`，主阶段初始为 `pending`。
2. 步骤事件增量到达（started/finished/failed/skipped/interrupted），前端更新对应主阶段与子阶段状态。
3. 若出现 reasoning 相关步骤，`ReasoningPanel` 从“未触发”切换为“进行中/完成/失败”。
4. 收到 `assistant_delta` 时，message 区持续流式追加正文；turn 区仅更新步骤与统计。
5. 收到 `assistant_done` 或终态事件后，冻结当前 turn，写入终态快照。

## 4.2 非流式（JSON）渲染时序

1. 用户发送后先展示本地占位 turn（`running` 骨架态）。
2. 响应返回完整 JSON 快照（包含完整 `steps[]` + `finalStatus`）。
3. 前端一次性替换占位 turn，按终态渲染完整步骤树。
4. 若字段缺失，标记 `isSnapshotComplete=false` 并显示降级提示，不影响 message 正文展示。

## 4.3 增量与快照合并规则

- 同一 `turnId` 下优先信任“终态快照”覆盖中间增量。
- 时间戳冲突时，按 `endedAt` 存在性和状态优先级纠偏：`failed/interrupted > completed > running > pending`。
- 新旧协议并存时，缺省字段用安全默认值补齐（如 `status=pending`，`message=""`）。

---

## 5. 状态机设计（主阶段 + 子阶段）

## 5.1 主阶段状态机

- 状态集合：`pending` → `running` → `completed | failed | skipped | interrupted`
- 不允许从终态回到 `running`。
- 当任一关键主阶段 `failed`：
  - 当前阶段记 `failed`；
  - 未执行阶段按策略标记 `skipped` 或 `interrupted`（默认 `skipped`，若有中断原因则 `interrupted`）。

## 5.2 子阶段状态机

- 与主阶段同枚举，但允许细粒度补充 `reasonTag`（如 `kb_not_needed`）。
- 子阶段终态驱动主阶段聚合：
  - 组内全部 `completed/skipped` → 主阶段 `completed`（若全 skipped 也视作 completed with skipped）。
  - 任一 `failed` → 主阶段 `failed`。
  - 任一 `interrupted` 且无 `failed` → 主阶段 `interrupted`。

## 5.3 主子阶段映射（对齐 0.1.7 A-F）

- 主阶段 A：请求与会话前置（A1-A3）
- 主阶段 B：历史与输入准备（B1-B4）
- 主阶段 C：知识库增强（C1-C5）
- 主阶段 D：Agent 构建与主对话（D1-D4）
- 主阶段 E：摘要回调与落库（E1-E2）
- 主阶段 F：输出持久化与响应（F1-F3）

---

## 6. 失败/中断态与交互规范

## 6.1 分类与文案基线

- `failed`：步骤执行失败且终止主流程。
  - 主文案：`本轮在「{stepName}」失败`
  - 副文案：`错误码：{errorCode}`（可复制）
- `interrupted`：流程被外因终止。
  - `user_cancelled`：`你已停止本轮生成`
  - `network_disconnected`：`网络中断，本轮未完整返回`
  - `server_timeout`：`服务响应超时，本轮已中断`
  - `unknown`：`本轮意外中断，可重试`

## 6.2 重试与恢复交互

- `重试本轮`：复用用户问题文本，发起新 turn，不复用旧 turn 状态。
- `恢复查看`：仅恢复 UI 展开状态（如重新打开 `StepDetailPanel`），不触发后端恢复计算。
- 中断后自动操作：
  - 保留已完成步骤；
  - 将未开始步骤标记为 `interrupted`（若原因明确）或 `skipped`（若逻辑跳过）。

---

## 7. Reasoning 可见性与安全边界

## 7.1 默认策略

- 默认展示 Level 0：仅状态、阶段、耗时、原因标签、安全摘要（可选模板化短文）。
- `ReasoningPanel` 默认折叠，Header 显示“已发生/进行中/未触发”。

## 7.2 展开边界（强约束）

展开后允许显示：
- 主阶段/子阶段状态时间线
- `durationMs`、时间戳、终态
- 中断/失败原因标签
- 模板化安全摘要（受长度上限）

展开后禁止显示：
- 原始 chain-of-thought
- 系统提示词、工具入参原文
- 密钥、token、PII 正文与高敏调试字段

## 7.3 权限与降级

- 权限不足或校验失败时，统一降级到 Level 0 状态可见。
- 任意级别均必须经过同一脱敏策略；前端不做“猜测性展示”。

---

## 8. 可用性与性能约束

- 首屏约束：`TurnCard` 首次可见不依赖完整步骤，先渲染骨架和主阶段状态。
- 滚动约束：步骤增量更新不重排已读消息区，避免滚动跳动；未定位到底部时使用“有新进度”提示。
- 增量更新约束：单 turn 内只重绘变更节点（按 `stepKey` 精确更新），避免整卡重渲染。
- 大会话约束：历史 turn 默认折叠子阶段，仅展开当前活跃 turn；超长会话可虚拟列表化。
- 时延感知：主阶段超过阈值（如 8s）显示“处理中，请稍候”而非静默等待。

---

## 9. 与后端协议对齐要求（设计侧）

- 流式需提供可关联 `turnId` 的步骤事件。
- 非流式需返回完整终态快照，至少包含：
  - `turnId`、`finalStatus`、`steps[]`、`interruptionReason?`、`reasoningVisibilityLevel`。
- 错误展示字段分离：
  - `errorCode`（机器）
  - `userMessage`（用户可读）

---

## 10. 设计验收清单（交付 backend/frontend 对齐）

- [ ] 主阶段 A-F 与子阶段可同时展示，且状态一致。
- [ ] 流式场景可观察到步骤增量变化；终态可冻结回放。
- [ ] 非流式场景仅靠 JSON 快照即可完整渲染步骤树。
- [ ] reasoning 默认 Level 0；展开后不出现敏感内容。
- [ ] `failed` 与 `interrupted` 文案可区分且映射四类中断原因。
- [ ] turn/message 并存期间，旧会话不报错且可正常阅读。
- [ ] 重试会创建新 turn，旧 turn 仅保留历史快照。

