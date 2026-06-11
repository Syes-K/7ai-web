# API 错误消息规格 — Console 域（version 0.1.16）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.16` |
| 命名空间 | `api.message`（`messages/{locale}/api/message.json`） |
| 策略 | **方案 A**：服务端 `resolveRequestLocale` + `tApiMessage` → `error.message` |
| 范围 | `/api/console/**`（12 route 文件） |
| 不在本期 | `/api/knowledge-bases/**`（0.1.18+） |
| 上游 | `user-stories-api-i18n.md`、`prd.md` 模块 D |

---

## 1. Locale 解析（服务端）

与 0.1.14/0.1.15 相同：Cookie `NEXT_LOCALE` → `Accept-Language` → `en`。

**本期调用点（12 files）：**

| 域 | 文件 |
| --- | --- |
| profile | `profile/route.ts`、`profile/personal/route.ts`、`profile/preference/route.ts` |
| models | `models/route.ts`、`models/[id]/route.ts` |
| assistants | `assistants/route.ts`、`assistants/[id]/route.ts`、`assistants/[id]/knowledge-bases/route.ts`、`assistants/[id]/mcp-configs/route.ts` |
| mcp | `mcp-configs/route.ts`、`mcp-configs/[id]/route.ts`、`mcp-configs/[id]/test-connection/route.ts` |

**改造模式：**

```typescript
const locale = await resolveRequestLocale(request);
return jsonError(
  ErrorCode.VALIDATION_ERROR,
  tApiMessage(locale, "validationError"),
  HttpStatus.BAD_REQUEST,
  details,
);
```

---

## 2. ErrorCode ↔ message key 映射表（0.1.16 必达）

### 2.1 Top-level key

| ErrorCode | message key | 现网中文 | 路由 / 场景 |
| --- | --- | --- | --- |
| `UNAUTHORIZED` | `unauthorized` | 未登录 | 全部 routes |
| `RATE_LIMITED` | `rateLimited` | 请求过于频繁… | mcp test-connection |
| `VALIDATION_ERROR` | 见 §2.2、§3 | 多种 | body/field 校验 |
| `AUTH_TEL_TAKEN` | `authTelTaken` | 该手机号已被占用 | profile/personal |
| `MODEL_CONFIG_NOT_FOUND` | `modelConfigNotFound` | 模型配置不存在 | models/[id]、profile/preference |
| `ASSISTANT_NOT_FOUND` | `assistantNotFound` | 助手不存在 | assistants 及子 routes |
| `MCP_CONFIG_NOT_FOUND` | `mcpConfigNotFound` | 配置不存在 | mcp-configs 全 route |
| `MCP_CONFIG_NAME_CONFLICT` | `mcpConfigNameConflict` | 名称已存在 | mcp-configs POST/PATCH |
| `MCP_CONFIG_REFERENCED_BY_ASSISTANT` | `mcpConfigReferencedByAssistant` | 无法删除：仍被助手引用… | mcp-configs DELETE |
| `MCP_CREDENTIALS_ENCRYPTION_UNAVAILABLE` | `mcpCredentialsEncryptionUnavailable` | 服务端未配置…主密钥 | mcp-configs credentials |
| `INTERNAL_ERROR`（通用） | `internalError` | — | 未分类 catch |
| `INTERNAL_ERROR`（profile GET） | `loadFailed` | 加载失败 | profile/route GET |
| `INTERNAL_ERROR`（保存） | `saveFailedRetry` | 保存失败，请稍后重试 | 多处 POST/PATCH catch |
| `INTERNAL_ERROR`（用户不存在） | `userNotFound` | 用户不存在 | profile personal/preference |
| `INTERNAL_ERROR`（加密失败） | `credentialEncryptionFailed` | 密钥加密失败 | mcp-configs |
| `INTERNAL_ERROR`（服务端密钥） | `serverConfigCannotSaveSecrets` | 服务端配置异常，无法保存密钥 | models POST、mcp |

### 2.2 新增 top-level 文案（en / zh）

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

**注：** `assistantNotFound`、`authTelTaken`、`unauthorized`、`rateLimited`、`validationError`、`validation.invalidJson` 沿用 0.1.14/0.1.15。

---

## 3. `validation.*` 子 key 扩展（Q9-A：details 全 key 化）

### 3.1 新增 validation key

