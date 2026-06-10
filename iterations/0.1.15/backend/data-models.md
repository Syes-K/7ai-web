# 数据模型 — Chat 域 API i18n（version 0.1.15）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.15` |
| 阶段 | 3A 文档 |
| 持久化 | **无 SQLite / TypeORM 变更** |

---

## 1. 数据库变更声明

> **本期无数据库 schema 变更。**

| 项 | 结论 |
| --- | --- |
| 新增/修改 Entity | **无** |
| Migration | **无** |
| `ChatTurn.stepsSnapshotJson` 结构 | **不变**；`safeMessage` 字段仍为 string，**值**随 locale 写入（历史中文快照保留） |
| 语言偏好存储 | **浏览器 Cookie `NEXT_LOCALE` only**（延续 0.1.13/0.1.14） |

---

## 2. Locale 模型（延续 0.1.14）

复用现网符号，**3B 不新增 enum**：

| 符号 | 路径 |
| --- | --- |
| `SUPPORTED_LOCALES` / `AppLocale` / `DEFAULT_LOCALE` / `LOCALE_COOKIE` | `@/common/constants/i18n` |
| `resolveLocaleFromCookieAndHeader` | `@/common/utils/i18n` |
| `resolveRequestLocale` | `@/server/i18n/resolve-request-locale` |
| `tApiMessage` | `@/server/i18n/t-api-message` |

**解析顺序（Q5-A）**：Cookie `NEXT_LOCALE` → `Accept-Language`（`zh*` → `zh`）→ 默认 `en`。

**API 路径不加 locale 前缀**；Chat API 与 UI locale 通过 cookie 对齐。

---

## 3. `api/message.json` 增量（0.1.15）

在 0.1.14 认证域 key 基础上**追加**（设计终稿见 `../design/spec-api-message-chat.md` §7–8）。

### 3.1 新增 top-level key（7）

| key | ErrorCode 场景 | ICU |
| --- | --- | --- |
| `conversationNotFound` | `CONVERSATION_NOT_FOUND` | — |
| `assistantNotFound` | `ASSISTANT_NOT_FOUND` | — |
| `modelError` | `MODEL_ERROR` | — |
| `readOnlyAccountBlocked` | `FORBIDDEN`（只读） | — |
| `createConversationFailed` | `INTERNAL_ERROR` | — |
| `limitParamInvalid` | `VALIDATION_ERROR`（limit 主 message） | — |
| `retryTargetNotFound` | `VALIDATION_ERROR`（retry 主 message） | — |

### 3.2 新增 `validation.*` 子 key（6）

| key | 场景 |
| --- | --- |
| `validation.contentInvalid` | content 非 string |
| `validation.contentEmpty` | content 空 |
| `validation.contentTooLong` | content 超长（ICU `{max}`） |
| `validation.limitPositiveInteger` | messages GET limit details |
| `validation.limitRange` | conversations GET limit details（1～50） |
| `validation.retryMessageInvalid` | retryUserMessageId details |

### 3.3 复用 0.1.14 已有 key（Chat 域）

| key | ErrorCode |
| --- | --- |
| `unauthorized` | `UNAUTHORIZED` |
| `forbidden` | `FORBIDDEN`（非只读，Chat 域本期未用） |
| `validationError` | `VALIDATION_ERROR` 兜底 |
| `validation.invalidJson` | POST body 非 JSON |

### 3.4 Key 树（增量后摘要）

```
api.message
├── …（0.1.14 auth keys）
├── conversationNotFound          ← 新增
├── assistantNotFound             ← 新增
├── modelError                    ← 新增
├── readOnlyAccountBlocked        ← 新增
├── createConversationFailed      ← 新增
├── limitParamInvalid             ← 新增
├── retryTargetNotFound           ← 新增
└── validation
    ├── …（0.1.14 auth 子 key）
    ├── contentInvalid            ← 新增
    ├── contentEmpty              ← 新增
    ├── contentTooLong            ← 新增 ICU {max}
    ├── limitPositiveInteger      ← 新增
    ├── limitRange                ← 新增
    └── retryMessageInvalid       ← 新增
```

**统计**：本期 REST/只读拦截新增 **13** 个 key。

### 3.5 SSE `turnSafe.*` key（3B 可选同批追加）

新发 turn 写入 `stepsSnapshotJson` 的 `safeMessage` 建议使用 `api.message.turnSafe.*`（服务端 `tApiMessage` 可读，与 `page.chat.turn.*` UI 标签分离）：

