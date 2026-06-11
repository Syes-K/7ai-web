# API / HTTP 路由与 Middleware 行为规格 — Console 域 i18n（version 0.1.16）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.16` |
| 阶段 | **3A 文档** |
| 说明 | Console 域 API **错误 message 双语**；middleware **console 路由迁移**；REST **成功**响应 schema **不变** |
| 基线 | `../../0.1.15/backend/api-spec.md` |
| 设计终稿 | `../design/spec-api-message-console.md`、`../design/spec-routing-locale-console.md` |

---

## 1. REST API 变更声明

### 1.1 总览

| 项 | 结论 |
| --- | --- |
| 新增 Route Handler | **无** |
| 修改 Route Handler | **有** — 12 个 console route 文件全部 `jsonError` 路径 + 共享校验 helper |
| 请求体 schema | **无** |
| 响应体 schema（成功） | **无** — 含 `test-connection` 的 `lastErrorSummary` **值**改为 locale 译文，字段名不变 |
| 响应体 schema（错误） | **无结构变更** — `{ error: { code, message, details? } }`；`message` 随 locale 变化 |
| 鉴权逻辑 | **无** |
| API URL | **仍** `/api/console/...`，**无** locale 前缀 |

**策略（延续 0.1.14/0.1.15 · Q9-A）**：`resolveRequestLocale(req)` → `tApiMessage(locale, key, params?)` → `jsonError(code, translatedMessage, status, details?)`；`details[].message` **全部** key 化。

### 1.2 本期双语范围

| 域 | 端点 | 双语 error.message / lastErrorSummary |
| --- | --- | --- |
| Console | `/api/console/profile/**`（3 files） | ✓ |
| Console | `/api/console/models/**`（2 files） | ✓ |
| Console | `/api/console/assistants/**`（4 files） | ✓ |
| Console | `/api/console/mcp-configs/**`（3 files） | ✓ |
| Middleware | `/console` legacy 302、`/{locale}/console` 未登录跳转 | ✓（redirect URL 变更） |
| Layout | `[locale]/console/layout.tsx` 服务端鉴权 redirect | ✓（Frontend 4 实现，规格见 §9） |
| 共享 | `withReadOnlyApi` | ✓（0.1.15 已实施，回归验证） |
| **非目标** | `/api/knowledge-bases/**`（5 routes） | ✗ 仍中文（0.1.18+） |
| **非目标** | `/api/admin/**` | ✗ 0.1.17 |

### 1.3 边界说明（Q1-A）

| 层 | 本期状态 |
| --- | --- |
| `/console/knowledge` **页面 UI** | Frontend 4 全量双语 |
| `/api/console/**` | **本期 Backend 3B 双语** |
| `/api/knowledge-bases/**` | **不在本期**；knowledge 管理页 CRUD/向量化/分片测试仍可能返回中文 `error.message` |

英文 UI 下 knowledge 页调用 knowledge-bases API 失败时，**原样展示** API message（可能中文）；不做客户端二次翻译。验收标注为**已知限制 #8**。

---

## 2. Locale 解析与 `tApiMessage` 调用约定

### 2.1 解析顺序（继承 Q5-A）

```
1. Cookie NEXT_LOCALE     → 值 ∈ { en, zh }
2. Accept-Language        → zh* → zh；否则 → en
3. 默认                   → en
```

**实现**：`resolveRequestLocale(req)`（`@/server/i18n/resolve-request-locale`）。

**每个 route handler 模式**：

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

### 2.2 `details[].message` 约定（Q9-A 定稿）

字段级 `details` 的 `message` **同样**使用 `tApiMessage`，与主 `error.message` 同 locale：

```typescript
return jsonError(
  ErrorCode.VALIDATION_ERROR,
  tApiMessage(locale, "validation.invalidParams"),
  HttpStatus.UNPROCESSABLE_ENTITY,
  [{ field: "modelName", message: tApiMessage(locale, "validation.required") }],
);
```

**共享校验 helper 改造**：`mcp-config-validation.ts`、`parse-mcp-config-ids.ts`、`parse-model-tags.ts`、`parse-assistant-tags.ts` 等产出 `details` 的函数须增加 `locale: AppLocale` 参数，内部 `tApiMessage`；route 传入 `locale`。

### 2.3 ICU 参数 key

| key | 参数 | 来源 |
| --- | --- | --- |
| `validation.maxLength` | `{ max }` | 各 `*_MAX_LENGTH` 常量 |
| `validation.paginationParamsInvalid` | `{ maxPageSize }` | `CONSOLE_*_LIST_MAX_PAGE_SIZE` |
| `validation.mcpConfigLimitPerUser` | `{ max }` | `MCP_CONFIG_MAX_PER_USER` |
| `validation.mcpConfigMaxPerAssistant` | `{ max }` | `MCP_CONFIG_MAX_PER_ASSISTANT` |
| `validation.mcpConfigNameUnique` | `{ maxLength }` | `MCP_CONFIG_NAME_MAX_LENGTH` |
| `validation.mcpConfigReferencedCount` | `{ count }` | DELETE 引用计数 |
| `validation.modelTagsAllowed` | `{ allowed }` | `MODEL_CONFIG_TAG_OPTIONS` join |
| `validation.mcpTransportAllowed` | `{ allowed }` | `MCP_TRANSPORT_VALUES` join |
| `mcpTest.connectionFailed` | `{ detail }` | `sanitizeMcpErrorSummary` 产出 |

