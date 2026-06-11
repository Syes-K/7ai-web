# API 错误消息规格 — Admin 域（version 0.1.17）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.17` |
| 命名空间 | `api.message`（`messages/{locale}/api/message.json`） |
| 策略 | **方案 A**：`resolveRequestLocale` + `tApiMessage` → `error.message` |
| 范围 | `/api/admin/**`（9 route 文件） |
| 上游 | `user-stories-api-i18n.md` Epic A–G |

---

## 1. Locale 解析

与 0.1.14–0.1.16 相同。鉴权层 `withAdminApi` / `requireAdminApi` 已双语——**回归验证**，无需重写。

**改造模式：**

```typescript
const locale = await resolveRequestLocale(request);
return jsonError(
  ErrorCode.VALIDATION_ERROR,
  tApiMessage(locale, "validation.invalidId"),
  HttpStatus.BAD_REQUEST,
  details,
);
```

---

## 2. ErrorCode ↔ message key 映射表

### 2.1 复用已有 top-level / validation key

| ErrorCode / 场景 | message key | 备注 |
| --- | --- | --- |
| `UNAUTHORIZED` | `unauthorized` | withAdminApi |
| `FORBIDDEN`（门禁） | `forbidden` | withAdminApi |
| `RATE_LIMITED` | `rateLimited` | reset-password |
| `USER_NOT_FOUND` | `userNotFound` | users PATCH/reset |
| `MODEL_CONFIG_NOT_FOUND` | `modelConfigNotFound` | model-configs |
| `ASSISTANT_NOT_FOUND` | `assistantNotFound` | assistants |
| `VALIDATION_ERROR`（分页） | `validation.paginationParamsInvalid` | `{maxPageSize}` |
| `VALIDATION_ERROR`（JSON body） | `validation.invalidJson` | |
| `VALIDATION_ERROR`（id） | `validation.invalidId` | **Q7-B：含用户 id** |
| `VALIDATION_ERROR`（顶层参数） | `validation.invalidParams` | |
| `VALIDATION_ERROR`（required） | `validation.required` | |
| `VALIDATION_ERROR`（stringOrNull） | `validation.stringOrNull` | |
| `VALIDATION_ERROR`（maxLength） | `validation.maxLength` | `{max}` |
| `VALIDATION_ERROR`（provider） | `validation.invalidModelProvider` | |
| `INTERNAL_ERROR`（通用保存） | `saveFailedRetry` | |
| `INTERNAL_ERROR`（密钥） | `serverConfigCannotSaveSecrets` | model-configs POST/PATCH |

### 2.2 新增 top-level `admin.*` key

| key | en | zh | 场景 |
| --- | --- | --- | --- |
| `admin.cannotResetOwnPassword` | You cannot reset your own password from the admin panel. Use account settings or another admin account. | 不能通过管理端重置当前登录账号的密码，请使用其他管理员账号或账号设置。 | reset-password FORBIDDEN |
| `admin.cannotChangeOwnStatus` | You cannot change read-only or status for your own account. Use another admin account. | 不能变更当前登录账号的只读或启用状态，请使用其他管理员操作。 | users PATCH FORBIDDEN |
| `admin.readPromptConfigFailed` | Could not read prompt configuration file. | 读取提示词配置文件失败。 | prompt-config GET |
| `admin.readConversationSummaryFailed` | Could not read conversation summary configuration. | 读取对话摘要配置失败。 | conversation-summary GET |
| `admin.saveFailedCheckPermissions` | Could not save. Check disk permissions or try again later. | 保存失败，请稍后重试或检查磁盘权限。 | prompt-config PUT |
| `admin.conversationSummarySaveFailed` | Could not save conversation summary configuration. | 保存对话摘要配置失败。 | conversation-summary PUT |
| `admin.writeVerifyFailed` | Save appeared to succeed but verification read failed. | 写入后读取验证失败。 | 两 config PUT |

### 2.3 新增 validation key（admin 用户域）

| key | en | zh |
| --- | --- | --- |
| `validation.invalidUserStatus` | status must be Active or Disabled. | status 须为 Active 或 Disabled。 |
| `validation.readOnlyMustBeBoolean` | readOnly must be a boolean. | readOnly 须为布尔值。 |
| `validation.atLeastOneUpdateField` | Provide at least one field to update. | 至少提供一个可更新字段。 |

**注：** `validation.invalidUserId` **不新增**（Q7-B 复用 `validation.invalidId`）。

---

## 3. `validation.promptConfig.*` 子树（Q4-B）

### 3.1 PUT 顶层与 items 结构

| 现网中文 | key | en |
| --- | --- | --- |
| 请求体不是合法 JSON | `validation.invalidJson` | （复用） |
| items 须为非空数组 | `validation.promptConfig.itemsRequired` | items must be a non-empty array. |
| items[i] 须为对象 | `validation.promptConfig.itemMustBeObject` | Each item must be an object. |
| key 须为字符串 | `validation.promptConfig.keyStringRequired` | key must be a string. |
| value 须为字符串 | `validation.promptConfig.valueStringRequired` | value must be a string. |
| 仅允许 key、value 字段 | `validation.promptConfig.onlyKeyValueAllowed` | Only key and value fields are allowed. |
| key 重复 | `validation.promptConfig.duplicateKey` | Duplicate key. |
| 须恰好包含 N 个配置项 | `validation.promptConfig.exactItemCount` | Must contain exactly {count} configuration items. |
| 缺少配置项：{k} | `validation.promptConfig.missingKey` | Missing configuration item: {key}. |
| {k} 的 value 不能为空 | `validation.promptConfig.valueRequired` | value for {key} cannot be empty. |
| 未知配置项：{k} | `validation.promptConfig.unknownKey` | Unknown configuration item: {key}. |
| 校验失败（顶层） | `validation.invalidParams` | （复用） |

