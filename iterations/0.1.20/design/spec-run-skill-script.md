# 规格：run_skill_script 沙箱与 Turn/控制台展示（version 0.1.20）

**Epic：** P0-B 脚本执行 + Turn run 展示 + 控制台「含脚本」升级  
**上游：** `prd.md` §5.3；`user-stories-skill-pack-script-run.md`  
**依赖：** P0-A **loaded** 白名单（`spec-skill-pack-intent-routing.md`）  
**相关代码：**

| 模块 | 路径 | 本期变更 |
| --- | --- | --- |
| Run tool | **新建** `src/server/skill/run-skill-script-tool.ts` | 沙箱 + 配额 |
| Turn 能力 | `src/server/chat/turn-capabilities.ts` | 注册 run tool；`applySkillScriptRunStatsToTurnUi` |
| Read tool | `src/server/skill/read-skill-file-tool.ts` | description 区分 read vs run |
| 控制台 | `SkillsClient.tsx` | 脚本文案、Alert、Help Drawer |
| 常量 | `src/common/constants` | timeout、配额上限 |

**0.1.19 替换：** `turn-capabilities.ts` 底部 TODO；控制台 `alert.scriptsReadOnly.*`

---

## 1. 工具契约（产品层 → backend 3A 细化）

### 1.1 Tool 定义

| 属性 | 值 |
| --- | --- |
| name | **`run_skill_script`** |
| 参数 | 见 §1.2 |
| 注册条件 | `selectedRefs.length > 0` 且 Pack 含 `scripts/` 下可执行文件 **或** 始终注册（invoke 时校验路径）— **建议始终注册** 1 个全局 tool（与 read 对齐），白名单在 invoke |

### 1.2 参数 schema

```typescript
z.object({
  packId: z.string().uuid(),
  path: z.string().describe("Must start with scripts/"),
  args: z.array(z.string()).optional().describe("CLI arguments"),
  timeoutMs: z.number().int().min(1000).max(120000).optional(),
});
```

| 参数 | 规则 |
| --- | --- |
| `packId` | 须在本轮 **loaded** 白名单 |
| `path` | **必须** `scripts/` 前缀；`normalizePackFilePath`；扩展名 **`.py`** 或 **`.sh`** |
| `args` | 字符串数组；实现负责 shell 转义（Q13） |
| `timeoutMs` | 可选；默认 **30000**；硬上限 **120000**（Q9） |

### 1.3 返回值（Agent 可读字符串）

**成功：**

```text
exitCode: 0
stdout:
{stdout text, truncated if huge}
stderr:
{stderr text or empty}
```

**失败（结构化错误，供 Agent 自我修正）：**

| 场景 | 返回示例 |
| --- | --- |
| pack 未加载 | `Error: packId not available in this turn.` |
| 路径非法 | `Error: path must be under scripts/ and end with .py or .sh` |
| 文件不存在 | `Error: script not found: scripts/foo.py` |
| 超时 | `Error: script timed out after {timeoutMs}ms` |
| 配额 Turn | `Error: script run quota exceeded for this turn (max 5).` |
| 配额日 | `Error: daily script run quota exceeded (max 100).` |
| 沙箱拒绝 | `Error: sandbox execution failed: {reason}` |

stdout/stderr 单段建议上限 **32_000** 字符（与 SKILL body 对齐），超出截断 + `…[truncated]`。

### 1.4 Tool description（英文，对齐 MCP）

```text
Run a script from a loaded Skill Pack in a sandboxed subprocess.
Only scripts under scripts/ with .py or .sh extensions.
No outbound network. Loaded packs only: {id}: {name}, ...
Use read_skill_file to view source without executing.
```

---

## 2. 沙箱边界（Q6–Q8、Q12）

### 2.1 技术选型（Q6 MVP）

**子进程 + 资源限制**（非容器）：

| 维度 | 规格 |
| --- | --- |
| Python | `python3 {scriptPath}`（或 `sys.executable`） |
| Bash | `bash {scriptPath}` |
| cwd | Pack **沙箱根**临时目录 |
| 文件可见性 | 同 Pack 内 `data/`、`reference.md` 等 **只读 bind** 到沙箱；**不可**读其他 Pack 或绝对系统路径 |
| 网络 | **默认禁止出站**（Q8）；本期不可配置放行 |
| 写入 | 仅临时目录；禁止写 Pack DB 内容回写 |
| 并发 | 单 Turn 内顺序执行即可；全局并发由配额限制 |

### 2.2 超时（Q9）

| 项 | 值 |
| --- | --- |
| 默认 `timeoutMs` | 30000 |
| 硬上限 | 120000 |
| 超时行为 | kill 子进程；返回超时错误；**计入** `scriptRunCount`（Q15） |

### 2.3 配额（Q10–Q11）

| 配额 | 默认 | 环境变量 |
| --- | --- | --- |
| 每 Turn / 用户 | **5** | `SKILL_SCRIPT_MAX_RUNS_PER_TURN`（建议） |
| 每用户 / 日 | **100** | `SKILL_SCRIPT_MAX_RUNS_PER_USER_DAY` |

计数时机：**tool invoke 进入执行前** 检查；拒绝则不 spawn。

### 2.4 审计（Q14）

表 `skill_script_runs`（可选但建议 MVP 实现）：

| 列 | 类型 |
| --- | --- |
| id | uuid |
| userId | string |
| packId | string |
| path | string |
| exitCode | int nullable |
| durationMs | int |
| errorSummary | string nullable |
| createdAt | timestamp |

