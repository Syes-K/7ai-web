# 数据模型 — Admin + knowledge-bases API i18n 与 message 组织（version 0.1.17）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.17` |
| 阶段 | 3A 文档 |
| 持久化 | **无 SQLite / TypeORM 变更** |

---

## 1. 数据库变更声明

> **本期无数据库 schema 变更。**

| 项 | 结论 |
| --- | --- |
| 新增/修改 Entity | **无** |
| Migration | **无** |
| 语言偏好存储 | **浏览器 Cookie `NEXT_LOCALE` only**（延续 0.1.13–0.1.16） |

---

## 2. Locale 模型（延续）

| 符号 | 路径 |
| --- | --- |
| `SUPPORTED_LOCALES` / `AppLocale` / `DEFAULT_LOCALE` / `LOCALE_COOKIE` | `@/common/constants/i18n` |
| `resolveLocaleFromCookieAndHeader` | `@/common/utils/i18n` |
| `resolveRequestLocale` | `@/server/i18n/resolve-request-locale` |
| `tApiMessage` | `@/server/i18n/t-api-message` |

**解析顺序**：Cookie `NEXT_LOCALE` → `Accept-Language`（`zh*` → `zh`）→ 默认 `en`。

**API 路径不加 locale 前缀**；Admin / knowledge-bases API 与 UI locale 通过 cookie 对齐。

---

## 3. `api/message.json` 增量（0.1.17）

在 0.1.16 基础上**追加** admin + knowledge-bases 域 key。完整逐 route 映射见 `api-spec.md` §3–§5。

### 3.1 新增 top-level `admin.*`（7）

| key | ErrorCode / 场景 |
| --- | --- |
| `admin.cannotResetOwnPassword` | reset-password FORBIDDEN |
| `admin.cannotChangeOwnStatus` | users PATCH FORBIDDEN |
| `admin.readPromptConfigFailed` | prompt-config GET/PUT 读失败 |
| `admin.readConversationSummaryFailed` | conversation-summary GET 读失败 |
| `admin.saveFailedCheckPermissions` | prompt-config PUT 写失败 |
| `admin.conversationSummarySaveFailed` | conversation-summary PUT 写失败 |
| `admin.writeVerifyFailed` | 两 config PUT 写入后验证失败 |

### 3.2 新增 top-level knowledge-bases（3）

| key | ErrorCode |
| --- | --- |
| `knowledgeBaseNotFound` | `KNOWLEDGE_BASE_NOT_FOUND` |
| `knowledgeBaseReferencedByAssistant` | `KNOWLEDGE_BASE_REFERENCED_BY_ASSISTANT` |
| `knowledgeBaseChunkTestUnavailable` | `KNOWLEDGE_BASE_CHUNK_TEST_UNAVAILABLE` |

### 3.3 新增 `validation.*` 子 key — admin 用户域（3）

| key | 现网中文（摘要） |
| --- | --- |
| `validation.invalidUserStatus` | status 须为 Active 或 Disabled |
| `validation.readOnlyMustBeBoolean` | readOnly 须为布尔值 |
| `validation.atLeastOneUpdateField` | 至少提供一个可更新字段 |

**不新增** `validation.invalidUserId`（Q7-B 复用 `validation.invalidId`）。

### 3.4 新增 `validation.promptConfig.*`（12）

| key | 现网中文（摘要） |
| --- | --- |
| `validation.promptConfig.itemsRequired` | items 须为非空数组 |
| `validation.promptConfig.itemMustBeObject` | items[i] 须为对象 |
| `validation.promptConfig.keyStringRequired` | key 须为字符串 |
| `validation.promptConfig.valueStringRequired` | value 须为字符串 |
| `validation.promptConfig.onlyKeyValueAllowed` | 仅允许 key、value 字段 |
| `validation.promptConfig.duplicateKey` | key 重复 |
| `validation.promptConfig.exactItemCount` | 须恰好包含 {count} 个配置项 |
| `validation.promptConfig.missingKey` | 缺少配置项：{key} |
| `validation.promptConfig.valueRequired` | {key} 的 value 不能为空 |
| `validation.promptConfig.valueEmpty` | value 不能为空（details） |
| `validation.promptConfig.unknownKey` | 未知配置项：{key} |
| `validation.promptConfig.template.invalidBrace` | 模版非法 `{` 占位符 |
| `validation.promptConfig.template.undeclaredParam` | 模版未声明参数：{param} |

