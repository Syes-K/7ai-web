# API 规格：对话页 — 会话与消息（0.0.6）

## 1. 约定

| 项 | 说明 |
| --- | --- |
| 基础路径 | Next.js App Router：`src/app/api/` 下 Route Handlers；本文建议统一前缀 **`/api/chat`**（与实现时可微调，但需全站一致）。 |
| 内容类型 | 非流式接口：`application/json; charset=utf-8`。 |
| 鉴权 | 与既有 **`GET /api/auth/me`** 一致：依赖 **Session Cookie** + `getCurrentUser()`；**未登录**返回 **401**。所有会话/消息资源必须校验归属 **当前 `user.id`**。 |
| 用户隔离 | 列表、详情、消息、发送、清空均仅操作 **当前登录用户** 的数据；通过 `conversation.userId === currentUser.id` 校验，失败视为 **404**（防枚举）或 **403**（见 §4）。 |
| ID | 会话 ID、消息 ID 建议使用 **UUID**（与 `users.id` 风格一致）。 |

### 1.1 与 PRD / 设计稿的一致性

| 要求 | API 行为 |
| --- | --- |
| PRD「清空保留条目」 | **清空** = 删除该会话下全部 **Message** 行；**Conversation** 行保留。详见 [data-models.md](./data-models.md)。 |
| 设计稿「列表按最后更新时间倒序」 | **列出会话**默认按 **`updatedAt` DESC**；与「默认选中第一条 = 最近活跃」一致（前端首屏取列表第一项作为默认 `conversationId`）。 |
| 设计稿标题规则（§6.1） | 会话 **`title`** 由服务端维护：新建无用户消息时为「新对话」语义；首条用户消息后由首条内容截断生成；清空后无消息时回退为「新对话」或产品选定文案。响应体携带 `title` 供列表展示。 |

---

## 2. 端点一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/chat/conversations` | 创建会话 |
| `GET` | `/api/chat/conversations` | 分页列出当前用户的会话 |
| `GET` | `/api/chat/conversations/:conversationId` | 获取会话详情 |
| `DELETE` | `/api/chat/conversations/:conversationId/messages` | **清空**该会话内全部消息 |
| `GET` | `/api/chat/conversations/:conversationId/messages` | 分页获取消息列表 |
| `POST` | `/api/chat/conversations/:conversationId/messages` | 发送用户消息并返回助手回复（见 §3.6 流式） |

> **说明**：PRD 将「删除整条会话」列为 Out of Scope，故不提供 `DELETE /conversations/:id`（删除会话行）。

---

## 3. 端点详述

### 3.1 `POST /api/chat/conversations` — 创建会话

**鉴权**：必填；未登录 **401**。

**请求体**：可为空对象 `{}`，或可选字段：

```json
{
  "title": "string | null"
}
```

| 字段 | 说明 |
| --- | --- |
| `title` | 可选；缺省则服务端使用默认「新对话」等价标题。 |

**响应** `201`：

```json
{
  "conversation": {
    "id": "uuid",
    "title": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601",
    "messageCount": 0
  }
}
```

| 错误 | HTTP | 说明 |
| --- | --- | --- |
| 未登录 | 401 | 与 `/api/auth/me` 一致 |
| 参数非法 | 422 | `VALIDATION_ERROR`，可选 `details[]` |
| 服务端异常 | 500 | `INTERNAL_ERROR` |

---

### 3.2 `GET /api/chat/conversations` — 列出会话

**鉴权**：必填；未登录 **401**。

**Query**（cursor 分页）：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `limit` | number | 可选，默认如 `20`，上限如 `50` |
| `cursor` | string | 可选，**opaque**（实现可选用 `updatedAt` + `id` 组合编码）；第一页不传 |

**排序**：固定 **`updatedAt DESC`**，同毫秒时 **`id DESC`** 稳定排序（与设稿「最近在上」一致）。

