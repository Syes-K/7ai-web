# API / HTTP 路由与 Middleware 行为规格 — Admin + knowledge-bases 域 i18n（version 0.1.17）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.17` |
| 阶段 | **3A 文档** |
| 说明 | Admin 9 routes + knowledge-bases 5 routes **错误 message 双语**；middleware **admin/knowledge 路由迁移**；layout 鉴权规格 |
| 基线 | `../../0.1.16/backend/api-spec.md` |
| 设计终稿 | `../design/spec-api-message-admin.md`、`../design/spec-api-message-knowledge-bases.md`、`../design/spec-routing-locale-admin-knowledge.md` |
| 产品决策 | Q1=A 全量；Q2=B GET 坏 JSON 前端映射；Q3=A 跨页链；Q4-B prompt tmpl 枚举；Q7-B 复用 `invalidId`；Q11=A knowledge 纳入 |

---

## 1. REST API 变更声明

### 1.1 总览

| 项 | 结论 |
| --- | --- |
| 新增 Route Handler | **无** |
| 修改 Route Handler | **有** — admin 9 + knowledge-bases 5 全部 `jsonError` 路径 + 共享校验 helper |
| 请求体 schema | **无** |
| 响应体 schema（成功） | **微变更（Q2-B）** — `prompt-config` / `conversation-summary` GET **移除**中文 `fileHint`；仅保留机器可读 `fileState` |
| 响应体 schema（错误） | **无结构变更** — `{ error: { code, message, details? } }`；`message` 随 locale 变化 |
| 鉴权逻辑 | **无** — `withAdminApi` / `getRequestUserContext` 行为不变 |
| API URL | **仍** `/api/admin/...`、`/api/knowledge-bases/...`，**无** locale 前缀 |

**策略（延续 0.1.14–0.1.16 · Q9-A）**：`resolveRequestLocale(req)` → `tApiMessage(locale, key, params?)` → `jsonError(code, translatedMessage, status, details?)`；`details[].message` **全部** key 化。

### 1.2 本期双语范围

| 域 | 端点 | 双语 error.message |
| --- | --- | --- |
| Admin | `/api/admin/**`（9 files） | ✓ |
| Knowledge-bases | `/api/knowledge-bases/**`（5 files） | ✓（消除 0.1.16 L1 已知限制） |
| Middleware | `/admin`、`/knowledge` legacy 302；`/{locale}/admin`、`/{locale}/knowledge` 未登录跳转 | ✓ |
| Layout | `[locale]/admin/layout.tsx` 服务端鉴权 redirect | 规格见 §10（Frontend 4 实现） |
| Knowledge 预览 | `[locale]/knowledge/[id]/page.tsx` 鉴权 redirect | 规格见 §11（Frontend 4 实现） |
| 鉴权层回归 | `withAdminApi` → `requireAdminApi` | ✓ 已双语，回归验证 |

---

## 2. Locale 解析与 `tApiMessage` 调用约定

### 2.1 解析顺序（继承）

```
1. Cookie NEXT_LOCALE     → 值 ∈ { en, zh }
2. Accept-Language        → zh* → zh；否则 → en
3. 默认                   → en
```

**实现**：`resolveRequestLocale(request)`（`@/server/i18n/resolve-request-locale`）。

**admin route 模式**（`withAdminApi` 内 handler 首行）：

```typescript
export const GET = withApiWrapper([withAdminApi], async (_admin, request, _ctx) => {
  const locale = resolveRequestLocale(request);
  return jsonError(
    ErrorCode.VALIDATION_ERROR,
    tApiMessage(locale, "validation.paginationParamsInvalid", { maxPageSize: 100 }),
    HttpStatus.BAD_REQUEST,
  );
});
```

**knowledge-bases route 模式**（无 `withAdminApi`）：

```typescript
export const GET = withApiWrapper(async (request: Request) => {
  const locale = resolveRequestLocale(request);
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, tApiMessage(locale, "unauthorized"), HttpStatus.UNAUTHORIZED);
  }
  // ...
});
```

### 2.2 `details[].message` 约定（Q9-A 继承）

字段级 `details` 的 `message` **同样**使用 `tApiMessage`，与主 `error.message` 同 locale。

**共享 helper 改造**（3B）：

| helper | 改造 |
| --- | --- |
| `parseModelConfigTags` | 增加 `locale` 或返回 `{ ok: false, key, params? }`；route 层 `tApiMessage` |
| `parseAssistantTags` | 同上（0.1.16 console 已 locale 化，admin 调用须传入 `locale`） |
| `normalizeTags`（knowledge-bases route 内） | 抽至 `server/knowledge-base/validate-tags.ts` 并 `locale` 化 |
| `validatePromptTemplate` | 返回 `{ valid: false, code }` 枚举；route 映射 `validation.promptConfig.template.*`（Q4-B） |

