# 用户故事与验收标准：Console API 错误 i18n（version 0.1.16）

本文档为 `prd.md` 子文档，覆盖 **`/api/console/**`（12 个 route 文件）** 的错误 message 双语及 ErrorCode 映射扩展。

**不在本期：** `/api/knowledge-bases/**`（0.1.18+）、`/api/admin/**`（0.1.17）。

---

## Epic A：机制延续

### US-A1 服务端翻译（方案 A）

**作为** 前端开发者  
**我想要** API 返回的 `error.message` 已是当前 locale 译文  
**以便** 客户端无需新增 messageKey 渲染逻辑  

**验收标准：**

- [ ] **AC-A1**：12 个 console route 文件中 `jsonError(code, message)` 的 `message` 改为 `tApiMessage(locale, key, params)` 或等价封装。
- [ ] **AC-A2**：locale 解析沿用 `resolveRequestLocale`（cookie `NEXT_LOCALE` → Accept-Language → `en`）。
- [ ] **AC-A3**：与 0.1.14 认证 API、0.1.15 chat API 行为一致。
- [ ] **AC-A4**：`iterations/0.1.16/backend/api-spec.md`（阶段 3A）包含 console 域全量 ErrorCode ↔ key 对照表。

### US-A2 通用错误复用

**验收标准：**

- [ ] **AC-A5**：`UNAUTHORIZED` → `unauthorized`（已有）。
- [ ] **AC-A6**：`RATE_LIMITED` → `rateLimited`（MCP test-connection 复用）。
- [ ] **AC-A7**：`AUTH_TEL_TAKEN` → `authTelTaken`（profile/personal 复用 auth key）。
- [ ] **AC-A8**：`VALIDATION_ERROR` + `validation.invalidJson` 复用已有 key。

---

## Epic B：Console 域 ErrorCode 映射

### US-B1 资源不存在类

**作为** 用户  
**我想要** 操作不存在或无权的资源时看到本地化 404 类错误  
**以便** 理解失败原因  

**验收标准：**

- [ ] **AC-B1**：`MODEL_CONFIG_NOT_FOUND` → `modelConfigNotFound`（models、profile/preference）。
- [ ] **AC-B2**：`ASSISTANT_NOT_FOUND` → `assistantNotFound`（已有；assistants 及子 route）。
- [ ] **AC-B3**：`MCP_CONFIG_NOT_FOUND` → `mcpConfigNotFound`（mcp-configs 全 route）。

### US-B2 MCP 业务错误

**验收标准：**

- [ ] **AC-B4**：`MCP_CONFIG_NAME_CONFLICT` → `mcpConfigNameConflict`。
- [ ] **AC-B5**：`MCP_CONFIG_REFERENCED_BY_ASSISTANT` → `mcpConfigReferencedByAssistant`。
- [ ] **AC-B6**：`MCP_CREDENTIALS_ENCRYPTION_UNAVAILABLE` → `mcpCredentialsEncryptionUnavailable`。

### US-B3 内部错误类

**验收标准：**

- [ ] **AC-B7**：profile GET「加载失败」→ `loadFailed`。
- [ ] **AC-B8**：通用保存失败「保存失败，请稍后重试」→ `saveFailedRetry`。
- [ ] **AC-B9**：「用户不存在」→ `userNotFound`（console 上下文）。
- [ ] **AC-B10**：「密钥加密失败」→ `credentialEncryptionFailed`。
- [ ] **AC-B11**：「服务端配置异常，无法保存密钥」→ `serverConfigCannotSaveSecrets`。
- [ ] **AC-B12**：未分类 `INTERNAL_ERROR` fallback → `internalError`。

---

## Epic C：Validation 子 key 扩展

### US-C1 高频校验 message

**作为** 用户  
**我想要** 表单/API 校验失败时看到与界面语言一致的 field 或顶层 message  
**以便** 修正输入  

**验收标准：**

- [ ] **AC-C1**：`id 无效` → `validation.invalidId`。
- [ ] **AC-C2**：顶层「请求参数不合法」→ `validation.invalidParams`；`details` 内 field message 使用子 key（见 AC-C3–C12）。
- [ ] **AC-C3**：`不能为空` → `validation.required`。
- [ ] **AC-C4**：`须为字符串或 null` / `须为字符串` → `validation.stringOrNull` / `validation.stringRequired`。
- [ ] **AC-C5**：`邮箱不可修改` / `不允许通过本接口修改邮箱` → `validation.emailImmutable`。
- [ ] **AC-C6**：`不能在控制台创建系统助手` → `validation.systemAssistantNotCreatable`。
- [ ] **AC-C7**：provider 枚举校验 → `validation.invalidModelProvider`。
- [ ] **AC-C8**：`apiKey` 相关（不能为空、须为字符串）→ `validation.apiKeyRequired` 等。
- [ ] **AC-C9**：MCP `mcpConfigIds` 无效 → `validation.invalidMcpConfigIds`、`validation.mcpConfigIdsRequired`。
- [ ] **AC-C10**：KB `knowledgeBaseIds` 无效 → `validation.invalidKnowledgeBaseIds`。
- [ ] **AC-C11**：MCP 名称「已达上限」→ `validation.mcpConfigLimitReached`。
- [ ] **AC-C12**：profile「至少需要一个偏好字段」「请至少提供 nickName 或 telNo」→ `validation.preferenceFieldRequired`、`validation.profileFieldRequired`。
- [ ] **AC-C13**：MCP credentials 字段校验（省略/null/空字符串/主密钥未配置）→ 专用 `validation.mcpCredentials*` keys。
- [ ] **AC-C14**：`telNo`「手机号须为 11 位数字」复用 `validation.telNoInvalid`（已有）。

