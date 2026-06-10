# API / HTTP 路由与 Middleware 行为规格 — Chat 域 i18n（version 0.1.15）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.15` |
| 阶段 | 3A 文档 |
| 说明 | Chat 域 API **错误 message 双语**；middleware **chat 路由迁移**；REST **成功**响应 schema **不变** |
| 基线 | `../../0.1.14/backend/api-spec.md` |
| 设计终稿 | `../design/spec-api-message-chat.md`、`../design/spec-routing-locale-chat.md` |

---

## 1. REST API 变更声明

### 1.1 总览

| 项 | 结论 |
| --- | --- |
| 新增 Route Handler | **无** |
| 修改 Route Handler | **有** — 4 个 chat route 文件错误路径 + `post-message-pipeline.ts` + `with-readonly-api.ts` |
| 请求体 schema | **无** |
| 响应体 schema（成功） | **无** |
| 响应体 schema（错误） | **无结构变更** — `{ error: { code, message, details? } }`；`message` 随 locale 变化 |
| SSE 事件 schema | **无结构变更** — `event: error` 的 `message` 改为本地化 `modelError` |
| 鉴权逻辑 | **无** |
| API URL | **仍** `/api/chat/...`，**无** locale 前缀 |

**策略（延续 Q1-A）**：`resolveRequestLocale(req)` → `tApiMessage(locale, key, params?)` → `jsonError(code, translatedMessage, status, details?)`。

### 1.2 本期双语范围

| 域 | 端点 | 双语 error.message |
| --- | --- | --- |
| Chat | `GET/POST /api/chat/conversations` | ✓ |
| Chat | `GET/DELETE /api/chat/conversations/:id` | ✓ |
| Chat | `GET/POST/DELETE /api/chat/conversations/:id/messages` | ✓（含 SSE `error` 事件） |
| Chat | `GET /api/chat/conversations/:id/turns` | ✓ |
| 共享 | `withReadOnlyApi`（经 `withApiWrapper` 包裹全部写 API） | ✓ |
| Middleware | `/chat` legacy 302、`/{locale}/chat` 未登录跳转 | ✓（redirect URL 变更） |
| **非目标** | `/api/console/**`、`/api/admin/**`、`/api/knowledge-bases/**` | ✗ 仍中文 |

---

## 2. Locale 解析与 `tApiMessage` 调用约定

### 2.1 解析顺序（Q5-A）

```
1. Cookie NEXT_LOCALE     → 值 ∈ { en, zh }
2. Accept-Language        → zh* → zh；否则 → en
3. 默认                   → en
```

**实现**：`resolveRequestLocale(req)`（`@/server/i18n/resolve-request-locale`）。

**每个 route handler 模式**（对齐 0.1.14 login）：

```typescript
export const GET = withApiWrapper(async (req: Request) => {
  const locale = resolveRequestLocale(req);
  // ...
  return jsonError(
    ErrorCode.UNAUTHORIZED,
    tApiMessage(locale, "unauthorized"),
    HttpStatus.UNAUTHORIZED,
  );
});
```

### 2.2 `details[].message` 约定

字段级 `details` 的 `message` **同样**使用 `tApiMessage` 翻译，与主 `error.message` 同 locale：

```typescript
return jsonError(
  ErrorCode.VALIDATION_ERROR,
  tApiMessage(locale, "limitParamInvalid"),
  HttpStatus.UNPROCESSABLE_ENTITY,
  [{ field: "limit", message: tApiMessage(locale, "validation.limitRange") }],
);
```

### 2.3 `validatePostMessageBody` 改造约定

现网 `post-message-pipeline.ts` 内直接 `jsonError(..., "content 无效", ...)` **无 locale**。

**3B 定稿**：扩展签名为 `validatePostMessageBody(body, locale: AppLocale)`，内部统一 `tApiMessage`；或返回 `{ ok: false, code, key, details }` 由 route 组装——**推荐前者**（减少 route 重复）。

### 2.4 ICU 参数

| key | 参数 | 来源 |
| --- | --- | --- |
| `validation.contentTooLong` | `{ max }` | `CHAT_USER_MESSAGE_MAX_LENGTH`（16000） |
| `turnSafe.kbHit` | `{ count }` | `kbInjection.chunks.length` |
| `turnSafe.mcpLoadFailed` | `{ count }` | `ui.configs.length` |
| `turnSafe.mcpLoaded` | `{ loaded, toolCount }` | MCP 加载成功数 / 工具总数 |