### 2.3 ICU 参数 key（本期新增/使用）

| key | 参数 | 来源 |
| --- | --- | --- |
| `validation.paginationParamsInvalid` | `{ maxPageSize }` | admin users: `100`；model-configs/assistants: `CONSOLE_*_LIST_MAX_PAGE_SIZE` |
| `validation.maxLength` | `{ max }` | 各 `*_MAX_LENGTH` 常量 |
| `validation.promptConfig.exactItemCount` | `{ count }` | `getAuthoritativePromptKeys().length` |
| `validation.promptConfig.missingKey` | `{ key }` | 权威 key 名 |
| `validation.promptConfig.valueRequired` | `{ key }` | 权威 key 名 |
| `validation.promptConfig.unknownKey` | `{ key }` | 未知 key 名 |
| `validation.promptConfig.template.undeclaredParam` | `{ param }` | 未声明占位符名 |
| `validation.conversationSummary.unsupportedField` | `{ field }` | 非法字段名 |
| `validation.conversationSummary.integerRange` | `{ min }`, `{ max }` | 各 `CONVERSATION_SUMMARY_*` 常量 |
| `validation.knowledgeBase.tagsMaxCount` | `{ max }` | `KNOWLEDGE_BASE_TAGS_MAX_COUNT` |
| `validation.knowledgeBase.tagMaxLength` | `{ max }` | `KNOWLEDGE_BASE_TAG_MAX_LENGTH` |

---

## 3. ErrorCode ↔ message key 完整映射表

### 3.1 复用已有 top-level / validation key

| ErrorCode / 场景 | message key | 路由 / 场景 |
| --- | --- | --- |
| `UNAUTHORIZED` | `unauthorized` | knowledge-bases 全 route；admin 由 `withAdminApi` |
| `FORBIDDEN`（门禁） | `forbidden` | `withAdminApi` |
| `RATE_LIMITED` | `rateLimited` | `users/[id]/reset-password` POST |
| `USER_NOT_FOUND` | `userNotFound` | users PATCH/reset-password |
| `MODEL_CONFIG_NOT_FOUND` | `modelConfigNotFound` | model-configs `[id]` |
| `ASSISTANT_NOT_FOUND` | `assistantNotFound` | assistants `[id]` |
| `KNOWLEDGE_BASE_NOT_FOUND` | `knowledgeBaseNotFound` | knowledge-bases `[id]/**` |
| `KNOWLEDGE_BASE_REFERENCED_BY_ASSISTANT` | `knowledgeBaseReferencedByAssistant` | knowledge-bases `[id]` DELETE |
| `KNOWLEDGE_BASE_CHUNK_TEST_UNAVAILABLE` | `knowledgeBaseChunkTestUnavailable` | chunk-tests POST |
| `VALIDATION_ERROR`（分页） | `validation.paginationParamsInvalid` | users/model-configs/assistants GET |
| `VALIDATION_ERROR`（JSON body） | `validation.invalidJson` | 各 POST/PATCH/PUT |
| `VALIDATION_ERROR`（id） | `validation.invalidId` | **Q7-B：含用户 id、模型 id、KB id** |
| `VALIDATION_ERROR`（顶层参数） | `validation.invalidParams` | model-configs/assistants/knowledge-bases |
| `VALIDATION_ERROR`（required） | `validation.required` | 各域字段 |
| `VALIDATION_ERROR`（stringOrNull） | `validation.stringOrNull` | assistants/knowledge-bases |
| `VALIDATION_ERROR`（apiKey 字符串） | `validation.apiKeyStringRequired` | model-configs PATCH `apiKey` 类型 |
| `VALIDATION_ERROR`（provider） | `validation.invalidModelProvider` | model-configs POST/PATCH |
| `INTERNAL_ERROR`（通用保存） | `saveFailedRetry` | model-configs/assistants/knowledge-bases POST |
| `INTERNAL_ERROR`（密钥） | `serverConfigCannotSaveSecrets` | model-configs POST/PATCH encrypt |

### 3.2 新增 top-level `admin.*` key

| key | ErrorCode | 场景 |
| --- | --- | --- |
| `admin.cannotResetOwnPassword` | `FORBIDDEN` | reset-password 重置自己 |
| `admin.cannotChangeOwnStatus` | `FORBIDDEN` | users PATCH 变更自己 status/readOnly |
| `admin.readPromptConfigFailed` | `INTERNAL_ERROR` | prompt-config GET 读文件失败 |
| `admin.readConversationSummaryFailed` | `INTERNAL_ERROR` | conversation-summary GET 读文件失败 |
| `admin.saveFailedCheckPermissions` | `INTERNAL_ERROR` | prompt-config PUT 写盘失败 |
| `admin.conversationSummarySaveFailed` | `INTERNAL_ERROR` | conversation-summary PUT 写盘失败 |
| `admin.writeVerifyFailed` | `INTERNAL_ERROR` | 两 config PUT 写入后读回失败 |

