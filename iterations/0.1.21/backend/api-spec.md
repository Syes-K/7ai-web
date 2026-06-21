# API 规格：Skills 治理与体验优化（version 0.1.21）

本文档为 **阶段 3A** 接口契约，在 `0.1.20` 基础上 **治理与 API 边界演进**。风格对齐：`withApiWrapper`、`withAdminApi`、`getRequestUserContext`、`jsonError`、`ErrorCode` / `HttpStatus`、`resolveRequestLocale` + `tApiMessage`。

**Chat REST 路径不变**；对话侧变更体现在 Admin/Catalog 拆分、Turn SSE 字段与 C1b 快照演进。

---

## 1. 变更摘要

| 域 | 0.1.20 | 0.1.21 |
| --- | --- | --- |
| Pack 管理 | `/api/console/skill-configs` 用户 CRUD | **`/api/admin/skill-configs`** admin only |
| 助手挂载列表 | console skill-configs GET | **`GET /api/console/skill-catalog`** |
| 元数据编辑 | PATCH name/enabled/alwaysLoad | **禁止**；仅 import 同步 frontmatter |
| 空包创建 | POST console | **移除** |
| 覆盖导入 | 无（console 仅新建） | **`POST .../import` + `packId`** |
| skip reason | `reason` 自由文本 | **`reasonCode` 枚举** |
| C1b 子步骤 | `safeMessage` | + **`safeMessageKey`** |
| failed_safe 详情 | 无 | **P1**：+ `skillsIntentFailedBody` 一行 |

---

## 2. Admin API — `/api/admin/skill-configs`

**鉴权**：所有 handler `withApiWrapper([withAdminApi], …)`；非 admin → **403** `authAdminOnly`（对齐 `admin/assistants`）。

**i18n**：错误 message 走 `messages/{locale}/api/message.json`；Admin Skills 专用文案可增 `admin.skillConfig*` 子键（3B 与 frontend `page.admin.skills` 对齐）。

### 2.1 `GET /api/admin/skill-configs`

分页列出 **系统** Skill Pack（含 disabled）。

**Query**

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `page` | int ≥1 | `1` | 页码 |
| `pageSize` | int 1–100 | `20` | 页大小 |
| `keyword` | string | — | 可选；`name` / `description` 模糊匹配（SQLite `instr`） |

**响应 `200`**

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "ui-ux-pro-max",
      "description": "…",
      "enabled": true,
      "alwaysLoad": false,
      "fileCount": 12,
      "hasScripts": true,
      "createdAt": "2026-06-20T08:00:00.000Z",
      "updatedAt": "2026-06-20T09:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

**与 console 0.1.20 差异**

- **不含** `referencedAssistantCount`（设计移除列表列；删除失败时 API 返回引用详情）。
- 不过滤 `userId`（系统全局）。

**错误**

| 状态 | Code | 场景 |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | 未登录 |
| 403 | `authAdminOnly` | 非 admin |
| 400 | `VALIDATION_ERROR` | 分页参数非法 |

---

### 2.2 `GET /api/admin/skill-configs/:id`

单条元数据 + 聚合字段（`fileCount`、`hasScripts`）。

**响应 `200`**：`{ "item": AdminSkillPackListItem }`（字段同列表项）。

**错误**

| 状态 | Code |
| --- | --- |
| 404 | `SKILL_CONFIG_NOT_FOUND` |

---

### 2.3 `DELETE /api/admin/skill-configs/:id`

删除 Pack 及全部 `skill_pack_files`。**须**引用检查（Q14）。

**成功 `204`**：无 body。

**失败 `409`** — 仍被助手挂载：

```json
{
  "code": "SKILL_CONFIG_REFERENCED_BY_ASSISTANT",
  "message": "…skillConfigReferencedByAssistant…",
  "referencedAssistants": [
    { "id": "assistant-uuid", "name": "默认助手" }
  ],
  "details": [
    {
      "field": "id",
      "message": "…validation.skillConfigReferencedCount…"
    }
  ]
}
```

