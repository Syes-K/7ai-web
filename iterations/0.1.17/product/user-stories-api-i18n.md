# 用户故事与验收标准：Admin API 错误 i18n（version 0.1.17）

本文档为 `prd.md` 子文档，覆盖 **`/api/admin/**`（9 个 route 文件）** 与 **`/api/knowledge-bases/**`（5 个 route 文件）** 的错误 message 双语及 ErrorCode 映射扩展。

**不在本期：** Console/Chat API 增量（0.1.16 已交付）。

---

## Epic A：机制延续

### US-A1 服务端翻译（方案 A）

**作为** 前端开发者  
**我想要** API 返回的 `error.message` 已是当前 locale 译文  
**以便** 客户端无需新增 messageKey 渲染逻辑  

**验收标准：**

- [ ] **AC-A1**：admin 9 个 + knowledge-bases 5 个 route 文件中 handler 层 `jsonError` → `tApiMessage`。
- [ ] **AC-A2**：locale 解析沿用 `resolveRequestLocale`（cookie `NEXT_LOCALE` → Accept-Language → `en`）。
- [ ] **AC-A3**：与 0.1.14–0.1.16 行为一致。
- [ ] **AC-A4**：`iterations/0.1.17/backend/api-spec.md`（阶段 3A）包含 admin 域全量 ErrorCode ↔ key 对照表。

### US-A2 鉴权层回归（已有双语）

**验收标准：**

- [ ] **AC-A5**：`withAdminApi` / `requireAdminApi` 的 `UNAUTHORIZED` → `unauthorized`、`FORBIDDEN` → `forbidden` 保持双语（回归验证，无需重写）。
- [ ] **AC-A6**：非管理员调用 admin API 时 `error.message` 与请求 locale 一致。

---

## Epic B：复用 Console 域 ErrorCode

### US-B1 资源不存在与通用错误

**验收标准：**

- [ ] **AC-B1**：`USER_NOT_FOUND` → `userNotFound`（users 域）。
- [ ] **AC-B2**：`MODEL_CONFIG_NOT_FOUND` → `modelConfigNotFound`（model-configs 域）。
- [ ] **AC-B3**：`ASSISTANT_NOT_FOUND` → `assistantNotFound`（assistants 域）。
- [ ] **AC-B4**：`RATE_LIMITED` → `rateLimited`（reset-password）。
- [ ] **AC-B5**：通用 `INTERNAL_ERROR` 保存失败 → `saveFailedRetry`。
- [ ] **AC-B6**：密钥/服务端配置异常 → `serverConfigCannotSaveSecrets`（model-configs POST/PATCH）。

### US-B2 通用 validation 复用

**验收标准：**

- [ ] **AC-B7**：`请求体须为 JSON` → `validation.invalidJson`。
- [ ] **AC-B8**：`id 无效` → `validation.invalidId`。
- [ ] **AC-B9**：分页参数非法 → `validation.paginationParamsInvalid`（带 `{maxPageSize}` 参数）。
- [ ] **AC-B10**：`请求参数不合法` → `validation.invalidParams`。
- [ ] **AC-B11**：`不能为空` → `validation.required`；`须为字符串或 null` → `validation.stringOrNull`。
- [ ] **AC-B12**：provider 枚举 → `validation.invalidModelProvider`。
- [ ] **AC-B13**：`长度不能超过 N` → `validation.maxLength`（带 `{max}` 参数）。

---

## Epic C：Admin 域特有 ErrorCode

### US-C1 用户管理 FORBIDDEN / VALIDATION

**作为** 管理员  
**我想要** 对自己账号的受限操作看到明确本地化错误  
**以便** 理解须换账号或走自助流程  

**验收标准：**

- [ ] **AC-C1**：重置自己密码 → `admin.cannotResetOwnPassword`（FORBIDDEN）。
- [ ] **AC-C2**：对自己 status/readOnly 变更 → `admin.cannotChangeOwnStatus`（FORBIDDEN）。
- [ ] **AC-C3**：`用户 id 无效` → `validation.invalidUserId`（或与 `invalidId` 合并，文档定稿）。
- [ ] **AC-C4**：`status 须为 Active/Disabled` → `validation.invalidUserStatus`（带枚举参数或固定文案）。
- [ ] **AC-C5**：`readOnly 须为布尔值` → `validation.readOnlyMustBeBoolean`。
- [ ] **AC-C6**：`至少提供一个可更新字段` → `validation.atLeastOneUpdateField`。

### US-C2 配置读取/写入 INTERNAL_ERROR

**验收标准：**

- [ ] **AC-C7**：prompt-config GET「读取配置文件失败」→ `admin.readPromptConfigFailed`。
- [ ] **AC-C8**：conversation-summary GET「读取对话摘要配置失败」→ `admin.readConversationSummaryFailed`。
- [ ] **AC-C9**：prompt-config PUT「保存失败，请稍后重试或检查磁盘权限」→ `admin.saveFailedCheckPermissions`。
- [ ] **AC-C10**：conversation-summary PUT「保存失败」→ `admin.conversationSummarySaveFailed`。
- [ ] **AC-C11**：写入后读取验证失败 → `admin.writeVerifyFailed`（两 config route 共用）。