### 3.3 新增 validation key（admin 用户域）

| key | 现网中文（摘要） |
| --- | --- |
| `validation.invalidUserStatus` | status 须为 Active 或 Disabled |
| `validation.readOnlyMustBeBoolean` | readOnly 须为布尔值 |
| `validation.atLeastOneUpdateField` | 至少提供一个可更新字段（users PATCH；knowledge-bases PATCH 空 body） |

**注**：`validation.invalidUserId` **不新增**（Q7-B 复用 `validation.invalidId`）。

### 3.4 新增 top-level knowledge-bases key

| ErrorCode | key |
| --- | --- |
| `KNOWLEDGE_BASE_NOT_FOUND` | `knowledgeBaseNotFound` |
| `KNOWLEDGE_BASE_REFERENCED_BY_ASSISTANT` | `knowledgeBaseReferencedByAssistant` |
| `KNOWLEDGE_BASE_CHUNK_TEST_UNAVAILABLE` | `knowledgeBaseChunkTestUnavailable` |

### 3.5 `validation.promptConfig.*` 子树（Q4-B）

| 现网中文 | key |
| --- | --- |
| 请求体不是合法 JSON | `validation.invalidJson`（复用） |
| items 须为非空数组 | `validation.promptConfig.itemsRequired` |
| items[i] 须为对象 | `validation.promptConfig.itemMustBeObject` |
| key 须为字符串 | `validation.promptConfig.keyStringRequired` |
| value 须为字符串 | `validation.promptConfig.valueStringRequired` |
| 仅允许 key、value 字段 | `validation.promptConfig.onlyKeyValueAllowed` |
| key 重复 | `validation.promptConfig.duplicateKey` |
| 须恰好包含 N 个配置项 | `validation.promptConfig.exactItemCount` |
| 缺少配置项：{k} | `validation.promptConfig.missingKey` |
| {k} 的 value 不能为空 | `validation.promptConfig.valueRequired` |
| value 不能为空（details field） | `validation.promptConfig.valueEmpty` |
| 未知配置项：{k} | `validation.promptConfig.unknownKey` |
| 校验失败（顶层） | `validation.invalidParams` |

**`validation.promptConfig.template.*`（原 `tmpl.message` 动态串）**：

| `validatePromptTemplate` 分支 | key |
| --- | --- |
| 非法 `{` 占位符 | `validation.promptConfig.template.invalidBrace` |
| 未声明参数 `{name}` | `validation.promptConfig.template.undeclaredParam`（ICU `{param}`） |

**实现约束**：route 层 **禁止** `jsonError(..., tmpl.message)`；须 `mapPromptTemplateError(locale, tmpl)` 或内联分支选 key。

### 3.6 `validation.conversationSummary.*` 子树

| 现网中文 | key |
| --- | --- |
| config 须为对象 | `validation.conversationSummary.configMustBeObject` |
| 不支持的字段 | `validation.conversationSummary.unsupportedField` |
| enabled 须为 boolean | `validation.conversationSummary.enabledBoolean` |
| 须为 min~max 的整数 | `validation.conversationSummary.integerRange` |
| 须为 tokens 或 messages | `validation.conversationSummary.modeEnum` |
| 顶层校验失败 | `validation.invalidParams` |

### 3.7 `validation.knowledgeBase.*` 子树

| 现网中文 | key |
| --- | --- |
| 须为字符串数组 | `validation.knowledgeBase.tagsArrayRequired` |
| 最多 N 个标签 | `validation.knowledgeBase.tagsMaxCount` |
| 单个标签最长 N 字 | `validation.knowledgeBase.tagMaxLength` |
| contentFormat 枚举 | `validation.knowledgeBase.contentFormatEnum` |
| sourceType 仅 text | `validation.knowledgeBase.sourceTypeTextOnly` |
| 名称已存在 | `validation.knowledgeBase.nameConflict` |
| topK 范围 | `validation.knowledgeBase.topKRange` |
| threshold 范围 | `validation.knowledgeBase.thresholdRange` |

---

## 4. Admin 九个 Route 逐 Endpoint 映射表

> **列说明**：`#` 为文件内分支序号；`details key` 为 `details[].message` 所用 key（无 details 填 `—`）。  
> **鉴权**：各 route 经 `withAdminApi`；`UNAUTHORIZED`/`FORBIDDEN` 由门禁返回，下表不重复列出。

