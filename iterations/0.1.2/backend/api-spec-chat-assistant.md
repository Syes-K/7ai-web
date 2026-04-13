# API 规格：对话与会话绑定助手（迭代 0.1.2）

## 文档信息

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.2` |
| 对应 PRD | [`iterations/0.1.2/product/prd-assistant-in-chat.md`](../product/prd-assistant-in-chat.md) |
| 对应设计 | [`iterations/0.1.2/design/spec-assistant-in-chat.md`](../design/spec-assistant-in-chat.md) |
| 基线实现 | Next.js Route Handlers：`src/app/api/chat/` |

本文描述在**现有聊天 API** 上的**契约扩展**；与当前行为不一致处标注为 **Migration**，供 3B 实现时对照。

---

## 1. 通用约定

### 1.1 鉴权

- 所有接口均需登录；未登录返回 `401`，`error.code` 为 `UNAUTHORIZED`（与现网一致）。
- 会话维度数据仅返回**当前用户**名下会话（与 `0.0.6` / `findOwnedConversation` 一致）。

### 1.2 错误响应体

沿用 `src/server/http/json-response.ts` 的 `jsonError` 形状：

```json
{ "error": { "code": "<ErrorCode>", "message": "…", "details": [ { "field": "…", "message": "…" } ] } }
```

`details` 可选，参数校验失败时建议提供。

### 1.3 助手可见性（与 0.1.1 对齐）

用户**仅可绑定**其**可读**助手，规则与控制台 `GET /api/console/assistants` 列表过滤一致（见 `src/app/api/console/assistants/route.ts` 中 QueryBuilder 条件）：

- **系统助手**（`scope = System`）：全员可读；
- **个人助手**（`scope = Personal`）：仅 `userId = 当前用户` 可读。

单条可读校验逻辑可参考 `src/app/api/console/assistants/[id]/route.ts` 中的 `findReadableAssistant`（**建议 3B 抽为** `@/server/assistant/*` 公共函数，避免重复）。

若 `assistantId` 不存在或当前用户**无权**读取：统一返回 **`ASSISTANT_NOT_FOUND` + HTTP 404**（与控制台详情一致，**不区分**「不存在」与「无权限」，避免枚举）。

---

## 2. 现有端点与变更摘要

| 方法 | 路径 | 当前行为（基线） | 0.1.2 变更要点 |
| --- | --- | --- | --- |
| GET | `/api/chat/conversations` | 分页列表；项含 `preview`、`messageCount`、`updatedAt` 等（`src/app/api/chat/conversations/route.ts`） | 扩展助手相关字段；**列表 UI 去副标题**后 `preview` 可废弃或保留兼容（见 §3.2） |
| POST | `/api/chat/conversations` | 仅接受可选 `title`，创建会话（同上） | 增加可选 `assistantId`；若绑定则**创建时**注入首条助手消息（开场白/默认问候） |
| GET | `/api/chat/conversations/:conversationId` | 返回 `id/title/createdAt/updatedAt/messageCount`（`src/app/api/chat/conversations/[conversationId]/route.ts`） | 扩展助手展示字段 |
| GET | `/api/chat/conversations/:conversationId/messages` | 分页消息；DTO 含 `id/role/content/createdAt`（`src/app/api/chat/conversations/[conversationId]/messages/route.ts`） | 契约可不变；身份展示依赖会话级 `assistant` |
| POST | `…/messages` | 用户消息入库后调用 `invokeAssistantReply` / `streamAssistantReply`（`src/server/chat/assistant.ts`） | **实现层**：有绑定时用助手 `prompt` 作为系统提示，替代固定 `CHAT_SYSTEM_PROMPT` |
| DELETE | `…/messages` | 清空消息并重置标题等（同文件） | **实现层**：与「清空后是否再注入开场白」策略一致（见实现计划） |

**本期不提供**：修改已存在会话的 `assistantId`（无 PATCH/PUT）；不提供「解绑」「换绑」类 API。

---

## 3. 资源模型（JSON）

### 3.1 `assistant`（列表/详情内嵌）

用于侧栏与消息区展示；**推荐**为**绑定快照**（见 `data-models.md`），避免列表 N+1 查 `assistants` 表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 助手主键 |
| `name` | `string` | 展示名称 |
| `icon` | `string \| null` | emoji 文案，与 `Assistant.icon` 语义一致 |

**助手不可用**（已删除或权限失效）：仍保留会话上的 `assistantId` 时，接口可返回 `assistant: null` 并增加 **`assistantUnavailable: true`**（或与设计 §3.4 一致的布尔/枚举），前端按设计做占位与降级。**若 3B 采用「清除绑定」策略**，则需产品确认，本文档建议优先**保留 id + 降级展示**以便追溯。

### 3.2 会话列表项 `GET /api/chat/conversations` → `items[]`

在现有字段基础上扩展：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `assistant` | `assistant \| null` | 无绑定为 `null` |
| `lastActivityAt` | `string`（ISO 8601） | **建议新增**，语义对齐 PRD §2.3「最后活动时间」：取该会话**最后一条消息**的 `createdAt`；若无消息则取会话 `createdAt`。**Migration**：若短期仍以 `updatedAt` 近似，须在实现说明中写明与「清空会话」等边界差异。 |
| `preview` | `string \| null` | **Migration**：当前存在；PRD F8 / 设计 §5.1 要求侧栏**不再展示预览**。后端可：**(A)** 下一版本移除或恒为 `null`；**(B)** 暂时保留供旧客户端。推荐 **A** 与产品一致。 |

排序、分页、`cursor` 规则保持与现实现一致。

### 3.3 创建会话 `POST /api/chat/conversations`

**请求体**（在现有 `title` 上扩展）：

```json
{
  "title": "可选，省略则与现网一致使用默认标题",
  "assistantId": "可选；省略或 null 表示普通对话（无绑定）"
}
```

校验：

- `assistantId` 若为非空字符串，须通过 §1.3 **可读**校验；否则 `ASSISTANT_NOT_FOUND` + 404。
- 不允许传空字符串与合法 UUID 混用等歧义形式：建议对 `assistantId` 做 trim，空串视为未传。

**响应** `201`：`conversation` 对象在现有字段上扩展：

- `assistant`: 绑定成功时为 §3.1 快照（创建时从 `Assistant` 行复制）；未绑定为 `null`。
- `messageCount`：若创建时注入首条助手消息，应为 **1**（与持久化一致）。

**副作用（核心）**：

1. 插入 `Conversation`（含 `assistantId` 或 null，见数据模型文档）。
2. 若 `assistantId` 有值：在**同一事务**中插入一条 `role = Assistant` 的消息，内容为：
   - `Assistant.openingMessage` 非空（trim 规则在实现计划中写死）：使用该内容；
   - 为空：使用设计文档 **§6.1** 固定文案：**「你好，我是你的助手。需要什么帮助？」**（见 `iterations/0.1.2/design/spec-assistant-in-chat.md`）。
3. 更新会话 `updatedAt` / 与 `lastActivityAt` 计算一致。

### 3.4 会话详情 `GET /api/chat/conversations/:conversationId`

在 `src/app/api/chat/conversations/[conversationId]/route.ts` 现返回结构上增加：

- `assistant`: `assistant | null`（与列表同源字段，优先快照列）。
- 可选：`lastActivityAt`（与列表同语义，便于前端仅拉详情时渲染侧栏时间）。

---

## 4. 消息与模型链路（契约影响）

### 4.1 拉取消息 `GET …/messages`

- 响应体可保持 `{ items, nextCursor }`；**不要求**每条助手消息重复携带助手信息（会话级已足够）。

### 4.2 发送消息 `POST …/messages`

- 请求/响应形状**无需**为 0.1.2 改变；**实现上**当会话存在 `assistantId` 时：
  - LangChain 消息构造（`src/server/chat/assistant.ts` 中 `toLangChainMessages`）应将 **首条 `SystemMessage`** 从固定 `CHAT_SYSTEM_PROMPT` 切换为该助手 **`Assistant.prompt`**；无绑定时维持现状。
- 流式与非流式两条路径均需一致。

### 4.3 与 `src/server/llm/assistant.ts` 的关系

- 现存 `getAssistantAgent`（`createAgent` + `systemPrompt`）面向 **Agent** 形态；当前对话主链路使用 **`invoke`/`stream` + Chat 消息列表**（`src/server/chat/assistant.ts`）。
- **3B 建议**：在 `chat/assistant` 层注入 **SystemMessage(assistant.prompt)**，与 `llm/assistant.ts` 的「systemPrompt 来自 Assistant 行」语义对齐，但**不必**强制改用 `createAgent`，除非产品后续统一编排方式。

---

## 5. 开场白幂等与清空会话

### 5.1 创建时注入（幂等）

- **仅当** `POST /conversations` 且绑定助手时插入首条助手消息。
- **禁止**在用户多次打开会话或重复 `GET /messages` 时再次插入（当前架构下首条仅在创建事务内插入即可保证）。

### 5.2 清空消息 `DELETE …/messages`

- PRD §3.2 AC4 与设计 §2.4：**方案 A（推荐）**清空后**不再**注入开场白；**方案 B** 需再次注入且仅一条。
- **幂等**：若选 B，须保证重复调用 DELETE 或重复进入**不会叠加**多条欢迎语（例如仅在「清空后首次 GET 且 messageCount=0」注入 —— 会污染 GET 语义，**不推荐**；更优是 **DELETE 末尾同步插入一条** 或 **会话级标志位**）。

---

## 6. 错误码与 HTTP 状态对齐

| 场景 | `error.code` | HTTP | 备注 |
| --- | --- | --- | --- |
| 未登录 | `UNAUTHORIZED` | 401 | 现网一致 |
| `limit`/`cursor` 等参数非法 | `VALIDATION_ERROR` | 422 | 列表/消息现网一致 |
| 会话不存在或无权 | `CONVERSATION_NOT_FOUND` | 404 | 现网一致 |
| `assistantId` 不可读或不存在 | `ASSISTANT_NOT_FOUND` | 404 | 与 `src/app/api/console/assistants/[id]/route.ts` 一致 |
| 模型调用失败 | `MODEL_ERROR` | 502（非流）/ SSE `error` 事件（流） | 现网 `messages` POST 一致 |

**本期不建议新增** ErrorCode；若未来需区分「助手被删除」与「无权限」，再考虑扩展并同步前端。

---

## 7. 可选：聊天侧助手列表

若前端希望在 `/chat` 内复用与控制台一致的列表而不走 console 路径，可新增（**非必须**，3B 按前端选型决定）：

- `GET /api/chat/assistants`：分页/关键字，可见性规则同 §1.3。

该端点**不在**当前 `src/app/api/chat/` 树内，属增量；若不加，前端可继续调用 `GET /api/console/assistants`（需处理路径与权限一致）。

---

## 8. 文档参考路径索引

| 路径 | 用途 |
| --- | --- |
| `src/app/api/chat/conversations/route.ts` | 列表/创建 |
| `src/app/api/chat/conversations/[conversationId]/route.ts` | 详情/删会话 |
| `src/app/api/chat/conversations/[conversationId]/messages/route.ts` | 消息 CRUD + 流式 |
| `src/server/chat/assistant.ts` | LangChain 消息与 `invoke`/`stream` |
| `src/server/chat/llm-runtime.ts` | `getChatRuntimeModel` |
| `src/server/db/entities/Conversation.ts` | 会话实体（当前无 `assistantId`） |
| `src/server/db/entities/Assistant.ts` | 助手实体字段 |
| `src/common/enums/http.ts` | `ErrorCode` / `HttpStatus` |

---

## 9. 变更记录

| 日期 | 说明 |
| --- | --- |
| 2026-04-13 | 初稿：REST 扩展、错误码、幂等与权限；与现网文件对齐。 |
