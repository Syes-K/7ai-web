# 状态机说明：Chat Turn 主阶段与子阶段

**迭代版本**：`0.1.8`

## 1. 目标

定义前后端统一消费的状态机语义，保证流式增量与非流式快照在 UI 呈现一致。

## 2. 状态枚举

- `pending`
- `running`
- `completed`
- `failed`
- `skipped`
- `interrupted`

## 3. 合法迁移

## 3.1 通用迁移

- `pending -> running`
- `pending -> skipped`
- `running -> completed`
- `running -> failed`
- `running -> interrupted`

## 3.2 非法迁移（前端忽略并记录告警）

- 任意终态（`completed/failed/skipped/interrupted`）回退到 `running/pending`
- `skipped -> running`
- `failed -> completed`

## 4. 主阶段聚合规则

- 主阶段状态由子阶段聚合得到：
  - 任一子阶段 `failed` => 主阶段 `failed`
  - 否则任一子阶段 `interrupted` => 主阶段 `interrupted`
  - 否则任一子阶段 `running` => 主阶段 `running`
  - 否则全部 `completed/skipped` => 主阶段 `completed`
  - 否则 => `pending`

## 5. 中断原因绑定

仅当状态为 `interrupted` 时允许附带：
- `user_cancelled`
- `network_disconnected`
- `server_timeout`
- `unknown`

若上游缺失原因，前端回退为 `unknown`。

## 6. 快照合并优先级

在同一 `turnId` 下：
1. 终态快照优先于流式中间事件。
2. 同一 `stepKey` 冲突时，按状态优先级覆盖：
   - `failed/interrupted` > `completed` > `running` > `pending`
3. 当 `endedAt` 更晚时，覆盖旧记录。

## 7. 设计验收（状态机维度）

- [ ] 主子阶段状态可通过同一规则推导，不依赖 UI 特例逻辑。
- [ ] 非法迁移不会污染已终态步骤。
- [ ] 流式与非流式在同一 `turnId` 终态一致。
- [ ] 中断原因仅出现四类协议枚举。

