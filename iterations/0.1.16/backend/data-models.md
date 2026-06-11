# 数据模型 — Console 域 API i18n 与 message 组织（version 0.1.16）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.16` |
| 阶段 | 3A 文档 |
| 持久化 | **无 SQLite / TypeORM 变更** |

---

## 1. 数据库变更声明

> **本期无数据库 schema 变更。**

| 项 | 结论 |
| --- | --- |
| 新增/修改 Entity | **无** |
| Migration | **无** |
| `UserMcpConfig.lastErrorSummary` 结构 | **不变**（string \| null）；**值**改为 locale 译文写入 |
| 语言偏好存储 | **浏览器 Cookie `NEXT_LOCALE` only**（延续 0.1.13–0.1.15） |

---

## 2. Locale 模型（延续 0.1.14/0.1.15）

| 符号 | 路径 |
| --- | --- |
| `SUPPORTED_LOCALES` / `AppLocale` / `DEFAULT_LOCALE` / `LOCALE_COOKIE` | `@/common/constants/i18n` |
| `resolveLocaleFromCookieAndHeader` | `@/common/utils/i18n` |
| `resolveRequestLocale` | `@/server/i18n/resolve-request-locale` |
| `tApiMessage` | `@/server/i18n/t-api-message` |

**解析顺序**：Cookie `NEXT_LOCALE` → `Accept-Language`（`zh*` → `zh`）→ 默认 `en`。

**API 路径不加 locale 前缀**；Console API 与 UI locale 通过 cookie 对齐。

---

## 3. `api/message.json` 增量（0.1.16）

在 0.1.15 基础上**追加** console 域 key。完整映射见 `api-spec.md` §3–§5。

### 3.1 新增 top-level key（11）

| key | ErrorCode / 场景 |
| --- | --- |
| `modelConfigNotFound` | `MODEL_CONFIG_NOT_FOUND` |
| `mcpConfigNotFound` | `MCP_CONFIG_NOT_FOUND` |
| `mcpConfigNameConflict` | `MCP_CONFIG_NAME_CONFLICT` |
| `mcpConfigReferencedByAssistant` | `MCP_CONFIG_REFERENCED_BY_ASSISTANT` |
| `mcpCredentialsEncryptionUnavailable` | `MCP_CREDENTIALS_ENCRYPTION_UNAVAILABLE` |
| `internalError` | `INTERNAL_ERROR` fallback |
| `loadFailed` | profile GET |
| `saveFailedRetry` | POST/PATCH save catch |
| `userNotFound` | profile personal/preference |
| `credentialEncryptionFailed` | MCP encrypt |
| `serverConfigCannotSaveSecrets` | models encrypt |

### 3.2 新增 `mcpTest.*` 子 key（3）

| key | 场景 |
| --- | --- |
| `mcpTest.credentialsDecryptFailed` | test-connection 解密失败 |
| `mcpTest.connectionFailed` | test-connection catch（ICU `{detail}`） |
| `mcpTest.listToolsTimeout` | 已知超时分支（可选映射） |

### 3.3 新增 `validation.*` 子 key（约 45）

按域分组（en/zh 对称填充，zh 与现网语义一致）：

#### 3.3.1 通用 / Profile / Models / Assistants