---

## 3. ErrorCode ↔ message key 完整映射表（Console 域）

> 与 `@/common/enums` 中 `ErrorCode` **一致**；同一 `ErrorCode` 可按场景选用不同 top-level key。

### 3.1 Top-level key

| ErrorCode | message key | 现网中文 | 路由 / 场景 |
| --- | --- | --- | --- |
| `UNAUTHORIZED` | `unauthorized` | 未登录 | 全部 12 routes 鉴权失败 |
| `RATE_LIMITED` | `rateLimited` | 请求过于频繁，请稍后再试 | `mcp-configs/[id]/test-connection` POST |
| `VALIDATION_ERROR` | 见 §3.2、§4 | 多种 | body/field/分页/scope 校验 |
| `AUTH_TEL_TAKEN` | `authTelTaken` | 该手机号已被占用 | `profile/personal` PATCH |
| `MODEL_CONFIG_NOT_FOUND` | `modelConfigNotFound` | 模型配置不存在 | `models/[id]/**`、`profile/preference` PATCH |
| `ASSISTANT_NOT_FOUND` | `assistantNotFound` | 助手不存在 | `assistants/**` 及 KB/MCP 子 route |
| `MCP_CONFIG_NOT_FOUND` | `mcpConfigNotFound` | 配置不存在 | `mcp-configs/**` 全 route |
| `MCP_CONFIG_NAME_CONFLICT` | `mcpConfigNameConflict` | 名称已存在 | `mcp-configs` POST/PATCH catch unique |
| `MCP_CONFIG_REFERENCED_BY_ASSISTANT` | `mcpConfigReferencedByAssistant` | 无法删除：仍被助手引用… | `mcp-configs/[id]` DELETE |
| `MCP_CREDENTIALS_ENCRYPTION_UNAVAILABLE` | `mcpCredentialsEncryptionUnavailable` | 服务端未配置…主密钥 | `mcp-configs` POST/PATCH credentials |
| `INTERNAL_ERROR`（通用） | `internalError` | — | 未分类 catch fallback |
| `INTERNAL_ERROR`（profile GET） | `loadFailed` | 加载失败 | `profile/route` GET |
| `INTERNAL_ERROR`（保存） | `saveFailedRetry` | 保存失败，请稍后重试 | models/assistants/mcp POST/PATCH catch |
| `INTERNAL_ERROR`（用户不存在） | `userNotFound` | 用户不存在 | `profile/personal`、`profile/preference` |
| `INTERNAL_ERROR`（加密失败） | `credentialEncryptionFailed` | 密钥加密失败 | `mcp-configs` POST/PATCH |
| `INTERNAL_ERROR`（服务端密钥） | `serverConfigCannotSaveSecrets` | 服务端配置异常，无法保存密钥 | `models` POST/PATCH encrypt |
| `FORBIDDEN` | `readOnlyAccountBlocked` | 只读账号 | `withReadOnlyApi`（0.1.15 已双语） |

### 3.2 新增 top-level 文案（en / zh）

| key | en | zh |
| --- | --- | --- |
| `modelConfigNotFound` | Model configuration not found. | 模型配置不存在 |
| `mcpConfigNotFound` | MCP configuration not found. | 配置不存在 |
| `mcpConfigNameConflict` | An MCP configuration with this name already exists. | 名称已存在 |
| `mcpConfigReferencedByAssistant` | Cannot delete: this MCP is still mounted on one or more assistants. Remove it from Assistant management first. | 无法删除：仍被助手引用，请先在助手管理中解除 MCP 挂载。 |
| `mcpCredentialsEncryptionUnavailable` | Server is not configured with MCP_CREDENTIALS_MASTER_KEY; credentials cannot be saved. | 服务端未配置 MCP 凭证加密主密钥（MCP_CREDENTIALS_MASTER_KEY），无法保存密钥。 |
| `internalError` | Something went wrong. Please try again later. | 服务器错误，请稍后重试 |
| `loadFailed` | Could not load your profile. | 加载失败 |
| `saveFailedRetry` | Could not save. Please try again later. | 保存失败，请稍后重试 |
| `userNotFound` | User not found. | 用户不存在 |
| `credentialEncryptionFailed` | Could not encrypt credentials. | 密钥加密失败 |
| `serverConfigCannotSaveSecrets` | Server configuration error; API keys cannot be saved. | 服务端配置异常，无法保存密钥 |

