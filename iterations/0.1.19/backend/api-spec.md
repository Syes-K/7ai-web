# API 规格：Skill Pack 目录包（version 0.1.19）

本文档为 **阶段 3A** 接口契约，供 3B 实现与前端对接。在 `0.1.18` 的 `/api/console/skill-configs` 基础上 **演进**（非新前缀）；风格对齐 MCP 控制台 API：`withApiWrapper`、`getRequestUserContext`、`jsonError`、`ErrorCode` / `HttpStatus`、`resolveRequestLocale` + `tApiMessage`。

**命名对称**：资源路径仍使用 **`skill-configs`**（与 `mcp-configs` 一致）；语义上 id 即 **Skill Pack id**（packId）。

---

## 1. 鉴权与用户隔离

与 0.1.18 相同：

| 规则 | 说明 |
| --- | --- |
| 登录 | 所有下列接口须已登录 → **`401` + `UNAUTHORIZED`** |
| 数据边界 | 一切读写以 `getRequestUserContext().user.id` 为界 |
| 404 / 422 | 对他人的 packId 写操作 → **`422` + `VALIDATION_ERROR` + `validation.invalidSkillConfigIds`**（不枚举） |
| 助手归属 | 助手子资源仅 **`AssistantScope.Personal`** 且 `userId` 匹配 → 否则 **`404` + `ASSISTANT_NOT_FOUND`** |

---

## 2. 0.1.18 → 0.1.19 API 变更摘要

| 维度 | 0.1.18 | 0.1.19 |
| --- | --- | --- |
| POST/PATCH body | 含 **`content`**（必填/可选） | **无 `content`**；Pack 正文经 files API |
| 列表/详情响应 | 含 **`content`** | **无 `content`**；含 **`fileCount`**、**`hasScripts`** |
| 新建 Pack | 一次写入 content | POST 创建元数据 + **默认 `SKILL.md` 模板**（事务内） |
| 文件管理 | 无 | **`/files` 子资源**（CRUD、批量、移动） |
| 导入 | 无 | **`POST .../import`**（zip / multipart 文件夹） |
| 助手子资源 | 不变 | 不变 |
| 运行时 | 无 REST | **`read_skill_file`** tool（§6） |

---

## 3. Skill Pack CRUD（主资源）

**路由前缀**：`/api/console/skill-configs`

| 方法 | 路径 | 文件（3B） |
| --- | --- | --- |
| GET, POST | `/api/console/skill-configs` | `skill-configs/route.ts` |
| GET, PATCH, DELETE | `/api/console/skill-configs/:id` | `skill-configs/[id]/route.ts` |
| POST | `/api/console/skill-configs/import` | `skill-configs/import/route.ts` |

### 3.1 `GET /api/console/skill-configs`

**用途**：技能包列表、助手 Modal 选项源。

**Query（可选）**

| 参数 | 说明 |
| --- | --- |
| `keyword` | 名称或描述模糊匹配（同 0.1.18） |

**分页**：与 0.1.18 一致，**全量返回**（上限 50 条/用户）。

**响应 `200`**

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "展示名",
      "description": "可选，null 可",
      "enabled": true,
      "fileCount": 3,
      "hasScripts": true,
      "createdAt": "2026-06-19T12:00:00.000Z",
      "updatedAt": "2026-06-19T12:00:00.000Z",
      "referencedAssistantCount": 0
    }
  ]
}
```

| 字段 | 说明 |
| --- | --- |
| `fileCount` | `skill_pack_files` 行数（`packId = id`） |
| `hasScripts` | 是否存在 `path` 以 `scripts/` 为前缀的文件 |
| ~~`content`~~ | **移除** |

- **排序**：`updatedAt DESC`, `id DESC`
- **UGC**：`name` / `description` 原样返回

### 3.2 `POST /api/console/skill-configs`

**用途**：新建空 Pack（预置 `SKILL.md` 模板）。

**请求体**

```json
{
  "name": "string, required",
  "description": "string | null, optional",
  "enabled": true
}
```

**校验**

| 字段 | 规则 |
| --- | --- |
| `name` | 必填；trim 非空；≤ `SKILL_PACK_NAME_MAX_LENGTH`（64） |
| `description` | 可选；null 或 string；≤ 500 |
| `enabled` | 可选 boolean；默认 `true` |
| ~~`content`~~ | **不接受**；若传入 → 422 `validation.unknownField` 或忽略并 log（3B 统一选 **422**） |

**服务端行为（事务）**

1. INSERT `user_skill_configs`
2. INSERT `skill_pack_files`：`path='SKILL.md'`，内容为 §3.2.1 模板（frontmatter `name`/`description` 与主表一致）

#### 3.2.1 默认 `SKILL.md` 模板

```markdown
---
name: {name}
description: {description or ""}
---