### 4.1 `users/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | GET | page/pageSize 非法 | `VALIDATION_ERROR` | `validation.paginationParamsInvalid`（`{maxPageSize: 100}`） | — | 400 |

### 4.2 `users/[id]/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PATCH | userId 无效 | `VALIDATION_ERROR` | `validation.invalidId` | — | 400 |
| 2 | PATCH | body 非 JSON | `VALIDATION_ERROR` | `validation.invalidJson` | — | 400 |
| 3 | PATCH | 无 status/readOnly | `VALIDATION_ERROR` | `validation.atLeastOneUpdateField` | — | 400 |
| 4 | PATCH | status 非法 | `VALIDATION_ERROR` | `validation.invalidUserStatus` | — | 400 |
| 5 | PATCH | readOnly 非 boolean | `VALIDATION_ERROR` | `validation.readOnlyMustBeBoolean` | — | 400 |
| 6 | PATCH | 操作自己账号 | `FORBIDDEN` | `admin.cannotChangeOwnStatus` | — | 403 |
| 7 | PATCH | 用户不存在 | `USER_NOT_FOUND` | `userNotFound` | — | 404 |

### 4.3 `users/[id]/reset-password/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | POST | IP 频控 | `RATE_LIMITED` | `rateLimited` | — | 429 |
| 2 | POST | body 非空且非 JSON | `VALIDATION_ERROR` | `validation.invalidJson` | — | 400 |
| 3 | POST | userId 无效 | `VALIDATION_ERROR` | `validation.invalidId` | — | 400 |
| 4 | POST | 重置自己 | `FORBIDDEN` | `admin.cannotResetOwnPassword` | — | 403 |
| 5 | POST | 用户不存在 | `USER_NOT_FOUND` | `userNotFound` | — | 404 |

### 4.4 `model-configs/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | GET | 分页非法 | `VALIDATION_ERROR` | `validation.paginationParamsInvalid`（`CONSOLE_MODEL_LIST_MAX_PAGE_SIZE`） | — | 400 |
| 2 | POST | body 非 JSON | `VALIDATION_ERROR` | `validation.invalidJson` | — | 400 |
| 3 | POST | provider 非法 | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.invalidModelProvider` | 422 |
| 4 | POST | modelName 空 | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.required` | 422 |
| 5 | POST | modelName 超长 | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.maxLength`（`{max}`） | 422 |
| 6 | POST | apiKey 空 | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.apiKeyRequired` | 422 |
| 7 | POST | tags 解析失败 | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.modelTags*` | 422 |
| 8 | POST | encrypt 失败 | `INTERNAL_ERROR` | `serverConfigCannotSaveSecrets` | — | 500 |
| 9 | POST | save catch | `INTERNAL_ERROR` | `saveFailedRetry` | — | 500 |

### 4.5 `model-configs/[id]/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | GET/PATCH/DELETE | id 无效 | `VALIDATION_ERROR` | `validation.invalidId` | — | 400 |
| 2 | GET | 不存在 | `MODEL_CONFIG_NOT_FOUND` | `modelConfigNotFound` | — | 404 |
| 3 | PATCH | body 非 JSON | `VALIDATION_ERROR` | `validation.invalidJson` | — | 400 |
| 4 | PATCH | 不存在 | `MODEL_CONFIG_NOT_FOUND` | `modelConfigNotFound` | — | 404 |
| 5 | PATCH | provider/modelName/apiKey/tags 校验 | `VALIDATION_ERROR` | `validation.invalidParams` | 同 §4.4 #3–7 + `validation.apiKeyStringRequired`（apiKey 非 string） | 422 |
| 6 | PATCH | encrypt 失败 | `INTERNAL_ERROR` | `serverConfigCannotSaveSecrets` | — | 500 |
| 7 | DELETE | 不存在 | `MODEL_CONFIG_NOT_FOUND` | `modelConfigNotFound` | — | 404 |

### 4.6 `assistants/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | GET | 分页非法 | `VALIDATION_ERROR` | `validation.paginationParamsInvalid`（`CONSOLE_ASSISTANT_LIST_MAX_PAGE_SIZE`） | — | 400 |
| 2 | POST | body 非 JSON | `VALIDATION_ERROR` | `validation.invalidJson` | — | 400 |
| 3 | POST | name/prompt/icon/opening/tags 校验 | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.required` / `maxLength` / `stringOrNull` / `assistantTags*` | 422 |
| 4 | POST | save catch | `INTERNAL_ERROR` | `saveFailedRetry` | — | 500 |

### 4.7 `assistants/[id]/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | GET/PATCH/DELETE | id 无效 | `VALIDATION_ERROR` | `validation.invalidId` | — | 400 |
| 2 | GET | 不存在 | `ASSISTANT_NOT_FOUND` | `assistantNotFound` | — | 404 |
| 3 | PATCH | body 非 JSON | `VALIDATION_ERROR` | `validation.invalidJson` | — | 400 |
| 4 | PATCH | 不存在 | `ASSISTANT_NOT_FOUND` | `assistantNotFound` | — | 404 |
| 5 | PATCH | 字段校验失败 | `VALIDATION_ERROR` | `validation.invalidParams` | 同 §4.6 #3 details | 422 |
| 6 | DELETE | 不存在 | `ASSISTANT_NOT_FOUND` | `assistantNotFound` | — | 404 |