| 现网中文（field/顶层） | key | en | zh |
| --- | --- | --- | --- |
| id 无效 | `validation.invalidId` | Invalid id. | id 无效 |
| 请求参数不合法（顶层） | `validation.invalidParams` | Invalid request parameters. | 请求参数不合法 |
| 不能为空 | `validation.required` | This field is required. | 不能为空 |
| 须为字符串 | `validation.stringRequired` | Must be a string. | 须为字符串 |
| 须为字符串或 null | `validation.stringOrNull` | Must be a string or null. | 须为字符串或 null |
| 须为数组 | `validation.arrayRequired` | Must be an array. | 须为数组 |
| 邮箱不可修改 | `validation.emailImmutable` | Email cannot be changed via this API. | 邮箱不可修改 |
| 不允许通过本接口修改邮箱 | `validation.emailImmutable` | （同上，顶层复用） | |
| 请至少提供 nickName 或 telNo | `validation.profileFieldRequired` | Provide at least nickName or telNo. | 请至少提供 nickName 或 telNo 之一 |
| 至少需要一个偏好字段 | `validation.preferenceFieldRequired` | At least one preference field is required. | 至少需要一个偏好字段 |
| 不能在控制台创建系统助手 | `validation.systemAssistantNotCreatable` | System assistants cannot be created from the console. | 不能在控制台创建系统助手 |
| provider 枚举 | `validation.invalidModelProvider` | Provider must be one of: ALYUN, GLM, DEEPSEEK, KIMI, SILICONFLOW. | 须为 ALYUN、GLM、DEEPSEEK、KIMI、SILICONFLOW 之一 |
| apiKey 不能为空 | `validation.apiKeyRequired` | API key is required. | 不能为空 |
| apiKey 须为字符串 | `validation.apiKeyStringRequired` | API key must be a string. | 须为字符串 |
| 包含无效知识库 | `validation.invalidKnowledgeBaseIds` | One or more knowledge bases are invalid or inaccessible. | 包含不存在或无权访问的知识库 |
| 包含无效 MCP | `validation.invalidMcpConfigIds` | One or more MCP configurations are invalid. | 包含无效 MCP 配置 |
| mcpConfigIds 须提供数组 | `validation.mcpConfigIdsRequired` | mcpConfigIds must be an array (may be empty). | 须提供 mcpConfigIds 数组（可为空数组） |
| mcpConfigIds 格式无效 | `validation.mcpConfigIdsInvalid` | Invalid mcpConfigIds format. | 格式无效 |
| MCP 名称达上限 | `validation.mcpConfigLimitReached` | MCP configuration limit reached. | 已达上限 |
| telNo 11 位 | `validation.telNoInvalid` | （已有） | 手机号须为 11 位数字 |

### 3.2 MCP credentials 专用 validation key

| 现网中文 | key | en |
| --- | --- | --- |
| 须为字符串或 null | `validation.mcpCredentialsStringOrNull` | Credentials must be a string or null. |
| 不允许传空字符串 | `validation.mcpCredentialsEmptyString` | Empty string is not allowed; omit the field to skip. |
| 请省略 credentials 表示不修改… | `validation.mcpCredentialsOmitToKeep` | Omit credentials to keep unchanged; null cannot clear (future field may be added). |
| 须为字符串 | `validation.mcpCredentialsStringRequired` | Credentials must be a string. |

### 3.3 details 构造约定

```typescript
details.push({
  field: "modelName",
  message: tApiMessage(locale, "validation.required"),
});
```

顶层 message 与 details 同 locale；frontend **优先**展示 `error.message`，details 用于表单 field 映射（若实现）。

---

## 4. 按 Route 覆盖清单

### 4.1 profile（3 files）

| 文件 | ErrorCode / key |
| --- | --- |
| `profile/route.ts` | UNAUTHORIZED → `unauthorized`；INTERNAL → `loadFailed` |
| `profile/personal/route.ts` | UNAUTHORIZED；VALIDATION + details；AUTH_TEL_TAKEN；INTERNAL → `userNotFound` |
| `profile/preference/route.ts` | UNAUTHORIZED；VALIDATION；MODEL_CONFIG_NOT_FOUND；INTERNAL → `userNotFound` |

### 4.2 models（2 files）

| 文件 | ErrorCode / key |
| --- | --- |
| `models/route.ts` | UNAUTHORIZED；VALIDATION（provider、modelName、apiKey）；INTERNAL → `serverConfigCannotSaveSecrets`、`saveFailedRetry` |
| `models/[id]/route.ts` | UNAUTHORIZED；VALIDATION；MODEL_CONFIG_NOT_FOUND；INTERNAL |

### 4.3 assistants（4 files）

| 文件 | ErrorCode / key |
| --- | --- |
| `assistants/route.ts` | UNAUTHORIZED；VALIDATION（systemAssistant、name、prompt…）；INTERNAL → `saveFailedRetry` |
| `assistants/[id]/route.ts` | UNAUTHORIZED；VALIDATION；ASSISTANT_NOT_FOUND |
| `assistants/[id]/knowledge-bases/route.ts` | UNAUTHORIZED；VALIDATION；ASSISTANT_NOT_FOUND；invalid KB |
| `assistants/[id]/mcp-configs/route.ts` | UNAUTHORIZED；VALIDATION；ASSISTANT_NOT_FOUND；invalid MCP |

### 4.4 mcp-configs（3 files）