### 3.5 新增 `validation.conversationSummary.*`（5）

| key | 现网中文（摘要） |
| --- | --- |
| `validation.conversationSummary.configMustBeObject` | config 须为对象 |
| `validation.conversationSummary.unsupportedField` | 不支持的字段：{field} |
| `validation.conversationSummary.enabledBoolean` | enabled 须为 boolean |
| `validation.conversationSummary.integerRange` | 须为 {min}~{max} 的整数 |
| `validation.conversationSummary.modeEnum` | 须为 tokens 或 messages |

### 3.6 新增 `validation.knowledgeBase.*`（8）

| key | 现网中文（摘要） |
| --- | --- |
| `validation.knowledgeBase.tagsArrayRequired` | 须为字符串数组 |
| `validation.knowledgeBase.tagsMaxCount` | 最多 {max} 个标签 |
| `validation.knowledgeBase.tagMaxLength` | 单个标签最长 {max} 字 |
| `validation.knowledgeBase.contentFormatEnum` | 须为 markdown 或 plain |
| `validation.knowledgeBase.sourceTypeTextOnly` | 本期仅支持 text |
| `validation.knowledgeBase.nameConflict` | 名称已存在，请更换名称 |
| `validation.knowledgeBase.topKRange` | topK 须为 1–20 的整数 |
| `validation.knowledgeBase.thresholdRange` | threshold 须为 0–1 的数字 |

### 3.7 复用已有 key（本期不重复定义）

以下 key **已存在于** 0.1.14–0.1.16 `api/message.json`，admin / knowledge-bases 直接复用：

`unauthorized`、`forbidden`、`rateLimited`、`userNotFound`、`modelConfigNotFound`、`assistantNotFound`、`saveFailedRetry`、`serverConfigCannotSaveSecrets`、`validation.invalidJson`、`validation.invalidId`、`validation.invalidParams`、`validation.required`、`validation.stringOrNull`、`validation.maxLength`、`validation.invalidModelProvider`、`validation.apiKeyRequired`、`validation.apiKeyStringRequired`、`validation.modelTags*`、`validation.assistantTags*`。

### 3.8 增量统计

| 类别 | 新增 key 数（约） |
| --- | --- |
| `admin.*` top-level | 7 |
| knowledge-bases top-level | 3 |
| `validation.*` admin 用户 | 3 |
| `validation.promptConfig.*` | 12 |
| `validation.conversationSummary.*` | 5 |
| `validation.knowledgeBase.*` | 8 |
| **合计** | **~38** |

en/zh **对称填充**；英文文案见 `../design/spec-api-message-admin.md`、`../design/spec-api-message-knowledge-bases.md`。

---

## 4. `page/admin/*.json` 注册约定（Frontend 4）

### 4.1 文件布局（Q6-B）

```
messages/{en,zh}/page/admin/
  shell.json
  config.json
  users.json
  models.json
  prompts.json
  logs.json
  assistants.json
messages/{en,zh}/page/
  knowledge.json
```

### 4.2 命名空间映射

| 文件 | next-intl 命名空间 | 用途 |
| --- | --- | --- |
| `shell.json` | `page.admin.shell` | ProLayout 标题、skip link、顶栏链、菜单 6 项、LanguageSwitcher |
| `config.json` | `page.admin.config` | 对话摘要 ProForm；**含** `invalidJsonAlert`（Q2-B） |
| `users.json` | `page.admin.users` | 用户 Table、Modal、锁定时间文案 |
| `models.json` | `page.admin.models` | 公有模型 CRUD |
| `prompts.json` | `page.admin.prompts` | 提示词模版；**含** `invalidJsonAlert`（Q2-B） |
| `logs.json` | `page.admin.logs` | 日志查询 |
| `assistants.json` | `page.admin.assistants` | 系统助手 CRUD |
| `knowledge.json` | `page.knowledge` | 预览页 metadata + 返回链 |

