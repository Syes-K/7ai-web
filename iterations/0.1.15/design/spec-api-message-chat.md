# API 错误消息规格 — Chat 域与跨域通用（version 0.1.15）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.15` |
| 命名空间 | `api.message`（`messages/{locale}/api/message.json`） |
| 策略 | **方案 A**：服务端 `resolveRequestLocale` + `tApiMessage` → `error.message` |
| 范围 | `/api/chat/conversations/**`（4 route 文件）+ `withReadOnlyApi` + 通用 validation 扩展 |
| 上游 | `user-stories-api-i18n.md`、`prd.md` 模块 F |

---

## 1. Locale 解析（服务端）

与 0.1.14 相同：Cookie `NEXT_LOCALE` → `Accept-Language` → `en`。

**本期调用点：**

- `src/app/api/chat/conversations/route.ts`
- `src/app/api/chat/conversations/[conversationId]/route.ts`
- `src/app/api/chat/conversations/[conversationId]/messages/route.ts`
- `src/app/api/chat/conversations/[conversationId]/turns/route.ts`
- `src/server/chat/post-message-pipeline.ts`（`validatePostMessageBody`）
- `src/server/auth/with-readonly-api.ts`
- SSE `error` 事件 payload（messages route 流式分支）

---

## 2. ErrorCode ↔ message key 映射表（0.1.15 必达）

| ErrorCode | message key | 现网中文（route） | 路由 / 场景 |
| --- | --- | --- | --- |
| `UNAUTHORIZED` | `unauthorized`（已有） | 未登录 | 全部 chat routes GET/POST/DELETE |
| `CONVERSATION_NOT_FOUND` | `conversationNotFound` | 会话不存在 | GET/PATCH/DELETE conv；messages；turns |
| `ASSISTANT_NOT_FOUND` | `assistantNotFound` | 助手不存在 | POST create conversation |
| `VALIDATION_ERROR` | 见 §2.2 | 多种 | body/limit/retry 等 |
| `MODEL_ERROR` | `modelError` | 模型调用失败 | messages POST 流式/非流式 |
| `INTERNAL_ERROR` | `createConversationFailed` | 创建会话失败 | POST create conversation catch |
| `FORBIDDEN` | `readOnlyAccountBlocked` | 测试账户… | `withReadOnlyApi` |
| `FORBIDDEN` | `forbidden`（已有） | 无权访问 | 非只读场景（若有） |

### 2.1 新增 top-level key（相对 0.1.14）

| key | en | zh |
| --- | --- | --- |
| `conversationNotFound` | This conversation does not exist or was removed. | 会话不存在 |
| `assistantNotFound` | The selected assistant does not exist or is unavailable. | 助手不存在 |
| `modelError` | The model failed to respond. Try again later. | 模型调用失败，请稍后重试 |
| `readOnlyAccountBlocked` | This test account is read-only. You cannot create, edit, or delete data. | 您访问的是测试账户，不能进行数据的修改和删除 |
| `createConversationFailed` | Could not create the conversation. Try again later. | 创建会话失败 |
| `limitParamInvalid` | Invalid limit parameter. | limit 参数无效 |
| `retryTargetNotFound` | The message to retry could not be found. | 重试目标用户消息不存在 |

**注：** `modelError` 为泛化用户提示；内部 exception message **不**透传至客户端。

### 2.2 `VALIDATION_ERROR` 细分 key

| 场景 | key | 现网中文 |
| --- | --- | --- |
| 通用回退 | `validationError`（已有） | 请求参数不合法 |
| 请求体非 JSON | `validation.invalidJson`（已有） | 请求体须为 JSON |
| GET limit（列表） | `limitParamInvalid` + details | limit 参数无效 / 须为 1～50 的正整数 |
| GET limit（messages） | `limitParamInvalid` + details | limit 参数无效 / 须为正整数 |
| content 类型错误 | `validation.contentInvalid` | content 无效 / 须为非空字符串 |
| content 空 | `validation.contentEmpty` | content 不能为空 / 不能为空 |
| content 超长 | `validation.contentTooLong` | content 过长 / 长度不能超过 N 个字符 |
| retryUserMessageId | `retryTargetNotFound` + details | 重试目标… / 无效或无权限 |