| key | 现网中文（摘要） |
| --- | --- |
| `validation.invalidId` | id 无效 |
| `validation.invalidParams` | 请求参数不合法 |
| `validation.required` | 不能为空 |
| `validation.stringRequired` | 须为字符串 |
| `validation.stringOrNull` | 须为字符串或 null |
| `validation.arrayRequired` | 须为数组 |
| `validation.maxLength` | 长度不能超过 {max}（ICU） |
| `validation.emailImmutable` | 邮箱不可修改 |
| `validation.profileFieldRequired` | 请至少提供 nickName 或 telNo 之一 |
| `validation.preferenceFieldRequired` | 至少需要一个偏好字段 |
| `validation.modelConfigIdInvalid` | {field} 须为非空字符串或 null |
| `validation.preferredKnowledgeTopKRange` | preferredKnowledgeTopK 须为 1-20 的整数或 null |
| `validation.preferredKnowledgeThresholdRange` | preferredKnowledgeThreshold 须为 0-1 的数字或 null |
| `validation.preferredKnowledgeChunkSizeRange` | preferredKnowledgeChunkSize 须为 200-4000 的整数或 null |
| `validation.preferredKnowledgeChunkOverlapRange` | preferredKnowledgeChunkOverlap 须为 0-1000 的整数或 null |
| `validation.paginationParamsInvalid` | 分页参数非法（ICU `{maxPageSize}`） |
| `validation.scopeInvalid` | scope 须为 all、system 或 personal |
| `validation.invalidModelProvider` | 须为 ALYUN、GLM、… 之一 |
| `validation.apiKeyRequired` | apiKey 不能为空 |
| `validation.apiKeyStringRequired` | apiKey 须为字符串 |
| `validation.systemAssistantNotCreatable` | 不能在控制台创建系统助手 |
| `validation.knowledgeBaseIdsInvalid` | knowledgeBaseIds 无效 |
| `validation.invalidKnowledgeBaseIds` | 包含不存在或无权访问的知识库 |
| `validation.invalidMcpConfigIds` | 包含无效 MCP 配置 |
| `validation.mcpConfigIdsRequired` | 须提供 mcpConfigIds 数组（可为空数组） |
| `validation.mcpConfigIdsInvalid` | 格式无效 |
| `validation.mcpConfigIdsStringArray` | 须为字符串数组 |
| `validation.mcpConfigLimitReached` | 已达上限 |
| `validation.mcpConfigLimitPerUser` | 单用户 MCP 配置最多 {max} 条 |
| `validation.mcpConfigMaxPerAssistant` | 最多挂载 {max} 个 MCP 配置 |
| `validation.mcpConfigNameUnique` | 同一用户下名称须唯一（ICU `{maxLength}`） |
| `validation.mcpConfigReferencedCount` | 仍被 {count} 个助手引用 |

#### 3.3.2 Tags

| key | 场景 |
| --- | --- |
| `validation.modelTagsArrayRequired` | tags 须为字符串数组 |
| `validation.assistantTagsArrayRequired` | tags 须为字符串数组 |
| `validation.tagMustBeString` | 每个标签须为字符串 |
| `validation.modelTagsAllowed` | 标签仅允许：{allowed} |
| `validation.assistantTagMaxLength` | 单个标签长度不能超过 {max} |
| `validation.assistantTagsMaxCount` | 标签数量不能超过 {max} |

#### 3.3.3 MCP 字段（credentials / transport / endpoint / metadata）

| key | 场景 |
| --- | --- |
| `validation.mcpCredentialsStringOrNull` | credentials 须为字符串或 null |
| `validation.mcpCredentialsEmptyString` | 不允许传空字符串 |
| `validation.mcpCredentialsOmitToKeep` | 请省略 credentials 表示不修改… |
| `validation.mcpCredentialsStringRequired` | credentials 须为字符串 |
| `validation.mcpDescriptionStringOrNull` | description 须为字符串或 null |
| `validation.mcpTransportRequired` | transport 不能为空 |
| `validation.mcpTransportMaxLength` | transport 长度超限 |
| `validation.mcpTransportAllowed` | 须为 {allowed} 之一 |
| `validation.mcpEndpointRequired` | endpoint 不能为空 |
| `validation.mcpEndpointObjectRequired` | endpoint 须为 JSON 对象 |
| `validation.mcpStdioCommandRequired` | stdio 须提供非空 command |
| `validation.mcpEndpointArgsStringArray` | endpoint.args 须为字符串数组 |
| `validation.mcpEndpointUrlRequired` | 须提供非空 url |
| `validation.mcpEndpointUrlInvalid` | url 格式无效 |
| `validation.mcpMetadataObjectOrNull` | metadata 须为 JSON 对象或 null |

### 3.4 复用 0.1.14/0.1.15 已有 key（Console 域）

| key | ErrorCode / 场景 |
| --- | --- |
| `unauthorized` | `UNAUTHORIZED` |
| `rateLimited` | `RATE_LIMITED`（test-connection） |
| `authTelTaken` | `AUTH_TEL_TAKEN` |
| `assistantNotFound` | `ASSISTANT_NOT_FOUND` |
| `validationError` | `VALIDATION_ERROR` 兜底（可选保留） |
| `validation.invalidJson` | POST body 非 JSON |
| `validation.nickNameLength` | nickName 长度（auth 域已有） |
| `validation.telNoInvalid` | telNo 格式 |
| `readOnlyAccountBlocked` | `FORBIDDEN`（只读，0.1.15） |

### 3.5 Key 树（增量后摘要）