### 4.8 `prompt-config/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | GET | 读文件 catch | `INTERNAL_ERROR` | `admin.readPromptConfigFailed` | — | 500 |
| 2 | GET | 成功 `invalid_json` | **无 jsonError** | — | — | 200 `{ fileState }`（**无** `fileHint`，Q2-B） |
| 3 | PUT | body 非 JSON | `VALIDATION_ERROR` | `validation.invalidJson` | — | 400 |
| 4 | PUT | items 非数组 | `VALIDATION_ERROR` | `validation.promptConfig.itemsRequired` | — | 400 |
| 5 | PUT | items[i] 非对象 | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.promptConfig.itemMustBeObject` | 400 |
| 6 | PUT | key/value 类型 | `VALIDATION_ERROR` | `validation.invalidParams` | `keyStringRequired` / `valueStringRequired` | 400 |
| 7 | PUT | 多余字段 | `VALIDATION_ERROR` | `validation.invalidParams` | `onlyKeyValueAllowed` | 400 |
| 8 | PUT | key 重复 | `VALIDATION_ERROR` | `validation.invalidParams` | `duplicateKey` | 400 |
| 9 | PUT | items 数量不对 | `VALIDATION_ERROR` | `validation.promptConfig.exactItemCount` | — | 400 |
| 10 | PUT | 缺少权威 key | `VALIDATION_ERROR` | `validation.promptConfig.missingKey` | — | 400 |
| 11 | PUT | value 空 | `VALIDATION_ERROR` | `validation.promptConfig.valueRequired` | `validation.promptConfig.valueEmpty` | 400 |
| 12 | PUT | 模版校验失败 | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.promptConfig.template.*` | 400 |
| 13 | PUT | 未知 key | `VALIDATION_ERROR` | `validation.promptConfig.unknownKey` | — | 400 |
| 14 | PUT | 读文件 catch（保存前） | `INTERNAL_ERROR` | `admin.readPromptConfigFailed` | — | 500 |
| 15 | PUT | 写盘 catch | `INTERNAL_ERROR` | `admin.saveFailedCheckPermissions` | — | 500 |
| 16 | PUT | 写入后读回 catch | `INTERNAL_ERROR` | `admin.writeVerifyFailed` | — | 500 |

### 4.9 `config/conversation-summary/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | GET | 读文件 catch | `INTERNAL_ERROR` | `admin.readConversationSummaryFailed` | — | 500 |
| 2 | GET | 成功 `invalid_json` | **无 jsonError** | — | — | 200 `{ fileState }`（**无** `fileHint`，Q2-B） |
| 3 | PUT | body 非 JSON | `VALIDATION_ERROR` | `validation.invalidJson` | — | 400 |
| 4 | PUT | validateConfig 失败 | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.conversationSummary.*` | 400 |
| 5 | PUT | 写盘 catch | `INTERNAL_ERROR` | `admin.conversationSummarySaveFailed` | — | 500 |
| 6 | PUT | 写入后读回 catch | `INTERNAL_ERROR` | `admin.writeVerifyFailed` | — | 500 |

**`validateConfig` details 映射**：

| field | 条件 | details key |
| --- | --- | --- |
| `config` | 非对象 | `validation.conversationSummary.configMustBeObject` |
| `config.{k}` | 不支持字段 | `validation.conversationSummary.unsupportedField` |
| `config.enabled` | 非 boolean | `validation.conversationSummary.enabledBoolean` |
| `config.maxChars` 等整数 | 范围非法 | `validation.conversationSummary.integerRange` |
| `config.mode` | 非 tokens/messages | `validation.conversationSummary.modeEnum` |

---

## 5. knowledge-bases 五个 Route 逐 Endpoint 映射表

### 5.1 `knowledge-bases/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | GET | 未登录 | `UNAUTHORIZED` | `unauthorized` | — | 401 |
| 2 | POST | 未登录 | `UNAUTHORIZED` | `unauthorized` | — | 401 |
| 3 | POST | body 非 JSON | `VALIDATION_ERROR` | `validation.invalidJson` | — | 400 |
| 4 | POST | name/content 等校验 | `VALIDATION_ERROR` | `validation.invalidParams` | `required` / `maxLength` / `stringOrNull` / `knowledgeBase.*` | 422 |
| 5 | POST | unique 名称冲突 | `VALIDATION_ERROR` | `validation.knowledgeBase.nameConflict` | `validation.knowledgeBase.nameConflict`（field: name） | 422 |
| 6 | POST | save catch（非 unique） | `INTERNAL_ERROR` | `saveFailedRetry` | — | 500 |

