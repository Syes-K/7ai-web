# 实现计划：对话绑定助手（迭代 0.1.2，阶段 3B 预备）

## 文档信息

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.2` |
| 阶段 | 本文档服务 **3B 编码**；当前仓库仅 **3A 文档**，**不含代码变更** |

---

## 1. 目标与边界

- **目标**：在 `/chat` 闭环 PRD：可选助手创建会话、绑定不可变、首条助手消息（开场白或默认问候）、列表/消息区展示助手身份、侧栏去预览行与展示最后活动时间。
- **边界**：不实现会话内换绑；普通对话保持与现网一致；枚举与错误码沿用 `src/common/enums/http.ts`。

---

## 2. 任务顺序（建议）

1. **数据层**
   - 按 `data-models.md` 扩展 `Conversation`：`assistantId` +（推荐）`assistantName` / `assistantIcon` 快照列。
   - 编写迁移并自测本地 SQLite。

2. **助手可读校验复用**
   - 从 `src/app/api/console/assistants/[id]/route.ts` 抽出 `findReadableAssistant` 等价逻辑到 `src/server/assistant/`（命名自定），供创建会话与（若需要）聊天助手列表复用。

3. **POST `/api/chat/conversations`**
   - 解析可选 `assistantId`；校验通过后创建会话；若绑定则**同事务**写入首条 `MessageRole.Assistant` 消息。
   - 开场白：`openingMessage` trim 后非空则用；否则用设计文档 **§6.1** 默认句：**「你好，我是你的助手。需要什么帮助？」**（出处：[`iterations/0.1.2/design/spec-assistant-in-chat.md`](../design/spec-assistant-in-chat.md) §6.1）。
   - 返回 DTO 含 `assistant` 快照与正确 `messageCount`。

4. **GET 会话列表/详情**
   - 填充 `assistant`；实现 `lastActivityAt`（子查询或批量查询最后消息时间，避免逐条查询）。
   - **Migration**：与产品确认 `preview` 字段是否移除或恒 `null`（PRD F8）。

5. **POST `/api/chat/conversations/:id/messages`**
   - 加载会话时读 `assistantId`；若存在则加载对应 `Assistant`（仅用于 `prompt`），并修改 `src/server/chat/assistant.ts`：
     - `toLangChainMessages` 使用的首条系统提示为 **`Assistant.prompt`**（或经 trim/长度校验）；
     - 无绑定时保持 **`CHAT_SYSTEM_PROMPT`**（`src/server/chat/assistant.ts` 现状）。
   - 注意传入 `user` 实体避免重复查库（与现网 `invokeAssistantReply(..., { user })` 一致）。

6. **DELETE `/messages`（清空）**
   - 与产品确认 **方案 A**（清空后不注入）或 **B**（再注入一条且幂等）；实现与 `api-spec-chat-assistant.md` §5.2 一致。
   - 清空后 `lastActivityAt` / `updatedAt` 与 PRD「最后活动时间」语义对齐（见开放项）。

7. **回归与文档**
   - 更新本目录 `api-spec` / `data-models` 若 3B 有偏离。
   - 自测用例覆盖：未选助手、选系统助手、选个人助手、非法 assistantId、开场白为空、仅首条助手消息在创建时出现一次。

---

## 3. LangChain 与提示词整合（技术说明）

| 组件 | 路径 | 现状 | 目标 |
| --- | --- | --- | --- |
| 对话调用 | `src/server/chat/assistant.ts` | 固定 `CHAT_SYSTEM_PROMPT` + 历史转 `HumanMessage`/`AIMessage` | 有 `assistantId` 时首条 `SystemMessage` = 该助手 `prompt` |
| Agent 封装 | `src/server/llm/assistant.ts` | `createAgent` + `systemPrompt: assistantRow.prompt` | 可与 Chat 链路**语义对齐**；**不要求**本期把主链路改为 Agent，除非统一编排 |

**注意**：助手 `prompt` 可能较长；保持与控制台校验一致（`ASSISTANT_PROMPT_MAX_LENGTH` 等常量）。

---

## 4. 风险

| 风险 | 缓解 |
| --- | --- |
| 创建会话 + 首条消息非原子 | 使用数据库事务，失败则整体回滚 |
| 开场白重复插入 | 仅在 POST create 路径插入；不在 GET 注入 |
| 助手删除后会话打开失败 | API 返回 `assistant` 降级 + `assistantUnavailable`（或等价），前端按设计 §3.4 |
| `preview` 移除导致旧前端 | 版本协商或并行保留一版 API 文档说明 |
| `updatedAt` 与「最后消息时间」在清空场景不一致 | 与产品统一口径后实现 `lastActivityAt` 计算 |

---

## 5. 测试要点（自测清单）

- 创建：无 `assistantId` → `messageCount === 0`，无 `assistant`。
- 创建：有合法 `assistantId` → `messageCount === 1`，首条为助手消息，内容与开场白或默认句一致。
- 创建：非法 id → `ASSISTANT_NOT_FOUND`。
- 发消息：绑定会话的系统提示影响回复（可做快照对比或集成测试）。
- 清空：符合所选 A/B 方案且无重复气泡。
- 列表：无预览依赖；含 `lastActivityAt`；有绑定时有助手快照。

---

## 6. 开放问题（需产品/设计收口）

与设计 [`spec-assistant-in-chat.md`](../design/spec-assistant-in-chat.md) §9 及 PRD 对齐：

1. **快照 vs 实时**：本计划推荐快照列；若改实时需调整 `data-models.md` 与列表查询。
2. **无消息时的最后活动时间**：已建议 `lastActivityAt` = `createdAt`；需书面确认。
3. **清空后是否再注入开场白**：方案 A（设计推荐）或 B。
4. **助手删除**：FK 策略与接口降级字段（`api-spec` §3.1）。
5. **深链/快捷键预填 `assistantId`**：是否与 Modal 流程一致（仅前端则跳过；若带 query 创建需补规格）。

---

## 7. 变更记录

| 日期 | 说明 |
| --- | --- |
| 2026-04-13 | 初稿：任务顺序、LangChain 整合、风险、测试与开放项。 |