```
api.message
├── …（0.1.14 auth + 0.1.15 chat keys）
├── modelConfigNotFound              ← 0.1.16
├── mcpConfigNotFound
├── mcpConfigNameConflict
├── mcpConfigReferencedByAssistant
├── mcpCredentialsEncryptionUnavailable
├── internalError
├── loadFailed
├── saveFailedRetry
├── userNotFound
├── credentialEncryptionFailed
├── serverConfigCannotSaveSecrets
├── mcpTest
│   ├── credentialsDecryptFailed
│   ├── connectionFailed          ← ICU {detail}
│   └── listToolsTimeout
└── validation
    ├── …（0.1.14/0.1.15 已有）
    ├── invalidId                   ← 0.1.16 批量
    ├── invalidParams
    ├── required
    ├── …（见 §3.3，约 45 个）
    └── mcpMetadataObjectOrNull
```

**统计**：本期 console REST 新增约 **11** top-level + **3** `mcpTest.*` + **~45** `validation.*` ≈ **59** key（en/zh 各一套）。

### 3.6 完整 JSON 增量示意 — `messages/en/api/message.json`

在 0.1.15 文件末尾**追加**（节选，完整文案见 `../design/spec-api-message-console.md` §8）：

```json
{
  "modelConfigNotFound": "Model configuration not found.",
  "mcpConfigNotFound": "MCP configuration not found.",
  "mcpConfigNameConflict": "An MCP configuration with this name already exists.",
  "mcpConfigReferencedByAssistant": "Cannot delete: this MCP is still mounted on one or more assistants. Remove it from Assistant management first.",
  "mcpCredentialsEncryptionUnavailable": "Server is not configured with MCP_CREDENTIALS_MASTER_KEY; credentials cannot be saved.",
  "internalError": "Something went wrong. Please try again later.",
  "loadFailed": "Could not load your profile.",
  "saveFailedRetry": "Could not save. Please try again later.",
  "userNotFound": "User not found.",
  "credentialEncryptionFailed": "Could not encrypt credentials.",
  "serverConfigCannotSaveSecrets": "Server configuration error; API keys cannot be saved.",
  "mcpTest": {
    "credentialsDecryptFailed": "Credentials could not be decrypted. Check server keys or re-save credentials.",
    "connectionFailed": "Connection test failed: {detail}",
    "listToolsTimeout": "MCP list_tools timed out."
  },
  "validation": {
    "invalidId": "Invalid id.",
    "invalidParams": "Invalid request parameters.",
    "required": "This field is required.",
    "stringRequired": "Must be a string.",
    "stringOrNull": "Must be a string or null.",
    "arrayRequired": "Must be an array.",
    "maxLength": "Must be at most {max} characters.",
    "emailImmutable": "Email cannot be changed via this API.",
    "profileFieldRequired": "Provide at least nickName or telNo.",
    "preferenceFieldRequired": "At least one preference field is required.",
    "modelConfigIdInvalid": "Must be a non-empty string or null.",
    "preferredKnowledgeTopKRange": "preferredKnowledgeTopK must be an integer from 1 to 20, or null.",
    "preferredKnowledgeThresholdRange": "preferredKnowledgeThreshold must be a number from 0 to 1, or null.",
    "preferredKnowledgeChunkSizeRange": "preferredKnowledgeChunkSize must be an integer from 200 to 4000, or null.",
    "preferredKnowledgeChunkOverlapRange": "preferredKnowledgeChunkOverlap must be an integer from 0 to 1000, or null.",
    "paginationParamsInvalid": "Invalid pagination: page must be ≥ 1; pageSize must be 1–{maxPageSize}.",
    "scopeInvalid": "scope must be all, system, or personal.",
    "invalidModelProvider": "Provider must be one of: ALYUN, GLM, DEEPSEEK, KIMI, SILICONFLOW.",
    "apiKeyRequired": "API key is required.",
    "apiKeyStringRequired": "API key must be a string.",
    "systemAssistantNotCreatable": "System assistants cannot be created from the console.",
    "knowledgeBaseIdsInvalid": "Invalid knowledgeBaseIds.",
    "invalidKnowledgeBaseIds": "One or more knowledge bases are invalid or inaccessible.",
    "invalidMcpConfigIds": "One or more MCP configurations are invalid.",
    "mcpConfigIdsRequired": "mcpConfigIds must be an array (may be empty).",
    "mcpConfigIdsInvalid": "Invalid mcpConfigIds format.",
    "mcpConfigIdsStringArray": "mcpConfigIds must be an array of strings.",
    "mcpConfigLimitReached": "MCP configuration limit reached.",
    "mcpConfigLimitPerUser": "Maximum {max} MCP configurations per user.",
    "mcpConfigMaxPerAssistant": "At most {max} MCP configurations per assistant.",
    "mcpConfigNameUnique": "Name must be unique under your account (max {maxLength} characters).",
    "mcpConfigReferencedCount": "Still referenced by {count} assistant(s).",
    "modelTagsArrayRequired": "tags must be an array of strings.",
    "assistantTagsArrayRequired": "tags must be an array of strings.",
    "tagMustBeString": "Each tag must be a string.",
    "modelTagsAllowed": "Tags must be one of: {allowed}.",
    "assistantTagMaxLength": "Each tag must be at most {max} characters.",
    "assistantTagsMaxCount": "At most {max} tags allowed.",
    "mcpCredentialsStringOrNull": "Credentials must be a string or null.",
    "mcpCredentialsEmptyString": "Empty string is not allowed; omit the field to skip.",
    "mcpCredentialsOmitToKeep": "Omit credentials to keep unchanged; null cannot clear.",
    "mcpCredentialsStringRequired": "Credentials must be a string.",
    "mcpDescriptionStringOrNull": "Description must be a string or null.",
    "mcpTransportRequired": "transport is required.",
    "mcpTransportMaxLength": "transport is too long.",
    "mcpTransportAllowed": "transport must be one of: {allowed}.",
    "mcpEndpointRequired": "endpoint is required.",
    "mcpEndpointObjectRequired": "endpoint must be a JSON object.",
    "mcpStdioCommandRequired": "stdio transport requires a non-empty command.",
    "mcpEndpointArgsStringArray": "endpoint.args must be an array of strings.",
    "mcpEndpointUrlRequired": "A non-empty url is required.",
    "mcpEndpointUrlInvalid": "Invalid url format.",
    "mcpMetadataObjectOrNull": "metadata must be a JSON object or null."
  }
}
```

