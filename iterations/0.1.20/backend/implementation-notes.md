# 实现说明：Skill Pack 增强（version 0.1.20）

关键算法、错误语义、环境变量与日志约定。供 3B 实现与 code review 对照。

---

## 1. `resolveSkillPackSelectionForTurn` 算法

**落点**：`src/server/chat/turn-capabilities.ts`

### 1.1 伪代码

```typescript
async function resolveSkillPackSelectionForTurn(ctx, userMessageText) {
  if (!ctx.assistantId) {
    return emptySelection({ assistantMissing: true, intentSource: "skipped" });
  }

  let mountedRefs: ChatSkillPackRef[];
  try {
    mountedRefs = await loadSkillPackRefsForChatTurn(ctx);
  } catch {
    return emptySelection({ loadFailed: true, intentSource: "skipped" });
  }

  if (mountedRefs.length === 0) {
    return emptySelection({ intentSource: "skipped" });
  }

  const packRows = await loadPackRows(ctx.userId, mountedRefs); // name, description, alwaysLoad, enabled
  const mounted = packRows.map(toUiRef);

  const alwaysIds = packRows.filter((p) => p.alwaysLoad && p.enabled).map((p) => p.id);
  const candidateRows = packRows.filter((p) => !alwaysIds.includes(p.id) && p.enabled);

  let intentSelectedIds: string[] = [];
  let reasons: Record<string, string> = {};
  let intentSource: SkillPackSelectionResult["intentSource"] = "skipped";

  if (candidateRows.length === 0) {
    intentSource = "always_load";
  } else if (!userMessageText.trim()) {
    intentSource = alwaysIds.length > 0 ? "always_load" : "skipped";
  } else {
    const intent = await decideSkillPackIntent({
      userId: ctx.userId,
      userMessageText,
      packs: candidateRows.map(({ id, name, description }) => ({ id, name, description })),
    });
    intentSelectedIds = intent.selectedIds.filter((id) => candidateRows.some((p) => p.id === id));
    reasons = intent.reasons ?? {};
    intentSource = intent.intentSource === "failed_safe" ? "failed_safe" : "intent_agent";
    if (alwaysIds.length > 0 && intentSource === "intent_agent") {
      // 仍标记 intent_agent（always 与 intent 混合）
    } else if (alwaysIds.length > 0 && intentSource === "failed_safe") {
      // 仅 always 加载：对外仍可用 failed_safe（Turn 文案用）
    }
  }

  const selectedIds = [...new Set([...alwaysIds, ...intentSelectedIds])];
  const selectedRefs = selectedIds.map((id) => ({ id }));

  // buildSkillsMergeResult 可能因缺 SKILL.md 减少实际 loaded
  const mergeResult = await buildSkillsMergeResult(ctx, selectedRefs);
  const loaded = mergeResult.merged; // 内部仍叫 merged，对外映射为 loaded

  const selectedSet = new Set(loaded.map((l) => l.id));
  const skipped = mounted
    .filter((m) => !selectedSet.has(m.id))
    .slice(0, 5)
    .map((m) => ({ ...m, reason: reasons[m.id] }));

  return {
    mountedRefs,
    selectedRefs: loaded.map((l) => ({ id: l.id })), // 工具白名单 = 实际 merge 成功者
    mounted,
    loaded,
    skipped,
    skippedCount: mounted.length - loaded.length,
    intentSource: resolveIntentSourceLabel(alwaysIds, intentSource),
    loadFailed: false,
  };
}
```

### 1.2 `intentSource` 赋值规则

| 条件 | `intentSource` |
| --- | --- |
| 无 assistant / 无 mounted | `skipped` |
| 仅 `alwaysLoad` 命中、未调 intent | `always_load` |
| intent LLM 成功 | `intent_agent` |
| intent 失败且存在非 always 候选 | `failed_safe` |
| 有 always + intent 成功 | `intent_agent`（always 不计入模型返回） |

### 1.3 与 `buildSkillsMergeResult` 的衔接