**注**：`assistantNotFound`、`authTelTaken`、`unauthorized`、`rateLimited`、`validationError`、`validation.invalidJson` 沿用 0.1.14/0.1.15。

---

## 4. 十二个 Route 逐 Endpoint 映射表

> **列说明**：`#` 为文件内分支序号；`details key` 为 `details[].message` 所用 key（无 details 填 `—`）。

### 4.1 `profile/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | GET | 未登录 | `UNAUTHORIZED` | `unauthorized` | — | 401 |
| 2 | GET | catch | `INTERNAL_ERROR` | `loadFailed` | — | 500 |

### 4.2 `profile/personal/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PATCH | 未登录 | `UNAUTHORIZED` | `unauthorized` | — | 401 |
| 2 | PATCH | body 非 JSON | `VALIDATION_ERROR` | `validation.invalidJson` | — | 400 |
| 3 | PATCH | `email` 字段存在 | `VALIDATION_ERROR` | `validation.emailImmutable` | `validation.emailImmutable` (field: email) | 400 |
| 4 | PATCH | 无 nickName/telNo | `VALIDATION_ERROR` | `validation.profileFieldRequired` | — | 400 |
| 5 | PATCH | User 行不存在 | `INTERNAL_ERROR` | `userNotFound` | — | 500 |
| 6 | PATCH | nickName 非 string | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.stringRequired` (nickName) | 422 |
| 7 | PATCH | nickName 长度非法 | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.nickNameLength` (nickName) | 422 |
| 8 | PATCH | telNo 非 string/null | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.stringOrNull` (telNo) | 422 |
| 9 | PATCH | telNo 格式非法 | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.telNoInvalid` (telNo) | 422 |
| 10 | PATCH | telNo 已被占用 | `AUTH_TEL_TAKEN` | `authTelTaken` | — | 400 |

### 4.3 `profile/preference/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PATCH | 未登录 | `UNAUTHORIZED` | `unauthorized` | — | 401 |
| 2 | PATCH | body 非 JSON | `VALIDATION_ERROR` | `validation.invalidJson` | — | 400 |
| 3 | PATCH | 无偏好字段 | `VALIDATION_ERROR` | `validation.preferenceFieldRequired` | — | 400 |
| 4 | PATCH | User 行不存在 | `INTERNAL_ERROR` | `userNotFound` | — | 500 |
| 5 | PATCH | modelConfigId 非法类型 | `VALIDATION_ERROR` | `validation.modelConfigIdInvalid` | — | 400 |
| 6 | PATCH | modelConfigId 不存在 | `MODEL_CONFIG_NOT_FOUND` | `modelConfigNotFound` | — | 404 |
| 7 | PATCH | topK 非法 | `VALIDATION_ERROR` | `validation.preferredKnowledgeTopKRange` | — | 400 |
| 8 | PATCH | threshold 非法 | `VALIDATION_ERROR` | `validation.preferredKnowledgeThresholdRange` | — | 400 |
| 9 | PATCH | chunkSize 非法 | `VALIDATION_ERROR` | `validation.preferredKnowledgeChunkSizeRange` | — | 400 |
| 10 | PATCH | chunkOverlap 非法 | `VALIDATION_ERROR` | `validation.preferredKnowledgeChunkOverlapRange` | — | 400 |

### 4.4 `models/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | GET | 未登录 | `UNAUTHORIZED` | `unauthorized` | — | 401 |
| 2 | GET | page/pageSize 非法 | `VALIDATION_ERROR` | `validation.paginationParamsInvalid` | — | 400 |
| 3 | POST | 未登录 | `UNAUTHORIZED` | `unauthorized` | — | 401 |
| 4 | POST | body 非 JSON | `VALIDATION_ERROR` | `validation.invalidJson` | — | 400 |
| 5 | POST | provider 非法 | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.invalidModelProvider` | 422 |
| 6 | POST | modelName 空 | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.required` (modelName) | 422 |
| 7 | POST | modelName 超长 | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.maxLength` (modelName, `{max}`) | 422 |
| 8 | POST | apiKey 空 | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.apiKeyRequired` | 422 |
| 9 | POST | tags 解析失败 | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.modelTags*`（见 §5.2） | 422 |
| 10 | POST | encrypt 失败 | `INTERNAL_ERROR` | `serverConfigCannotSaveSecrets` | — | 500 |
| 11 | POST | save catch | `INTERNAL_ERROR` | `saveFailedRetry` | — | 500 |

### 4.5 `models/[id]/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | GET | 未登录 | `UNAUTHORIZED` | `unauthorized` | — | 401 |
| 2 | GET/PATCH/DELETE | id 无效 | `VALIDATION_ERROR` | `validation.invalidId` | — | 400 |
| 3 | GET | 不存在 | `MODEL_CONFIG_NOT_FOUND` | `modelConfigNotFound` | — | 404 |
| 4 | PATCH | 未登录 | `UNAUTHORIZED` | `unauthorized` | — | 401 |
| 5 | PATCH | body 非 JSON | `VALIDATION_ERROR` | `validation.invalidJson` | — | 400 |
| 6 | PATCH | 不存在（非公有） | `MODEL_CONFIG_NOT_FOUND` | `modelConfigNotFound` | — | 404 |
| 7 | PATCH | provider/modelName/apiKey/tags 校验 | `VALIDATION_ERROR` | `validation.invalidParams` | 同 POST §4.4 #5–9 | 422 |
| 8 | PATCH | encrypt 失败 | `INTERNAL_ERROR` | `serverConfigCannotSaveSecrets` | — | 500 |
| 9 | DELETE | 未登录 | `UNAUTHORIZED` | `unauthorized` | — | 401 |
| 10 | DELETE | 不存在 | `MODEL_CONFIG_NOT_FOUND` | `modelConfigNotFound` | — | 404 |

