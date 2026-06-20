# API 规格：Skill Pack 增强（version 0.1.20）

本文档为 **阶段 3A** 接口契约，在 `0.1.19` 基础上 **增量演进**。风格对齐：`withApiWrapper`、`getRequestUserContext`、`jsonError`、`ErrorCode` / `HttpStatus`、`resolveRequestLocale` + `tApiMessage`。

**本期无新增 Chat REST**；对话侧变更体现在 Turn SSE 快照、C1b 步骤语义与 Agent 内部 tools。

---

## 1. 变更摘要

| 域 | 0.1.19 | 0.1.20 |
| --- | --- | --- |
| Console CRUD | 无 `alwaysLoad` | 列表/详情/PATCH **读写 `alwaysLoad`** |
| 导入 / 保存 SKILL.md | frontmatter → name/description | + **alwaysLoad** 同步至表 |
| Chat REST | 不变 | 不变 |
| Turn SSE C1b | `merged` 语义 | `mounted` / `loaded` / `skipped` / read / run |
| Agent tools | `read_skill_file`（mounted 白名单） | read + **`run_skill_script`**（**loaded** 白名单） |

---

## 2. Console API — `alwaysLoad`

**路由前缀不变**：`/api/console/skill-configs`

### 2.1 `GET /api/console/skill-configs`