# Instructions

Write skill instructions here…
```

**用户条数上限**：≥ `SKILL_PACK_MAX_PER_USER`（50）→ 422（同 0.1.18）。

**响应 `201`**：`{ "item": { /* 同列表项 */ } }`

**错误**：409 名称冲突（同 0.1.18）；422 校验失败。

### 3.3 `GET /api/console/skill-configs/:id`

**响应 `200`**：`{ "item": { ... } }`（字段同列表项；**不含**文件正文）。

**可选扩展**（3B 二选一，推荐 **不含**，详情正文走 files API）：

- 若前端首屏需减少请求，可在 query `?includeFiles=1` 时附加 `files: { path, content }[]` — **非 MVP 必须**；默认 **不** 带。

### 3.4 `PATCH /api/console/skill-configs/:id`

**请求体**（部分更新，**仅元数据**）

```json
{
  "name": "optional",
  "description": "optional — null 清空",
  "enabled": "optional boolean"
}
```

- ~~`content`~~：**不接受**
- `enabled=true` 前须校验 Pack 内存在 **非空** `SKILL.md`（去 frontmatter 后 body 非空）→ 否则 422 `validation.skillMdRequired`
- 名称冲突 → 409

**注意**：修改 `name`/`description` **不**自动回写 `SKILL.md` frontmatter（Q6：表单项优先直至下次保存 SKILL）。

**响应 `200`**：`{ "item": { ... } }`

### 3.5 `DELETE /api/console/skill-configs/:id`

与 0.1.18 相同：

| 场景 | HTTP | `error.code` |
| --- | --- | --- |
| 成功 | **204** | — |
| 仍被助手挂载 | **409** | `SKILL_CONFIG_REFERENCED_BY_ASSISTANT` |
| 不存在 | **404** | `SKILL_CONFIG_NOT_FOUND` |

**级联**：DELETE Pack 时 **CASCADE** 删除其 `skill_pack_files` 行（应用层事务或 DB ON DELETE CASCADE）。

---

## 4. Pack 文件子资源

**基址**：`/api/console/skill-configs/:packId/files`

**路径参数编码**：URL 中文件相对路径使用 **逐段 encodeURIComponent** 后的 catch-all，例如：

- `scripts/search.py` → `/files/scripts%2Fsearch.py`
- Next.js 路由：`skill-configs/[id]/files/[...path]/route.ts`（`path` 数组 join `/`）

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `.../files` | 列出 Pack 内文件元数据（不含 content 或可选摘要） |
| GET | `.../files/[...path]` | 读取单文件 content |
| PUT | `.../files/[...path]` | 创建或覆盖单文件 |
| PATCH | `.../files/[...path]` | 移动/重命名（body `{ newPath }`） |
| DELETE | `.../files/[...path]` | 删除单文件 |
| PUT | `.../files` | **批量 upsert**（body `{ files: [{ path, content }] }`） |

所有操作须校验 **`packId` 归属当前 user**。

### 4.1 `GET .../files`

**响应 `200`**

```json
{
  "packId": "uuid",
  "files": [
    {
      "path": "SKILL.md",
      "sizeBytes": 1024,
      "updatedAt": "2026-06-19T12:00:00.000Z"
    },
    {
      "path": "scripts/search.py",
      "sizeBytes": 4096,
      "updatedAt": "..."
    }
  ],
  "totalBytes": 5120,
  "fileCount": 2
}
```

- **排序**：`path` POSIX 字典序；`SKILL.md` 可置顶（与 UI 一致）
- **不含** `content`（列表轻量）

### 4.2 `GET .../files/[...path]`

**响应 `200`**

```json
{
  "path": "reference.md",
  "content": "file text utf-8",
  "sizeBytes": 123,
  "updatedAt": "..."
}
```

**错误**：404 `SKILL_PACK_FILE_NOT_FOUND`

### 4.3 `PUT .../files/[...path]`

**请求体**

```json
{
  "content": "string, required — UTF-8 文本"
}
```

**校验（每次写入）**

| 规则 | 失败 |
| --- | --- |
| `normalizePackFilePath(path)` 合法 | 422 `validation.skillPackInvalidPath` |
| 扩展名 ∈ 白名单（Q2） | 422 `validation.skillPackFileExtensionDenied` |
| 单文件 ≤ `SKILL_PACK_FILE_MAX_BYTES`（512_000） | 422 `validation.skillPackFileTooLarge` |
| 写入后 Pack 总字节 ≤ `SKILL_PACK_MAX_TOTAL_BYTES`（2_000_000） | 422 `validation.skillPackTotalSizeExceeded` |
| 写入后文件数 ≤ `SKILL_PACK_MAX_FILES`（100） | 422 `validation.skillPackFileCountExceeded` |
| 保存 `SKILL.md` 时 body（去 frontmatter）≤ `SKILL_MD_MAX_BODY_LENGTH`（32_000） | 422 `validation.skillMdBodyTooLarge` |
| content 须为合法 UTF-8 | 422 `validation.skillPackNotUtf8` |

**`SKILL.md` 特殊逻辑（Q6）**

- 保存成功后：解析 frontmatter；若含 `name`/`description` → **覆盖**主表对应字段（同一事务）
- frontmatter 解析失败：文件仍保存；**不**同步元数据；log warning

**响应 `200`**：`{ "file": { path, content, sizeBytes, updatedAt }, "item": { /* 可选：同步后的 pack 元数据 */ } }`

**响应 `201`**：新建文件时可用 201（3B 与前端统一一种）。

### 4.4 `PATCH .../files/[...path]` — 移动/重命名

**请求体**

```json
{
  "newPath": "scripts/search_v2.py"
}
```

- 校验新旧 path 均合法；`newPath` 不存在或允许覆盖（3B 定稿：**冲突 → 409 `SKILL_PACK_FILE_PATH_CONFLICT`**）
- **禁止**删除最后一个 `SKILL.md` 且无替换（若 move 源为 SKILL.md 且 newPath 非 SKILL.md → 须保证 Pack 仍有 SKILL.md）
- **禁止** rename `SKILL.md` 导致 Pack 无入口文件

**响应 `200`**：`{ "path": "newPath", "updatedAt": "..." }`

### 4.5 `DELETE .../files/[...path]`

- **禁止**删除 Pack 内 **唯一** 的 `SKILL.md` → 422 `validation.skillMdRequired`
- 成功 **204**

### 4.6 `PUT .../files` — 批量 upsert

**请求体**

```json
{
  "files": [
    { "path": "SKILL.md", "content": "..." },
    { "path": "reference.md", "content": "..." }
  ]
}
```

- 逐文件应用 §4.3 校验；**任一失败** → 422，details 含多个 `{ field: "files[{i}].path", message }` 或 `{ field: "path", message }`
- 3B 推荐 **单事务**：全成功或全失败
- 若 batch 含 `SKILL.md` → 执行 frontmatter 同步（一次）

**响应 `200`**

```json
{
  "savedCount": 2,
  "totalBytes": 12345,
  "fileCount": 5,
  "item": { /* pack 元数据 */ }
}
```

---

## 5. 导入 API

### 5.1 `POST /api/console/skill-configs/import`

**Content-Type**：`multipart/form-data`

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `file` | zip 模式必填 | `.zip` 单文件 |
| `files` | 文件夹模式 | 多文件；每 part 含 `filename` 相对路径（如 `my-skill/SKILL.md`） |
| `mode` | 可选 | `zip` \| `folder`；可据 Content-Type 推断 |
| `name` | 可选 | 覆盖默认 Pack 名（否则 Q7：frontmatter name > 顶层文件夹名 > zip 文件名） |

**处理流程**

1. 解压 / 归一化相对路径（去掉顶层单文件夹包裹，与 `.cursor/skills/<name>/` 同构）
2. 过滤：路径非法、扩展名拒绝、非 UTF-8、隐藏文件（`__pycache__`、`.DS_Store`）→ **跳过**并收集 `skipped[]`
3. **必须**含根级 `SKILL.md` 且非空 → 否则 **422** `validation.skillMdRequiredOnImport` + details 列出原因
4. 汇总大小/文件数配额 → 超限 422
5. 解析 `SKILL.md` frontmatter → 默认 `name`/`description`
6. `(userId, name)` 冲突 → **409** `SKILL_CONFIG_NAME_CONFLICT`（Q12）
7. 用户 Pack 数 ≥ 50 → 422
8. 事务：INSERT pack + INSERT 全部 files

**响应 `201`**

```json
{
  "item": {
    "id": "uuid",
    "name": "...",
    "description": "...",
    "enabled": true,
    "fileCount": 12,
    "hasScripts": true,
    "createdAt": "...",
    "updatedAt": "...",
    "referencedAssistantCount": 0
  },
  "importSummary": {
    "importedFileCount": 12,
    "skippedFileCount": 2,
    "skipped": [
      { "path": "__pycache__/x.pyc", "reason": "extension_denied" },
      { "path": "data/binary.bin", "reason": "not_utf8" }
    ],
    "totalBytes": 150000,
    "hasScripts": true
  }
}
```

**Zip 炸弹 / 安全**

- 解压前检查压缩包大小；解压后总 uncompressed ≤ `SKILL_PACK_MAX_TOTAL_BYTES`（可略放宽读取缓冲，写入 DB 前截断拒绝）
- 拒绝 zip 内嵌套 `.zip`（Q2）
- 路径遍历（`../`、绝对路径）→ skip + reason `invalid_path`

### 5.2 文件夹导入（multipart 多文件）

与 zip **共用** endpoint；`files[]` 的 `filename` 为 webkitRelativePath。

前端也可 **客户端打 zip** 后只传 `file` — 后端仅实现 zip 亦可；3B **至少**实现 zip；folder multipart **推荐同批实现**（设计已定）。

---

## 6. 运行时：`read_skill_file` Tool 契约（非 REST）

**注入点**：`resolveAllToolsForAgent` → `skillPackRefsToReadTools` → 与 MCP tools 合并传入 `createAgent`。

### 6.1 Tool Schema

| 属性 | 值 |
| --- | --- |
| name | **`read_skill_file`** |
| description（英文） | Read a text file from a Skill Pack mounted on this assistant. Only paths under packs listed below are allowed. Scripts are read-only; they cannot be executed in this version. Available packs: `{packId}: {name}, ...` |
| parameters | JSON Schema object |

```json
{
  "type": "object",
  "properties": {
    "packId": {
      "type": "string",
      "description": "UUID of the Skill Pack (must be in the available packs list)"
    },
    "path": {
      "type": "string",
      "description": "POSIX relative path within the pack, e.g. reference.md or scripts/search.py"
    }
  },
  "required": ["packId", "path"]
}
```

### 6.2 安全边界（硬性）

| 规则 | 行为 |
| --- | --- |
| **packId 白名单** | 仅 `loadSkillPackRefsForChatTurn` 返回的 id 集合；否则返回 `Error: packId not available in this turn.` |
| **用户隔离** | 查询 `skill_pack_files` 时 **必须** `userId = ctx.userId` AND `packId` |
| **路径规范化** | `normalizeRelativePath(path)`：统一 `/`；拒绝 `..`、`\`、绝对路径、NUL、前导 `/`；拒绝 Windows 盘符 |
| **仅挂载 Pack** | 未在本 Turn 加载的 Pack（未挂载、disabled、超 slice）→ 拒绝 |
| **UTF-8 文本** | 返回 DB 中 `content` 字符串；**不**执行、不 spawn、不 eval |
| **`scripts/`** | **允许 read** 路径与内容；**禁止**任何执行语义 |
| **日志** | `{ event: "skill_read_file", packId, path, ok: boolean }`；**禁止** log 全文（大文件） |
| **泄露防护** | 错误信息 **不**暗示其他用户 Pack 是否存在 |

### 6.3 返回值

| 情况 | 返回（字符串，供 Agent 自我修正） |
| --- | --- |
| 成功 | 文件 `content` 原文 |
| packId 不在白名单 | `Error: packId not available in this turn.` |
| path 非法 | `Error: invalid path.` |
| 文件不存在 | `Error: file not found: {normalizedPath}` |
| DB 异常 | `Error: failed to read file.` |

**不**抛异常中断 Agent 循环（与 MCP tool 错误字符串模式一致）。

### 6.4 Turn 统计（Q13）

- Agent 循环结束后统计 **`read_skill_file` 成功 invoke 次数** → `SkillsTurnUiSnapshot.readFileCount`
- 可选 `readFileSamples`：最多 5 条 `{packName}:{path}`（成功 read）
- 失败 read **不计入** `readFileCount`（设计默认）
- 消息路由 `messages/route.ts` 的 `skillsSafeMessage` / details 块见 `copy-chat-en-zh.md`

### 6.5 0.1.20 预留：`run_skill_script`

**本期禁止注册**。3B 在 `turn-capabilities.ts` 或 `skill/read-tools.ts` 留 **扩展点注释**：

```typescript
// 0.1.20: run_skill_script(packId, path, args?, timeoutMs?) — 沙箱执行 scripts/ 下文件
// MVP 不实现；不得向 createAgent 注册执行类 tool
```

预期 0.1.20 参数：`packId`、`path`（须在 `scripts/` 下）、`args[]`、`timeoutMs`；独立配额与审计表。

---

## 7. 助手 Skills 挂载子资源（不变）

**路由**：`/api/console/assistants/:id/skill-configs`

与 0.1.18 **完全一致**；`skillConfigIds` 元素为 **packId**。

| 方法 | 语义 |
| --- | --- |
| GET | `{ assistantId, skillConfigIds[] }` 字典序 |
| PUT | 整表替换；上限 `SKILL_PACK_MAX_PER_ASSISTANT`（10）；无效 id → 422 |

**列表选项**：GET skill-configs 返回项含 `fileCount` / `hasScripts` 供 UI 展示。

---

## 8. 路径与 frontmatter 工具（服务端内部）

建议在 `src/server/skill/pack-path.ts`、`pack-frontmatter.ts`：

```typescript
/** 归一化 Pack 内相对路径；非法返回 null */
export function normalizePackFilePath(raw: string): string | null;

