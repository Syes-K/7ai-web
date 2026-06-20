# 规格：Skill Pack 意图路由与 alwaysLoad（version 0.1.20）

**Epic：** P0-A 按需加载 + Turn 挂载/加载/未选用/读取  
**上游：** `prd.md` §5.1、§5.4、§5.5；`user-stories-skill-pack-intent.md`  
**相关代码：**

| 模块 | 路径 | 本期变更 |
| --- | --- | --- |
| Selection 单入口 | `src/server/chat/turn-capabilities.ts` | 新增 `resolveSkillPackSelectionForTurn` |
| Agent | `src/server/chat/langchain-agent.ts` | 传入 `userMessageText` |
| 意图分类 | **新建** `src/server/skill/skill-pack-intent-agent.ts` | 对齐 KB intent |
| Frontmatter | `src/server/skill/pack-frontmatter.ts` | + `alwaysLoad` |
| 实体/DTO | `UserSkillConfig`、console API | + `alwaysLoad` 列 |
| Turn 文案 | `messages/route.ts`、`localize-turn-detail.ts` | 新摘要/details |
| 控制台 | `SkillsClient.tsx` | Switch + Tag |

**参考实现：** `src/server/knowledge-base/knowledge-retrieval-intent-agent.ts`

---

## 1. 挂载 vs 加载（心智模型）

| 阶段 | 时机 | 数据 | 用户可见 |
| --- | --- | --- | --- |
| **挂载 mounted** | 助手配置 | `AssistantSkillBinding` + `enabled` | 控制台助手页；Turn details「已挂载」 |
| **选用 loaded** | 每轮 C1b 前 | 意图路由 + `alwaysLoad` | Turn 摘要「已加载」 |
| **未选用 skipped** | 同上 | mounted − loaded | Turn details「未选用」 |

**工具白名单（read / run）：** 仅 **loaded** Pack id 集合。

---

## 2. 意图路由（skill-pack-intent-agent）

### 2.1 调用时机

在 `getAssistantAgent` 内、**合并 prompt 与注册 tools 之前**：

```text
C1  knowledge_injection（已有）
C1b skills_resolution（本期：先 selection，再 merge/tools/snapshot）
C2  mcp_tools_resolution
```

`skills_resolution` subStep 在 selection 完成后即可标记 `completed`（read/run 计数在 Agent 结束后二次更新 safeMessage/details，沿用 0.1.19 MCP 模式）。

### 2.2 输入

| 字段 | 来源 | 说明 |
| --- | --- | --- |
| `userMessageText` | 本轮用户消息（与 KB 注入同源） | trim 后空 → skipped |
| `mountedPacks` | DB：`UserSkillConfig` where mounted + enabled | 每项含 `id`、`name`、`description`（表字段）、`alwaysLoad` |
| `description` | 表字段 | 截断 ≤ **400** 字符（对齐 KB intent） |

**Q19 MVP：** **不** 读取 `SKILL.md` 正文或摘要入 intent prompt。

### 2.3 输出 JSON（模型）

```json
{
  "selectedIds": ["uuid-1", "uuid-2"],
  "reasons": {
    "uuid-3": "与当前问题无关"
  }
}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `selectedIds` | `string[]` | 本轮应 **加载** 的 Pack id（**不含** alwaysLoad 已单独并入） |
| `reasons` | `Record<string, string>` | 可选；**未选用** Pack 的用户向简短理由（中文优先） |

解析失败 / 超时 / 非法 JSON → 见 §2.5。

### 2.4 选择算法（`resolveSkillPackSelectionForTurn`）

```typescript
type SkillPackSelectionResult = {
  mountedRefs: ChatSkillPackRef[];
  selectedRefs: ChatSkillPackRef[]; // = loaded
  mounted: Array<{ id: string; name: string }>;
  loaded: Array<{ id: string; name: string }>;
  skipped: Array<{ id: string; name: string; reason?: string }>;
  skippedCount: number;
  intentSource: "always_load" | "intent_agent" | "failed_safe" | "skipped";
  loadFailed: boolean;
};