---

## Epic D：prompt-config validation 子 key

### US-D1 PUT 校验 message 全 key 化

**作为** 管理员  
**我想要** 保存提示词配置时校验错误与界面语言一致  
**以便** 修正 JSON 结构  

**验收标准：**

- [ ] **AC-D1**：`请求体不是合法 JSON` → `validation.invalidJson`（或 `validation.bodyNotJson` 若与 invalidJson 语义区分）。
- [ ] **AC-D2**：`items 须为非空数组` → `validation.promptConfig.itemsRequired`。
- [ ] **AC-D3**：`items[i] 须为对象` → `validation.promptConfig.itemMustBeObject`。
- [ ] **AC-D4**：`key/value 须为字符串` → `validation.promptConfig.keyStringRequired` / `valueStringRequired`。
- [ ] **AC-D5**：`仅允许 key、value 字段` → `validation.promptConfig.onlyKeyValueAllowed`。
- [ ] **AC-D6**：`key 重复` → `validation.promptConfig.duplicateKey`。
- [ ] **AC-D7**：`须恰好包含 N 个配置项` → `validation.promptConfig.exactItemCount`（带 `{count}`）。
- [ ] **AC-D8**：`缺少配置项：{k}` → `validation.promptConfig.missingKey`（带 `{key}`）。
- [ ] **AC-D9**：`{k} 的 value 不能为空` → `validation.promptConfig.valueRequired`（带 `{key}`）。
- [ ] **AC-D10**：`未知配置项：{k}` → `validation.promptConfig.unknownKey`（带 `{key}`）。
- [ ] **AC-D11**：`tmpl.message` 动态模板校验 → 映射至有限 `validation.promptConfig.template.*` key（见 open-questions Q1；不保留运行时中文字符串）。

---

## Epic E：conversation-summary validation 子 key

### US-E1 PUT 校验 message 全 key 化

**验收标准：**

- [ ] **AC-E1**：`config 须为对象` → `validation.conversationSummary.configMustBeObject`。
- [ ] **AC-E2**：`不支持的字段` → `validation.conversationSummary.unsupportedField`（带 `{field}`）。
- [ ] **AC-E3**：`enabled 须为 boolean` → `validation.conversationSummary.enabledBoolean`。
- [ ] **AC-E4**：整数范围 `须为 min~max 的整数` → `validation.conversationSummary.integerRange`（带 `{min}` `{max}`）。
- [ ] **AC-E5**：`须为 tokens 或 messages` → `validation.conversationSummary.modeEnum`。
- [ ] **AC-E6**：顶层 `校验失败` → `validation.invalidParams` 或 `validationError`。
- [ ] **AC-E7**：`details` 内所有 `field.message` 使用 `tApiMessage` key，无硬编码中文。

---

## Epic F：按 Route 覆盖清单

### US-F1 users 域（3 files）

| 文件 | 须覆盖 ErrorCode / 场景 |
| --- | --- |
| `users/route.ts` | VALIDATION_ERROR(paginationParamsInvalid) |
| `users/[id]/route.ts` | VALIDATION_ERROR(invalidUserId, invalidJson, atLeastOneUpdateField, invalidUserStatus, readOnlyMustBeBoolean), FORBIDDEN(cannotChangeOwnStatus), USER_NOT_FOUND |
| `users/[id]/reset-password/route.ts` | RATE_LIMITED, VALIDATION_ERROR(invalidJson, invalidUserId), FORBIDDEN(cannotResetOwnPassword), USER_NOT_FOUND |

**验收标准：**

- [ ] **AC-F1**：上述 3 文件 handler 无硬编码中文 `jsonError` message（注释除外）。

### US-F2 model-configs 域（2 files）

| 文件 | 须覆盖 ErrorCode / 场景 |
| --- | --- |
| `model-configs/route.ts` | VALIDATION_ERROR(pagination, invalidJson, invalidParams, provider, required, maxLength), INTERNAL_ERROR(serverConfig, saveFailedRetry) |
| `model-configs/[id]/route.ts` | VALIDATION_ERROR(invalidId, invalidJson, invalidParams), MODEL_CONFIG_NOT_FOUND, INTERNAL_ERROR(serverConfig, saveFailedRetry) |

**验收标准：**

- [ ] **AC-F2**：上述 2 文件无硬编码中文 `jsonError` message。

### US-F3 assistants 域（2 files）

| 文件 | 须覆盖 ErrorCode / 场景 |
| --- | --- |
| `assistants/route.ts` | VALIDATION_ERROR(pagination, invalidJson, invalidParams, required, maxLength, stringOrNull), INTERNAL_ERROR(saveFailedRetry) |
| `assistants/[id]/route.ts` | VALIDATION_ERROR(invalidId, invalidJson, invalidParams), ASSISTANT_NOT_FOUND, INTERNAL_ERROR |

