# 实现说明：对话绑定助手（0.1.2 · 阶段 3B）

## 已落地行为

- **数据**：`Conversation` 增加可空 `assistantId`、`assistantName`、`assistantIcon`（快照，无数据库外键，助手删除后仍保留会话侧 id 与快照）。
- **助手可读**：`src/server/assistant/readable-assistant.ts` 中 `findReadableAssistant`，控制台 `GET/PATCH/DELETE …/assistants/[id]` 已改为复用。
- **创建会话**：`POST /api/chat/conversations` 可选 `assistantId`；合法则事务内写入会话 + 首条 `Assistant` 消息（开场白或 `CHAT_ASSISTANT_DEFAULT_OPENING_MESSAGE`）。
- **列表/详情**：`GET …/conversations`、`GET …/conversations/:id` 返回 `assistant`、`lastActivityAt`；`preview` 恒为 `null`；`assistantUnavailable` 在 `assistants` 表无对应行时为 `true`。
- **发消息**：`src/server/chat/assistant.ts` 支持 `systemPrompt`；绑定会话且助手行仍存在时使用 `Assistant.prompt`，否则回退默认系统提示。
- **清空消息**：`DELETE …/messages` 不再次注入开场白（方案 A）。

## 前端（最小闭环）

- `chat-api.ts`：`createConversation` 支持 `assistantId`；列表项类型含 `lastActivityAt`、助手字段。
- `ChatWorkspace.tsx`：新建对话经 Modal 选助手或跳过；侧栏展示助手 icon/名称与最后活动时间；助手消息气泡展示助手身份标签。

## 自测建议

- 无 `assistantId` 创建 → `messageCount === 0`，模型走默认系统提示。
- 绑定助手创建 → 首条为开场/默认问候，`POST messages` 使用助手 `prompt`。
- 非法 `assistantId` → `ASSISTANT_NOT_FOUND`。
- 助手删除后：会话仍可打开；列表/详情仍显示快照，`assistantUnavailable: true`；发消息回退默认系统提示。

## 变更记录

| 日期 | 说明 |
| --- | --- |
| 2026-04-13 | 3B 实现与上述说明 |
