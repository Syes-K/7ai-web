# 实现说明 — Chat 域 API i18n 与 middleware（version 0.1.15，阶段 3B）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.15` |
| 阶段 | **3B 服务端代码** |
| 状态 | **已完成** |
| 范围 | Chat API 双语 error、SSE modelError、turn safeMessage、withReadOnlyApi、middleware chat 迁移 |
| 上游 | `api-spec.md`、`implementation-plan.md`、`design/spec-api-message-chat.md` |

---

## 1. 实现方案摘要

### 1.1 错误 message 双语（方案 A）

各 Chat route 在 handler 顶层调用 `resolveRequestLocale(req)`，全部 `jsonError` 改用 `tApiMessage(locale, key, params?)`。`validatePostMessageBody(body, locale)` 内部统一校验文案，避免 route 重复。

### 1.2 SSE / MODEL_ERROR 安全策略

流式与非流式 catch 分支**不再**透传 `exception.message`；`event: error` 与 turn snapshot `error.message` 均使用 `tApiMessage(locale, "modelError")`。内部异常仅由 `withApiLog` 写服务端日志。

### 1.3 turn `safeMessage` locale 感知

新发 turn 的 `stepsSnapshotJson` 内 `safeMessage` 使用 `turnSafe.*` key（经 `tApiMessage`）。历史 DB 快照中文**不** retro-translate。`kbDetailsFromInjection` / `mcpDetailsFromUi` 的 `title` 本期仍中文（调试面板，见 risks R8）。

### 1.4 Middleware chat 迁移

- `KNOWN_APP_SEGMENTS` 移除 `chat`
- 新增 `handleLegacyChatRedirect`：`/chat` → 302 `/{locale}/chat`（先于受保护逻辑）
- `isProtectedPath` 扩展 `/(en|zh)/chat`
- `handleProtectedRoute`：pathname 含 locale 时优先 `localeFromPathname`，login redirect 含完整 pathname（如 `/en/chat`）

### 1.5 withReadOnlyApi 横切

全站写 API 只读拦截改用 `readOnlyAccountBlocked` 双语；Bypass 路径不变（login/logout）。

---

## 2. 变更文件清单

| 路径 | 说明 |
| --- | --- |
| `messages/en/api/message.json` | +13 REST key + 12 `turnSafe.*` |
| `messages/zh/api/message.json` | 对称中文 |
| `src/app/api/chat/conversations/route.ts` | 6 处 jsonError i18n |
| `src/app/api/chat/conversations/[conversationId]/route.ts` | 4 处 |
| `src/app/api/chat/conversations/[conversationId]/messages/route.ts` | jsonError + SSE + safeMessage + mcpSafeMessage |
| `src/app/api/chat/conversations/[conversationId]/turns/route.ts` | 2 处 |
| `src/server/chat/post-message-pipeline.ts` | `validatePostMessageBody(body, locale)` |
| `src/server/auth/with-readonly-api.ts` | `readOnlyAccountBlocked` 双语 |
| `src/middleware.ts` | legacy chat 302、isProtectedPath、locale redirect |

**未改（按 plan）**：`resolve-request-locale.ts`、`t-api-message.ts`（静态 import JSON 自动生效）。

---

## 3. 自测记录

### 3.1 类型与构建

| 命令 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | ✅ 通过 |
| `npm run build` | ✅ 编译、Lint、类型检查、静态页生成均通过；trace 阶段 `.env` EPERM（沙箱/权限，非代码问题，与 0.1.14 一致） |

### 3.2 静态验收（grep）

| 项 | 结果 |
| --- | --- |
| Chat route 无硬编码中文 `jsonError` message | ✅ |
| `READ_ONLY_BLOCK_MESSAGE` 已移除 | ✅ |
| SSE catch 无 `e.message` 透传 | ✅ |
| `messages/{en,zh}/api/message.json` 含 13 REST + 12 turnSafe key | ✅ |

### 3.3 待集成 / dev 环境验证

| # | 场景 | 期望 |
| --- | --- | --- |
| C1 | 无 cookie `GET /api/chat/conversations` | en `unauthorized` |
| C2 | cookie=zh 同上 | zh `未登录` |
| C3 | 空 content POST | `validation.contentEmpty` 双语 |
| C4 | 超长 content | ICU `{max}` = 16000 |
| C5 | 只读账号 DELETE conversation | `readOnlyAccountBlocked` |
| C6 | 流式 MODEL_ERROR | SSE `event: error` 为 `modelError` 译文 |
| M1 | `GET /chat` cookie=en | 302 `/en/chat` |
| M2 | 无 session `GET /en/chat` | 302 `/en/login?redirect=/en/chat` |
| M3 | `GET /chat?x=1` | 302 保留 query |

**注**：middleware `Accept-Language` 推断依赖 cookie；0.1.14 起 `resolveLocaleFromCookieAndHeader` 未读 header，无 cookie 时默认 `en`（与 0.1.14 行为一致，见 risks O3）。

---

## 4. 未完成 / 风险项

| ID | 项 | 说明 |
| --- | --- | --- |
| R3 | 历史 turn 快照中文 safeMessage | 设计已接受；仅新发 turn locale 感知 |
| R5 | console/admin 写 API 英文错误、UI 仍中文 | withReadOnlyApi 横切预期 |
| R7 | 旧书签 `redirect=/chat` | Frontend `safeRedirectUrl` 可选规范化 |
| R8 | kb/mcp details 面板 title 中文 | 本期不译 |
| — | curl / E2E 冒烟 | 需 dev server + session；3B 以 tsc/build + grep 为主 |

---

## 5. Frontend 4 对接要点

- REST / SSE 错误直接展示 `error.message`（已翻译）
- SSE fallback：`page.chat.errors.sseUnknown`
- 401 跳转：`/{locale}/login?redirect=/{locale}/chat`
- Chat 页面迁移至 `src/app/[locale]/chat/**` 由 Frontend 4 完成

---

## 6. 验收期微调（迭代收尾）

| 项 | 文件 | 说明 |
| --- | --- | --- |
| LLM 回复语言 | `src/common/constants/index.ts`、`src/server/chat/langchain-agent.ts` | 默认系统提示改为语言中立；所有 Agent 追加 `CHAT_LANGUAGE_REPLY_SUFFIX`，模型随用户最新消息语言回复（非 UI locale，非 PRD 原「LLM 不 i18n」范围的 UI 层例外） |