### 4.6 `assistants/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | GET | 未登录 | `UNAUTHORIZED` | `unauthorized` | — | 401 |
| 2 | GET | 分页非法 | `VALIDATION_ERROR` | `validation.paginationParamsInvalid` | — | 400 |
| 3 | GET | scope 非法 | `VALIDATION_ERROR` | `validation.scopeInvalid` | — | 400 |
| 4 | POST | 未登录 | `UNAUTHORIZED` | `unauthorized` | — | 401 |
| 5 | POST | body 非 JSON | `VALIDATION_ERROR` | `validation.invalidJson` | — | 400 |
| 6 | POST | scope=system | `VALIDATION_ERROR` | `validation.systemAssistantNotCreatable` | — | 400 |
| 7 | POST | name/prompt/icon/opening/tags 校验 | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.required` / `validation.maxLength` / `validation.stringOrNull` / `validation.assistantTags*` | 422 |
| 8 | POST | save catch | `INTERNAL_ERROR` | `saveFailedRetry` | — | 500 |

### 4.7 `assistants/[id]/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | GET/PATCH/DELETE | 未登录 | `UNAUTHORIZED` | `unauthorized` | — | 401 |
| 2 | GET/PATCH/DELETE | id 无效 | `VALIDATION_ERROR` | `validation.invalidId` | — | 400 |
| 3 | GET | 不可读 | `ASSISTANT_NOT_FOUND` | `assistantNotFound` | — | 404 |
| 4 | PATCH | body 非 JSON | `VALIDATION_ERROR` | `validation.invalidJson` | — | 400 |
| 5 | PATCH | 非本人 personal | `ASSISTANT_NOT_FOUND` | `assistantNotFound` | — | 404 |
| 6 | PATCH | 字段校验失败 | `VALIDATION_ERROR` | `validation.invalidParams` | 同 §4.6 #7 details | 422 |
| 7 | DELETE | 非本人 personal | `ASSISTANT_NOT_FOUND` | `assistantNotFound` | — | 404 |

### 4.8 `assistants/[id]/knowledge-bases/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | GET/PUT | 未登录 | `UNAUTHORIZED` | `unauthorized` | — | 401 |
| 2 | GET/PUT | assistantId 无效 | `VALIDATION_ERROR` | `validation.invalidId` | — | 400 |
| 3 | GET | 助手不存在/不可读 | `ASSISTANT_NOT_FOUND` | `assistantNotFound` | — | 404 |
| 4 | PUT | body 非 JSON | `VALIDATION_ERROR` | `validation.invalidJson` | — | 400 |
| 5 | PUT | knowledgeBaseIds 非数组 | `VALIDATION_ERROR` | `validation.knowledgeBaseIdsInvalid` | `validation.arrayRequired` | 422 |
| 6 | PUT | 非本人 personal 助手 | `ASSISTANT_NOT_FOUND` | `assistantNotFound` | — | 404 |
| 7 | PUT | 含无效 KB id | `VALIDATION_ERROR` | `validation.invalidKnowledgeBaseIds` | `validation.invalidKnowledgeBaseIds` | 422 |

