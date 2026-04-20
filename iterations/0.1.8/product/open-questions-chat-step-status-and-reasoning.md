# Open Questions：Step 状态同步、Reasoning 与 Turn 记录（v0.1.8）

## 已确认并关闭（Decision Log 对齐）

- 默认 `reasoning` 展示为 **Level 0**，允许“可展开”但受边界限制。
- 前端步骤展示采用“**主阶段 + 子阶段**”分层结构。
- 非流式（JSON）返回必须包含**完整步骤快照**。
- 中断原因分类固定为：
  - `user_cancelled`
  - `network_disconnected`
  - `server_timeout`
  - `unknown`
- reasoning 采用最小埋点集合并执行脱敏约束。
- 新增 `turn` 记录模型作为推荐方向，兼容既有 `message` 结构。

## 仍待拍板（需用户明确）

### 1) Turn 存储形态细化

- `turn` 中 `user/assistant` 字段采用“消息引用（ref）”还是“冗余快照（snapshot）”为主？
- `steps[]` 是否按环境分级存储（生产仅结果、预发含摘要）？

### 2) 迁移执行节奏

- 双写灰度范围：按租户灰度，还是按会话创建时间灰度？
- 历史 `message` 回填 `turn` 的策略：惰性回填优先，还是追加离线批处理窗口？

### 3) 埋点治理细节

- 埋点保留周期（如 30/90/180 天）与归档策略。
- reasoning 面板展开行为是否纳入审计级日志（不仅是普通埋点）。