**响应** `200`：

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "string",
      "updatedAt": "ISO8601",
      "createdAt": "ISO8601",
      "preview": "string | null",
      "messageCount": 0
    }
  ],
  "nextCursor": "string | null"
}
```

| 字段 | 说明 |
| --- | --- |
| `preview` | 可选；最后一条消息摘要，无消息时为 `null`（与设计「副行预览」一致，可后续迭代）。 |
| `nextCursor` | 无更多数据时为 `null`。 |

| 错误 | HTTP | 说明 |
| --- | --- | --- |
| 未登录 | 401 | |
| `limit` 非法 | 422 | |
| 服务端异常 | 500 | |

---

### 3.3 `GET /api/chat/conversations/:conversationId` — 会话详情

**鉴权**：必填。

**响应** `200`：

```json
{
  "conversation": {
    "id": "uuid",
    "title": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601",
    "messageCount": 0
  }
}
```

| 错误 | HTTP | 说明 |
| --- | --- | --- |
| 未登录 | 401 | |
| 不存在或无权限 | **404** | 建议使用统一 `NOT_FOUND` 或资源专用码（见 §4），不泄露资源是否存在 |
| 服务端异常 | 500 | |

---

### 3.4 `DELETE /api/chat/conversations/:conversationId/messages` — 清空消息

对应 PRD **「清空当前会话消息」**：删除该会话下**所有**消息行；**会话行保留**。

**鉴权**：必填。

**请求体**：无。

**成功** `200`：

```json
{
  "conversation": {
    "id": "uuid",
    "title": "string",
    "updatedAt": "ISO8601",
    "messageCount": 0
  },
  "deletedCount": 0
}
```

**服务端副作用**（与设计 §6.1 对齐）：

- 物理删除 `Message` 表中 `conversationId` 匹配行。
- **更新** `Conversation.updatedAt`（便于列表排序「最近清空」浮到顶部，可选产品策略；若产品希望清空后排序不变，可仅更新 `title` 而不 bump `updatedAt` — **建议与产品确认**；默认文档取 **更新 `updatedAt`** 以反映「最后操作时间」）。
- **`title`**：无剩余用户消息时回退为默认「新对话」类标题（与设计「已清空 → 新对话」一致）。

| 错误 | HTTP | 说明 |
| --- | --- | --- |
| 未登录 | 401 | |
| 不存在或无权限 | 404 | |
| 服务端异常 | 500 | |

---

### 3.5 `GET /api/chat/conversations/:conversationId/messages` — 消息列表

**鉴权**：必填。

**Query**：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `limit` | number | 默认如 `50`，上限如 `200` |
| `cursor` | string | 可选，向前分页（通常按时间正序展示时，用「早于某条」或分段 key） |
| `order` | `"asc" \| "desc"` | 可选；默认 **`asc`**（从早到晚，符合聊天时间线）。 |

**响应** `200`：

```json
{
  "items": [
    {
      "id": "uuid",
      "role": "user | assistant | system",
      "content": "string",
      "createdAt": "ISO8601"
    }
  ],
  "nextCursor": "string | null"
}
```

| 错误 | HTTP | 说明 |
| --- | --- | --- |
| 未登录 | 401 | |
| 不存在或无权限 | 404 | |
| 参数非法 | 422 | |
| 服务端异常 | 500 | |

---

### 3.6 `POST /api/chat/conversations/:conversationId/messages` — 发送并得助手回复

**鉴权**：必填。

**请求体**：

```json
{
  "content": "string",
  "stream": false
}
```

| 字段 | 说明 |
| --- | --- |
| `content` | 用户输入；非空 trim，最大长度由服务端校验（具体上限 3B 定）。 |
| `stream` | 可选，默认 `false`。`true` 时走 **SSE**（见 §5）。 |

#### 非流式 `200`

持久化顺序建议：**先写 user 消息 → 调 LangChain → 写 assistant 消息**；响应：

```json
{
  "userMessage": {
    "id": "uuid",
    "role": "user",
    "content": "string",
    "createdAt": "ISO8601"
  },
  "assistantMessage": {
    "id": "uuid",
    "role": "assistant",
    "content": "string",
    "createdAt": "ISO8601"
  },
  "conversation": {
    "id": "uuid",
    "title": "string",
    "updatedAt": "ISO8601"
  }
}
```

发送成功后应更新会话 **`updatedAt`**，并在首条用户消息后更新 **`title`**（设计 §6.1）。

| 错误 | HTTP | 说明 |
| --- | --- | --- |
| 未登录 | 401 | |
| 不存在或无权限 | 404 | |
| `content` 非法（空、超长） | 422 | `VALIDATION_ERROR` |
| 模型不可用 / 超时 | 502 或 500 | 可区分 `MODEL_ERROR` / `INTERNAL_ERROR`（3B 在 `@/common/enums` 扩展） |
| 服务端异常 | 500 | |

#### 流式：见 §5

---

## 4. 错误响应体（对齐既有工程）

与 `jsonError` 一致，形如：

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "人类可读说明",
    "details": [{ "field": "content", "message": "..." }]
  }
}
```

| HTTP | 典型 `code` | 场景 |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | 未登录 |
| 403 | `FORBIDDEN` | 已登录但策略禁止（本功能若仅用 404 隐藏资源，可少用 403） |
| 404 | `USER_NOT_FOUND` 或新增 **`CONVERSATION_NOT_FOUND`**（建议） | 会话不存在或无权 |
| 422 | `VALIDATION_ERROR` | 参数校验 |
| 500 | `INTERNAL_ERROR` | 未捕获异常 |

> **枚举扩展**：新增业务码在 **`@/common/enums`**（如 `CONVERSATION_NOT_FOUND`、`MODEL_ERROR`）集中定义，避免魔法字符串。

---

## 5. 流式响应（SSE / Web 约定）

当 `stream: true`（或专用路径如 `.../messages?stream=1`，二选一，实现统一即可）：

| 项 | 约定 |
| --- | --- |
| Header | `Content-Type: text/event-stream; charset=utf-8` |
| 连接 | `Cache-Control: no-cache`，`Connection: keep-alive`（按需） |
| 事件名 | 建议：`message`（子类型在 data JSON 内区分）或分事件 `token` / `done` / `error` |

**示例（data 为 JSON 字符串）**：

```
event: meta
data: {"conversationId":"uuid"}

event: user_message
data: {"id":"uuid","role":"user","content":"...","createdAt":"..."}

event: assistant_delta
data: {"text":"片段"}

event: assistant_done
data: {"id":"uuid","role":"assistant","content":"全文","createdAt":"..."}

event: error
data: {"code":"MODEL_ERROR","message":"..."}
```

**语义**：

- 流开始前可已持久化 user 消息，或在首个 `assistant_delta` 前写入（3B 需统一事务与失败回滚策略）。
- 结束时 **`assistant_done`** 与 DB 中助手消息一致。
- 客户端断开：服务端可选择中止生成；已持久化内容以 3B 策略为准。

**与 LangChain**：流式须通过 **LangChain** 的异步迭代（如 `streamEvents` / `stream`）输出 token，经 SSE 转发；见 [implementation-plan.md](./implementation-plan.md)。

---

## 6. 与前端对接提示

- **默认选中**：`GET /conversations` 第一项即设计稿「最近活跃」。
- **清空后**：列表仍含该 `id`；`messageCount === 0`；`title` 回退；前端草稿应按设计 §5.4 同步清除（客户端行为，非 API）。
- **防串会话**：切换会话时重新拉取消息列表；请求未完成前不混显（前端）；服务端始终以路径中的 `conversationId` 为准。