### 5.2 `knowledge-bases/[id]/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | GET/PATCH/DELETE | 未登录 | `UNAUTHORIZED` | `unauthorized` | — | 401 |
| 2 | GET/PATCH/DELETE | id 缺失 | `VALIDATION_ERROR` | `validation.invalidId` | — | 400 |
| 3 | GET/PATCH/DELETE | 不存在或非本人 | `KNOWLEDGE_BASE_NOT_FOUND` | `knowledgeBaseNotFound` | — | 404 |
| 4 | PATCH | body 非 JSON | `VALIDATION_ERROR` | `validation.invalidJson` | — | 400 |
| 5 | PATCH | 字段校验 | `VALIDATION_ERROR` | `validation.invalidParams` | 同 POST details | 422 |
| 6 | PATCH | 无更新字段 | `VALIDATION_ERROR` | `validation.atLeastOneUpdateField` | — | 422 |
| 7 | DELETE | 仍被助手引用 | `KNOWLEDGE_BASE_REFERENCED_BY_ASSISTANT` | `knowledgeBaseReferencedByAssistant` | — | 409 |

### 5.3 `knowledge-bases/[id]/vectorization/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | GET | 未登录 | `UNAUTHORIZED` | `unauthorized` | — | 401 |
| 2 | GET | 不存在 | `KNOWLEDGE_BASE_NOT_FOUND` | `knowledgeBaseNotFound` | — | 404 |

> **注**：现网该文件仅导出 **GET**（查询向量化状态）；无 POST handler。

### 5.4 `knowledge-bases/[id]/vectorization/retry/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | POST | 未登录 | `UNAUTHORIZED` | `unauthorized` | — | 401 |
| 2 | POST | 不存在 | `KNOWLEDGE_BASE_NOT_FOUND` | `knowledgeBaseNotFound` | — | 404 |

