# 数据模型：多轮对话摘要（迭代 0.1.4，阶段 3A）

## 文档信息

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.4` |
| 基线 | `Conversation` 实体见 `src/server/db/entities/Conversation.ts` |
| 对应设计 | [`iterations/0.1.4/design/spec-conversation-summary.md`](../design/spec-conversation-summary.md) |

---

## 1. 会话实体增量

在 `conversations` 表新增：

| 列 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `contextSummary` | `text` | nullable | 当前会话滚动摘要正文。 |
| `contextSummaryUpdatedAt` | `datetime` | nullable | 摘要最后成功更新时间。 |
| `contextSummaryCutoffSortOrder` | `integer` | nullable | 当前摘要已覆盖到的最后一条消息 `sortOrder`（checkpoint）。 |

说明：

- 旧数据迁移后两列均为 `NULL`，语义为“尚未生成摘要”。
- 删除会话时随会话删除（与 `DELETE /api/chat/conversations/:id` 的会话级删除一致）。

可选列（本期建议不做）：

- `contextSummaryModelSnapshot`（varchar，nullable）用于排障。

---

## 2. 运行时配置模型（JSON）

### 2.1 默认配置（constants）

建议新增常量文件：`src/common/constants/defaultConversationSummaryConfig.ts`。

结构：

```ts
export type ConversationSummaryConfig = {
  enabled: boolean;
  maxChars: number;
  mode: "tokens" | "messages";
  summaryTriggerTokens: number;
  summaryKeepTokens: number;
  summaryTriggerMessages: number;
  summaryKeepMessages: number;
  summaryMinRecentMessages: number;
};

export const DEFAULT_CONVERSATION_SUMMARY_CONFIG: ConversationSummaryConfig = {
  enabled: true,
  maxChars: 2000,
  mode: "messages",
  summaryTriggerTokens: 6000,
  summaryKeepTokens: 2000,
  summaryTriggerMessages: 30,
  summaryKeepMessages: 12,
  summaryMinRecentMessages: 6,
};
```

### 2.2 覆盖配置（data）

文件：`data/conversationSummaryConfig.json`。

建议持久化结构（仅覆盖层，可与默认同形）：

```json
{
  "enabled": true,
  "maxChars": 2000,
  "mode": "messages",
  "summaryTriggerTokens": 6000,
  "summaryKeepTokens": 2000,
  "summaryTriggerMessages": 30,
  "summaryKeepMessages": 12,
  "summaryMinRecentMessages": 6
}
```

### 2.3 合并与校验

- 读取文件：不存在返回 `missing`；
- 解析 JSON：失败返回 `invalid_json` 并回退默认；
- 校验：字段类型与范围校验，失败时拒绝写盘；
- 合并：`DEFAULT_*` 与文件 shallow merge（本结构一层字段）。

---

## 3. 摘要生成输入/输出模型（服务端内部）

### 3.1 输入

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `messages` | `BaseMessage[]` | 会话消息序列；由 LangChain middleware 按 trigger/keep 策略决定是否触发摘要。 |
| `maxChars` | `number` | 注入 `contextSummarySystem` 占位参数（用于约束摘要生成目标字数，不做服务端二次截断）。 |
| `mode/trigger/keep` | config | 由 `ConversationSummaryConfig` 提供，驱动 middleware 触发与保留窗口。 |

### 3.2 输出

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `summary` | `string` | middleware 生成的摘要文本（由 callback 捕获）。 |
| `updatedAt` | `Date` | callback 成功写库时间。 |
| `cutoffSortOrder` | `number \| null` | 本次摘要写回时更新的会话 checkpoint。 |

---

## 4. 与现有表/字段关系

- `Message` 表无需新增列；摘要是会话级能力。
- `Conversation.assistantId`（已存在）继续作为主对话系统提示来源；摘要模型按 PRD 7.1 复用 `getChatRuntimeModel(userId)`，无需新增模型配置表。
- `chatAssistantFields` DTO 不扩展摘要信息（7.3 已确认不返回给前端）。

---

## 5. 数据一致性约束

- 同一会话内摘要写入应“后写覆盖前写”；3B 实现建议串行化或以 `updatedAt` 判定。
- 摘要失败不应写空覆盖旧值；应保持旧 `contextSummary`。
- 事务边界：用户消息落库与摘要更新可分离；主目标是“不阻塞回复”。

---

## 6. 变更记录

| 日期 | 说明 |
| --- | --- |
| 2026-04-14 | 初稿：会话摘要列、运行时 JSON 与合并模型。 |
| 2026-04-14 | 同步实现：摘要生成链路改为 LangChain middleware + callback 落库。 |