- 意图选中但缺 `SKILL.md` / body 空 / 超长 → **不计入 loaded**（沿用 0.1.19 `skill_skip` 日志）
- **不进** 用户向 skipped 列表（与 0.1.19 一致）
- `selectedRefs` 传给 tools 时应用 **merge 成功后** 的 id 集合，避免 Agent 可读未 merge 的包

### 1.4 `getAssistantAgent` 调用顺序

```text
selection = resolveSkillPackSelectionForTurn(capCtx, userMessageText)
parallel:
  systemPrompt = resolveSystemPromptWithSkills(base, capCtx, selection.selectedRefs)
  toolsRes = resolveAllToolsForAgent(capCtx, selection.selectedRefs, selection)
skillsTurnUi = buildSkillsTurnUiFromSelection(selection, {
  readToolEnabled: selection.selectedRefs.length > 0,
  runToolEnabled: selection.selectedRefs.length > 0,
})
```

**禁止** 三处各自 `loadSkillPackRefsForChatTurn` 全量 merge（0.1.19 根因）。

---

## 2. `skill-pack-intent-agent` 实现要点

**落点**：`src/server/skill/skill-pack-intent-agent.ts`  
**参考**：`src/server/knowledge-base/knowledge-retrieval-intent-agent.ts`

### 2.1 模型调用

```typescript
const model = await getChatRuntimeModel(userId, {
  temperature: 0,
  tags: [SKILL_PACK_INTENT_TAG],
});
```

### 2.2 超时

使用 `Promise.race` 或 AbortSignal：

```typescript
const SKILL_PACK_INTENT_TIMEOUT_MS = 1500; // 常量；对齐 P95 ≤1.5s
```

超时 → `failed_safe`。

### 2.3 System prompt（要点）

- 角色：技能包选用分类器
- 输入：用户问题 + Pack 列表（`- id=…; name=…; description=…`）
- 输出：**仅** JSON `{"selectedIds":["…"],"reasons":{"id":"简短中文"}}`
- **不含** SKILL.md 正文（Q19）

### 2.4 JSON 解析

复用 KB intent 的 `extractJsonObject` 模式；校验：

- `selectedIds` 为 string 数组
- 每个 id ∈ 输入 packs
- `reasons` 可选 object

### 2.5 日志

```json
{
  "module": "skill.intent",
  "intentSource": "intent_agent",
  "userId": "…",
  "ms": 320,
  "selectedCount": 1,
  "skippedCount": 2
}
```

失败：

```json
{
  "module": "skill.intent",
  "intentSource": "failed_safe",
  "userId": "…",
  "ms": 1501,
  "error": "timeout"
}
```

---

## 3. `run_skill_script` 沙箱实现要点

### 3.1 执行器选择

| 扩展名 | 命令 |
| --- | --- |
| `.py` | `python3` + script 绝对路径（或 `process.env.PYTHON_PATH ?? "python3"`） |
| `.sh` | `bash` + script 绝对路径 |

使用 `child_process.spawn`；`stdio: ["ignore", "pipe", "pipe"]`。

### 3.2 工作目录与文件准备

1. 创建 `mkdtemp` 沙箱根
2. 从 DB 读取目标脚本写入 `scripts/{basename}`
3. 可选：将同 Pack `data/**` 只读复制到 `data/`（Q12）
4. `cwd` = 沙箱根或 `workspace/` 子目录
5. 执行完毕 `rm -rf` 沙箱（`finally`）

### 3.3 参数传递（Q13）

- `args[]` 作为 **独立 argv 元素** 传递（`spawn(cmd, [script, ...args])`），**禁止** shell 拼接
- `.sh` 仍用 `bash script.sh arg1`（argv 分离），不用 `bash -c`

### 3.4 超时

```typescript
const timeoutMs = Math.min(
  input.timeoutMs ?? SKILL_SCRIPT_DEFAULT_TIMEOUT_MS,
  SKILL_SCRIPT_MAX_TIMEOUT_MS,
);
```

超时 → `SIGKILL` → 返回 `Error: script timed out…`；**计入** `scriptRunCount`；审计 `exitCode=null`。

### 3.5 网络隔离（MVP）