---

## 3. ErrorCode ↔ message key 完整映射表（Chat 域）

> 与 `@/common/enums` 中 `ErrorCode` **一致**；下表覆盖 4 个 route 文件 + pipeline + 只读拦截 **全部**现网硬编码分支。

| # | ErrorCode | message key | details key（若有） | HTTP | 文件:方法 |
| --- | --- | --- | --- | --- | --- |
| 1 | `UNAUTHORIZED` | `unauthorized` | — | 401 | 全部 route 鉴权失败（共 **11** 处） |
| 2 | `CONVERSATION_NOT_FOUND` | `conversationNotFound` | — | 404 | `[id]/route` GET/DELETE；`messages` GET/POST/DELETE；`turns` GET |
| 3 | `ASSISTANT_NOT_FOUND` | `assistantNotFound` | — | 404 | `conversations/route` POST |
| 4 | `VALIDATION_ERROR` | `limitParamInvalid` | `validation.limitRange` | 422 | `conversations/route` GET `limit` |
| 5 | `VALIDATION_ERROR` | `limitParamInvalid` | `validation.limitPositiveInteger` | 422 | `messages/route` GET `limit` |
| 6 | `VALIDATION_ERROR` | `validation.invalidJson` | — | 422 | `conversations/route` POST；`messages/route` POST |
| 7 | `VALIDATION_ERROR` | `validation.contentInvalid` | `validation.contentInvalid`（field: content） | 422 | `post-message-pipeline` |
| 8 | `VALIDATION_ERROR` | `validation.contentEmpty` | `validation.contentEmpty` | 422 | 同上 |
| 9 | `VALIDATION_ERROR` | `validation.contentTooLong` | ICU 同上 `{max}` | 422 | 同上 |
| 10 | `VALIDATION_ERROR` | `retryTargetNotFound` | `validation.retryMessageInvalid` | 422 | `messages/route` POST retry |
| 11 | `MODEL_ERROR` | `modelError` | — | 502 | `messages/route` POST 非流式 catch |
| 12 | `MODEL_ERROR` | `modelError` | — | SSE | `messages/route` POST 流式 `send("error", ...)` |
| 13 | `INTERNAL_ERROR` | `createConversationFailed` | — | 500 | `conversations/route` POST |
| 14 | `FORBIDDEN` | `readOnlyAccountBlocked` | — | 403 | `with-readonly-api.ts` |

**现网中文 → key 对照（改造前）**：

| 现网 message | key |
| --- | --- |
| 未登录 | `unauthorized` |
| 会话不存在 | `conversationNotFound` |
| 助手不存在 | `assistantNotFound` |
| limit 参数无效 | `limitParamInvalid` |
| 须为 1～50 的正整数 | `validation.limitRange` |
| 须为正整数 | `validation.limitPositiveInteger` |
| 请求体须为 JSON | `validation.invalidJson` |
| content 无效 / 须为非空字符串 | `validation.contentInvalid` |
| content 不能为空 / 不能为空 | `validation.contentEmpty` |
| content 过长 / 长度不能超过 N 个字符 | `validation.contentTooLong` |
| 重试目标用户消息不存在 | `retryTargetNotFound` |
| 无效或无权限 | `validation.retryMessageInvalid` |
| 模型调用失败（及 exception.message 透传） | **`modelError`（禁止透传内部栈）** |
| 创建会话失败 | `createConversationFailed` |
| 您访问的是测试账户… | `readOnlyAccountBlocked` |

---

## 4. 四个 Chat Route 改造点

### 4.1 `src/app/api/chat/conversations/route.ts`

| 方法 | 改造分支 | key |
| --- | --- | --- |
| GET | 未登录 | `unauthorized` |
| GET | `limit` 无效 | `limitParamInvalid` + `validation.limitRange` |
| POST | 未登录 | `unauthorized` |
| POST | body 非 JSON | `validation.invalidJson` |
| POST | 助手不存在 | `assistantNotFound` |
| POST | 创建后 conv 缺失 | `createConversationFailed` |

**成功响应不变**：`200 { items, nextCursor }`；`201 { conversation }`。

### 4.2 `src/app/api/chat/conversations/[conversationId]/route.ts`