---

## Epic D：按 Route 覆盖清单

### US-D1 profile 域（3 files）

| 文件 | 须覆盖 ErrorCode / 场景 |
| --- | --- |
| `profile/route.ts` | UNAUTHORIZED, INTERNAL_ERROR(loadFailed) |
| `profile/personal/route.ts` | UNAUTHORIZED, VALIDATION_ERROR(含 details), AUTH_TEL_TAKEN, INTERNAL_ERROR(userNotFound) |
| `profile/preference/route.ts` | UNAUTHORIZED, VALIDATION_ERROR, MODEL_CONFIG_NOT_FOUND, INTERNAL_ERROR(userNotFound) |

**验收标准：**

- [ ] **AC-D1**：上述 3 文件无硬编码中文 `jsonError` message（注释除外）。

### US-D2 models 域（2 files）

| 文件 | 须覆盖 ErrorCode / 场景 |
| --- | --- |
| `models/route.ts` | UNAUTHORIZED, VALIDATION_ERROR, INTERNAL_ERROR(save/serverConfig) |
| `models/[id]/route.ts` | UNAUTHORIZED, VALIDATION_ERROR, MODEL_CONFIG_NOT_FOUND, INTERNAL_ERROR |

**验收标准：**

- [ ] **AC-D2**：上述 2 文件无硬编码中文 `jsonError` message。

### US-D3 assistants 域（4 files）

| 文件 | 须覆盖 ErrorCode / 场景 |
| --- | --- |
| `assistants/route.ts` | UNAUTHORIZED, VALIDATION_ERROR(systemAssistant), INTERNAL_ERROR |
| `assistants/[id]/route.ts` | UNAUTHORIZED, VALIDATION_ERROR, ASSISTANT_NOT_FOUND, INTERNAL_ERROR |
| `assistants/[id]/knowledge-bases/route.ts` | UNAUTHORIZED, VALIDATION_ERROR(invalid KB ids), ASSISTANT_NOT_FOUND |
| `assistants/[id]/mcp-configs/route.ts` | UNAUTHORIZED, VALIDATION_ERROR(invalid MCP ids), ASSISTANT_NOT_FOUND |

**验收标准：**

- [ ] **AC-D3**：上述 4 文件无硬编码中文 `jsonError` message。

### US-D4 mcp-configs 域（3 files）

| 文件 | 须覆盖 ErrorCode / 场景 |
| --- | --- |
| `mcp-configs/route.ts` | UNAUTHORIZED, VALIDATION_ERROR, MCP_*, INTERNAL_ERROR |
| `mcp-configs/[id]/route.ts` | 同上 + DELETE referenced |
| `mcp-configs/[id]/test-connection/route.ts` | UNAUTHORIZED, VALIDATION_ERROR, RATE_LIMITED, MCP_CONFIG_NOT_FOUND |

**验收标准：**

- [ ] **AC-D4**：上述 3 文件无硬编码中文 `jsonError` message。
- [ ] **AC-D5**：test-connection 响应体中用户可见 `lastErrorSummary` 字符串 i18n 策略已落实（见 open-questions Q5）。

---

## Epic E：messages 文件

### US-E1 api/message.json 填充

**验收标准：**

- [ ] **AC-E1**：`messages/en/api/message.json` 与 `messages/zh/api/message.json` 含本期全部新增 key。
- [ ] **AC-E2**：key 命名 camelCase，与 ErrorCode 语义对应。
- [ ] **AC-E3**：带参数 message（如 plural）使用 ICU 或分 key，中英两套。
- [ ] **AC-E4**：缺失 key 时 `tApiMessage` 行为可预期（开发环境 warn / 回退 en）。

---

## Epic F：只读拦截（继承 0.1.15）

### US-F1 withReadOnlyApi 对 console 写 API 生效

**验收标准：**

- [ ] **AC-F1**：console POST/PATCH/DELETE route 经 `withReadOnlyApi` 包装处返回 `readOnlyAccountBlocked` 双语（0.1.15 已实施，回归验证即可）。

---

## 不在范围

- `/api/knowledge-bases/**`（knowledge 管理页调用的 CRUD/向量化/分片测试 API）。
- `/api/admin/**`。
- API **成功**响应体 `message` 字段。
- HTTP 状态码变更。
- 数据库/日志内部错误栈。

---

## 冒烟测试建议（API）

| 场景 | locale | 预期 |
| --- | --- | --- |
| 未登录 GET `/api/console/profile` | en | `unauthorized` 英文 |
| 无效 id GET `/api/console/models/bad-id` | en | `validation.invalidId` 或 `modelConfigNotFound` 英文 |
| 重复 MCP 名称 POST | zh | `mcpConfigNameConflict` 中文 |
| MCP 连接测试频控 | en | `rateLimited` 英文 |
| 只读账号 POST model | en | `readOnlyAccountBlocked` 英文 |