- 文档化为 **best-effort**：不注入 HTTP_PROXY；子进程 env 最小集
- Linux 可选后续：`unshare --net`（非 MVP 硬依赖）
- 验收标准：外网 curl 失败（US-E2）

### 3.6 输出截断

```typescript
function truncateOutput(s: string, max = SKILL_SCRIPT_OUTPUT_MAX_CHARS): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "…[truncated]";
}
```

---

## 4. 环境变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `SKILL_SCRIPT_MAX_RUNS_PER_TURN` | `5` | 每 Turn spawn 上限 |
| `SKILL_SCRIPT_MAX_RUNS_PER_USER_DAY` | `100` | 每用户日 spawn 上限 |
| `SKILL_SCRIPT_DEFAULT_TIMEOUT_MS` | `30000` | 默认超时 |
| `SKILL_SCRIPT_MAX_TIMEOUT_MS` | `120000` | tool 参数硬顶 |
| `SKILL_PACK_INTENT_TIMEOUT_MS` | `1500` | 意图路由超时 |
| `PYTHON_PATH` | `python3` | 可选；Python 解释器路径 |

读取方式：在 `src/common/constants` 或 `src/server/skill/skill-script-env.ts` 集中 `parseInt(process.env.X, 10)`，非法回退默认。

---

## 5. 配额与审计

### 5.1 Turn 配额

- `SkillScriptRunStatsCollector` 在 `resolveAllToolsForAgent` 创建
- **spawn 前** `if (collector.scriptRunCount >= MAX_PER_TURN) return quota error`
- 配额拒绝：**不** `recordAttempt`；**不** 写审计表

### 5.2 日配额

```sql
SELECT COUNT(*) FROM skill_script_runs
WHERE userId = ? AND createdAt >= ?
```

`startOfDay`：UTC 零点（3B 实现时固定并注释）。

### 5.3 审计写入

```typescript
await repo.save({
  id: uuidv4(),
  userId,
  packId,
  path: normalizedPath,
  exitCode: result.exitCode,
  durationMs: Date.now() - started,
  errorSummary: result.errorSummary ?? null,
});
```

### 5.4 `scriptRunCount` 口径（Q15 定稿）

| 事件 | 计入 |
| --- | --- |
| spawn 后正常结束 | ✓ |
| spawn 后非 0 exit | ✓ |
| 超时 kill | ✓ |
| 配额拒绝 | ✗ |
| invoke 前校验失败 | ✗ |

---

## 6. Tool 错误字符串一览（Agent 层）

| reason | 字符串模式 |
| --- | --- |
| `not_loaded` | `Error: packId not available in this turn.` |
| `invalid_path` | `Error: path must be under scripts/ and end with .py or .sh` |
| `not_found` | `Error: script not found: {path}` |
| `quota_turn` | `Error: script run quota exceeded for this turn (max {n}).` |
| `quota_day` | `Error: daily script run quota exceeded (max {n}).` |
| `timeout` | `Error: script timed out after {ms}ms` |
| `sandbox` | `Error: sandbox execution failed: {reason}` |

read_skill_file 保持 0.1.19 模式；仅白名单缩小。

---

## 7. Turn 文案组装（`messages/route.ts`）

### 7.1 C1b 隐藏

```typescript
function shouldEmitSkillsStep(ui: SkillsTurnUiSnapshot): boolean {
  const n = normalizeSkillsTurnUi(ui);
  if (n.assistantMissing || n.loadFailed) return true;
  return (n.mounted?.length ?? 0) > 0;
}
```

### 7.2 `onAgentPrepared` 分支

```typescript
if (shouldEmitSkillsStep(skillsTurnUi)) {
  turnState.updateStep("C1b", "completed", {
    safeMessage: skillsSafeMessage(locale, skillsTurnUi),
    details: skillsDetailsFromUi(locale, skillsTurnUi),
  });
  await emitTurnDelta("C1b", "completed");
}
```

### 7.3 结构化日志（skills selection）

```json
{
  "event": "skills_selection",
  "userId": "…",
  "assistantId": "…",
  "mounted": 2,
  "loaded": 1,
  "skipped": 1,
  "intentSource": "intent_agent"
}
```

---