| 方法 | 改造分支 | key |
| --- | --- | --- |
| GET | 未登录 / 会话不存在 | `unauthorized` / `conversationNotFound` |
| DELETE | 未登录 / 会话不存在 | 同上 |

**只读拦截**：DELETE 经 `withReadOnlyApi` → `readOnlyAccountBlocked`。

### 4.3 `src/app/api/chat/conversations/[conversationId]/messages/route.ts`

| 方法 | 改造分支 | key |
| --- | --- | --- |
| GET | 未登录 / 不存在 / limit 无效 | `unauthorized` / `conversationNotFound` / `limitParamInvalid` + `validation.limitPositiveInteger` |
| POST | 鉴权 / JSON / validate / 不存在 / retry / MODEL_ERROR | 见 §3 表 |
| POST 流式 | catch 分支 `send("error")` | **`modelError`**（§5） |
| POST 流式 | `safeMessage` 常量 | **`turnSafe.*`**（§6） |
| DELETE | 未登录 / 不存在 | `unauthorized` / `conversationNotFound` |

**只读拦截**：POST、DELETE 写操作。

### 4.4 `src/app/api/chat/conversations/[conversationId]/turns/route.ts`

| 方法 | 改造分支 | key |
| --- | --- | --- |
| GET | 未登录 / 不存在 | `unauthorized` / `conversationNotFound` |

### 4.5 `src/server/chat/post-message-pipeline.ts`

| 函数 | 改造 |
| --- | --- |
| `validatePostMessageBody` | 增加 `locale` 参数；三处 `jsonError` 改 `tApiMessage` |

---

## 5. SSE 流式错误 i18n 方案（Q6-A）

### 5.1 问题（现网）

流式 POST catch 分支：

```typescript
const msg = e instanceof Error ? e.message : "模型调用失败";
send("error", { code: ErrorCode.MODEL_ERROR, message: msg });
```

- 英文 UI 下可能展示中文 fallback 或 provider 内部英文/中文混合栈信息。
- **安全**：不应向客户端暴露 provider API 错误详情。

### 5.2 定稿方案

| 项 | 定稿 |
| --- | --- |
| `event: error` payload | `{ code: "MODEL_ERROR", message: tApiMessage(locale, "modelError") }` |
| 内部 exception | 仅写服务端日志（`withApiLog` 已有）；**不**放入 SSE `message` |
| `turn_failed` | `interruptionReason: "unknown"` 不变；客户端用 `page.chat.turn.interruption.*` 映射展示 |
| `steps[].error.message`（D1 failed） | 同步改为 `modelError` 译文（与 SSE 一致） |
| 客户端 fallback | `page.chat.errors.sseUnknown`（Frontend 4；API message 优先） |

### 5.3 流式 handler 内 locale 获取

在 `POST` handler 顶层 `const locale = resolveRequestLocale(req)`，闭包传入 `ReadableStream.start`：

```typescript
const locale = resolveRequestLocale(req);
// ...
send("error", {
  code: ErrorCode.MODEL_ERROR,
  message: tApiMessage(locale, "modelError"),
});
```

### 5.4 非流式 MODEL_ERROR

同样改为 `jsonError(ErrorCode.MODEL_ERROR, tApiMessage(locale, "modelError"), HttpStatus.BAD_GATEWAY)`，**不再**使用 `e.message`。

### 5.5 SSE 事件双语范围（本期）

| 事件 | 是否 i18n | 说明 |
| --- | --- | --- |
| `error` | **是** | 用户可见 toast |
| `turn_failed` | 部分 | `interruptionReason` 为机器码；UI 标签走 `page.chat` |
| `assistant_delta` / LLM 正文 | **否** | PRD 非目标 |
| `turn_step_delta.safeMessage` | **是** | §6 |

---

## 6. Turn `safeMessage` locale 感知（Q6-A · 3B）

### 6.1 原则

| 项 | 规则 |
| --- | --- |
| 新发 turn | emit 时用 `tApiMessage(locale, "turnSafe.*", params?)` |
| 历史快照 | DB 已存中文 **不** retro-translate |
| `mcpSafeMessage()` | 改为 `mcpSafeMessage(locale, ui)` 内部 `tApiMessage` |
| `kbDetailsFromInjection` / `mcpDetailsFromUi` 的 `title` | **本期不译**（details 面板偏调试；Frontend 可后续 key 化） |