### 4.9 `assistants/[id]/mcp-configs/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | GET/PUT | 未登录 | `UNAUTHORIZED` | `unauthorized` | — | 401 |
| 2 | GET/PUT | assistantId 无效 | `VALIDATION_ERROR` | `validation.invalidId` | — | 400 |
| 3 | GET/PUT | 非本人 personal | `ASSISTANT_NOT_FOUND` | `assistantNotFound` | — | 404 |
| 4 | PUT | body 非 JSON | `VALIDATION_ERROR` | `validation.invalidJson` | — | 400 |
| 5 | PUT | mcpConfigIds 缺失 | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.mcpConfigIdsRequired` | 422 |
| 6 | PUT | mcpConfigIds 格式无效 | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.mcpConfigIdsInvalid` / `validation.mcpConfigIdsStringArray` / `validation.mcpConfigMaxPerAssistant` | 422 |
| 7 | PUT | 含无效 MCP id | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.invalidMcpConfigIds` | 422 |

### 4.10 `mcp-configs/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | GET | 未登录 | `UNAUTHORIZED` | `unauthorized` | — | 401 |
| 2 | POST | 未登录 | `UNAUTHORIZED` | `unauthorized` | — | 401 |
| 3 | POST | body 非 JSON | `VALIDATION_ERROR` | `validation.invalidJson` | — | 400 |
| 4 | POST | 字段校验（name/description/transport/endpoint/metadata/shape） | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.mcp*`（§5.3） | 422 |
| 5 | POST | credentials 类型/空串 | `VALIDATION_ERROR` | `validation.invalidParams` | `validation.mcpCredentialsStringOrNull` / `validation.mcpCredentialsEmptyString` | 422 |
| 6 | POST | 主密钥未配置 | `MCP_CREDENTIALS_ENCRYPTION_UNAVAILABLE` | `mcpCredentialsEncryptionUnavailable` | — | 422 |
| 7 | POST | encrypt 失败 | `INTERNAL_ERROR` | `credentialEncryptionFailed` | — | 500 |
| 8 | POST | 达用户上限 | `VALIDATION_ERROR` | `validation.mcpConfigLimitPerUser` | `validation.mcpConfigLimitReached` | 422 |
| 9 | POST | unique 冲突 | `MCP_CONFIG_NAME_CONFLICT` | `mcpConfigNameConflict` | `validation.mcpConfigNameUnique` | 409 |
| 10 | POST | save catch | `INTERNAL_ERROR` | `saveFailedRetry` | — | 500 |

### 4.11 `mcp-configs/[id]/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | GET/PATCH/DELETE | 未登录 | `UNAUTHORIZED` | `unauthorized` | — | 401 |
| 2 | GET/PATCH/DELETE | id 无效 | `VALIDATION_ERROR` | `validation.invalidId` | — | 400 |
| 3 | GET/PATCH/DELETE | 不存在 | `MCP_CONFIG_NOT_FOUND` | `mcpConfigNotFound` | — | 404 |
| 4 | PATCH | body 非 JSON | `VALIDATION_ERROR` | `validation.invalidJson` | — | 400 |
| 5 | PATCH | 字段校验 | `VALIDATION_ERROR` | `validation.invalidParams` | 同 §4.10 #4–5 + `validation.mcpCredentialsOmitToKeep` / `validation.mcpCredentialsStringRequired` | 422 |
| 6 | PATCH | 主密钥/encrypt | 同 §4.10 #6–7 | — | — | — |
| 7 | PATCH | unique 冲突 | `MCP_CONFIG_NAME_CONFLICT` | `mcpConfigNameConflict` | `validation.mcpConfigNameUnique` | 409 |
| 8 | PATCH | save catch | `INTERNAL_ERROR` | `saveFailedRetry` | — | 500 |
| 9 | DELETE | 仍被引用 | `MCP_CONFIG_REFERENCED_BY_ASSISTANT` | `mcpConfigReferencedByAssistant` | `validation.mcpConfigReferencedCount` | 409 |

### 4.12 `mcp-configs/[id]/test-connection/route.ts`

| # | 方法 | 条件 | ErrorCode | top-level key | details key | HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | POST | 未登录 | `UNAUTHORIZED` | `unauthorized` | — | 401 |
| 2 | POST | id 无效 | `VALIDATION_ERROR` | `validation.invalidId` | — | 400 |
| 3 | POST | 频控 | `RATE_LIMITED` | `rateLimited` | — | 429 |
| 4 | POST | 配置不存在 | `MCP_CONFIG_NOT_FOUND` | `mcpConfigNotFound` | — | 404 |
| 5 | POST | 凭证解密失败 | **无 jsonError** | — | — | 200 `{ ok: false, item.lastErrorSummary }` |
| 6 | POST | 连接失败 catch | **无 jsonError** | — | — | 200 `{ ok: false, item.lastErrorSummary }` |

---

## 5. Validation 子 key 扩展（Q9-A 全量清单）

### 5.1 通用 validation key（设计 + 代码审计）

