# API 规格：多轮对话摘要（迭代 0.1.4，阶段 3A）

## 文档信息

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.4` |
| 对应 PRD | [`iterations/0.1.4/product/prd-conversation-summary.md`](../product/prd-conversation-summary.md) |
| 对应设计 | [`iterations/0.1.4/design/spec-conversation-summary.md`](../design/spec-conversation-summary.md) |
| 基线实现 | `src/app/api/admin/prompt-config/route.ts`、`src/app/api/chat/conversations/*` |

---

## 1. 通用约定

- 鉴权与错误结构沿用现有约定：`withAdminApi`（管理端）与 `getRequestUserContext`（用户侧），`jsonError` 返回 `{ error: { code, message, details? } }`。
- 错误码复用 `ErrorCode`：`VALIDATION_ERROR`、`UNAUTHORIZED`、`FORBIDDEN`、`CONVERSATION_NOT_FOUND`、`MODEL_ERROR`、`INTERNAL_ERROR`。
- 本期明确：**不新增**任何「面向 C 端展示摘要」接口；摘要仅服务端内部读写并注入模型上下文。

---

## 2. 管理端配置接口（新增）

### 2.1 GET `/api/admin/config/conversation-summary`

用途：返回「对话摘要」Card 使用的**合并后配置**与文件状态。

响应 `200`：

```json
{
  "config": {
    "enabled": true,
    "maxChars": 2000,
    "mode": "messages",
    "summaryTriggerTokens": 6000,
    "summaryKeepTokens": 2000,
    "summaryTriggerMessages": 30,
    "summaryKeepMessages": 12,
    "summaryMinRecentMessages": 6
  },
  "fileState": "ok",
  "fileHint": "可选；invalid_json 时返回"
}
```

字段说明：

- `fileState`：`ok | missing | invalid_json`
  - `missing`：`data/conversationSummaryConfig.json` 不存在，使用 constants 默认。
  - `invalid_json`：文件损坏，回退默认并提示可覆盖保存。

错误：

- `401 UNAUTHORIZED`：未登录；
- `403 FORBIDDEN`：非管理员；
- `500 INTERNAL_ERROR`：读取文件失败。

### 2.2 PUT `/api/admin/config/conversation-summary`

用途：保存配置到 `data/conversationSummaryConfig.json`（原子写）。

请求体：

```json
{
  "config": {
    "enabled": true,
    "maxChars": 2000,
    "mode": "messages",
    "summaryTriggerTokens": 6000,
    "summaryKeepTokens": 2000,
    "summaryTriggerMessages": 30,
    "summaryKeepMessages": 12,
    "summaryMinRecentMessages": 6
  }
}
```

校验：

- `config.enabled`：boolean；
- `config.maxChars`：正整数（建议 1~32000）；**语义是“摘要生成提示词中的最大字数参数”**；
- `config.mode`：`tokens | messages`；
- `config.summaryTriggerTokens`：正整数（建议 1~200000）；
- `config.summaryKeepTokens`：正整数（建议 1~100000）；
- `config.summaryTriggerMessages`：正整数（建议 1~1000）；
- `config.summaryKeepMessages`：正整数（建议 1~500）；
- `config.summaryMinRecentMessages`：正整数（建议 1~200）；
- 仅允许上述 key（首期不开放多余字段）。

响应 `200`：返回保存后的合并配置（同 GET 形状）。

错误：

- `400/422 VALIDATION_ERROR`：字段非法；
- `401/403`：鉴权失败；
- `500 INTERNAL_ERROR`：写入失败或写后校验失败。

---

## 3. Chat 相关接口行为变更（不改对外契约）

### 3.1 POST `/api/chat/conversations/:conversationId/messages`

现状：写入用户消息后，调用 `streamAssistantReply` / `invokeAssistantReply` 生成助手回复。

本迭代增加的服务端内部行为（最终实现）：

1. 在创建主对话 Agent 时读取摘要配置与提示词模板（`contextSummarySystem`、`summarySystemPrefix`）。
2. 当 `enabled=true` 时，为 Agent 注入 LangChain `summarizationMiddleware`：
   - `messages` 模式：使用 `summaryTriggerMessages` / `summaryKeepMessages`；
   - `tokens` 模式：使用 `summaryTriggerTokens` / `summaryKeepTokens`。
3. 摘要生成由 middleware 在模型调用链路中触发；摘要子调用完成后通过 callback 回传摘要文本。
4. 回调在服务端写回会话：
   - `Conversation.contextSummary`
   - `Conversation.contextSummaryUpdatedAt`
   - `Conversation.contextSummaryCutoffSortOrder`
5. 组装下一轮模型输入时，若会话已有摘要则采用：
   - `summaryPrefix + contextSummary`（system 注入）
   - `cutoffSortOrder` 之后的增量消息；若不足则补齐最近 `summaryMinRecentMessages` 条
6. 主对话请求/响应契约维持不变（含 SSE 事件形状）。

说明：接口请求/响应字段保持不变（含 SSE 事件），避免前端改动。

### 3.2 GET `/api/chat/conversations/:conversationId`

保持现状，不返回摘要字段（PRD 7.3 已确认）。

---

## 4. 与现有 prompt-config 的关系

- `contextSummarySystem`、`summarySystemPrefix` 的文案来源仍是 `promptConfig` 合并链路。
- `conversationSummaryConfig` 提供运行参数（enabled/maxChars/mode/trigger/keep）。
- 摘要生成时：从 prompt 模板读取 `contextSummarySystem.value`，以 `maxChars` 注入占位参数。
- `maxChars` 仅用于提示词约束，不在服务端再做字符串硬截断。

---

## 5. 失败策略与错误映射

- 摘要 middleware 子调用失败（模型超时/空输出/模板渲染异常）：
  - 主对话继续；
  - 会话摘要沿用旧值；
  - 打日志（建议带 `conversationId`、`userId`、失败阶段）。
- 流式对话需过滤摘要子调用分词事件（按 `summarization` tag / `lc_source`），避免摘要文本拼进最终 assistant 消息。
- 仅当主对话模型失败时，才沿用既有 `MODEL_ERROR` 行为返回前端。

---

## 6. 自测 API 用例（3B 参考）

- 管理端：
  - `GET` 文件缺失 -> `fileState=missing` 且配置为默认；
  - `PUT` 非法数字 -> `VALIDATION_ERROR`；
  - `PUT` 合法 -> 文件写入且重启后读取一致。
- 用户侧：
  - 发送消息未达到阈值 -> 不刷新摘要；
  - 达到阈值 -> `Conversation.contextSummary` 更新，接口外观不变；
  - 摘要失败 -> 主对话仍可返回。

---

## 7. 变更记录

| 日期 | 说明 |
| --- | --- |
| 2026-04-14 | 初稿：新增管理端配置 API 与 chat 内部摘要刷新行为规格。 |
| 2026-04-14 | 同步实现：摘要从“手工编排”收敛为 LangChain `summarizationMiddleware` + callback 落库。 |