**响应 `items[]` 增量字段**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `alwaysLoad` | `boolean` | 默认 `false` |

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "问候测试包",
      "description": "…",
      "enabled": true,
      "alwaysLoad": false,
      "fileCount": 3,
      "hasScripts": true,
      "createdAt": "…",
      "updatedAt": "…",
      "referencedAssistantCount": 1
    }
  ]
}
```

### 2.2 `GET /api/console/skill-configs/:id`

`item` 同列表项，含 `alwaysLoad`。

### 2.3 `PATCH /api/console/skill-configs/:id`

**请求体增量**

```json
{
  "alwaysLoad": true
}
```

| 字段 | 校验 |
| --- | --- |
| `alwaysLoad` | 可选 boolean；`parseBoolean`；默认保持原值 |

**行为**：仅更新表字段；**不**修改 `SKILL.md` frontmatter（与 name/description 元数据 Switch 策略一致，Q3）。

**响应 `200`**：`{ "item": { …, "alwaysLoad": true } }`

### 2.4 `POST /api/console/skill-configs`（新建）

- 新建 Pack：`alwaysLoad` 默认 **`false`**（可不暴露在 POST body；若暴露则可选 boolean）。
- 默认 `SKILL.md` 模板 **可不** 含 `alwaysLoad` 键。

### 2.5 `POST /api/console/skill-configs/import`

**行为增量**

1. 解析 zip/文件夹内 `SKILL.md` frontmatter
2. `alwaysLoad: true|false` → 写入 `user_skill_configs.alwaysLoad`
3. 无该键 → `false`

**响应 `item.alwaysLoad`** 反映导入结果。

### 2.6 `PUT/PATCH .../files/...`（保存 SKILL.md）

沿用 `syncPackMetadataFromSkillMd`；扩展同步 `alwaysLoad`：

| frontmatter | 表字段 |
| --- | --- |
| `alwaysLoad: true` | `alwaysLoad=true` |
| `alwaysLoad: false` | `alwaysLoad=false` |
| 缺省 | **不覆盖**表字段（与 name 缺省策略区分：alwaysLoad 缺省表示「未声明」） |

> **3B 定稿**：若 frontmatter 显式 `alwaysLoad`，覆盖表；否则 PATCH 过的表值保留。

### 2.7 助手子资源

`GET/PUT /api/console/assistants/:id/skill-configs` **不变**（绑定 pack id 列表）；`alwaysLoad` 由 Pack 详情维护，助手 API 不重复暴露。

---

## 3. Chat API — Turn SSE 与 C1b

**路由不变**：`POST /api/chat/conversations/:conversationId/messages`（stream / 非 stream）

### 3.1 管道顺序（不变）

```text
C1  knowledge_injection
C1b skills_resolution   ← 本期语义升级
C2  mcp_tools_resolution
D1  assistant_generation
```

### 3.2 `userMessageText` 传递链（新增）

| 环节 | 变更 |
| --- | --- |
| `messages/route.ts` | 已有 `content` → `prepareModelInputForPostMessage({ userMessageText: content })` |
| `streamAssistantReply` / `invokeAssistantReply` | 新增可选 `userMessageText` 传入 `getAssistantAgent` |
| `getAssistantAgent` | `resolveSkillPackSelectionForTurn(capCtx, userMessageText)` |

**3B 必须**：`assistant.ts` 的 `AssistantRuntimeOptions` 增加 `userMessageText?: string`，路由层传入本轮 `content`。

### 3.3 C1b 步骤 — `safeMessage` 分支

**函数**：`skillsSafeMessage(locale, ui)` — **重写**（`messages/route.ts`）

须先 `normalizeSkillsTurnUi(ui)`。

| 条件 | i18n key | 参数 |
| --- | --- | --- |
| `assistantMissing` | `turnSafe.skillsNoAssistant` | — |
| `loadFailed` | `turnSafe.skillsLoadSkipped` | — |
| `mounted.length === 0` | `turnSafe.skillsNotMounted` | 兜底（通常隐藏步骤） |
| `loaded.length === 0` && `intentSource === failed_safe` | `turnSafe.skillsSelectionFailed` | — |
| `loaded.length === 0` | `turnSafe.skillsMountedNotSelected` | `{ mountedCount }` |
| `loaded > 0`, read=0, run=0 | `turnSafe.skillsLoaded` | `{ count: loadedCount }` |
| + read | `turnSafe.skillsLoadedWithRead` | `{ count, readCount }` |
| + run | `turnSafe.skillsLoadedWithRun` | `{ count, runCount }` |
| + read + run | `turnSafe.skillsLoadedWithReadAndRun` | `{ count, readCount, runCount }` |

**禁止**用户向字符串含：`system prompt`、`read_skill_file`、`run_skill_script`、`Merged ... into`。

### 3.4 C1b 步骤 — `details` 块

**函数**：`skillsDetailsFromUi(locale, ui)` — **重写**

| 顺序 | key | 条件 | 内容 |
| --- | --- | --- | --- |
| 1 | `skillsMountedTitle` | `mounted.length > 0` | `skillsLoadedNameLine` × N |
| 2 | `skillsLoadedTitle` | `loaded.length > 0` | 同上 |
| 3 | `skillsSkippedTitle` | `skipped.length > 0` | `skillsSkippedLine` / `skillsSkippedLineNoReason`，**最多 5 条** |
| 4 | `skillsReadTitle` | `readFileCount > 0` | `skillsReadLine` |
| 5 | `skillsScriptRunTitle` | `scriptRunCount > 0` | `skillsScriptRunLine` |

**移除**：read `scripts/` 时追加 `skillsReadOnlyNote`。

### 3.5 C1b 隐藏逻辑（Q21）

`messages/route.ts` 在 `onAgentPrepared` **之前**或组装步骤时：

```typescript
function shouldEmitSkillsStep(ui: SkillsTurnUiSnapshot): boolean {
  const n = normalizeSkillsTurnUi(ui);
  if (n.assistantMissing || n.loadFailed) return true;
  return n.mounted.length > 0;
}
```

- `false` → **不** `updateStep("C1b", …)` / **不** `emitTurnDelta("C1b")`
- 与 MCP「无挂载隐藏」对齐

### 3.6 Agent 完成后二次更新

沿用 0.1.19 模式：D1 完成后用 `skillsUiForTurn`（含 read/run 统计）再次 `updateStep("C1b")`。

`assistant.ts` 扩展：

```typescript
const finalSkillsUi = applySkillScriptRunStatsToTurnUi(
  applySkillReadStatsToTurnUi(skillsTurnUi, skillsReadCollector),
  skillsRunCollector,
);
```

### 3.7 SSE 事件结构（不变）

| 事件 | 相关字段 |
| --- | --- |
| `turn_started` | `steps` 含 C1b `pending` |
| `turn_delta` | `step.stepKey === "C1b"` 时 `safeMessage` / `details` 更新 |
| `assistant_done` | 最终 `stepsSnapshotJson` 已含 read/run 统计 |

**不新增** SSE 事件类型；skills 结构化数据通过 C1b `details` 与持久化 snapshot 表达。

### 3.8 Turn 持久化

`ChatTurn.stepsSnapshotJson` 内 C1b 步骤：

- `safeMessage`：按请求 locale 组装（历史消息切换语言时，前端可用 `localize-turn-detail.ts` + 快照字段重建）
- **建议**（可选 3B）：在 step `reasonTag` 或内部 meta 存 `skillsSnapshot` JSON 片段供前端精确渲染——**非 MVP 必须**；默认靠 details 文本块

---

## 4. Agent Tool：`read_skill_file`（演进）

**名称不变**；**白名单变更**。

| 维度 | 0.1.19 | 0.1.20 |
| --- | --- | --- |
| 注册条件 | `mountedRefs.length > 0` | `selectedRefs.length > 0`（**loaded**） |
| `allowedIds` | mounted pack ids | **loaded** pack ids |
| description | 「Scripts are read-only…」 | 「Scripts can be run with run_skill_script when loaded.」 |

### 4.1 参数 schema（不变）

```typescript
z.object({
  packId: z.string().uuid(),
  path: z.string(), // e.g. reference.md, scripts/search.py
});
```

### 4.2 错误返回（不变）

| 场景 | 返回 |
| --- | --- |
| pack 未 loaded | `Error: packId not available in this turn.` |
| 非法路径 | `Error: invalid path.` |
| 文件不存在 | `Error: file not found: {path}` |

### 4.3 统计

`SkillReadStatsCollector` 不变；仅白名单缩小后，未 loaded Pack 的 read 不再可能成功。

---

## 5. Agent Tool：`run_skill_script`（新建）

**模块**：`src/server/skill/run-skill-script-tool.ts`

### 5.1 注册策略

与 `read_skill_file` 对齐：**始终注册 1 个全局 tool**（当 `selectedRefs.length > 0`），白名单在 invoke 内校验。

```typescript
export const RUN_SKILL_SCRIPT_TOOL_NAME = "run_skill_script";
```

### 5.2 参数 schema

```typescript
z.object({
  packId: z.string().uuid().describe("UUID of a loaded Skill Pack"),
  path: z.string().describe("Must start with scripts/ and end with .py or .sh"),
  args: z.array(z.string()).optional().describe("CLI arguments passed to the script"),
  timeoutMs: z
    .number()
    .int()
    .min(1000)
    .max(SKILL_SCRIPT_MAX_TIMEOUT_MS)
    .optional()
    .describe("Execution timeout in ms; default 30000, max 120000"),
});
```

### 5.3 前置校验（invoke 顺序）

1. `packId ∈ loadedIds`
2. `normalizePackFilePath(path)` 成功且 `path.startsWith("scripts/")`
3. 扩展名 `.py` 或 `.sh`
4. DB 存在 `skill_pack_files` 行
5. Turn 配额未超限（`SKILL_SCRIPT_MAX_RUNS_PER_TURN`）
6. 日配额未超限（`SKILL_SCRIPT_MAX_RUNS_PER_USER_DAY`）
7. 通过后 **spawn** 子进程

### 5.4 返回值（Agent 可读字符串）

**成功**

```text
exitCode: 0
stdout:
{stdout}
stderr:
{stderr or empty}
```

**失败**

| 场景 | 返回前缀 |
| --- | --- |
| pack 未 loaded | `Error: packId not available in this turn.` |
| 路径非法 | `Error: path must be under scripts/ and end with .py or .sh` |
| 文件不存在 | `Error: script not found: {path}` |
| Turn 配额 | `Error: script run quota exceeded for this turn (max 5).` |
| 日配额 | `Error: daily script run quota exceeded (max 100).` |
| 超时 | `Error: script timed out after {timeoutMs}ms` |
| 沙箱失败 | `Error: sandbox execution failed: {reason}` |

stdout/stderr 各段上限 `SKILL_SCRIPT_OUTPUT_MAX_CHARS`（32_000），超出追加 `…[truncated]`。

### 5.5 Tool description（英文）

```text
Run a script from a loaded Skill Pack in a sandboxed subprocess.
Only scripts under scripts/ with .py or .sh extensions.
No outbound network. Loaded packs only: {id}: {name}, ...
Use read_skill_file to view source without executing.
```

### 5.6 统计 collector

```typescript
export class SkillScriptRunStatsCollector {
  scriptRunCount = 0;
  scriptRunSamples: string[] = [];