保留 **90** 天。UI 面板 P1，本期无控制台列表。

### 2.5 run 失败计入 Turn（Q15）

- 每次 **invoke 到达 run tool**（含失败、超时、配额拒绝是否计入 — **建议仅实际 spawn 的计入**；配额拒绝不计 `scriptRunCount`）
- details 展示 `exitCode`；失败时 exitCode 非 0 或 `—`

**设计定稿：** `scriptRunCount` = **spawn 尝试次数**（成功 + 失败 + 超时）；配额拒绝 **不计**。

---

## 3. 与 read_skill_file 的关系（US-E5）

| 操作 | Tool | 路径 | 结果 |
| --- | --- | --- | --- |
| 读源码 | `read_skill_file` | 任意允许文本路径含 `scripts/foo.py` | 文件文本 |
| 执行 | `run_skill_script` | **仅** `scripts/foo.py` 或 `.sh` | stdout/stderr + exitCode |

同一 Turn：可先 read 再 run；read 白名单 = loaded；run 白名单 = loaded。

---

## 4. Turn 展示（US-E4、E8）

### 4.1 快照字段

```typescript
scriptRunCount?: number;
scriptRunSamples?: string[]; // ≤5, "packName:path:exitCode"
```

`applySkillScriptRunStatsToTurnUi(base, collector)` 对齐 read collector。

### 4.2 摘要

见 `design-spec.md` §4.3；用户向 **无** `run_skill_script` 字样。

示例 zh：`已加载 1 个；读取 2 个文件；运行 1 个脚本`

### 4.3 Details 块

```typescript
{
  title: t("turnSafe.detail.skillsScriptRunTitle"), // 「已运行脚本」
  content: samples.map(s => formatScriptRunLine(s)).join("\n"),
}
// 行格式：· {packName}：{path}（退出码 {exitCode}）
```

**移除：** read samples 含 `scripts/` 时追加的 `skillsReadOnlyNote`。

### 4.4 ChatWorkspace

- 允许展示「运行 N 个脚本」摘要
- **禁止** 0.1.19 的「脚本仅以文本读取」脚注

---

## 5. 控制台 UX（US-E6）

### 5.1 列表「含脚本」Tag

| 0.1.19 | 0.1.20 |
| --- | --- |
| Tooltip「仅可读源码，不会执行」 | Tooltip「可在对话中按技能说明运行（沙箱）」 |
| Tag 旁无 secondary | 可选 secondary「沙箱」 |

### 5.2 Pack 详情 Alert（替换 `alert.scriptsReadOnly`）

**移除** 金色 Alert「此包内的脚本为只读」。

**新增** `alert.scriptsSandbox`（info 级别，closable）：

| 项 | 内容 |
| --- | --- |
| message | 此包包含可运行脚本 |
| description | Agent 可在对话中通过技能说明 **在沙箱中运行** `scripts/` 下脚本。默认 **无出站网络**；受超时与次数限制。 |

### 5.3 文件树 `scripts/*` 节点

| 0.1.19 | 0.1.20 |
| --- | --- |
| Badge「只读」 | Badge「可运行」或 icon `PlayCircleOutlined` muted |
| Tooltip 只读 | Tooltip「可在对话沙箱中运行」 |

### 5.4 Help Drawer `help.scripts`

Rich text 结构：

1. **读取 vs 运行**：`read_skill_file` 看源码；`run_skill_script` 执行（用户向不写 tool 名，用「阅读文件」「运行脚本」）
2. **安全边界**：无网络、仅 `scripts/`、py/sh、超时默认 30s
3. **配额**：每轮最多 5 次、每日 100 次（用户向简述）
4. **示例**：ui-ux-pro-max `scripts/search.py`；greeting-test `scripts/hello.py`

### 5.5 产品页 Alert 增量

`alert.productScope.description`：去掉「当前版本不执行脚本」；改为「相关对话中可按技能说明在沙箱运行脚本」。

---

## 6. 测试夹具（implementation 阶段，非设计代码）

| 夹具 | 验收 |
| --- | --- |
| `iterations/0.1.19/fixtures/greeting-test-skill/` | 更新 SKILL.md：允许 run `scripts/hello.py` |
| `.cursor/skills/ui-ux-pro-max/` | 相关 UI 问题 → `scripts/search.py` |

---

## 7. 常量建议（`src/common/constants`）

```typescript
export const SKILL_SCRIPT_DEFAULT_TIMEOUT_MS = 30_000;
export const SKILL_SCRIPT_MAX_TIMEOUT_MS = 120_000;
export const SKILL_SCRIPT_MAX_RUNS_PER_TURN = 5;
export const SKILL_SCRIPT_MAX_RUNS_PER_USER_DAY = 100;
export const SKILL_SCRIPT_OUTPUT_MAX_CHARS = 32_000;
export const RUN_SKILL_SCRIPT_TOOL_NAME = "run_skill_script";
```

---

## 8. 日志

```typescript
{ event: "skill_script_run", userId, packId, path, exitCode, durationMs, ok: boolean }
{ event: "skill_script_run_denied", reason: "quota_turn" | "quota_day" | "not_loaded" | ... }
```

---

## 9. 故事映射

| 故事 | 本节 |
| --- | --- |
| US-E1 | §1 |
| US-E2 | §2 |
| US-E3 | §2.3、§2.4 |
| US-E4、E8 | §4 |
| US-E5 | §3 |
| US-E6 | §5 |
| US-E7 | §1.2 白名单 |
| US-E9 | §6 |

---

## 10. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-19 | 初稿 |
