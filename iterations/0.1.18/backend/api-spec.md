# API 规格：用户 Skill 配置与助手挂载（version 0.1.18）

本文档为 **阶段 3A** 接口契约，供阶段 3B 实现与前端对接。风格对齐现有 MCP 控制台 API：`withApiWrapper`（`src/server/http/with-api-wrapper.ts`）、`getRequestUserContext`（`src/server/auth/request-user-context.ts`）、`jsonError`（`src/server/http/json-response.ts`）、`ErrorCode` / `HttpStatus`（`src/common/enums/http.ts`）、`resolveRequestLocale` + `tApiMessage`（`src/server/i18n/*`）。

**命名对称**：资源路径使用 **`skill-configs`**（与 `mcp-configs` 一致），**不**使用 `/api/console/skills`。

---

## 1. 鉴权与用户隔离

| 规则 | 说明 |
| --- | --- |
| 登录 | 所有下列接口须已登录；未登录返回 **`401`**，`error.code = UNAUTHORIZED`，`error.message = tApiMessage(locale, "unauthorized")`。 |
| 数据边界 | 一切查询/写入以 `getRequestUserContext()` 得到的 **`user.id`** 为边界；禁止按裸 id 访问他用户资源。 |
| 404 / 422 策略 | 对他人的 `skillConfigId` 进行写操作时，与 `PUT /api/console/assistants/:id/mcp-configs` 对无效 `mcpConfigIds` **一致**：**`422` + `VALIDATION_ERROR` + `details`**，统一文案 `validation.invalidSkillConfigIds`，**不**区分「他人 id」与「不存在 id」（避免枚举）。 |
| 助手归属 | 助手子资源仅允许 **`AssistantScope.Personal`** 且 `userId === user.id` 的助手；否则 **`404` + `ASSISTANT_NOT_FOUND`**（与 MCP 子资源一致）。 |

---

## 2. 用户 Skill 配置 CRUD

**路由前缀**：`/api/console/skill-configs`

**建议文件布局**（对称 MCP）：

| 方法 | 路径 | 文件 |
| --- | --- | --- |
| GET, POST | `/api/console/skill-configs` | `src/app/api/console/skill-configs/route.ts` |
| GET, PATCH, DELETE | `/api/console/skill-configs/:id` | `src/app/api/console/skill-configs/[id]/route.ts` |

**无** `test-connection` 类端点（与 MCP 差异）。

### 2.1 `GET /api/console/skill-configs`

**用途**：Skills 管理列表、助手 Modal 选择器选项源。

**Query（可选）**

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `keyword` | string | 名称或描述模糊匹配（trim；空则忽略）。实现建议与 MCP 相同：`instr(lower(name), lower(:kw))` 或 `description`。 |
| `page` | number | **可选**；若首版与 MCP 一致采用全量返回则可忽略；若 ProTable 服务端分页，见 §2.1.1。 |
| `pageSize` | number | **可选**；与 `page` 成对使用。 |

#### 2.1.1 分页策略（3B 二选一，与 MCP 对齐）

| 方案 | 说明 |
| --- | --- |
| **A（推荐，与现行 MCP 一致）** | 无分页参数，返回当前用户全部记录（上限 50 条，可接受）。响应 `{ items: [...] }`。 |
| B | `page`/`pageSize` 服务端分页，响应 `{ items, total, page, pageSize }`；需在 3B 与前端同时落地。 |