| 文件 | ErrorCode / key |
| --- | --- |
| `mcp-configs/route.ts` | UNAUTHORIZED；VALIDATION；MCP_*；INTERNAL |
| `mcp-configs/[id]/route.ts` | 同上 + DELETE `mcpConfigReferencedByAssistant` |
| `mcp-configs/[id]/test-connection/route.ts` | UNAUTHORIZED；VALIDATION `invalidId`；RATE_LIMITED；MCP_CONFIG_NOT_FOUND |

---

## 5. MCP test-connection `lastErrorSummary`（Q5-A）

### 5.1 策略定稿

| 场景 | 处理 |
| --- | --- |
| 凭证解密失败（现网硬编码） | `tApiMessage(locale, 'mcpTest.credentialsDecryptFailed')` 写入 `lastErrorSummary` |
| `sanitizeMcpErrorSummary(e)` 异常摘要 | `tApiMessage(locale, 'mcpTest.connectionFailed', { detail: sanitized })` 或分已知错误码映射 |
| 连接成功 | `lastErrorSummary = null` |

### 5.2 新增 api.message key

| key | en | zh |
| --- | --- | --- |
| `mcpTest.credentialsDecryptFailed` | Credentials could not be decrypted. Check server keys or re-save credentials. | 凭证解密失败（请检查服务端密钥或重新保存凭证） |
| `mcpTest.connectionFailed` | Connection test failed: {detail} | 连接测试失败：{detail} |
| `mcpTest.listToolsTimeout` | MCP list_tools timed out. | MCP list_tools 超时 |

**实现要点：**

- `test-connection/route.ts` 顶部 `const locale = await resolveRequestLocale(request)`
- 已知分支**禁止**硬编码中文
- `sanitizeMcpErrorSummary` 产出若含用户可见中文常量（如超时文案），改为传入 `tApiMessage` 后的英文字符串或 key 映射表
- UI（`mcp/page.tsx`）**原样展示** `lastErrorSummary`（已为译文）；fallback `page.console.mcp.toast.testFailed`

### 5.3 前端展示

```typescript
message.error(data.item?.lastErrorSummary?.trim() || t("toast.testFailed"));
```

---

## 6. `withReadOnlyApi`（继承 0.1.15）

| ErrorCode | key |
| --- | --- |
| `FORBIDDEN` | `readOnlyAccountBlocked` |

console 写 route 已包装；0.1.16 回归验证即可。

---

## 7. 前端展示约定

| 场景 | 来源 |
| --- | --- |
| REST 错误（console API） | `error.message` 已翻译 |
| REST 错误（knowledge-bases API） | **可能中文**（已知限制） |
| Toast catch | `parseApiError` → API message 或 `shell.errors.*` |
| MCP test 失败 | `lastErrorSummary` 或 `toast.testFailed` |

---

## 8. 完整 JSON 增量示意 — `messages/en/api/message.json`

在 0.1.15 基础上**追加**（节选）：

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
    "emailImmutable": "Email cannot be changed via this API.",
    "profileFieldRequired": "Provide at least nickName or telNo.",
    "preferenceFieldRequired": "At least one preference field is required.",
    "systemAssistantNotCreatable": "System assistants cannot be created from the console.",
    "invalidModelProvider": "Provider must be one of: ALYUN, GLM, DEEPSEEK, KIMI, SILICONFLOW.",
    "apiKeyRequired": "API key is required.",
    "apiKeyStringRequired": "API key must be a string.",
    "invalidKnowledgeBaseIds": "One or more knowledge bases are invalid or inaccessible.",
    "invalidMcpConfigIds": "One or more MCP configurations are invalid.",
    "mcpConfigIdsRequired": "mcpConfigIds must be an array (may be empty).",
    "mcpConfigIdsInvalid": "Invalid mcpConfigIds format.",
    "mcpConfigLimitReached": "MCP configuration limit reached.",
    "mcpCredentialsStringOrNull": "Credentials must be a string or null.",
    "mcpCredentialsEmptyString": "Empty string is not allowed; omit the field to skip.",
    "mcpCredentialsOmitToKeep": "Omit credentials to keep unchanged; null cannot clear.",
    "mcpCredentialsStringRequired": "Credentials must be a string."
  }
}
```

`messages/zh/api/message.json` 填入对应中文（与现网语义一致）。

---

## 9. 不在范围

- `/api/knowledge-bases/**`（knowledge 管理页调用）
- `/api/admin/**`
- API 成功响应 `message`
- HTTP 状态码变更

---

## 10. 冒烟测试

| 场景 | locale | 预期 message |
| --- | --- | --- |
| 未登录 GET `/api/console/profile` | en | `unauthorized` 英文 |
| 无效 id GET `/api/console/models/bad` | en | `validation.invalidId` 英文 |
| 重复 MCP 名称 POST | zh | `mcpConfigNameConflict` 中文 |
| MCP 连接测试频控 | en | `rateLimited` 英文 |
| 只读账号 POST model | en | `readOnlyAccountBlocked` 英文 |
| test-connection 解密失败 | en | `lastErrorSummary` 英文 |