async function resolveSkillPackSelectionForTurn(
  ctx: ChatTurnCapabilityContext,
  userMessageText: string,
): Promise<SkillPackSelectionResult>;
```

**步骤：**

1. `mountedRefs = await loadSkillPackRefsForChatTurn(ctx)`；加载 Pack 行（name、description、alwaysLoad、enabled）。
2. 若 `mountedRefs.length === 0` → 空结果，`intentSource=skipped`。
3. `alwaysIds` = `alwaysLoad === true` 的 id → **无条件** 加入 `selectedIds`。
4. `candidates` = mounted − alwaysIds。
5. 若 `candidates.length === 0` → `intentSource=always_load`（仅 always）。
6. 若 `userMessageText.trim()` 为空 → 非 always **不** 进入 selected；`intentSource=skipped` 或 `always_load`。
7. 否则调用 `decideSkillPackIntent({ userId, userMessageText, packs: candidates })`。
8. `selectedIds = alwaysIds ∪ intent.selectedIds`（intent 返回须过滤 ⊆ candidates）。
9. `skipped = mounted − selected`；reason 来自 intent `reasons` 或默认 i18n 占位（backend 可不填 reason，前端仅显示名）。
10. `loadFailed` 仅当 DB 整类失败（沿用 `skills_load_error`）。

**intentSource 赋值：**

| 情况 | `intentSource` |
| --- | --- |
| 仅 always 命中、无 intent 调用 | `always_load` |
| intent LLM 成功 | `intent_agent` |
| intent 失败（Q2） | `failed_safe`（非 always 不加入） |
| 无 mounted / 空消息且无 always | `skipped` |

### 2.5 失败策略（Q2）

对齐 `decideKnowledgeRetrievalIntent` 的 `failed` 分支：

- **不** keyword fallback
- **不** silent 全量 merge
- 非 `alwaysLoad` Pack **不加载**
- Turn 摘要：`skillsSelectionFailed`（当 `loaded===0` 且存在非 always mounted）
- 日志：`{ module: "skill.intent", intentSource: "failed_safe", ... }`

### 2.6 Intent Agent Prompt 要点

- System：技能包选用分类器；根据用户问题从列表中选 **相关** Pack；只输出 JSON
- Human：Pack 列表行格式 `- id={uuid}; name={name}; description={desc?}`
- Temperature：**0**；tag：`SKILL_PACK_INTENT`
- 超时：backend 3A 建议 **1500ms** 硬超时（对齐 P95 指标）

### 2.7 SKILL.md 合并（仅 selectedRefs）

`buildSkillsMergeResult(ctx, selectedRefs)` 逻辑与 0.1.19 相同；`merged` 返回值改名为 **`loaded`** 写入快照。

单 Pack 缺 SKILL.md → skip 该 Pack（不计入 loaded）；可记入 `skippedCount` 日志，**不进** 用户向 skipped 列表（与 0.1.19 一致）。

---

## 3. alwaysLoad（Q3）

### 3.1 数据模型

| 变更 | 说明 |
| --- | --- |
| `user_skill_configs.alwaysLoad` | `boolean NOT NULL DEFAULT false` |

**权威源：** 表字段。`SKILL.md` frontmatter `alwaysLoad: true|false` 在 **保存 SKILL.md / 导入 zip** 时同步写入表（与 name/description 同策略）。

**元数据 Switch 修改：** PATCH 表字段；**不要求** 用户手改 SKILL.md。

### 3.2 Console API

| 端点 | 变更 |
| --- | --- |
| `GET /api/console/skill-configs` | 列表项 + `alwaysLoad` |
| `GET /api/console/skill-configs/:id` | + `alwaysLoad` |
| `PATCH /api/console/skill-configs/:id` | 可写 `alwaysLoad` |
| 导入 | frontmatter → 表 |

```typescript
type SkillPackListItem = {
  // ...0.1.19 字段
  alwaysLoad: boolean;
};
```

### 3.3 控制台 UX

**列表 ProTable：**

| 列/位置 | 展示 |
| --- | --- |
| `name` 列 secondary | 若 `alwaysLoad`：`Tag color="purple"`「始终加载」 |
| `hasScripts` | 仍显示「含脚本」（文案见 run spec） |

**详情 Drawer 顶栏（桌面）：**

```text
[始终加载 Switch]  label + Tooltip
[启用 Switch]      沿用 0.1.19
```

| 控件 | 规格 |
| --- | --- |
| Switch | `checked={alwaysLoad}`；`onChange` → PATCH（或并入保存全部） |
| 说明 | `form.alwaysLoad.extra`：「每轮对话都会应用此技能包，即使与问题看似无关」 |
| 保存 SKILL.md 后 | 若 frontmatter 含 `alwaysLoad`，Toast 可沿用 `syncedFromFrontmatter` 扩展 |

**状态：**

| 状态 | 表现 |
| --- | --- |
| 默认 false | Switch 关；列表无 Tag |
| true | Switch 开；列表 Tag「始终加载」 |
| 导入 `alwaysLoad: true` | 导入后 Switch 开 |

### 3.4 助手挂载区（US-D1）

`assistants.json` 挂载区 `extra` 增量（见 `copy-console-en-zh.md`）：

- 可挂载多个技能包
- **对话时仅加载与问题相关的包**（除非设为「始终加载」）

交互结构不变（多选 pack id）。

### 3.5 技能包页 Alert（US-D2）

`alert.productScope.description` 增量一句按需加载（见 copy-console）。

---

## 4. langchain-agent 衔接

```typescript
export type GetChatAssistantAgentOptions = {
  userId: string;
  user?: User | null;
  assistantId?: string | null;
  /** 0.1.20：本轮用户消息，供技能包意图路由 */
  userMessageText?: string;
};