**验收标准：**

- [ ] **AC-F3**：上述 2 文件无硬编码中文 `jsonError` message。

### US-F4 prompt-config（1 file）

| 文件 | 须覆盖 ErrorCode / 场景 |
| --- | --- |
| `prompt-config/route.ts` | GET INTERNAL_ERROR(readPromptConfigFailed); PUT 全量 validation.promptConfig.* + INTERNAL_ERROR(save/writeVerify) |

**验收标准：**

- [ ] **AC-F4**：route 无硬编码中文 `jsonError` message。
- [ ] **AC-F5**：GET 响应中用户可见 `statusMessage`（若保留）双语或改由前端 `page.admin.prompts` 映射（见 open-questions Q2）。

### US-F5 conversation-summary（1 file）

| 文件 | 须覆盖 ErrorCode / 场景 |
| --- | --- |
| `config/conversation-summary/route.ts` | GET INTERNAL_ERROR(read); PUT validation.conversationSummary.* + INTERNAL_ERROR(save/writeVerify) |

**验收标准：**

- [ ] **AC-F6**：route 无硬编码中文 `jsonError` message。
- [ ] **AC-F7**：GET 坏 JSON 说明文案策略与 prompt-config 一致（open-questions Q2）。

---

## Epic G：messages 文件

### US-G1 api/message.json 填充

**验收标准：**

- [ ] **AC-G1**：`messages/en/api/message.json` 与 `messages/zh/api/message.json` 含本期全部新增 `admin.*` 与 `validation.promptConfig.*`、`validation.conversationSummary.*` key。
- [ ] **AC-G2**：key 命名 camelCase，与 ErrorCode 语义对应。
- [ ] **AC-G3**：带参数 message 使用 ICU 或分 key，中英两套。
- [ ] **AC-G4**：与 0.1.16 console 共用 key 不重复定义冲突措辞（同一 key 中英各一条）。

---

## Epic D：knowledge-bases API（5 routes）

### US-D1 知识库 CRUD 与向量化错误双语

**作为** 用户  
**我想要** 在 console knowledge 管理页操作失败时看到与界面语言一致的 API 错误  
**以便** 理解失败原因（消除 0.1.16 已知限制）  

**验收标准：**

- [ ] **AC-D1**：`KNOWLEDGE_BASE_NOT_FOUND` → `knowledgeBaseNotFound`。
- [ ] **AC-D2**：`KNOWLEDGE_BASE_REFERENCED_BY_ASSISTANT` → `knowledgeBaseReferencedByAssistant`。
- [ ] **AC-D3**：`KNOWLEDGE_BASE_CHUNK_TEST_UNAVAILABLE` → `knowledgeBaseChunkTestUnavailable`。
- [ ] **AC-D4**：validation details（name/content/tags 等）全 `validation.*` key 化。
- [ ] **AC-D5**：标签校验 helper（若存在）增加 `locale` 或 route 层 `tApiMessage`。
- [ ] **AC-D6**：5 个 route 文件 grep 零中文硬编码 `jsonError` message。

**Route 清单：**

- `knowledge-bases/route.ts`（GET, POST）
- `knowledge-bases/[id]/route.ts`（GET, PATCH, DELETE）
- `knowledge-bases/[id]/vectorization/route.ts`（POST）
- `knowledge-bases/[id]/vectorization/retry/route.ts`（POST）
- `knowledge-bases/[id]/chunk-tests/route.ts`（POST）

---

## 不在范围

- API **成功**响应体 `message` 字段。
- HTTP 状态码变更。
- 数据库/日志内部错误栈。
- `withAdminApi` 门禁层重构（已双语）。

---

## 冒烟测试建议（API）

| 场景 | locale | 预期 |
| --- | --- | --- |
| 非管理员 GET `/api/admin/users` | en | `forbidden` 英文 |
| 未登录 GET `/api/admin/users` | en | `unauthorized` 英文 |
| 无效分页 GET `/api/admin/users?page=0` | en | `validation.paginationParamsInvalid` 英文 |
| 重置自己密码 POST | zh | `admin.cannotResetOwnPassword` 中文 |
| 不存在用户 PATCH | en | `userNotFound` 英文 |
| 不存在模型 GET | en | `modelConfigNotFound` 英文 |
| prompt-config 缺 key PUT | zh | `validation.promptConfig.missingKey` 中文 |
| reset-password 频控 | en | `rateLimited` 英文 |
| 不存在知识库 GET | en | `knowledgeBaseNotFound` 英文 |
| 删除仍被助手引用 DELETE | zh | `knowledgeBaseReferencedByAssistant` 中文 |
| 分片测试不可用 POST | en | `knowledgeBaseChunkTestUnavailable` 英文 |