| key | 现网中文 |
| --- | --- |
| `turnSafe.retryReused` | 已复用原用户消息重试 |
| `turnSafe.modelGenerating` | 模型正在生成回复 |
| `turnSafe.modelCompleted` | 模型回复生成完成 |
| `turnSafe.modelFailed` | 模型回复生成失败 |
| `turnSafe.kbHit` | 已命中 {count} 个知识片段（ICU） |
| `turnSafe.kbMiss` | 未命中可用知识片段 |
| `turnSafe.summaryProcessing` | 摘要回调处理中 |
| `turnSafe.summaryCompleted` | 摘要回调已完成 |
| `turnSafe.mcpNoAssistant` | 未绑定助手，未加载 MCP |
| `turnSafe.mcpNotMounted` | 助手未挂载 MCP |
| `turnSafe.mcpLoadFailed` | 已挂载 {count} 个 MCP，工具加载失败（ICU） |
| `turnSafe.mcpLoaded` | 已加载 {loaded} 个 MCP，共 {toolCount} 个工具（ICU） |

**注**：`turnSafe.*` 不计入 PRD「13 key」REST 增量，但 Q6-A 要求 3B 一并落地；详见 `api-spec.md` §6。

---

## 4. ErrorCode ↔ message key 映射表（Chat 域全量）

> 同一 `ErrorCode` 可按场景选用不同 key（与 0.1.14 一致）。

| ErrorCode | message key | HTTP | 触发位置 |
| --- | --- | --- | --- |
| `UNAUTHORIZED` | `unauthorized` | 401 | 4 routes 全部鉴权失败 |
| `CONVERSATION_NOT_FOUND` | `conversationNotFound` | 404 | `[id]/route`、`messages`、`turns` |
| `ASSISTANT_NOT_FOUND` | `assistantNotFound` | 404 | `conversations/route` POST |
| `VALIDATION_ERROR` | `limitParamInvalid` + `details[].message` = `validation.limitRange` | 422 | GET conversations `limit` |
| `VALIDATION_ERROR` | `limitParamInvalid` + `validation.limitPositiveInteger` | 422 | GET messages `limit` |
| `VALIDATION_ERROR` | `validation.invalidJson` | 422 | POST conversations / messages body parse |
| `VALIDATION_ERROR` | `validation.contentInvalid` + details | 422 | `validatePostMessageBody` type |
| `VALIDATION_ERROR` | `validation.contentEmpty` + details | 422 | content 空 |
| `VALIDATION_ERROR` | `validation.contentTooLong` + details（ICU `{max}`） | 422 | content 超长 |
| `VALIDATION_ERROR` | `retryTargetNotFound` + `validation.retryMessageInvalid` | 422 | retry 目标不存在 |
| `MODEL_ERROR` | `modelError` | 502 | messages POST 非流式 catch |
| `MODEL_ERROR` | `modelError` | —（SSE） | messages POST 流式 `event: error` |
| `INTERNAL_ERROR` | `createConversationFailed` | 500 | POST create 事务后 conv 缺失 |
| `FORBIDDEN` | `readOnlyAccountBlocked` | 403 | `withReadOnlyApi` 写操作拦截 |

**响应体 schema 不变**：

```typescript
{
  error: {
    code: ErrorCode;
    message: string;  // 已翻译
    details?: { field: string; message: string }[];
  }
}
```

---

## 5. 路由 Segment 模型（middleware 变更）

| URL segment | 0.1.14 | 0.1.15 |
| --- | --- | --- |
| `chat` | `KNOWN_APP_SEGMENTS` 成员；裸 `/chat` 受保护 | **移除**；`/chat` → 302 `/{locale}/chat` |
| `en` / `zh` | home、login、register | **+** `chat` 子路由 |
| `console`、`admin`、`knowledge` | 未接入 i18n | **不变**（批次 2–4） |

```typescript
const KNOWN_APP_SEGMENTS = new Set([
  // "chat",  ← 0.1.15 移除
  "console",
  "admin",
  "knowledge",
  "api",
]);
```

---

## 6. Cookie 与 API locale 对齐

| 场景 | 期望 |
| --- | --- |
| 用户在 `/en/chat`，cookie `NEXT_LOCALE=en` | Chat API 错误英文 |
| LanguageSwitcher 切至 `/zh/chat` | cookie 更新为 `zh`；下一 API 请求中文错误 |
| 无 cookie，`Accept-Language: zh-CN` | API 中文错误 |
| fetch Chat API | **`credentials: 'include'`**（携带 cookie） |

---

## 7. 关联文档

- HTTP 行为与示例：`api-spec.md`
- 3B 步骤：`implementation-plan.md`
- 风险：`risks-and-open-items.md`