export async function getAssistantAgent(options: GetChatAssistantAgentOptions) {
  const capCtx = { userId, user, assistantId };
  const selection = await resolveSkillPackSelectionForTurn(
    capCtx,
    options.userMessageText ?? "",
  );
  const [systemPrompt, toolsRes] = await Promise.all([
    resolveSystemPromptWithSkills(base, capCtx, selection.selectedRefs),
    resolveAllToolsForAgent(capCtx, selection.selectedRefs, selection),
  ]);
  const skillsTurnUi = buildSkillsTurnUiFromSelection(selection, toolsRes);
  // ...
}
```

`resolveAllToolsForAgent` 接收 `selectedRefs`；`readToolEnabled` / `runToolEnabled` = `selectedRefs.length > 0`。

---

## 5. Turn 快照与 UI

### 5.1 `SkillsTurnUiSnapshot`（演进）

```typescript
type SkillsTurnUiSnapshot = {
  assistantMissing: boolean;
  loadFailed?: boolean;
  intentSource?: "always_load" | "intent_agent" | "failed_safe" | "skipped";
  mounted: Array<{ id: string; name: string }>;
  loaded: Array<{ id: string; name: string }>;
  skipped?: Array<{ id: string; name: string; reason?: string }>;
  skippedCount?: number;
  readToolEnabled?: boolean;
  runToolEnabled?: boolean;
  readFileCount?: number;
  readFileSamples?: string[];
  scriptRunCount?: number;
  scriptRunSamples?: string[];
  /** @deprecated 0.1.20+ 用 loaded；历史 Turn 读时映射 */
  merged?: Array<{ id: string; name: string }>;
};
```

### 5.2 `skillsSafeMessage` 分支（替换 0.1.19）

```typescript
function skillsSafeMessage(locale: AppLocale, ui: SkillsTurnUiSnapshot): string {
  const ui = normalizeSkillsTurnUi(ui);
  if (ui.assistantMissing) return t("turnSafe.skillsNoAssistant");
  if (ui.loadFailed) return t("turnSafe.skillsLoadSkipped");
  const mountedCount = ui.mounted.length;
  const loadedCount = ui.loaded.length;
  if (mountedCount === 0) return t("turnSafe.skillsNotMounted"); // 仅隐藏前兜底
  if (loadedCount === 0) {
    if (ui.intentSource === "failed_safe")
      return t("turnSafe.skillsSelectionFailed");
    return t("turnSafe.skillsMountedNotSelected", { mountedCount });
  }
  const readCount = ui.readFileCount ?? 0;
  const runCount = ui.scriptRunCount ?? 0;
  if (readCount > 0 && runCount > 0)
    return t("turnSafe.skillsLoadedWithReadAndRun", { count: loadedCount, readCount, runCount });
  if (readCount > 0)
    return t("turnSafe.skillsLoadedWithRead", { count: loadedCount, readCount });
  if (runCount > 0)
    return t("turnSafe.skillsLoadedWithRun", { count: loadedCount, runCount });
  return t("turnSafe.skillsLoaded", { count: loadedCount });
}
```

### 5.3 `skillsDetailsFromUi`

见 `design-spec.md` §4.4 块顺序。

**assistantMissing / mounted=0：** 沿用 0.1.19 body；mounted=0 时通常 **无 C1b**。

### 5.4 ChatWorkspace 隐藏逻辑

扩展 `shouldHideUnboundSkillsStep`：

- **隐藏：** `skillsNoAssistant`、**`skillsNotMounted`**（mounted=0）
- **不隐藏：** `skillsMountedNotSelected`、`skillsSelectionFailed`、一切 `skillsLoaded*`

新增常量集合（或改为基于快照字段判断，长期更稳）：

```typescript
// 优先：若 step.meta?.skillsMountedCount === 0 → hide（backend 可选传 meta）
// MVP：safeMessage 匹配 skillsNotMounted / skillsNoAssistant
```

### 5.5 localize-turn-detail.ts（Q22）

新增 `DetailKey`：

- `skillsMountedTitle`、`skillsLoadedTitle`、`skillsSkippedTitle`、`skillsScriptRunTitle`
- `skillsSkippedLine`（`· {name} — {reason}`）

Legacy 映射保留：

- `已合并技能包` / `Merged Skill Packs` → **`skillsLoadedTitle`**（历史 Turn 展示兼容）
- `skillsMergedTitle` 别名到 `skillsLoadedTitle`

---

## 6. read_skill_file 白名单变更

`skillPackRefsToReadTools(ctx, selectedRefs, collector)`：

- `allowedIds = selectedRefs`（**非** mounted）
- Tool description 移除「cannot be executed」；改为「Scripts can be run with run_skill_script when loaded.」

---

## 7. 日志

```typescript
{ module: "skill.intent", intentSource, userId, ms, selectedCount, skippedCount }
{ event: "skill_skip", reason: "missing_skill_md" | ... }  // 沿用
{ event: "skills_selection", mounted, loaded, skipped, intentSource }
```

---

## 8. 故事映射

| 故事 | 本节 |
| --- | --- |
| US-A1～A5 | §2、§5.2 |
| US-B1～B2 | §3 |
| US-C1～C4 | §5、`copy-chat-en-zh.md` |
| US-D1～D2 | §3.4、§3.5 |

---

## 9. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-19 | 初稿 |