`messages/zh/api/message.json` 填入与现网中文语义一致的译文（见 `../design/copy-console-en-zh.md` 与 `../design/spec-api-message-console.md`）。

---

## 4. `page/console/*.json` 组织（Frontend 主责 · 服务端读取约定）

> **Backend 3B 不创建** `page/console/*.json`（Frontend 4 职责）；**Backend 须了解**注册方式以便联调与验收。

### 4.1 文件结构（Q6-B）

```
messages/{en,zh}/page/console/
  shell.json       → page.console.shell.*
  profile.json     → page.console.profile.*
  models.json      → page.console.models.*
  assistants.json  → page.console.assistants.*
  knowledge.json   → page.console.knowledge.*
  mcp.json         → page.console.mcp.*
  settings.json    → page.console.settings.*
```

### 4.2 `src/i18n/request.ts` 注册（Frontend 4）

在 0.1.15 基础上追加动态 import：

```typescript
const [
  pageHome, pageLogin, pageRegister, pageChat, pageShell,
  shell, profile, models, assistants, knowledge, mcp, settings,
  apiMessage,
] = await Promise.all([
  import(`../../messages/${locale}/page/home.json`),
  // …existing…
  import(`../../messages/${locale}/page/console/shell.json`),
  import(`../../messages/${locale}/page/console/profile.json`),
  import(`../../messages/${locale}/page/console/models.json`),
  import(`../../messages/${locale}/page/console/assistants.json`),
  import(`../../messages/${locale}/page/console/knowledge.json`),
  import(`../../messages/${locale}/page/console/mcp.json`),
  import(`../../messages/${locale}/page/console/settings.json`),
  import(`../../messages/${locale}/api/message.json`),
]);

return {
  locale,
  messages: {
    page: {
      home: pageHome.default,
      // …
      console: {
        shell: shell.default,
        profile: profile.default,
        models: models.default,
        assistants: assistants.default,
        knowledge: knowledge.default,
        mcp: mcp.default,
        settings: settings.default,
      },
    },
    api: { message: apiMessage.default },
  },
};
```

### 4.3 服务端是否读取 `page/console/*`？

| 读取方 | 是否读取 | 说明 |
| --- | --- | --- |
| Route Handler / `tApiMessage` | **否** | 仅读 `messages/{locale}/api/message.json` |
| `resolveRequestLocale` | **否** | cookie/header only |
| middleware | **否** | redirect 不含 UI 文案 |
| RSC `generateMetadata` | **是**（Frontend） | `getTranslations('page.console.{module}')` |
| `[locale]/console/layout.tsx` | **否**（文案在 Client Shell） | 鉴权-only |