## 8. `alwaysLoad` 同步实现

### 8.1 `syncPackMetadataFromSkillMd` 扩展

```typescript
const always = parseAlwaysLoadFromFrontmatter(frontmatter);
if (always !== undefined) pack.alwaysLoad = always;
```

### 8.2 导入事务

`importPackTransaction` 在 INSERT `UserSkillConfig` 时：

```typescript
alwaysLoad: parseAlwaysLoadFromFrontmatter(fm) ?? false,
```

### 8.3 PATCH API

直接 `row.alwaysLoad = parseBoolean(body.alwaysLoad, row.alwaysLoad)`；**不回写** SKILL.md。

---

## 9. 日志事件索引

| event / module | 场景 |
| --- | --- |
| `skill.intent` | 意图路由成功/失败 |
| `skills_selection` | 单轮 selection 汇总 |
| `skill_skip` | 缺 SKILL.md 等（沿用） |
| `skill_read_file` | read tool（沿用） |
| `skill_script_run` | spawn 完成 |
| `skill_script_run_denied` | 配额/白名单/路径拒绝 |

---

## 10. 3B 实现完成说明

### 10.1 主要代码落点

| 模块 | 路径 |
| --- | --- |
| 意图路由 | `src/server/skill/skill-pack-intent-agent.ts` |
| 单轮选用 | `src/server/chat/turn-capabilities.ts` → `resolveSkillPackSelectionForTurn` |
| run 沙箱 | `src/server/skill/skill-script-sandbox.ts` |
| run tool | `src/server/skill/run-skill-script-tool.ts` |
| 日配额 | `src/server/skill/skill-script-quota.ts` |
| 审计实体 | `src/server/db/entities/SkillScriptRun.ts` |
| Turn 文案 | `src/app/api/chat/conversations/[conversationId]/messages/route.ts` |
| legacy 快照 | `src/common/utils/normalize-skills-turn-ui.ts` |

### 10.2 自测步骤（greeting-test-skill）

1. **导入夹具**：Console 导入 `iterations/0.1.19/fixtures/greeting-test-skill.zip`（或文件夹）。
2. **挂载助手**：将 Pack 绑定到测试助手；新建会话。
3. **意图未命中**：发送「天津天气」→ C1b 显示「已挂载 N，本轮未选用」；回复不含 `[Skill Pack 测试]`。
4. **意图命中**：发送「请用技能包测试打个招呼」→ C1b loaded=1；回复含 `[Skill Pack 测试]` 且问候来自 `greetings.md`。
5. **alwaysLoad**：Console PATCH `alwaysLoad=true` 后，再发「天津天气」→ 问候包仍在 loaded。
6. **run 脚本**（可选）：发「请运行 hello.py 并告诉我输出」→ C1b 含 run 统计；`skill_script_runs` 表有记录。
7. **legacy**：打开 0.1.19 历史 Turn（仅 `merged` 字段）→ 前端/详情不崩溃。

### 10.4 ui-ux-pro-max 联调

1. 导入 `.cursor/skills/ui-ux-pro-max`（zip，排除 `__pycache__`）。
2. 挂载助手；发「黑科技 UI 风格建议」类问题。
3. 期望：`intent_agent`，loaded=1，`scripts/search.py` exit 0（需沙箱复制整个 `scripts/**`）。

### 10.5 额外夹具

见 [../fixtures/README.md](../fixtures/README.md)：`multi-script-loop-test-skill`、`script-error-test-skill`。

---

## 11. 结项补丁（2026-06-20）

| 变更 | 文件 |
| --- | --- |
| 意图超时默认 15s | `skill-script-env.ts`、`constants/index.ts`、`.env.example` |
| 沙箱复制全部 `scripts/**` | `skill-script-sandbox.ts` |

详见 [../deviations.md](../deviations.md)。

---

## 12. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-19 | 3A：selection 算法、沙箱、配额、环境变量 |
| 2026-06-19 | 3B：P0-A 意图路由 + P0-B run 沙箱代码落地 |
| 2026-06-20 | 结项：超时 15s、scripts/** 沙箱、夹具与 ui-ux 联调说明 |