### 4.3 `src/i18n/request.ts` 扩展（Frontend 4）

在现有 `page.console.*` 注册旁**并行**追加：

```typescript
const [
  // ...existing...
  adminShell,
  adminConfig,
  adminUsers,
  adminModels,
  adminPrompts,
  adminLogs,
  adminAssistants,
  pageKnowledge,
] = await Promise.all([
  // ...
  import(`../../messages/${locale}/page/admin/shell.json`),
  import(`../../messages/${locale}/page/admin/config.json`),
  import(`../../messages/${locale}/page/admin/users.json`),
  import(`../../messages/${locale}/page/admin/models.json`),
  import(`../../messages/${locale}/page/admin/prompts.json`),
  import(`../../messages/${locale}/page/admin/logs.json`),
  import(`../../messages/${locale}/page/admin/assistants.json`),
  import(`../../messages/${locale}/page/knowledge.json`),
]);

// messages 树：
page: {
  // ...
  admin: {
    shell: adminShell.default,
    config: adminConfig.default,
    users: adminUsers.default,
    models: adminModels.default,
    prompts: adminPrompts.default,
    logs: adminLogs.default,
    assistants: adminAssistants.default,
  },
  knowledge: pageKnowledge.default,
},
```

**加载策略**：admin 子模块仅在访问 `/[locale]/admin/**` 或 `/[locale]/knowledge/**` 时经 `request.ts` 全量加载（与 console 0.1.16 一致）；非 admin 页不引用 `page.admin.*` key 即可。

### 4.4 与 `page/shell.json` / `page/console/*` 分工

| 命名空间 | 范围 |
| --- | --- |
| `page.shell` | 跨 Shell：UserMenu、Confirm、ForbiddenNotice |
| `page.console.*` | 控制台子模块（0.1.16 已交付） |
| `page.admin.*` | 管理后台**独立** key 树；英文可参考 console 措辞，**不**共享 key |
| `page.knowledge` | 预览页专用；与 `page.console.knowledge`（管理 UI）分离 |

### 4.5 Q2-B：`fileState` 前端 key（非 api/message）

| `fileState` | 展示 key（示例） |
| --- | --- |
| `invalid_json` | `page.admin.prompts.invalidJsonAlert` / `page.admin.config.invalidJsonAlert` |
| `ok` | 无 Alert |

服务端 GET **不再**返回 `fileHint` 字符串。

---

## 5. 共享工具与常量（3B / Frontend 4）

| 符号 | 路径 | 职责 |
| --- | --- | --- |
| `getConsoleForbiddenUrl` | `@/common/utils/console-forbidden-url`（**新建**） | `/${locale}/console?notice=admin_forbidden` |
| `buildLocaleLoginRedirect` | `@/common/utils/locale-login-redirect`（已有） | 客户端 401 跳转 |
| `mapPromptTemplateError` | `@/server/prompt-config/map-template-error.ts`（**新建**，推荐） | `validatePromptTemplate` code → `tApiMessage` key |
| `validateKnowledgeBaseTags` | `@/server/knowledge-base/validate-tags.ts`（**新建**，推荐） | 标签校验 + locale |

---

## 6. `validatePromptTemplate` 改造（Q4-B）

**现网**：返回 `{ valid: false, message: string }`（中文）。

**3B 目标**：返回 `{ valid: false, code: 'invalidBrace' | 'undeclaredParam', param?: string }`；route / 前端分别映射：

| code | api key | 前端 key（admin prompts 表单） |
| --- | --- | --- |
| `invalidBrace` | `validation.promptConfig.template.invalidBrace` | `page.admin.prompts.template.invalidBrace`（可选镜像） |
| `undeclaredParam` | `validation.promptConfig.template.undeclaredParam` | 同上 + `{param}` |

---

## 7. 关联文档

- API 逐 endpoint 表：`api-spec.md`
- 3B 文件清单：`implementation-plan.md`
- 文案终稿：`../design/copy-admin-en-zh.md`、`../design/copy-knowledge-en-zh.md`