  /** 仅 spawn 尝试计入（含失败 exitCode；配额拒绝不计） */
  recordAttempt(packName: string, path: string, exitCode: number | null): void;
}
```

`scriptRunSamples` 格式：`packName:path:exitCode`（`exitCode` 为 null 时用 `-`）。

---

## 6. 意图路由（内部 API，非 REST）

**模块**：`src/server/skill/skill-pack-intent-agent.ts`

### 6.1 入口

```typescript
export async function decideSkillPackIntent(options: {
  userId: string;
  userMessageText: string;
  packs: Array<{ id: string; name: string; description: string | null }>;
}): Promise<SkillPackIntentResult>;
```

### 6.2 输出

```typescript
export type SkillPackIntentResult = {
  selectedIds: string[];
  reasons: Record<string, string>;
  intentSource: "intent_agent" | "failed_safe" | "skipped";
};
```

### 6.3 模型 JSON 契约

```json
{
  "selectedIds": ["uuid-1"],
  "reasons": {
    "uuid-2": "与当前问题无关"
  }
}
```

| 字段 | 规则 |
| --- | --- |
| `selectedIds` | 须为 `packs` 子集；不含 `alwaysLoad` 已单独选中的 id |
| `reasons` | 可选；未选用 Pack 的简短中文理由 |

### 6.4 失败策略（Q2）

- 超时（建议 **1500ms**）、非法 JSON、模型异常 → `intentSource=failed_safe`，`selectedIds=[]`
- **不** keyword fallback；**不** silent 全量 merge

### 6.5 Selection 单入口

```typescript
export async function resolveSkillPackSelectionForTurn(
  ctx: ChatTurnCapabilityContext,
  userMessageText: string,
): Promise<SkillPackSelectionResult>;
```

见 [implementation-notes.md](./implementation-notes.md) §1。

---

## 7. i18n keys（backend 引用清单）

**文件**：`messages/{en,zh}/api/message.json`（`turnSafe.*`）

| Key | 用途 |
| --- | --- |
| `skillsLoaded` | loaded>0 基础摘要 |
| `skillsLoadedWithRead` | + read |
| `skillsLoadedWithRun` | + run |
| `skillsLoadedWithReadAndRun` | 组合 |
| `skillsMountedNotSelected` | mounted>0, loaded=0 |
| `skillsSelectionFailed` | failed_safe |
| `turnSafe.detail.skillsMountedTitle` | details 块 |
| `turnSafe.detail.skillsLoadedTitle` | … |
| `turnSafe.detail.skillsSkippedTitle` | … |
| `turnSafe.detail.skillsScriptRunTitle` | … |

完整中英文见 `iterations/0.1.20/design/copy-chat-en-zh.md`。

**Legacy**：保留 `skillsMerged` / `skillsMergedWithRead` key 值改为用户向文案（无开发术语）。

---

## 8. 错误码

本期 **无新增** `ErrorCode` 枚举（Console PATCH `alwaysLoad` 走现有 `VALIDATION_ERROR`）。

| 场景 | Code |
| --- | --- |
| 未登录 | `UNAUTHORIZED` |
| Pack 不存在 | `SKILL_CONFIG_NOT_FOUND` |
| PATCH 校验失败 | `VALIDATION_ERROR` |

Tool 层错误以 **字符串** 返回 Agent，不走 HTTP 错误码。

---

## 9. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-19 | 3A：alwaysLoad REST、Turn SSE、read/run tool 契约、intent 内部 API |