**引用查询范围**：**全局** — 统计所有 `AssistantSkillBinding.skillConfigId = :id`（含用户助手与系统助手），JOIN `Assistant` 取 `id`、`name`。

**与 0.1.20 console DELETE 差异**：响应体 **新增** `referencedAssistants[]` 供 Modal 枚举（设计 §3.1）。

---

### 2.4 `POST /api/admin/skill-configs/import`

**唯一**内容变更路径（新建 + 覆盖）。`multipart/form-data`。

**Form 字段**

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `file` | zip 模式必填 | zip 文件 |
| `files` | 文件夹模式 | 多 part 文件夹导入（沿用 0.1.20） |
| `name` | 否 | 覆盖 frontmatter 建议名（新建时） |
| **`packId`** | 覆盖时必填 | 目标 Pack uuid；**有值 = 覆盖模式** |

**决策 B4**：单端点 + `packId` 区分模式（**不**新增 `POST /:id/import`）。

**新建模式**（无 `packId`）

1. 校验 zip/文件夹（SKILL.md、大小、路径安全、文件数上限 — 沿用 0.1.20）
2. 解析 frontmatter → 同步 `name`、`description`、`enabled`、`alwaysLoad`（Q10）
3. **P1**：`description` 空时走回退策略（见 §2.8）
4. 系统 Pack 总数 `< SKILL_PACK_MAX_SYSTEM`（默认 200）
5. `name` 全局唯一冲突 → **409** `SKILL_CONFIG_NAME_CONFLICT`

**覆盖模式**（有 `packId`）

1. 校验 Pack 存在
2. **DELETE** 该 `packId` 下全部 `skill_pack_files`，再 bulk INSERT 新 entries
3. **保留** Pack `id`；`AssistantSkillBinding` 不变
4. 从 SKILL.md frontmatter **重新同步** 表字段（含 `enabled`、`alwaysLoad`）
5. 覆盖时 **允许** frontmatter `name` 变更；若新 name 与其他 Pack 冲突 → 409

**响应 `200` / `201`**

```json
{
  "item": { "...AdminSkillPackListItem" },
  "importSummary": {
    "importedFileCount": 10,
    "skippedFileCount": 1,
    "skipped": [{ "path": "node_modules/foo", "reason": "…" }],
    "totalBytes": 12345,
    "hasScripts": true
  }
}
```

- 新建 → **201**；覆盖 → **200**

---

### 2.5 文件只读 — `GET .../files`

沿用 0.1.20 console 语义；**去掉** `userId` 所有权校验，改为「Pack 存在即可」。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/admin/skill-configs/:id/files` | 文件 meta 列表 |
| GET | `/api/admin/skill-configs/:id/files/*` | 单文件内容；大文件 `truncated: true` |

**响应类型**：沿用 `SkillPackFileMetaJson` / `SkillPackFileContentJson`（`skill-config-dto.ts`）。

---

### 2.6 禁止的写端点（决策 B5）

UI **不暴露**；3B **不实现**业务 handler，或保留 stub 返回 **403**：

| 方法 | 路径 | 处置 |
| --- | --- | --- |
| POST | `/api/admin/skill-configs` | **403** `SKILL_CONFIG_WRITE_DISABLED` |
| PATCH | `/api/admin/skill-configs/:id` | **403** `SKILL_CONFIG_WRITE_DISABLED` |
| PUT/PATCH/DELETE | `.../files/*` | **403** `SKILL_CONFIG_WRITE_DISABLED` |

**message key**（建议新增）：

- en: `Changes to Skill Packs are only allowed by importing a zip.`
- zh: `技能包内容仅能通过导入 zip 变更。`

元数据（enabled / alwaysLoad）变更路径：**编辑 zip 内 SKILL.md frontmatter → 重新导入**。

---

### 2.7 Admin DTO 类型

```typescript
/** Admin 列表/详情项（无 referencedAssistantCount）。 */
export type AdminSkillPackListItemJson = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  alwaysLoad: boolean;
  fileCount: number;
  hasScripts: boolean;
  createdAt: string;
  updatedAt: string;
};