### 5.5 `knowledge-bases/[id]/chunk-tests/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | POST | 未登录 | `UNAUTHORIZED` | `unauthorized` | — | 401 |
| 2 | POST | id 缺失 | `VALIDATION_ERROR` | `validation.invalidId` | — | 400 |
| 3 | POST | body 非 JSON | `VALIDATION_ERROR` | `validation.invalidJson` | — | 400 |
| 4 | POST | query 空 | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.required`（field: query） | 422 |
| 5 | POST | topK 非法 | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.knowledgeBase.topKRange` | 422 |
| 6 | POST | threshold 非法 | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.knowledgeBase.thresholdRange` | 422 |
| 7 | POST | KB 不存在 | `KNOWLEDGE_BASE_NOT_FOUND` | `knowledgeBaseNotFound` | — | 404 |
| 8 | POST | vectorStatus ≠ success | `KNOWLEDGE_BASE_CHUNK_TEST_UNAVAILABLE` | `knowledgeBaseChunkTestUnavailable` | — | 422 |

---

## 6. GET 成功体与 Q2-B（前端映射）

| route | 3B 变更 | Frontend 4 展示 |
| --- | --- | --- |
| `prompt-config` GET | 移除 `fileHint`；保留 `fileState: "invalid_json" \| "ok"` | `page.admin.prompts` 按 `fileState` 映射 Alert（`invalidJsonAlert` 等） |
| `conversation-summary` GET | 移除 `fileHint` | `page.admin.config` 按 `fileState` 映射 Alert |

错误路径仍用 `admin.readPromptConfigFailed` / `admin.readConversationSummaryFailed`。

---

## 7. Middleware 变更（admin + knowledge）

### 7.1 相对 0.1.16 变更摘要

| 项 | 0.1.16 | 0.1.17 |
| --- | --- | --- |
| `KNOWN_APP_SEGMENTS` | 含 `admin`、`knowledge` | **移除** 二者 |
| `GET /admin` | 受保护 → 裸 login redirect | **302** → `/{locale}/admin/...`（legacy **先于**受保护逻辑） |
| `GET /knowledge/{id}` | 直通（非 i18n 路径） | **302** → `/{locale}/knowledge/{id}` |
| `GET /en/admin` 未登录 | 可能漏网 | **受保护** → `/en/login?redirect=/en/admin/...` |
| `x-admin-login-redirect` | 裸 `/admin/...` | **移除**；改 layout + 可选 `x-pathname` |

### 7.2 `handleLegacyAdminRedirect`（新增）

```typescript
function handleLegacyAdminRedirect(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const locale = resolveRequestLocale(request);
    const suffix = pathname.slice("/admin".length);
    const url = new URL(`/${locale}/admin${suffix}`, request.url);
    url.search = search;
    return NextResponse.redirect(url, 302);
  }
  return null;
}
```

### 7.3 `handleLegacyKnowledgeRedirect`（新增）

```typescript
function handleLegacyKnowledgeRedirect(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/knowledge" || pathname.startsWith("/knowledge/")) {
    const locale = resolveRequestLocale(request);
    const suffix = pathname.slice("/knowledge".length);
    const url = new URL(`/${locale}/knowledge${suffix}`, request.url);
    url.search = search;
    return NextResponse.redirect(url, 302);
  }
  return null;
}
```

### 7.4 `KNOWN_APP_SEGMENTS`（变更后）

```typescript
const KNOWN_APP_SEGMENTS = new Set([
  "api",
  // "admin",     ← 0.1.17 移除
  // "knowledge", ← 0.1.17 移除
]);
```

### 7.5 `isProtectedPath` 扩展

```typescript
function isProtectedPath(pathname: string): boolean {
  if (
    pathname.startsWith("/chat") ||
    pathname.startsWith("/console") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/knowledge") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/console") ||
    pathname.startsWith(AUTH_API_PREFIX)
  ) {
    return true;
  }
  if (/^\/(en|zh)\/chat(\/|$)/.test(pathname)) return true;
  if (/^\/(en|zh)\/console(\/|$)/.test(pathname)) return true;
  if (/^\/(en|zh)\/admin(\/|$)/.test(pathname)) return true;      // 0.1.17 新增
  if (/^\/(en|zh)\/knowledge(\/|$)/.test(pathname)) return true;  // 0.1.17 新增
  return false;
}
```

### 7.6 `handleProtectedRoute` 调整

| 变更 | 说明 |
| --- | --- |
| **移除** `pathname.startsWith("/admin")` 分支 | 不再设置 `x-admin-login-redirect` 裸路径 header |
| locale 前缀 admin/knowledge 未登录 | `redirect=/${locale}/admin/...` 或 `/${locale}/knowledge/...`（含 query） |

### 7.7 Middleware 执行顺序

```mermaid
flowchart TD
  R[Request] --> IL{非法 locale?}
  IL -->|是| RED0[302 /en]
  IL -->|否| LEG_AUTH{/login|register?}
  LEG_AUTH -->|是| RED_AUTH[302 /{locale}/login|register]
  LEG_AUTH -->|否| LEG_CHAT{/chat legacy?}
  LEG_CHAT -->|是| RED_CHAT[302 /{locale}/chat]
  LEG_CHAT -->|否| LEG_CONSOLE{/console legacy?}
  LEG_CONSOLE -->|是| RED_CONSOLE[302 /{locale}/console]
  LEG_CONSOLE -->|否| LEG_ADMIN{/admin legacy?}
  LEG_ADMIN -->|是| RED_ADMIN[302 /{locale}/admin]
  LEG_ADMIN -->|否| LEG_KB{/knowledge legacy?}
  LEG_KB -->|是| RED_KB[302 /{locale}/knowledge]
  LEG_KB -->|否| PR{受保护路径?}
  PR -->|是| AUTH[handleProtectedRoute]
  PR -->|否| I18N{i18n 路径?}
  I18N -->|是| INTL[next-intl]
  I18N -->|否| NEXT[NextResponse.next]
```

### 7.8 Matcher 扩展

在现有 matcher 上**增加**：

```typescript
"/knowledge",
"/knowledge/:path*",
```

保留 `/admin`、`/admin/:path*`。更新负向 lookahead：

```typescript
"/((?!api|_next|_vercel|chat|console|admin|knowledge|.*\\..*)[^/]+)",
```

**可选（推荐）**：对 `/(en|zh)/admin` 与 `/(en|zh)/knowledge` 已登录/未登录请求设置 `x-pathname`、`x-search` header，供 layout/page fallback 构造精确 login redirect。

---

## 8. 请求/响应示例

### 8.1 非管理员 admin API（en）

```http
GET /api/admin/users
Cookie: NEXT_LOCALE=en
```

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to access this resource."
  }
}
```

### 8.2 重置自己密码（zh）

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "不能通过管理端重置当前登录账号的密码，请使用其他管理员账号或账号设置。"
  }
}
```

### 8.3 prompt-config 缺 key（en）

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing configuration item: chatSystemPrompt."
  }
}
```

### 8.4 知识库不存在（en）

```http
GET /api/knowledge-bases/00000000-0000-0000-0000-000000000099
Cookie: NEXT_LOCALE=en
```