/** 剥离 SKILL.md YAML frontmatter；解析失败则整文件为 body */
export function stripSkillMdFrontmatter(content: string): { frontmatter: Record<string, string> | null; body: string };

/** 从 frontmatter 提取 name/description（trim、长度截断校验） */
export function extractSkillMetadataFromFrontmatter(fm: Record<string, string>): { name?: string; description?: string };
```

**扩展名白名单（Q2 定稿）**

`.md`, `.txt`, `.json`, `.yaml`, `.yml`, `.csv`, `.py`, `.sh`, `.js`, `.ts`，及 **无扩展名**。

**拒绝**：`.exe`, `.dll`, `.zip`, `.pyc`, `.png`, `.jpg`, `.gif`, `.pdf`, `.wasm` 等（可维护 denylist + 无扩展名 allow）。

---

## 9. `ErrorCode` 扩展（3B）

在 `src/common/enums/http.ts` 追加：

| 枚举值 | HTTP | 用途 |
| --- | --- | --- |
| `SKILL_CONFIG_NOT_FOUND` | 404 | 已有 |
| `SKILL_CONFIG_NAME_CONFLICT` | 409 | 已有 |
| `SKILL_CONFIG_REFERENCED_BY_ASSISTANT` | 409 | 已有 |
| **`SKILL_PACK_FILE_NOT_FOUND`** | 404 | GET/DELETE 单文件不存在 |
| **`SKILL_PACK_FILE_PATH_CONFLICT`** | 409 | PATCH move 目标已存在 |

其余用 `VALIDATION_ERROR` + details。

---

## 10. `api/message.json` key 映射（增量）

### 10.1 Top-level

| ErrorCode | key | en | zh |
| --- | --- | --- | --- |
| `SKILL_PACK_FILE_NOT_FOUND` | `skillPackFileNotFound` | Pack file not found. | 技能包文件不存在 |
| `SKILL_PACK_FILE_PATH_CONFLICT` | `skillPackFilePathConflict` | A file already exists at the target path. | 目标路径已存在文件 |

### 10.2 Validation（`VALIDATION_ERROR`）

| 场景 | key |
| --- | --- |
| 未知字段 content | `validation.skillContentDeprecated` |
| 缺少 SKILL.md | `validation.skillMdRequired` |
| 导入缺 SKILL.md | `validation.skillMdRequiredOnImport` |
| 非法 path | `validation.skillPackInvalidPath` |
| 扩展名拒绝 | `validation.skillPackFileExtensionDenied` |
| 单文件过大 | `validation.skillPackFileTooLarge` |
| Pack 总过大 | `validation.skillPackTotalSizeExceeded` |
| 文件数超限 | `validation.skillPackFileCountExceeded` |
| SKILL.md body 过大 | `validation.skillMdBodyTooLarge` |
| 非 UTF-8 | `validation.skillPackNotUtf8` |
| 禁止删 SKILL.md | `validation.skillMdDeleteForbidden` |

**常量别名**：保留 `SKILL_CONFIG_*` 重导出或新增 `SKILL_PACK_*`（见 `data-models.md`）；message 中 `{max}` 与常量一致。

### 10.3 Turn safeMessage（Q13 增量）

见 `iterations/0.1.19/design/copy-chat-en-zh.md`：

- `turnSafe.skillsMergedWithRead`
- `turnSafe.detail.skillsReadTitle` / `skillsReadLine` / `skillsReadOnlyNote`

---

## 11. 与 MCP API 对照

| 维度 | MCP | Skill Pack |
| --- | --- | --- |
| 前缀 | `/api/console/mcp-configs` | `/api/console/skill-configs` |
| 核心 payload | transport/endpoint | **`skill_pack_files`** |
| 子资源 | test-connection | **files + import** |
| 运行时 | LangChain MCP tools | **`read_skill_file`** + prompt |
| 每助手上限 | 20 | **10** |

---

## 12. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-19 | 3A 初稿：Skill Pack CRUD 演进、files、import、read_skill_file |