### 6.2 改造清单（`messages/route.ts`）

| 位置 | 现网 safeMessage | turnSafe key |
| --- | --- | --- |
| retry 分支 | 已复用原用户消息重试 | `turnSafe.retryReused` |
| applyToolEventsToD1 running | 模型正在生成回复 | `turnSafe.modelGenerating` |
| applyToolEventsToD1 completed | 模型回复生成完成 | `turnSafe.modelCompleted` |
| applyToolEventsToD1 failed | 模型回复生成失败 | `turnSafe.modelFailed` |
| C1 kb hit | 已命中 N 个知识片段 | `turnSafe.kbHit` |
| C1 kb miss | 未命中可用知识片段 | `turnSafe.kbMiss` |
| onSummary running | 摘要回调处理中 | `turnSafe.summaryProcessing` |
| onSummary completed | 摘要回调已完成 | `turnSafe.summaryCompleted` |
| D1 completed（流式/非流式） | 模型回复生成完成 | `turnSafe.modelCompleted` |
| 非流式 D1 running | 模型正在生成回复 | `turnSafe.modelGenerating` |
| `mcpSafeMessage` ×4 变体 | 见 data-models §3.5 | `turnSafe.mcp*` |

---

## 7. `withReadOnlyApi` 双语改造

### 7.1 现网

```typescript
const READ_ONLY_BLOCK_MESSAGE = "您访问的是测试账户，不能进行数据的修改和删除";
// ...
return jsonError(ErrorCode.FORBIDDEN, READ_ONLY_BLOCK_MESSAGE, HttpStatus.FORBIDDEN);
```

### 7.2 定稿

```typescript
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";

// 拦截分支：
const locale = resolveRequestLocale(req);
return jsonError(
  ErrorCode.FORBIDDEN,
  tApiMessage(locale, "readOnlyAccountBlocked"),
  HttpStatus.FORBIDDEN,
);
```

### 7.3 影响面

经 `withApiWrapper` → **全部**非 GET 写 API（chat、console、admin、knowledge-bases 等）。文案统一为 `readOnlyAccountBlocked`；console/admin 页面仍中文但 API 错误已双语——符合 MVP 预期。

**Bypass 不变**：`/api/auth/login`、`/api/auth/logout`。

---

## 8. Middleware 变更（chat 相关）

### 8.1 相对 0.1.14 变更摘要

| 项 | 0.1.14 | 0.1.15 |
| --- | --- | --- |
| `KNOWN_APP_SEGMENTS` | 含 `chat` | **移除** `chat` |
| `GET /chat` | 受保护 → `/en/login?redirect=/chat` | **302** → `/{locale}/chat`（legacy handler **先于**受保护逻辑） |
| `GET /en/chat` 未登录 | next-intl 直通（**无** middleware 鉴权） | **受保护** → `/en/login?redirect=/en/chat` |
| `redirect` 参数 | 裸路径 `/chat` | **含 locale 前缀** `/en/chat` |

### 8.2 `handleLegacyChatRedirect`（新增）

```typescript
function handleLegacyChatRedirect(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/chat" || pathname.startsWith("/chat/")) {
    const locale = resolveRequestLocale(request);
    const suffix = pathname.slice("/chat".length);
    const url = new URL(`/${locale}/chat${suffix}`, request.url);
    url.search = search;
    return NextResponse.redirect(url, 302);
  }
  return null;
}
```

### 8.3 `isProtectedPath` 扩展

```typescript
function isProtectedPath(pathname: string): boolean {
  if (
    pathname.startsWith("/chat") ||
    pathname.startsWith("/console") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/console") ||
    pathname.startsWith(AUTH_API_PREFIX)
  ) {
    return true;
  }
  // 0.1.15：locale 前缀 chat
  if (/^\/(en|zh)\/chat(\/|$)/.test(pathname)) {
    return true;
  }
  return false;
}
```

### 8.4 未登录跳转 — redirect 值升级

```typescript
// handleProtectedRoute 内（pathname 已为 /en/chat 或经 legacy 302 后不再裸 /chat）
const login = new URL(`/${locale}/login`, request.url);
login.searchParams.set("redirect", `${pathname}${search}`);
// 例：redirect=/en/chat
```