| 现网中文 | key | en（摘要） |
| --- | --- | --- |
| id 无效 | `validation.invalidId` | Invalid id. |
| 请求参数不合法 | `validation.invalidParams` | Invalid request parameters. |
| 不能为空 | `validation.required` | This field is required. |
| 须为字符串 | `validation.stringRequired` | Must be a string. |
| 须为字符串或 null | `validation.stringOrNull` | Must be a string or null. |
| 须为数组 | `validation.arrayRequired` | Must be an array. |
| 长度不能超过 N | `validation.maxLength` | Must be at most {max} characters. |
| 邮箱不可修改 | `validation.emailImmutable` | Email cannot be changed via this API. |
| 请至少提供 nickName 或 telNo | `validation.profileFieldRequired` | Provide at least nickName or telNo. |
| 至少需要一个偏好字段 | `validation.preferenceFieldRequired` | At least one preference field is required. |
| modelConfigId 须为非空字符串或 null | `validation.modelConfigIdInvalid` | Must be a non-empty string or null. |
| preferredKnowledgeTopK 范围 | `validation.preferredKnowledgeTopKRange` | Must be an integer from 1 to 20, or null. |
| preferredKnowledgeThreshold 范围 | `validation.preferredKnowledgeThresholdRange` | Must be a number from 0 to 1, or null. |
| preferredKnowledgeChunkSize 范围 | `validation.preferredKnowledgeChunkSizeRange` | Must be an integer from 200 to 4000, or null. |
| preferredKnowledgeChunkOverlap 范围 | `validation.preferredKnowledgeChunkOverlapRange` | Must be an integer from 0 to 1000, or null. |
| 分页参数非法 | `validation.paginationParamsInvalid` | Invalid pagination: page ≥ 1, pageSize 1–{maxPageSize}. |
| scope 须为 all/system/personal | `validation.scopeInvalid` | scope must be all, system, or personal. |
| provider 枚举 | `validation.invalidModelProvider` | Provider must be one of: ALYUN, GLM, … |
| apiKey 不能为空 | `validation.apiKeyRequired` | API key is required. |
| apiKey 须为字符串 | `validation.apiKeyStringRequired` | API key must be a string. |
| 不能在控制台创建系统助手 | `validation.systemAssistantNotCreatable` | System assistants cannot be created from the console. |
| knowledgeBaseIds 无效（顶层） | `validation.knowledgeBaseIdsInvalid` | Invalid knowledgeBaseIds. |
| 包含无效知识库 | `validation.invalidKnowledgeBaseIds` | One or more knowledge bases are invalid or inaccessible. |
| 包含无效 MCP | `validation.invalidMcpConfigIds` | One or more MCP configurations are invalid. |
| mcpConfigIds 须提供数组 | `validation.mcpConfigIdsRequired` | mcpConfigIds must be an array (may be empty). |
| mcpConfigIds 格式无效 | `validation.mcpConfigIdsInvalid` | Invalid mcpConfigIds format. |
| mcpConfigIds 须为字符串数组 | `validation.mcpConfigIdsStringArray` | mcpConfigIds must be an array of strings. |
| MCP 名称达上限 | `validation.mcpConfigLimitReached` | MCP configuration limit reached. |
| 单用户 MCP 达上限（顶层） | `validation.mcpConfigLimitPerUser` | Maximum {max} MCP configurations per user. |
| 助手挂载 MCP 达上限 | `validation.mcpConfigMaxPerAssistant` | At most {max} MCP configurations per assistant. |
| 名称须唯一 details | `validation.mcpConfigNameUnique` | Name must be unique (max {maxLength} characters). |
| 仍被 N 个助手引用 | `validation.mcpConfigReferencedCount` | Still referenced by {count} assistant(s). |
| telNo 11 位 | `validation.telNoInvalid` | （已有） | 

### 5.2 Model / Assistant tags validation key

| 现网中文 | key |
| --- | --- |
| 须为字符串数组 | `validation.modelTagsArrayRequired` / `validation.assistantTagsArrayRequired` |
| 每个标签须为字符串 | `validation.tagMustBeString` |
| 标签仅允许：… | `validation.modelTagsAllowed`（ICU `{allowed}`） |
| tags 须为字符串数组 | `validation.assistantTagsArrayRequired` |
| 单个标签长度不能超过 N | `validation.assistantTagMaxLength`（ICU `{max}`） |
| 标签数量不能超过 N | `validation.assistantTagsMaxCount`（ICU `{max}`） |

### 5.3 MCP 字段 validation key（`mcp-config-validation.ts`）

| 现网中文 | key |
| --- | --- |
| 须为字符串或 null（credentials/description） | `validation.mcpCredentialsStringOrNull` / `validation.mcpDescriptionStringOrNull` |
| 不允许传空字符串 | `validation.mcpCredentialsEmptyString` |
| 请省略 credentials 表示不修改… | `validation.mcpCredentialsOmitToKeep` |
| 须为字符串（credentials PATCH） | `validation.mcpCredentialsStringRequired` |
| transport 不能为空 | `validation.mcpTransportRequired` |
| transport 长度超限 | `validation.mcpTransportMaxLength` |
| transport 枚举 | `validation.mcpTransportAllowed`（ICU `{allowed}`） |
| endpoint 不能为空 | `validation.mcpEndpointRequired` |
| endpoint 须为 JSON 对象 | `validation.mcpEndpointObjectRequired` |
| stdio command | `validation.mcpStdioCommandRequired` |
| endpoint.args 须为字符串数组 | `validation.mcpEndpointArgsStringArray` |
| 须提供非空 url | `validation.mcpEndpointUrlRequired` |
| url 格式无效 | `validation.mcpEndpointUrlInvalid` |
| metadata 须为 JSON 对象或 null | `validation.mcpMetadataObjectOrNull` |