/** DELETE 409 扩展体。 */
export type SkillConfigDeleteBlockedJson = {
  code: "SKILL_CONFIG_REFERENCED_BY_ASSISTANT";
  message: string;
  referencedAssistants: Array<{ id: string; name: string }>;
  details?: JsonErrorDetail[];
};
```

---

### 2.8 description 回退（P1 — Q22）

**时机**：import 解析后，frontmatter `description` trim 后为空。

**回退顺序**（写入 `description` 表字段）：

1. frontmatter `description`（非空）
2. SKILL.md body：首个非空、非 `#` 标题行，截断 ≤400 字符
3. zip 顶层文件夹名（去扩展名）

---

## 3. Catalog API — `GET /api/console/skill-catalog`

**决策 B3**：独立只读端点；助手页（用户 + admin）**统一**数据源。

**鉴权**：`getRequestUserContext()`；未登录 → **401**。

**过滤**：`enabled === true` **only**（disabled Pack 不出现在 catalog；已挂载 disabled 由前端 warning 处理 — 沿用 0.1.20）。

**Query**（可选）

| 参数 | 说明 |
| --- | --- |
| `keyword` | 名称/描述搜索 |
| `page` / `pageSize` | 可选分页；默认一次返回全量（`pageSize` 上限 **500**） |

**响应 `200`**

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "ui-ux-pro-max",
      "description": "…",
      "fileCount": 12,
      "hasScripts": true,
      "alwaysLoad": false
    }
  ],
  "total": 1
}
```

**字段说明**

| 字段 | 含于 catalog | 不含 |
| --- | --- | --- |
| `id`, `name`, `description` | ✅ | |
| `fileCount`, `hasScripts`, `alwaysLoad` | ✅ | |
| `enabled` | — | 已过滤，不返回 |
| `createdAt`, `updatedAt` | — | 助手 UI 不需要 |

**助手绑定校验**（`PUT .../assistants/:id/skill-configs`）：`skillConfigIds` 须为 **存在的 Pack id**；不要求 enabled（允许保留 disabled 挂载 — 0.1.20 行为）。无效 id → `INVALID_SKILL_CONFIG_IDS`（不泄露存在性）。

**3B 变更**：`replaceAssistantSkillBindings` 校验 Pack 存在时 **去掉** `userId` 条件。

---

## 4. 废弃 Console API — `/api/console/skill-configs`

**决策 Q7**：一次性切换（Q27 无双写）；3B 维护窗口内部署。

| 原端点 | 处置 | 说明 |
| --- | --- | --- |
| GET 列表/详情 | **410 Gone** 或 **删除路由** | message：`skillConfigConsoleDeprecated` |
| POST 新建 | **410** | |
| PATCH 元数据 | **410** | |
| DELETE | **410** | 管理迁至 admin |
| POST import | **410** | |
| GET files | **410** 或短期只读 alias | 建议 **410**；预览改 admin API |
| PUT/PATCH/DELETE files | **410** | |

**410 响应体示例**

```json
{
  "code": "SKILL_CONFIG_CONSOLE_DEPRECATED",
  "message": "Skill Pack management has moved to the admin console."
}
```

**迁移路径（frontend）**

```text
/console/skills          → 移除；admin 302 / 其他 404（B8，前端路由）
/api/console/skill-configs → 410
助手技能多选              → GET /api/console/skill-catalog
Admin Skills 页          → /api/admin/skill-configs
```

**新增 ErrorCode**（3B）

| Code | HTTP | 用途 |
| --- | --- | --- |
| `SKILL_CONFIG_CONSOLE_DEPRECATED` | 410 | console 端点废弃 |
| `SKILL_CONFIG_WRITE_DISABLED` | 403 | admin 禁止在线写 |

---

## 5. 助手子资源（不变路径）

`GET/PUT /api/console/assistants/:id/skill-configs`  
`GET/PUT /api/admin/assistants/:id/skill-configs`（若已有）

**行为变更**：绑定目标 id 须存在于 **系统库**；校验逻辑去 `userId` 过滤。

**响应 shape 不变**：`{ skillConfigIds: string[] }`。

---

## 6. Chat API — Turn SSE 与 C1b 演进

**路由不变**：`POST/GET .../messages`

### 6.1 C1b 子步骤字段演进

**存储**：`ChatTurn.stepsSnapshotJson` → C1b step 对象。

| 字段 | 0.1.20 | 0.1.21 |
| --- | --- | --- |
| `safeMessage` | locale 字符串 | **保留**（写入时 locale；legacy 兼容） |
| **`safeMessageKey`** | 无 | **新增**；如 `turnSafe.skillsLoaded` |
| `details` | `{ title, content }[]` 文本 | P0 不变；P1 可选 `lines[]` |
| `reasonTag` | 可选 | 不变 |

**决策 T1**：`safeMessageKey` **同时**写入 DB 快照与 SSE `turn_delta` / `turn_started` 步骤 payload。

**SSE 步骤片段示例**

```json
{
  "stepKey": "C1b",
  "label": "…",
  "status": "completed",
  "safeMessage": "Loaded 1 Skill Pack(s).",
  "safeMessageKey": "turnSafe.skillsLoaded",
  "details": [{ "title": "…", "content": "…" }]
}
```

**GET messages 重放**：前端优先 `safeMessageKey` + `t()`；fallback `safeMessage` + legacy 映射。

---

### 6.2 `skillsSafeMessage` — 返回值扩展（3B 内部）

函数仍返回 **localized string**；并设置并行 key（供写入快照）：

| 条件 | `safeMessageKey` |
| --- | --- |
| `assistantMissing` | `turnSafe.skillsNoAssistant` |
| `loadFailed` | `turnSafe.skillsLoadSkipped` |
| `mounted.length === 0` | `turnSafe.skillsNotMounted` |
| `loaded === 0` && `failed_safe` | `turnSafe.skillsSelectionFailed` |
| `loaded === 0` | `turnSafe.skillsMountedNotSelected` |
| loaded + read + run 组合 | 对应 `skillsLoadedWith*` keys |

---

### 6.3 `skillsDetailsFromUi` — skip reason i18n

**skipped 行组装**（`messages/route.ts`）：

```typescript
// 新 Turn：reasonCode → i18n
const reasonLabel = item.reasonCode
  ? tApiMessage(locale, `turnSafe.detail.skillsSkipReason.${item.reasonCode}`)
  : null;