**locale 来源**：pathname 已含 `/en|zh` 时，**建议**从 pathname 解析 segment 作为 login 前缀（与 redirect 一致）；裸 `/console` 仍用 `resolveRequestLocale(request)`。

### 8.5 Middleware 执行顺序（更新）

```mermaid
flowchart TD
  R[Request] --> IL{非法 locale?}
  IL -->|是| RED0[302 /en]
  IL -->|否| LEG_CHAT{/chat legacy?}
  LEG_CHAT -->|是| RED_CHAT["302 /{locale}/chat"]
  LEG_CHAT -->|否| LEG_AUTH{/login|register?}
  LEG_AUTH -->|是| RED_AUTH[302 /{locale}/login|register]
  LEG_AUTH -->|否| PR{受保护路径?}
  PR -->|是| AUTH[handleProtectedRoute]
  PR -->|否| I18N{i18n 路径?}
  I18N -->|是| INTL[next-intl]
  I18N -->|否| NEXT[NextResponse.next]
```

### 8.6 Matcher

**不变**：已有 `/chat`、`/chat/:path*`；`/(en|zh)/:path*` 覆盖 `/{locale}/chat`。

### 8.7 Chat API 与 middleware

`/api/chat/**` **不在** `isProtectedPath` 内；鉴权由各 route `getRequestUserContext()` 负责（现网行为保持）。Middleware 对 chat 的变更**仅**影响页面路由 `/chat` 与 `/{locale}/chat`。

---

## 9. 请求/响应示例

### 9.1 会话不存在（en）

```http
GET /api/chat/conversations/00000000-0000-0000-0000-000000000099
Cookie: NEXT_LOCALE=en
```

```json
{
  "error": {
    "code": "CONVERSATION_NOT_FOUND",
    "message": "This conversation does not exist or was removed."
  }
}
```

### 9.2 会话不存在（zh）

```json
{
  "error": {
    "code": "CONVERSATION_NOT_FOUND",
    "message": "会话不存在"
  }
}
```

### 9.3 空消息（en）

```http
POST /api/chat/conversations/{id}/messages
Content-Type: application/json
Cookie: NEXT_LOCALE=en

{"content": "   "}
```

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Message cannot be empty.",
    "details": [{ "field": "content", "message": "Message cannot be empty." }]
  }
}
```

### 9.4 消息过长 ICU（en）

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Message is too long. Maximum 16000 characters.",
    "details": [
      { "field": "content", "message": "Message is too long. Maximum 16000 characters." }
    ]
  }
}
```

### 9.5 只读账号删除会话（en）

```http
DELETE /api/chat/conversations/{id}
Cookie: NEXT_LOCALE=en
```

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "This test account is read-only. You cannot create, edit, or delete data."
  }
}
```

### 9.6 只读账号（zh）

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "您访问的是测试账户，不能进行数据的修改和删除"
  }
}
```

### 9.7 SSE 模型错误（en）

```
event: error
data: {"code":"MODEL_ERROR","message":"The model failed to respond. Try again later."}
```

### 9.8 GET conversations limit 无效（zh）

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "limit 参数无效",
    "details": [{ "field": "limit", "message": "须为 1～50 的正整数" }]
  }
}
```

### 9.9 Legacy 页面重定向

```http
GET /chat
Cookie: NEXT_LOCALE=en
```

```http
HTTP/1.1 302 Found
Location: /en/chat
```

```http
GET /chat?foo=1
Accept-Language: zh-CN
```

```http
HTTP/1.1 302 Found
Location: /zh/chat?foo=1
```

---

## 10. 与前端对接要点

| 项 | 约定 |
| --- | --- |
| 展示 REST 错误 | 直接 `error.message` |
| SSE `onError` | 优先 `err.message`（已为译文）；fallback `page.chat.errors.sseUnknown` |
| 只读 UI toast | `page.chat.errors.readOnlyBlocked`（与 API 语义等价） |
| fetch | `credentials: 'include'` |
| `interruptionReason` | 机器码；展示用 `page.chat.turn.interruption.*` |
| 401 跳转 | `/{locale}/login?redirect=/{locale}/chat`（Frontend + middleware） |

---

## 11. 关联文档

- Key 树与 DB 声明：`data-models.md`
- 3B 步骤：`implementation-plan.md`
- 设计终稿：`../design/spec-api-message-chat.md`