---

## 6. MCP test-connection `lastErrorSummary`（Q5-A）

### 6.1 策略定稿

| 场景 | 处理 |
| --- | --- |
| 凭证解密失败 | `lastErrorSummary = tApiMessage(locale, 'mcpTest.credentialsDecryptFailed')` |
| `loadLangChainToolsForUserMcpConfig` catch | `lastErrorSummary = tApiMessage(locale, 'mcpTest.connectionFailed', { detail: sanitized })`；`sanitized = sanitizeMcpErrorSummary(e)`（**不**再直接写入中文） |
| 已知超时文案（若 `sanitize` 前可识别） | 映射 `mcpTest.listToolsTimeout` |
| 连接成功 | `lastErrorSummary = null` |

### 6.2 新增 api.message key

| key | en | zh |
| --- | --- | --- |
| `mcpTest.credentialsDecryptFailed` | Credentials could not be decrypted. Check server keys or re-save credentials. | 凭证解密失败（请检查服务端密钥或重新保存凭证） |
| `mcpTest.connectionFailed` | Connection test failed: {detail} | 连接测试失败：{detail} |
| `mcpTest.listToolsTimeout` | MCP list_tools timed out. | MCP list_tools 超时 |

### 6.3 实现要点

- `test-connection/route.ts` 首行 `const locale = resolveRequestLocale(_request)`（handler 须接收 `request` 参数）。
- 成功响应 `{ ok, item }` schema **不变**；UI 原样展示 `lastErrorSummary`（已为译文）。
- `sanitizeMcpErrorSummary` **保持**纯技术摘要（provider 英文/混合栈）；外层由 `mcpTest.connectionFailed` 包装，避免裸栈信息当主文案。

---

## 7. Middleware 变更（console 相关）

### 7.1 相对 0.1.15 变更摘要

| 项 | 0.1.15 | 0.1.16 |
| --- | --- | --- |
| `KNOWN_APP_SEGMENTS` | 含 `console` | **移除** `console` |
| `GET /console` | 受保护 → `/en/login?redirect=/console/...` | **302** → `/{locale}/console/...`（legacy handler **先于**受保护逻辑） |
| `GET /en/console` 未登录 | next-intl 直通（**无** middleware 鉴权） | **受保护** → `/en/login?redirect=/en/console/...` |
| `redirect` 参数 | 裸路径 `/console/...` | **含 locale 前缀** `/en/console/...` |

### 7.2 `handleLegacyConsoleRedirect`（新增）

```typescript
function handleLegacyConsoleRedirect(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/console" || pathname.startsWith("/console/")) {
    const locale = resolveRequestLocale(request);
    const suffix = pathname.slice("/console".length);
    const url = new URL(`/${locale}/console${suffix}`, request.url);
    url.search = search;
    return NextResponse.redirect(url, 302);
  }
  return null;
}
```

**插入位置**：`handleLegacyChatRedirect` **之后**、`isProtectedPath` **之前**。

### 7.3 `KNOWN_APP_SEGMENTS`（变更后）

```typescript
const KNOWN_APP_SEGMENTS = new Set([
  // "chat",    ← 0.1.15 已移除
  // "console", ← 0.1.16 移除
  "admin",
  "knowledge",
  "api",
]);
```

移除 `console` 后，`/fr/console` 等非法 locale → 302 `/en`（与 chat 一致）。

### 7.4 `isProtectedPath` 扩展

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
  if (/^\/(en|zh)\/chat(\/|$)/.test(pathname)) return true;
  if (/^\/(en|zh)\/console(\/|$)/.test(pathname)) return true;  // 0.1.16 新增
  return false;
}
```

### 7.5 Middleware 执行顺序（更新）

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
  LEG_CONSOLE -->|否| PR{受保护路径?}
  PR -->|是| AUTH[handleProtectedRoute]
  PR -->|否| I18N{i18n 路径?}
  I18N -->|是| INTL[next-intl]
  I18N -->|否| NEXT[NextResponse.next]
```

### 7.6 Matcher

**保留**（已有）：

```typescript
"/console",
"/console/:path*",
```

`/(en|zh)/:path*` 覆盖 `/{locale}/console/**`。

### 7.7 Admin 跳链（Q3-B）

- 0.1.17 前 admin 仍可能跳转裸 `/console?notice=admin_forbidden`。
- legacy redirect → `/{locale}/console?notice=admin_forbidden` → page redirect profile **保留** query。
- **本期不改** `AdminShell` / `admin/users` 链；console 端须正确展示 Forbidden。

---

## 8. 请求/响应示例

### 8.1 未登录（en）

