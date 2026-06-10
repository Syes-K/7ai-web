# 服务端文档索引 — Chat 域 API i18n 与 middleware（version 0.1.15）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.15` |
| 阶段 | **3A 文档 + 3B 代码** — **已完成** |
| 上游 | `../product/prd.md`、`../product/user-stories-api-i18n.md`、`../product/user-stories-routing-locale.md`、`../design/spec-api-message-chat.md`、`../design/spec-routing-locale-chat.md`、`../design/spec-shared-infra-i18n.md` |
| 基线 | `../../0.1.14/backend/` |

---

## 文档清单

| 文件 | 用途 | 主要读者 |
| --- | --- | --- |
| [api-spec.md](./api-spec.md) | Chat 域 4 个 route 改造、ErrorCode ↔ key 映射、locale/`tApiMessage` 约定、SSE 流式错误、withReadOnlyApi、middleware 变更、JSON 示例 | Backend / Frontend |
| [data-models.md](./data-models.md) | 无 DB 变更；`api/message.json` 增量 key 树；ErrorCode 映射摘要 | Backend |
| [implementation-plan.md](./implementation-plan.md) | 3B 分步实现：文件清单、改造顺序、依赖、自测步骤 | Backend（3B 主责） |
| [risks-and-open-items.md](./risks-and-open-items.md) | 风险、SSE/safeMessage 技术债、待确认项 | 全员 |

---

## 本期服务端职责摘要（MVP）

| 职责 | 说明 |
| --- | --- |
| **Chat API 错误双语** | `/api/chat/conversations/**`（**4** 个 route 文件）全部 `jsonError` 路径改为 `resolveRequestLocale` + `tApiMessage` |
| **withReadOnlyApi 双语** | 硬编码 `READ_ONLY_BLOCK_MESSAGE` → `tApiMessage(locale, 'readOnlyAccountBlocked')` |
| **SSE 流式错误** | `event: error` 的 `message` 使用 `modelError` key，**不透传**内部 exception 文案（Q6-A） |
| **message 填充** | `messages/{en,zh}/api/message.json` 新增 **13** 个 key（7 top-level + 6 `validation.*`） |
| **middleware** | `/chat` legacy 302；`KNOWN_APP_SEGMENTS` 移除 `chat`；`isProtectedPath` 匹配 `/{locale}/chat`；未登录 redirect 含 locale 前缀 |
| **turn safeMessage** | messages route 新发 turn 的 `safeMessage` 改为 locale 感知（约 **12** 处 + `mcpSafeMessage`）；历史快照不 retro-translate |
| **不做** | `/api/console/**`、`/api/admin/**`、`/api/knowledge-bases/**` 双语；REST 成功 schema 变更；User 表语言字段 |

---

## 已确认 / 设计推荐决策（实现基线）

| 编号 | 决策 |
| --- | --- |
| Q1-A | MVP 仅 chat UI + chat API + 共享 infra |
| Q6-A | 用户可见 REST/SSE 错误纳入 i18n；`safeMessage` 新发 turn locale 感知 |
| Q9-A | chat 迁入 `[locale]`；删除 `src/app/chat/` |
| 方案 A | 服务端翻译 `error.message`，客户端直接展示 |
| Q5-A | locale：cookie `NEXT_LOCALE` → Accept-Language → `en` |

---

## 3B 状态

**已完成** — 见 [implementation-notes.md](./implementation-notes.md)。迭代验收期另增 LLM 系统提示语言中立化（`CHAT_SYSTEM_PROMPT`、`CHAT_LANGUAGE_REPLY_SUFFIX`）。