**details[].message：** 可选继续返回字段级译文（与主 message 同 locale）；frontend 仍以主 `error.message` 展示为主。

### 2.3 SSE 流式 `error` 事件

```typescript
send("error", {
  code: ErrorCode.MODEL_ERROR,
  message: tApiMessage(locale, "modelError"),
});
```

客户端 `chat-api.ts`：`handlers.onError(err.message ?? t('errors.sseUnknown'))`。

---

## 3. 带参数文案 — ICU

### 3.1 `validation.contentTooLong`

| locale | 值 |
| --- | --- |
| **en** | `Message is too long. Maximum {max} characters.` |
| **zh** | `消息过长，长度不能超过 {max} 个字符` |

参数：`max` = `CHAT_USER_MESSAGE_MAX_LENGTH`。

### 3.2 其它

本期 chat 域除 `contentTooLong` 外均为静态字符串。`authLoginLocked` 等 auth key 不变。

---

## 4. `withReadOnlyApi`（US-F1）

| 之前 | 之后 |
| --- | --- |
| 硬编码 `READ_ONLY_BLOCK_MESSAGE` | `tApiMessage(locale, 'readOnlyAccountBlocked')` |
| — | `resolveRequestLocale(req)` 在拦截分支调用 |

Chat UI 只读 toast 使用 `page.chat.errors.readOnlyBlocked`（与 API 语义等价，略短）。

---

## 5. 服务端 turn `safeMessage`（Q6 设计推荐）

**用户可见、经 UI 展示的**新发 turn 步骤 `safeMessage`（如「模型正在生成回复」）应在 emit 时用 `tApiMessage` 或专用 `api.message` / `page.chat` key 生成。

| 策略 | 说明 |
| --- | --- |
| **推荐（backend 0.1.15）** | messages route 内写 `safeMessage` 处改为 locale 感知 |
| 历史快照 | 已存中文 `safeMessage` **不** retro-translate |
| 客户端标签 | `知识库增强`、`MCP 工具` 等固定标签走 `page.chat.turn.stage.*` |

本期 backend 文档须列出需改造的 `safeMessage` 常量清单（messages route 内 ~15 处）。

---

## 6. 前端展示约定

| 场景 | 来源 |
| --- | --- |
| REST 错误 | 直接展示 `error.message` |
| Toast catch | `e.message` 若来自 `ChatApiError` 则为 API 译文；否则 `toast.*` |
| SSE error | API message 或 `errors.sseUnknown` |
| 只读 | API + `errors.readOnlyBlocked` |

**Q11-A（设计推荐）：** 抽 `@/common/utils/parse-api-error.ts`，接受 `tApiFallback` 或 `locale`，统一 `errors.requestFailed`（含 `{status}` ICU）。

---

## 7. 完整 JSON 增量 — `messages/en/api/message.json`（0.1.15 追加）

在 0.1.14 基础上**追加**：

```json
{
  "conversationNotFound": "This conversation does not exist or was removed.",
  "assistantNotFound": "The selected assistant does not exist or is unavailable.",
  "modelError": "The model failed to respond. Try again later.",
  "readOnlyAccountBlocked": "This test account is read-only. You cannot create, edit, or delete data.",
  "createConversationFailed": "Could not create the conversation. Try again later.",
  "limitParamInvalid": "Invalid limit parameter.",
  "retryTargetNotFound": "The message to retry could not be found.",
  "validation": {
    "contentInvalid": "Message must be a non-empty string.",
    "contentEmpty": "Message cannot be empty.",
    "contentTooLong": "Message is too long. Maximum {max} characters.",
    "limitPositiveInteger": "Must be a positive integer.",
    "limitRange": "Must be an integer from 1 to 50.",
    "retryMessageInvalid": "Invalid or not allowed."
  }
}
```