```json
{
  "error": {
    "code": "KNOWLEDGE_BASE_NOT_FOUND",
    "message": "Knowledge base not found."
  }
}
```

### 8.5 Legacy admin 重定向

```http
GET /admin/users?q=test
Cookie: NEXT_LOCALE=en
```

```http
HTTP/1.1 302 Found
Location: /en/admin/users?q=test
```

### 8.6 Legacy knowledge 重定向

```http
GET /knowledge/abc-uuid
Accept-Language: zh-CN
```

```http
HTTP/1.1 302 Found
Location: /zh/knowledge/abc-uuid
```

---

## 9. `[locale]/admin/layout.tsx` 服务端鉴权规格（Q5-A / Q10-B）

> **实现归属**：Frontend 4；Backend 3B 改 middleware 双保险。规格供联调与验收。

### 9.1 定稿行为

| 项 | 定稿 |
| --- | --- |
| 文件 | `src/app/[locale]/admin/layout.tsx`（新建）；**删除** `src/app/admin/` |
| 无效 locale | `hasLocale` 失败 → `return null` |
| 鉴权 | `await gateAdminPageAccess()`（`@/server/auth/admin`） |
| 未登录 | `redirect(\`/${locale}/login?redirect=${encodeURIComponent(pathname+search)}\`)` |
| 非管理员 | `redirect(getConsoleForbiddenUrl(locale))` → `/${locale}/console?notice=admin_forbidden` |
| Provider | `AntdRegistry` + `AdminShell`；`displayName` 由 layout 传入 |
| Shell 客户端鉴权 | **移除** `fetch /api/auth/me` 与「验证会话…」加载态 |

### 9.2 参考实现

```typescript
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return null;

  const access = await gateAdminPageAccess();
  if (access === "login") {
    const h = await headers();
    const pathname = h.get("x-pathname") ?? `/${locale}/admin/config`;
    const search = h.get("x-search") ?? "";
    redirect(`/${locale}/login?redirect=${encodeURIComponent(`${pathname}${search}`)}`);
  }
  if (access === "forbidden") {
    redirect(getConsoleForbiddenUrl(locale));
  }

  const reqCtx = await getRequestUserContext();
  const displayName = userDisplayLabel(reqCtx!.user);
  return (
    <AntdRegistry>
      <AdminShell displayName={displayName}>{children}</AdminShell>
    </AntdRegistry>
  );
}
```

### 9.3 redirect 精确度

| 场景 | redirect 目标 |
| --- | --- |
| middleware 拦截 `GET /en/admin/users` | `/en/login?redirect=/en/admin/users`（含 query） |
| layout fallback（无 x-pathname） | `/en/login?redirect=/en/admin/config` |
| 非管理员 | `/en/console?notice=admin_forbidden` |

### 9.4 与 middleware 关系

- **双保险**：middleware 未登录 → login；layout 防止 matcher 漏网或 RSC 直渲。
- **API**：`/api/admin/**` 不经 layout；仍由 `withAdminApi` + `jsonError(unauthorized|forbidden)` 处理。

---

## 10. Knowledge 预览页鉴权 redirect 规格

> **实现归属**：Frontend 4（`src/app/[locale]/knowledge/[id]/page.tsx`）。

| 项 | 定稿 |
| --- | --- |
| 未登录 | `redirect(\`/${locale}/login?redirect=/${locale}/knowledge/${id}\`)` |
| KB 不存在或非本人 | `notFound()` |
| 单独 layout | **可选**；默认在 `page.tsx` 内联鉴权（与 admin 解耦） |
| LanguageSwitcher | **本期不加**（设计定稿：轻量预览页） |

---

## 11. 与前端对接要点

| 项 | 约定 |
| --- | --- |
| 展示 REST 错误 | 直接 `error.message`（已翻译）；`parseApiError` fallback 用 `page.admin.*` / `page.console.shell.errors.*` |
| prompt/config GET `fileState` | 前端 `t('invalidJsonAlert')` 等（Q2-B） |
| 401 页面跳转 | `buildLocaleLoginRedirect(locale, returnPath)` |
| 403 forbidden | `getConsoleForbiddenUrl(locale)` + `ConsoleForbiddenNotice`（`page.shell`） |
| AdminShell 链 | `Link` from `@/i18n/navigation`：`/chat`、`/console/profile` |
| Knowledge 预览链 | `Link href="/knowledge/{id}"`（自动 locale 前缀） |

---

## 12. 关联文档

- Key 树与 JSON 增量：`data-models.md`
- 3B 步骤与文件清单：`implementation-plan.md`
- 设计终稿：`../design/spec-api-message-admin.md`、`../design/spec-api-message-knowledge-bases.md`、`../design/spec-routing-locale-admin-knowledge.md`