**结论**：`page/console/*.json` **无 Backend 3B 代码依赖**；验收时确认 Frontend 注册后 console 页 metadata / Shell 可解析 key 即可。

### 4.4 与 `page/shell.json` 分工

| 归属 | 内容 |
| --- | --- |
| `page.shell` | Confirm、UserAvatarMenu、ConsoleForbiddenNotice（Q7-A 继续引用） |
| `page.console.shell` | 控制台标题、菜单、langSwitcher、`errors.requestFailed` / `errors.networkRetry`（供 `parseApiError`） |
| `page.console.{子页}` | 子页 ProTable/ProForm/toast |

---

## 5. ErrorCode ↔ message key 映射表（Console 域摘要）

> 逐 endpoint 明细见 `api-spec.md` §4。

| ErrorCode | message key | HTTP |
| --- | --- | --- |
| `UNAUTHORIZED` | `unauthorized` | 401 |
| `RATE_LIMITED` | `rateLimited` | 429 |
| `VALIDATION_ERROR` | `validation.*` / `validationError` | 400/422 |
| `AUTH_TEL_TAKEN` | `authTelTaken` | 400 |
| `MODEL_CONFIG_NOT_FOUND` | `modelConfigNotFound` | 404 |
| `ASSISTANT_NOT_FOUND` | `assistantNotFound` | 404 |
| `MCP_CONFIG_NOT_FOUND` | `mcpConfigNotFound` | 404 |
| `MCP_CONFIG_NAME_CONFLICT` | `mcpConfigNameConflict` | 409 |
| `MCP_CONFIG_REFERENCED_BY_ASSISTANT` | `mcpConfigReferencedByAssistant` | 409 |
| `MCP_CREDENTIALS_ENCRYPTION_UNAVAILABLE` | `mcpCredentialsEncryptionUnavailable` | 422 |
| `INTERNAL_ERROR` | `loadFailed` / `saveFailedRetry` / `userNotFound` / `credentialEncryptionFailed` / `serverConfigCannotSaveSecrets` / `internalError` | 500 |
| `FORBIDDEN` | `readOnlyAccountBlocked` | 403 |

**响应体 schema 不变**：

```typescript
{
  error: {
    code: ErrorCode;
    message: string;  // 已翻译
    details?: { field: string; message: string }[];  // message 已翻译
  }
}
```

**成功体 test-connection**：

```typescript
{
  ok: boolean;
  item: {
    // …
    lastErrorSummary: string | null;  // 0.1.16 起为 locale 译文
  };
}
```

---

## 6. 路由 Segment 模型（middleware 变更）

| URL segment | 0.1.15 | 0.1.16 |
| --- | --- | --- |
| `console` | `KNOWN_APP_SEGMENTS` 成员；裸 `/console` 受保护 | **移除**；`/console` → 302 `/{locale}/console` |
| `en` / `zh` | home、login、register、chat | **+** `console` 子路由 |
| `admin`、`knowledge` | 未接入 i18n | **不变** |

```typescript
const KNOWN_APP_SEGMENTS = new Set([
  "admin",
  "knowledge",
  "api",
]);
```

---

## 7. Cookie 与 API locale 对齐

| 场景 | 期望 |
| --- | --- |
| 用户在 `/en/console/models`，cookie `NEXT_LOCALE=en` | Console API 错误英文 |
| LanguageSwitcher 切至 `/zh/console/models` | cookie 更新为 `zh`；下一 API 请求中文错误 |
| 无 cookie，`Accept-Language: zh-CN` | API 中文错误 |
| fetch Console API | **`credentials: 'include'`** |
| knowledge 页 fetch `/api/knowledge-bases/**` | **仍可能中文**（非本期） |

---

## 8. 不在本期（data 边界）

| 项 | 批次 |
| --- | --- |
| `/api/knowledge-bases/**` message.json 增量 | 0.1.18+ |
| User 表语言偏好字段 | 后续 |
| API 成功体 `message` 字段 i18n | 全迭代不变 |

---

## 9. 关联文档

- HTTP 行为与逐 route 表：`api-spec.md`
- 3B 步骤：`implementation-plan.md`
- 设计 copy：`../design/spec-api-message-console.md`