**zh 对称追加**（见 §8）。

---

## 8. 完整 JSON 增量 — `messages/zh/api/message.json`（0.1.15 追加）

```json
{
  "conversationNotFound": "会话不存在",
  "assistantNotFound": "助手不存在",
  "modelError": "模型调用失败，请稍后重试",
  "readOnlyAccountBlocked": "您访问的是测试账户，不能进行数据的修改和删除",
  "createConversationFailed": "创建会话失败",
  "limitParamInvalid": "limit 参数无效",
  "retryTargetNotFound": "重试目标用户消息不存在",
  "validation": {
    "contentInvalid": "须为非空字符串",
    "contentEmpty": "不能为空",
    "contentTooLong": "长度不能超过 {max} 个字符",
    "limitPositiveInteger": "须为正整数",
    "limitRange": "须为 1～50 的正整数",
    "retryMessageInvalid": "无效或无权限"
  }
}
```

---

## 9. Key 树（0.1.15 增量）

```
api.message
├── …（0.1.14 auth keys 保留）
├── conversationNotFound
├── assistantNotFound
├── modelError
├── readOnlyAccountBlocked
├── createConversationFailed
├── limitParamInvalid
├── retryTargetNotFound
└── validation
    ├── …（0.1.14 保留）
    ├── contentInvalid
    ├── contentEmpty
    ├── contentTooLong      ← ICU {max}
    ├── limitPositiveInteger
    ├── limitRange
    └── retryMessageInvalid
```

**数量级：** 本期新增 **7** 个 top-level key + **6** 个 `validation.*` 子 key（共 **13** 个新 key；含 ICU 1 个）。复用 auth 已有 **4** 个（`unauthorized`、`forbidden`、`validationError`、`validation.invalidJson`）。

---

## 10. route → key 速查（backend 实现）

| 文件 | 现网 message | tApiMessage key |
| --- | --- | --- |
| `conversations/route.ts` GET | 未登录 | `unauthorized` |
| | limit 无效 | `limitParamInvalid` + details `validation.limitRange` |
| | 未登录 POST | `unauthorized` |
| | 非 JSON | `validation.invalidJson` |
| | 助手不存在 | `assistantNotFound` |
| | 创建失败 | `createConversationFailed` |
| `[id]/route.ts` | 未登录 / 不存在 | `unauthorized` / `conversationNotFound` |
| `messages/route.ts` GET | limit 无效 | `limitParamInvalid` + `validation.limitPositiveInteger` |
| | POST validate | `validation.content*` / `retryTargetNotFound` |
| | MODEL_ERROR | `modelError` |
| | SSE error | `modelError` |
| `turns/route.ts` | 未登录 / 不存在 | `unauthorized` / `conversationNotFound` |
| `post-message-pipeline.ts` | content 校验 | 同上 validation keys |
| `with-readonly-api.ts` | 只读 | `readOnlyAccountBlocked` |

---

## 11. 安全与语义等价

| key | 约束 |
| --- | --- |
| `conversationNotFound` | 不泄露会话是否曾属于他人 |
| `assistantNotFound` | 不泄露助手 id 是否存在 vs 无权限 |
| `readOnlyAccountBlocked` | 明确只读，不披露内部 flag 名 |
| `modelError` | 不暴露 provider 栈或 API key 信息 |

---

## 12. 验收检查表

- [ ] `en` UI + cookie=en → chat API 错误为英文
- [ ] `zh` UI → 与现网中文语义一致
- [ ] 空 message POST → `validation.contentEmpty`
- [ ] 超长 message → ICU `{max}` 中英正确
- [ ] 只读 POST delete conversation → `readOnlyAccountBlocked`
- [ ] SSE MODEL_ERROR → 英文 message
- [ ] `withReadOnlyApi` 全站写 API 生效（不仅 chat）