```http
GET /api/console/profile
Cookie: NEXT_LOCALE=en
```

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "You are not signed in."
  }
}
```

### 8.2 模型不存在（zh）

```http
GET /api/console/models/00000000-0000-0000-0000-000000000099
Cookie: NEXT_LOCALE=zh
```

```json
{
  "error": {
    "code": "MODEL_CONFIG_NOT_FOUND",
    "message": "模型配置不存在"
  }
}
```

### 8.3 校验 details（en）

```http
POST /api/console/models
Content-Type: application/json
Cookie: NEXT_LOCALE=en

{"provider":"INVALID","modelName":"","apiKey":""}
```

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters.",
    "details": [
      { "field": "provider", "message": "Provider must be one of: ALYUN, GLM, DEEPSEEK, KIMI, SILICONFLOW." },
      { "field": "modelName", "message": "This field is required." },
      { "field": "apiKey", "message": "API key is required." }
    ]
  }
}
```

### 8.4 MCP 名称冲突（zh）

```json
{
  "error": {
    "code": "MCP_CONFIG_NAME_CONFLICT",
    "message": "名称已存在",
    "details": [
      { "field": "name", "message": "同一用户下名称须唯一（最长 64 字）" }
    ]
  }
}
```

### 8.5 test-connection 解密失败（en）

```http
POST /api/console/mcp-configs/{id}/test-connection
Cookie: NEXT_LOCALE=en
```

```json
{
  "ok": false,
  "item": {
    "lastErrorSummary": "Credentials could not be decrypted. Check server keys or re-save credentials."
  }
}
```

### 8.6 Legacy 页面重定向

```http
GET /console/profile
Cookie: NEXT_LOCALE=en
```

```http
HTTP/1.1 302 Found
Location: /en/console/profile
```

```http
GET /console?notice=admin_forbidden
Accept-Language: zh-CN
```

```http
HTTP/1.1 302 Found
Location: /zh/console?notice=admin_forbidden
```

---

## 9. `[locale]/console/layout.tsx` 服务端鉴权规格（Q10-A）

> **实现归属**：Frontend 4；Backend 3B 仅改 middleware 双保险。规格供联调与验收。

### 9.1 定稿行为

| 项 | 定稿 |
| --- | --- |
| 文件 | `src/app/[locale]/console/layout.tsx`（新建） |
| 鉴权 | `await getRequestUserContext()`；未登录 `redirect(\`/${locale}/login?redirect=/${locale}/console/...\`)` |
| 无效 locale | `hasLocale` 失败 → `return null`（与 chat layout 一致） |
| Provider | 继承 `[locale]/layout.tsx` 的 `NextIntlClientProvider` + antd；layout 内 `AntdRegistry` + `ConsoleShell` |
| Shell 客户端鉴权 | **移除** `/api/auth/me` 轮询；`ready` 全屏加载态删除或极短 hydration |
| 旧目录 | **删除** `src/app/console/`（不保留 re-export） |

### 9.2 参考实现（对齐 chat）

```typescript
export default async function ConsoleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return null;
  }
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    // middleware 通常已拦截；fallback 用 profile 作默认入口
    redirect(`/${locale}/login?redirect=/${locale}/console/profile`);
  }
  return (
    <AntdRegistry>
      <ConsoleShell>{children}</ConsoleShell>
    </AntdRegistry>
  );
}
```

### 9.3 redirect 精确度

| 场景 | redirect 目标 |
| --- | --- |
| middleware 拦截 `GET /en/console/models` | `/en/login?redirect=/en/console/models`（含 query） |
| layout fallback（极少） | `/en/login?redirect=/en/console/profile` |
| 可选增强 | 从 `headers().get('x-pathname')` 或 middleware 注入 header 还原完整路径（非阻塞） |

### 9.4 与 middleware 关系

- **双保险**：middleware 未登录 → login；layout 防止 middleware matcher 漏网或 RSC 直渲。
- **API 路径**：`/api/console/**` 不经 layout；仍由 route `getRequestUserContext()` + `jsonError(unauthorized)` 处理。

---

## 10. 与前端对接要点

| 项 | 约定 |
| --- | --- |
| 展示 REST 错误（console API） | 直接 `error.message`（已翻译） |
| 展示 REST 错误（knowledge-bases API） | **可能中文**（已知限制） |
| MCP 测试失败 | `item.lastErrorSummary` 或 `page.console.mcp.toast.testFailed` |
| Toast catch | `parseApiError` → API message 或 `page.console.shell.errors.*`（Frontend 4） |
| fetch console API | `credentials: 'include'` |
| 401 跳转 | `/{locale}/login?redirect=/{locale}/console/...` |
| 只读写 API | `readOnlyAccountBlocked`（0.1.15 已双语） |

---

## 11. 关联文档

- Key 树与 JSON 增量：`data-models.md`
- 3B 步骤与文件清单：`implementation-plan.md`
- 设计终稿：`../design/spec-api-message-console.md`、`../design/spec-routing-locale-console.md`