// legacy：有 reason 文本但无 reasonCode → B7 降级为无 reason 行
const line = reasonLabel
  ? tApiMessage(locale, "turnSafe.detail.skillsSkippedLine", { name, reason: reasonLabel })
  : tApiMessage(locale, "turnSafe.detail.skillsSkippedLineNoReason", { name });
```

**决策 B6 — `SkillPackSkipReasonCode` 全集**

| code | 含义 |
| --- | --- |
| `unrelated` | 与当前问题无关 |
| `low_confidence` | 本轮不需要 |
| `user_small_talk` | 寒暄闲聊 |
| `duplicate_coverage` | 已由其他包覆盖 |
| `other` | 兜底 |

**i18n keys**（`api/message.json` + 镜像 `page/chat.json`）：

- `turnSafe.detail.skillsSkipReason.{code}`

**Intent agent JSON 契约变更**

```json
{
  "selectedIds": ["uuid-1"],
  "reasons": {
    "uuid-2": "unrelated"
  }
}
```

| 规则 | 说明 |
| --- | --- |
| `reasons` 值 | **须为上述 code**；非法值丢弃该条 reasonCode |
| 解析失败 | **不** persist 自由文本；该 skipped 项无 `reasonCode` |
| 新 Turn | **不写** `skipped[].reason` 字符串 |

---

### 6.4 failed_safe 详情（P1 — T5）

**触发**：`intentSource === "failed_safe"` && `mounted.length > 0`。

**摘要**：不变 — `turnSafe.skillsSelectionFailed`。

**详情增量**：在 skipped 块之后追加 note 块（或并入 `skillsNote`）：

| key | 说明 |
| --- | --- |
| `turnSafe.detail.skillsIntentFailedBody` | 统一一句；**不**区分 timeout / parse |

**决策 T5**：**不**持久化 `failureKind`；日志可区分，用户向 copy 统一。

---

### 6.5 C1b 隐藏逻辑（不变）

```typescript
function shouldEmitSkillsStep(ui: SkillsTurnUiSnapshot): boolean {
  const n = normalizeSkillsTurnUi(ui);
  if (n.assistantMissing || n.loadFailed) return true;
  return n.mounted.length > 0;
}
```

---

### 6.6 结构化详情行（P1 — T2）

**P0**：`details[].content` 多行文本 + 前端 `localizeDetailContentLines` legacy。

**P1 可选**：details 项扩展：

```typescript
type TurnDetailBlock = {
  title: string;
  content?: string; // legacy
  lines?: Array<
    | { type: "loadedName"; name: string }
    | { type: "skipped"; name: string; reasonCode?: SkillPackSkipReasonCode }
    | { type: "read"; packName: string; path: string }
    | { type: "scriptRun"; packName: string; path: string; exitCode: string }
  >;
};
```

新 Turn 可双写 `content` + `lines`；旧客户端忽略 `lines`。

---

## 7. 意图路由（内部 API — 语义不变，契约演进）

**模块**：`skill-pack-intent-agent.ts`

### 7.1 输出类型演进

```typescript
export type SkillPackIntentResult = {
  selectedIds: string[];
  /** 值改为 SkillPackSkipReasonCode，非自由文本 */
  reasons: Record<string, SkillPackSkipReasonCode>;
  intentSource: "intent_agent" | "failed_safe" | "skipped";
};
```

### 7.2 其他不变

- 超时：`SKILL_PACK_INTENT_TIMEOUT_MS`（现网 15000ms）
- 失败 → `failed_safe`；非 always **不加载**
- `decideSkillPackIntent` 的 `userId` 参数 **保留**（审计/配额）；Pack 查询 **不**再按 owner 过滤

---

## 8. i18n keys 增量清单

**文件**：`messages/{en,zh}/api/message.json`

| Key | 用途 |
| --- | --- |
| `turnSafe.detail.skillsSkipReason.unrelated` | skip reason |
| `turnSafe.detail.skillsSkipReason.low_confidence` | … |
| `turnSafe.detail.skillsSkipReason.user_small_talk` | … |
| `turnSafe.detail.skillsSkipReason.duplicate_coverage` | … |
| `turnSafe.detail.skillsSkipReason.other` | … |
| `turnSafe.detail.skillsIntentFailedBody` | failed_safe 详情（P1） |
| `skillConfigConsoleDeprecated` | console 410 |
| `skillConfigWriteDisabled` | admin 403 写禁用 |
| `admin.skillConfigImportOnly` | 可选；与 writeDisabled 合并 |

**Admin 域**：`messages/*/api/message.json` 的 `admin.*` 与 `page.admin.skills` 对齐（见 design `copy-admin-en-zh.md`）。

---

## 9. 错误码汇总

| Code | HTTP | 场景 |
| --- | --- | --- |
| `UNAUTHORIZED` | 401 | 未登录 |
| `authAdminOnly` | 403 | 非 admin 调 admin API |
| `SKILL_CONFIG_NOT_FOUND` | 404 | Pack 不存在 |
| `SKILL_CONFIG_NAME_CONFLICT` | 409 | 全局 name 冲突 |
| `SKILL_CONFIG_REFERENCED_BY_ASSISTANT` | 409 | 删除仍被挂载；含 `referencedAssistants` |
| `SKILL_CONFIG_WRITE_DISABLED` | 403 | 禁止在线写 |
| `SKILL_CONFIG_CONSOLE_DEPRECATED` | 410 | console API 废弃 |
| `VALIDATION_ERROR` | 400/422 | 分页、import 校验 |
| `INTERNAL_ERROR` | 500 | 事务失败 |

---

## 10. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-20 | 3A：Admin/Catalog API、console 废弃、Turn i18n 契约、B1–B8/T1–T5 定稿 |