### 3.2 `validation.promptConfig.template.*`（原 `tmpl.message` 动态串）

映射 `validatePromptTemplate` 与 route 内自定义模板校验：

| 场景 | key | en | zh |
| --- | --- | --- | --- |
| 非法 `{` 占位符 | `validation.promptConfig.template.invalidBrace` | Template contains invalid \"{\" placeholders. Use {paramName} only; names must match declared parameters below. | 模版中存在非法的「{」占位符，请仅使用 {参数名} 形式（参数名须与已声明参数一致）。 |
| 未声明参数 | `validation.promptConfig.template.undeclaredParam` | Template uses undeclared parameter: {{{param}}}. | 模版中使用了未声明的参数：{{{param}}}。 |

**实现：** route 层根据校验分支选择 key；**禁止** `jsonError(..., tmpl.message)` 运行时中文。

**客户端表单校验：** `validatePromptTemplate` 返回的 message 在 admin prompts 页改为 `t('validation.promptConfig.template.*')` 映射（按错误类型枚举），或抽共享 `mapPromptTemplateError(t, code)`。

---

## 4. `validation.conversationSummary.*` 子树

| 现网中文 | key | en |
| --- | --- | --- |
| config 须为对象 | `validation.conversationSummary.configMustBeObject` | config must be an object. |
| 不支持的字段 | `validation.conversationSummary.unsupportedField` | Unsupported field: {field}. |
| enabled 须为 boolean | `validation.conversationSummary.enabledBoolean` | enabled must be a boolean. |
| 整数范围 | `validation.conversationSummary.integerRange` | Must be an integer from {min} to {max}. |
| mode 枚举 | `validation.conversationSummary.modeEnum` | mode must be tokens or messages. |

---

## 5. GET 成功体与 Q2-B

| route | 变更 |
| --- | --- |
| `prompt-config` GET | 返回 `fileState: "invalid_json"`；**移除**中文 `fileHint` 用于 UI |
| `conversation-summary` GET | 同上 |

错误路径仍用 `admin.readPromptConfigFailed` / `admin.readConversationSummaryFailed`。

---

## 6. 按 Route 覆盖清单

### 6.1 users（3 files）

| 文件 | ErrorCode / key |
| --- | --- |
| `users/route.ts` | VALIDATION → `validation.paginationParamsInvalid` |
| `users/[id]/route.ts` | `validation.invalidId`, `invalidJson`, `atLeastOneUpdateField`, `invalidUserStatus`, `readOnlyMustBeBoolean`; FORBIDDEN → `admin.cannotChangeOwnStatus`; `userNotFound` |
| `users/[id]/reset-password/route.ts` | `rateLimited`, `invalidJson`, `invalidId`, `admin.cannotResetOwnPassword`, `userNotFound` |

### 6.2 model-configs（2 files）

| 文件 | ErrorCode / key |
| --- | --- |
| `model-configs/route.ts` | pagination, `invalidJson`, `invalidParams`, `invalidModelProvider`, `required`, `maxLength`, `serverConfigCannotSaveSecrets`, `saveFailedRetry` |
| `model-configs/[id]/route.ts` | `invalidId`, `invalidJson`, `invalidParams`, `modelConfigNotFound`, `serverConfigCannotSaveSecrets`, `saveFailedRetry` |

### 6.3 assistants（2 files）

| 文件 | ErrorCode / key |
| --- | --- |
| `assistants/route.ts` | pagination, `invalidJson`, `invalidParams`, `required`, `maxLength`, `stringOrNull`, `saveFailedRetry` |
| `assistants/[id]/route.ts` | `invalidId`, `invalidJson`, `invalidParams`, `assistantNotFound`, `saveFailedRetry` |

### 6.4 prompt-config（1 file）

| 方法 | key |
| --- | --- |
| GET | INTERNAL → `admin.readPromptConfigFailed` |
| PUT | 全量 `validation.promptConfig.*` + `admin.saveFailedCheckPermissions`, `admin.writeVerifyFailed` |

### 6.5 conversation-summary（1 file）

| 方法 | key |
| --- | --- |
| GET | INTERNAL → `admin.readConversationSummaryFailed` |
| PUT | `validation.conversationSummary.*` + `admin.conversationSummarySaveFailed`, `admin.writeVerifyFailed` |

---

## 7. details 构造约定（Q9-A 继承）

```typescript
details.push({
  field: "status",
  message: tApiMessage(locale, "validation.invalidUserStatus"),
});
```

所有 `field.message` **无硬编码中文**。

---

## 8. 冒烟测试

| 场景 | locale | 预期 message |
| --- | --- | --- |
| 非管理员 GET `/api/admin/users` | en | `forbidden` 英文 |
| 无效分页 | en | `validation.paginationParamsInvalid` 英文 |
| 重置自己密码 | zh | `admin.cannotResetOwnPassword` 中文 |
| 不存在用户 PATCH | en | `userNotFound` 英文 |
| prompt-config 缺 key PUT | zh | `validation.promptConfig.missingKey` 中文 |
| conversation-summary 非法 mode | en | `validation.conversationSummary.modeEnum` 英文 |
