# 用户故事与验收标准：业务域 API 错误 i18n（version 0.1.15）

本文档为 `prd.md` 子文档，覆盖 auth 以外 **31 个 API route 文件**的错误 message 双语及 ErrorCode 映射扩展。

---

## Epic A：机制延续（全批次）

### US-A1 服务端翻译（方案 A）

**作为** 前端开发者  
**我想要** API 返回的 `error.message` 已是当前 locale 译文  
**以便** 客户端无需新增 messageKey 渲染逻辑  

**验收标准：**

- [ ] **AC-A1**：业务域 route 中 `jsonError(code, message)` 的 `message` 改为 `tApiMessage(locale, key, params)` 或等价封装。
- [ ] **AC-A2**：locale 解析沿用 `resolveRequestLocale`（cookie → Accept-Language → `en`）。
- [ ] **AC-A3**：与 0.1.14 认证 API 行为一致，文档更新于 backend 迭代目录。

### US-A2 ErrorCode ↔ message key 对照表

**作为** 开发者  
**我想要** 维护完整的 ErrorCode 到 `api/message.json` key 映射  
**以便** 增删错误码时不遗漏翻译  

**验收标准：**

- [ ] **AC-A4**：`iterations/{version}/backend/api-spec.md`（或等价文档）包含全量 ErrorCode 映射表。
- [ ] **AC-A5**：`messages/{en,zh}/api/message.json` 中每个业务 ErrorCode 均有对应 key。
- [ ] **AC-A6**：key 命名 camelCase，与 ErrorCode 对应（如 `conversationNotFound` ← `CONVERSATION_NOT_FOUND`）。

---

## Epic B：Chat API — **0.1.15 MVP**

**范围：** `/api/chat/conversations/**`（4 files）

### US-B1 会话 CRUD 错误双语

**作为** 用户  
**我想要** 会话列表、创建、删除、更新相关 API 错误以界面语言返回  
**以便** 理解失败原因  

**验收标准：**

- [ ] **AC-B1**：`UNAUTHORIZED` 返回本地化「未登录」等价文案。
- [ ] **AC-B2**：`CONVERSATION_NOT_FOUND` 双语。
- [ ] **AC-B3**：`ASSISTANT_NOT_FOUND`（创建会话时）双语。
- [ ] **AC-B4**：`VALIDATION_ERROR`（无效 body、空消息等）双语；高频场景有专用子 key 或可读 message。
- [ ] **AC-B5**：`INTERNAL_ERROR`（如「创建会话失败」）双语。

### US-B2 消息与 turns API 错误双语

**作为** 用户  
**我想要** 发消息、拉历史、流式 turns 相关错误双语  
**以便** 对话流程可理解  

**验收标准：**

- [ ] **AC-B6**：messages route 中 `CONVERSATION_NOT_FOUND`、`VALIDATION_ERROR`、`MODEL_ERROR` 等双语。
- [ ] **AC-B7**：turns route 错误双语。
- [ ] **AC-B8**：流式响应**内**错误事件若含用户可见 message，纳入 i18n（见 open-questions Q6）。

---

## Epic C：Console API — **批次 2（0.1.16 建议）**

**范围：** `/api/console/profile/**`、`/api/console/models/**`、`/api/console/assistants/**`、`/api/console/mcp-configs/**`

### US-C1 控制台通用错误双语

**验收标准：**

- [ ] **AC-C1**：`MODEL_CONFIG_NOT_FOUND`、`ASSISTANT_NOT_FOUND` 双语。
- [ ] **AC-C2**：`MCP_CONFIG_NOT_FOUND`、`MCP_CONFIG_NAME_CONFLICT`、`MCP_CONFIG_REFERENCED_BY_ASSISTANT`、`MCP_CREDENTIALS_ENCRYPTION_UNAVAILABLE` 双语。
- [ ] **AC-C3**：通用「请求体须为 JSON」「id 无效」「保存失败，请稍后重试」「加载失败」等归入 `api/message.json` 统一 key。
- [ ] **AC-C4**：profile personal 中 `AUTH_TEL_TAKEN` 复用已有 auth key。

---

## Epic D：Admin API — **批次 3（0.1.17 建议）**

**范围：** `/api/admin/users/**`、`/api/admin/model-configs/**`、`/api/admin/assistants/**`、`/api/admin/prompt-config/**`、`/api/admin/config/**`

### US-D1 管理端错误双语

**验收标准：**

- [ ] **AC-D1**：`USER_NOT_FOUND` 双语。
- [ ] **AC-D2**：重置密码、只读切换相关 `FORBIDDEN`、`VALIDATION_ERROR` 双语。
- [ ] **AC-D3**：prompt-config 校验失败 message 双语（动态 tmpl.message 是否翻译见 open-questions Q7）。
- [ ] **AC-D4**：conversation-summary config 保存失败类 `INTERNAL_ERROR` 双语。

---

## Epic E：Knowledge-bases API — **批次 2/4（建议 0.1.16 与 console knowledge 同步）**

**范围：** `/api/knowledge-bases/**`（6 files）

### US-E1 知识库 API 错误双语

**验收标准：**

- [ ] **AC-E1**：`KNOWLEDGE_BASE_NOT_FOUND` 双语。
- [ ] **AC-E2**：`KNOWLEDGE_BASE_REFERENCED_BY_ASSISTANT` 双语。
- [ ] **AC-E3**：`KNOWLEDGE_BASE_CHUNK_TEST_UNAVAILABLE` 双语。
- [ ] **AC-E4**：向量化 retry/route 相关错误双语。

---

## Epic F：跨域只读拦截 — **0.1.15 MVP**

### US-F1 withReadOnlyApi 双语

**作为** 只读测试账号用户  
**我想要** 写操作被拦截时的 API 错误与界面语言一致  
**以便** 理解限制  

**验收标准：**

- [ ] **AC-F1**：`with-readonly-api.ts` 中硬编码 `READ_ONLY_BLOCK_MESSAGE` 改为 `ErrorCode.FORBIDDEN` + `tApiMessage('readOnlyAccountBlocked')`（或等价 key）。
- [ ] **AC-F2**：`messages/{en,zh}/api/message.json` 含 `readOnlyAccountBlocked` 中英条目。
- [ ] **AC-F3**：Chat 与其它域写 API 均经 `withReadOnlyApi` 包装处生效。

---

## Epic G：通用 validation 扩展（各批次）

### US-G1 共享校验 message key

**验收标准：**

- [ ] **AC-G1**：`validation.invalidJson`、`validation.invalidId` 等通用 key 填充。
- [ ] **AC-G2**：减少 route 内硬编码中文字符串；`VALIDATION_ERROR` 优先使用 key + 可选 `details`。
- [ ] **AC-G3**：带参数 message（如频控「请稍后再试」）使用 ICU 或分 key，中英两套。

---

## 不在范围

- API **成功**响应 `message` 字段。
- HTTP 状态码变更。
- 数据库/日志内部错误栈。