**响应 `200`**

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "展示名",
      "description": "可选，null 可",
      "content": "Markdown 源正文（列表可返回全文供 preview 列；与 MCP 列表返回 endpointSummary 对称）",
      "enabled": true,
      "createdAt": "2026-06-18T12:00:00.000Z",
      "updatedAt": "2026-06-18T12:00:00.000Z",
      "referencedAssistantCount": 0
    }
  ]
}
```

- **`referencedAssistantCount`**：该 Skill 被多少助手挂载（`AssistantSkillBinding` 计数）；用于删除 409 UX，**必须**提供。
- **排序**：`updatedAt DESC`, `id DESC`（与 MCP 列表一致）。
- **UGC**：`name` / `description` / `content` 原样返回，不做 i18n。

### 2.2 `POST /api/console/skill-configs`

**请求体**

```json
{
  "name": "string, required",
  "description": "string | null, optional",
  "content": "string, required — Markdown 源，非空 trim 后",
  "enabled": true
}
```

**校验**

| 字段 | 规则 | details.field | validation key（`tApiMessage`） |
| --- | --- | --- | --- |
| `name` | 必填；trim 后非空；长度 ≤ `SKILL_CONFIG_NAME_MAX_LENGTH`（64） | `name` | `validation.required` / `validation.maxLength` |
| `description` | 可选；null 或 string；长度 ≤ 500 | `description` | `validation.maxLength` |
| `content` | 必填；trim 后非空；长度 ≤ `SKILL_CONFIG_CONTENT_MAX_LENGTH`（16000） | `content` | `validation.required` / `validation.skillContentMaxLength` |
| `enabled` | 可选 boolean；默认 `true` | `enabled` | — |

**用户条数上限**：创建前 `count(userId)` ≥ `SKILL_CONFIG_MAX_PER_USER`（50）→ **`422` + `VALIDATION_ERROR`**，`details: [{ field: "name", message: tApiMessage(..., "validation.skillConfigLimitReached") }]`，`error.message` 可用 `validation.skillConfigLimitPerUser`（带 `{max}`）。

**响应 `201`**

```json
{ "item": { /* 同列表项字段 */ } }
```

**错误**

| 场景 | HTTP | `error.code` | `error.message` key | `details` |
| --- | --- | --- | --- | --- |
| JSON 非法 | 400 | `VALIDATION_ERROR` | `validation.invalidJson` | — |
| 参数非法 | 422 | `VALIDATION_ERROR` | `validation.invalidParams` | 字段级 |
| 未登录 | 401 | `UNAUTHORIZED` | `unauthorized` | — |
| `(userId, name)` 唯一冲突 | 409 | `SKILL_CONFIG_NAME_CONFLICT` | `skillConfigNameConflict` | `[{ field: "name", message: validation.skillConfigNameUnique }]` |
| 保存失败 | 500 | `INTERNAL_ERROR` | `saveFailedRetry` | — |

### 2.3 `GET /api/console/skill-configs/:id`

**响应 `200`**：`{ "item": { ... } }`（字段同列表项；编辑 Modal 需完整 `content`）。

**错误**

| 场景 | HTTP | `error.code` | `error.message` key |
| --- | --- | --- | --- |
| `id` 缺失 | 400 | `VALIDATION_ERROR` | `validation.invalidId` |
| 非本人或不存在 | 404 | `SKILL_CONFIG_NOT_FOUND` | `skillConfigNotFound` |
| 未登录 | 401 | `UNAUTHORIZED` | `unauthorized` |

### 2.4 `PATCH /api/console/skill-configs/:id`

**请求体**（部分更新）

```json
{
  "name": "optional",
  "description": "optional — null 清空",
  "content": "optional",
  "enabled": "optional boolean"
}
```

- 校验规则同 POST 对应字段；`content` 若传入则 trim 后仍须非空。
- 名称冲突 → 409 + `SKILL_CONFIG_NAME_CONFLICT`（同 POST）。

**响应 `200`**：`{ "item": { ... } }`

### 2.5 `DELETE /api/console/skill-configs/:id`

**成功**：**`204`** 无 body（与现行 MCP DELETE 一致）。

**失败：仍被助手挂载（产品定稿 Q7）**

| HTTP | `error.code` | `error.message` key | `details` |
| --- | --- | --- | --- |
| **409** | `SKILL_CONFIG_REFERENCED_BY_ASSISTANT` | `skillConfigReferencedByAssistant` | `[{ field: "id", message: tApiMessage(..., "validation.skillConfigReferencedCount", { count }) }]` |

**其他错误**：不存在 → 404 + `SKILL_CONFIG_NOT_FOUND`；未登录 → 401。

---

## 3. 助手 Skills 挂载子资源

**路由**：`/api/console/assistants/:id/skill-configs`

**文件**：`src/app/api/console/assistants/[id]/skill-configs/route.ts`（对称 `mcp-configs/route.ts`）

### 3.1 `GET /api/console/assistants/:id/skill-configs`

**响应 `200`**

```json
{
  "assistantId": "uuid",
  "skillConfigIds": ["uuid", "..."]
}
```

- **`skillConfigIds` 顺序**：按 `skillConfigId` **字典序 ascending**（与 MCP `listMcpConfigIdsByAssistantIds` 的 `order: { mcpConfigId: "ASC" }` 一致）；便于前端 diff 与运行时排序一致。

**错误**

| 场景 | HTTP | `error.code` | message key |
| --- | --- | --- | --- |
| 助手不存在或非本人 | 404 | `ASSISTANT_NOT_FOUND` | `assistantNotFound` |
| 未登录 | 401 | `UNAUTHORIZED` | `unauthorized` |

### 3.2 `PUT /api/console/assistants/:id/skill-configs`

**请求体**

```json
{
  "skillConfigIds": ["uuid"]
}
```

**语义**：**整表替换**该助手与 Skill 的挂载集合；`[]` 表示清空。**必须**显式传入数组；`undefined` → 422。

**校验**

| 规则 | HTTP | details.field | message key |
| --- | --- | --- | --- |
| 非数组 | 422 | `skillConfigIds` | `validation.skillConfigIdsStringArray` |
| 元素非 string / 空串 | 422 | `skillConfigIds` | `validation.skillConfigIdsInvalid` |
| 去重后长度 > `SKILL_CONFIG_MAX_PER_ASSISTANT`（10） | 422 | `skillConfigIds` | `validation.skillAssistantMountLimit` 或 `validation.skillConfigMaxPerAssistant`（带 `{max}`，对称 MCP） |
| 任一 id 不属于当前用户 | 422 | `skillConfigIds` | `validation.invalidSkillConfigIds` |
| **`enabled=false` 的 Skill** | **允许**写入挂载（对齐 MCP）；运行时过滤 | — | — |

**实现建议**：事务内 `DELETE` 旧绑定 + `INSERT` 新行（对称 `replaceAssistantMcpBindings`）。

**响应 `200`**

```json
{
  "assistantId": "uuid",
  "skillConfigIds": ["..."]
}
```

（返回去重、排序后的 id 列表。）

**错误**

| 场景 | HTTP | `error.code` | message key |
| --- | --- | --- | --- |
| 助手不存在 | 404 | `ASSISTANT_NOT_FOUND` | `assistantNotFound` |
| 未传 `skillConfigIds` | 422 | `VALIDATION_ERROR` | `validation.skillConfigIdsRequired`（details） |
| 未登录 | 401 | `UNAUTHORIZED` | `unauthorized` |

---

## 4. 对话运行时接口

**无新增 REST**。Skills 注入发生在既有发消息 / Agent 构建链路：

```
getAssistantAgent → resolveSystemPromptWithSkills → loadSkillPackRefsForChatTurn + skillRefsToExtraSystemText
```

前端 **无需** 单独拉取「合并后 prompt」API（Q9 不做预览）。

Turn 面板数据来自既有消息 POST 的 SSE / Turn delta（`skills_resolution` 子步），见 `implementation-plan.md` §5。

---

## 5. `ErrorCode` 扩展（3B）

在 `src/common/enums/http.ts` 的 `ErrorCode` 中新增：

| 枚举值 | 典型 HTTP | 用途 |
| --- | --- | --- |
| `SKILL_CONFIG_NOT_FOUND` | 404 | GET/PATCH/DELETE 目标不存在或非本人 |
| `SKILL_CONFIG_REFERENCED_BY_ASSISTANT` | 409 | 删除仍被助手挂载 |
| `SKILL_CONFIG_NAME_CONFLICT` | 409 | `(userId, name)` 唯一冲突 |

删除 / 校验失败等场景仍可使用已有 `VALIDATION_ERROR`、`ASSISTANT_NOT_FOUND`、`UNAUTHORIZED`、`INTERNAL_ERROR`。

---

## 6. `api/message.json` key 映射（完整）

写入 `messages/en/api/message.json` 与 `messages/zh/api/message.json`。`error.message` 与 `details[].message` 均通过 `tApiMessage(locale, key, params?)` 解析。

### 6.1 Top-level（对应 `error.code` 主文案）

| ErrorCode | `tApiMessage` key | en（设计定稿） | zh（设计定稿） |
| --- | --- | --- | --- |
| `SKILL_CONFIG_NOT_FOUND` | `skillConfigNotFound` | Skill configuration not found. | Skill 配置不存在 |
| `SKILL_CONFIG_NAME_CONFLICT` | `skillConfigNameConflict` | A Skill with this name already exists. | 名称已存在 |
| `SKILL_CONFIG_REFERENCED_BY_ASSISTANT` | `skillConfigReferencedByAssistant` | Cannot delete: this Skill is still mounted on one or more assistants. Remove it from Assistant management first. | 无法删除：仍被助手引用，请先在助手管理中解除 Skills 挂载。 |

### 6.2 Validation（`error.code = VALIDATION_ERROR` 时 `details` / 主 message）

| 场景 | `tApiMessage` key | 说明 |
| --- | --- | --- |
| 无效 JSON | `validation.invalidJson` | 已有 |
| 无效 id | `validation.invalidId` | 已有 |
| 通用参数错误 | `validation.invalidParams` | 已有 |
| 必填 | `validation.required` | 已有 |
| 超长（name/description 通用） | `validation.maxLength` | 已有，带 `{max}` |
| 正文超长 | `validation.skillContentMaxLength` | content 专用文案 |
| 用户条数上限（主 message） | `validation.skillConfigLimitPerUser` | 建议对称 MCP：`Single user Skill limit {max}` / `单用户 Skill 最多 {max} 条` |
| 用户条数上限（details） | `validation.skillConfigLimitReached` | 已达 Skill 配置上限 |
| 名称唯一（details） | `validation.skillConfigNameUnique` | 带 `{maxLength}`，对称 `validation.mcpConfigNameUnique` |
| 删除引用数（details） | `validation.skillConfigReferencedCount` | 带 `{count}`，对称 `validation.mcpConfigReferencedCount` |
| PUT 未传数组 | `validation.skillConfigIdsRequired` | skillConfigIds must be an array |
| 非字符串数组 | `validation.skillConfigIdsStringArray` | 对称 `validation.mcpConfigIdsStringArray` |
| 格式无效 | `validation.skillConfigIdsInvalid` | — |
| 无效 id 集合 | `validation.invalidSkillConfigIds` | 不泄露存在性 |
| 助手挂载超限 | `validation.skillAssistantMountLimit` 或 `validation.skillConfigMaxPerAssistant` | 带 `{max}` |

### 6.3 Turn safeMessage（对话 Turn，非 REST 错误）

见 `copy-chat-en-zh.md`；写入 `api/message.json` 的 `turnSafe.*`：

| key | 用途 |
| --- | --- |
| `turnSafe.skillsNoAssistant` | 无 assistantId |
| `turnSafe.skillsNotMounted` | 无有效挂载 |
| `turnSafe.skillsMerged` | 成功合并，带 `{count}` |
| `turnSafe.skillsLoadSkipped` | DB 整类失败 |
| `turnSafe.detail.skillsMergedTitle` 等 | Turn details 块 |

---

## 7. 与 `withApiWrapper` 的约束

新增 `src/app/api/console/skill-configs/**/route.ts` 及助手子资源的导出方法均应 **`withApiWrapper(async ...)`** 包装；**个人控制台资源**，与 `console/mcp-configs` 一致，**不**组合 `withAdminApi`。

---

## 8. 与 MCP API 对照速查

| 维度 | MCP | Skills |
| --- | --- | --- |
| 列表/CRUD 前缀 | `/api/console/mcp-configs` | `/api/console/skill-configs` |
| 助手子资源 | `GET/PUT .../mcp-configs` | `GET/PUT .../skill-configs` |
| 请求体字段 | `mcpConfigIds` | `skillConfigIds` |
| 引用计数字段 | `referencedAssistantCount` | `referencedAssistantCount` |
| 删除被引用 | 409 `MCP_CONFIG_REFERENCED_BY_ASSISTANT` | 409 `SKILL_CONFIG_REFERENCED_BY_ASSISTANT` |
| 额外端点 | `POST .../test-connection` | **无** |
| 每助手挂载上限常量 | 20（现行代码） | **10**（本期 PRD 定稿） |

---

## 9. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-18 | 3A 初稿，对齐 product/design 0.1.18 与 MCP 实现 |
