# 规格：对话 — Agent 运行时 Skill Pack 与 Turn 步骤（version 0.1.19）

**相关代码：**

| 模块 | 路径 | 本期变更 |
| --- | --- | --- |
| Skills 加载 | `src/server/chat/turn-capabilities.ts` | 读 `SKILL.md`；注册 `read_skill_file` |
| Agent 构建 | `src/server/chat/langchain-agent.ts` | tools 合并 Skill + MCP |
| Turn 快照 | `src/server/chat/turn-runtime.ts` | snapshot 含 read 计数 |
| Turn UI | `src/components/chat/ChatWorkspace.tsx` | details 展示 read 次数 |
| 消息路由 | `src/app/api/chat/conversations/[conversationId]/messages/route.ts` | 收集 read 统计 |

**前置规格：** `iterations/0.1.18/design/spec-chat-agent-skills.md`（单 `content` 版，**逻辑替换**）

---

## 1. 触发条件与边界

| 条件 | system prompt | `read_skill_file` | Turn 步 |
| --- | --- | --- | --- |
| 无 `assistantId` | 不合并 | **不注册** | skipped / 隐藏 |
| 无挂载 / 全 disabled | 不合并 | 不注册 | 隐藏 |
| 有 N 个有效 Pack | 合并 N 块 SKILL.md 正文 | **注册 1 个** read tool（全局，白名单多 pack） | 展示合并 + read 计数 |
| 单 Pack 缺 SKILL.md | 跳过该 Pack | 白名单仍含该 id 但 read 其他 path 可用；缺 SKILL 的 skip 不影响其他 Pack | 合并数减 1 |
| DB 整类失败 | 基础 prompt | 不注册 Skill tools | `skillsLoadSkipped` |

**与 MCP / 知识库：** 三路并行独立；Skill **不再**仅影响 prompt。

---

## 2. 加载链路

```
getAssistantAgent(ctx)
  ├─ resolveChatAssistantSystemPrompt(ctx)           → baseSystemPrompt
  ├─ resolveSystemPromptWithSkills(base, ctx)
  │    ├─ loadSkillPackRefsForChatTurn(ctx)          → ChatSkillPackRef[]
  │    └─ skillRefsToExtraSystemText(ctx, refs)      → 读 SKILL.md，剥离 frontmatter
  ├─ resolveAllToolsForAgent(ctx)
  │    ├─ loadToolsForChatTurn (native，空)
  │    ├─ skillPackRefsToReadTools(ctx, refs)        → [read_skill_file]  ← 新增
  │    └─ mcpBindingsToLangChainTools(...)           → MCP tools
  └─ createAgent({ systemPrompt: merged, tools: [...all] })
```

**禁止：** 在路由层重复拼接 Skills 或单独注册 read tool。

---

## 3. System prompt 合并（替代 0.1.18 content）

### 3.1 `buildSkillsMergeResult` 改造

对每个有效 ref（按 `skillConfigId` 字典序）：

1. 加载 `SkillPackFile` where `path = 'SKILL.md'`
2. 若缺失或正文（去 frontmatter 后）为空 → **log `skill_skip` reason=`missing_skill_md`** + skip
3. 剥离 YAML frontmatter（首段 `--- ... ---`）
4. 校验正文长度 ≤ `SKILL_MD_MAX_BODY_LENGTH`（32_000）；超限 → skip + log（或整包 skip，backend 定一种）
5. 生成块：

```text
## Skill: {pack.name}
{body}
```

6. 块间 `\n\n---\n\n`

**`{pack.name}`：** DB `UserSkillConfig.name`（非 frontmatter 运行时覆盖，与 0.1.18 一致）。

### 3.2 frontmatter 剥离规则

- 仅当文件以 `---\n` 开头且第二个 `---\n` 之前为 YAML
- 剥离后 trim；剩余为 body
- 解析失败 → **整文件当作 body**（不阻塞合并）

---

## 4. `read_skill_file` Tool（Q4/Q5）

### 4.1 Tool 定义

| 属性 | 值 |
| --- | --- |
| name | **`read_skill_file`** |
| description（英文，对齐 MCP） | Read a text file from a Skill Pack mounted on this assistant. Only paths under packs listed below are allowed. Scripts are read-only; they cannot be executed in this version. Available packs: {id}: {name}, … |
| parameters | `packId: string` (UUID), `path: string` (POSIX relative, e.g. `reference.md`, `scripts/search.py`) |

### 4.2 实现要点

```typescript
// 伪代码
async function invoke({ packId, path }) {
  if (!allowedPackIds.has(packId)) {
    return "Error: packId not available in this turn.";
  }
  const normalized = normalizeRelativePath(path); // 拒绝 ..、绝对路径
  if (!normalized) return "Error: invalid path.";
  const row = await loadPackFile(userId, packId, normalized);
  if (!row) return `Error: file not found: ${normalized}`;
  return row.content; // UTF-8 文本
}
```

**安全：**

- `allowedPackIds` = 本 Turn `loadSkillPackRefsForChatTurn` 结果
- **必须**校验 `userId` + `packId` 归属
- `scripts/` **允许 read**；**无** exec、spawn、eval

### 4.3 与 MCP tools 合并

`resolveAllToolsForAgent` 返回：

```typescript
{
  tools: [...native, readSkillFileTool, ...mcpTools],
  mcpTurnUi: McpTurnUiSnapshot,
  skillsTurnUi: SkillsTurnUiSnapshot,  // 扩展
  disposeMcp: () => Promise<void>,
}
```

**Agent 循环：** 同一 `createAgent` tools 数组；read 与 MCP invoke 同一多轮循环（0.1.7 Turn 管道）。

### 4.4 ui-ux-pro-max 运行时示例

| Agent 收到 SKILL.md 指引 | 实际行为 |
| --- | --- |
| 「运行 `python3 scripts/search.py "query"`」 | 无 shell；可能改为 `read_skill_file` 读脚本源码并向用户说明 MVP 无法执行 |
| 「读取 `data/colors.csv`」 | `read_skill_file(packId, 'data/colors.csv')` 返回 CSV 文本 |
| 多次 read 大文件 | 正常返回；受 token 与模型限制 |

**禁止注册：** `run_skill_script`、`execute`、`bash` 等执行类 tool。

---

## 5. Turn 管道 — `skills_resolution`（扩展 Q13）

### 5.1 子步定义（延续 0.1.18）

| 字段 | 值 |
| --- | --- |
| stepKey | `C1b` |
| subStage | `skills_resolution` |
| UI order | **12**（knowledge=10, skills=12, mcp=15） |

### 5.2 `SkillsTurnUiSnapshot` 扩展

```typescript
type SkillsTurnUiSnapshot = {
  assistantMissing: boolean;
  merged: Array<{ id: string; name: string }>;
  skippedCount?: number;
  loadFailed?: boolean;
  /** Q13 MVP */
  readToolEnabled: boolean;
  readFileCount: number;           // 成功 read 次数
  readFileSamples?: string[];      // 最多 5 条 "packName:path"
};
```

**统计时机：** Agent 循环结束后，从 tool call 日志聚合 `read_skill_file` **成功**次数；失败不计入或单独计数（默认仅成功）。

### 5.3 `skillsSafeMessage` 文案

| 场景 | key | 示例 en |
| --- | --- | --- |
| 无助手 | `skillsNoAssistant` | （沿用 0.1.18） |
| 无有效 Pack | `skillsNotMounted` | （沿用） |
| 已合并 N + read M | `skillsMergedWithRead` | Merged {count} Skill Pack(s); read {readCount} file(s) via read_skill_file. |
| 已合并 N，read=0 | `skillsMerged` | Merged {count} Skill Pack(s) into system prompt. |
| 整类失败 | `skillsLoadSkipped` | （沿用） |

### 5.4 Turn details blocks

**当 `merged.length > 0`：**

```typescript
{
  title: t("turnSafe.detail.skillsMergedTitle"),
  content: merged.map(s => `· ${s.name}`).join("\n"),
}
```

**当 `readFileCount > 0`（Q13）：**

```typescript
{
  title: t("turnSafe.detail.skillsReadTitle"),  // "Files read"
  content: samples.join("\n") // "· ui-ux-pro-max: data/colors.csv"
}
```

**禁止展示：** 文件全文、脚本执行输出、stderr。

### 5.5 ChatWorkspace

| 项 | 改法 |
| --- | --- |
| 隐藏逻辑 | 沿用 `shouldHideUnboundSkillsStep` |
| 阶段标签 | `turn.stage.skill` → en「Skill Packs」/ zh「技能包」（见 copy-chat） |
| read 行 | 无 read 时仅显示合并文案；不显示「脚本已执行」 |

---

## 6. 失败降级（US-C4）

| 情况 | prompt | read tool | UI |
| --- | --- | --- | --- |
| 单 Pack 缺 SKILL.md | 跳过 | 其他 Pack 仍可读 | 合并数减少；无 Toast |
| Pack 已删 | 跳过 | 不在白名单 | 无 |
| read 路径非法 | — | Tool 返回 Error 字符串 | Agent 自行修正；Turn 不计成功 read |
| Skills DB 失败 | 基础 prompt | 空 | `skillsLoadSkipped` |

---

## 7. 常量（`src/common/constants`）

```typescript
// 沿用 0.1.18 命名 + 新增
export const SKILL_PACK_MAX_FILES = 100;
export const SKILL_PACK_MAX_TOTAL_BYTES = 2_000_000;
export const SKILL_PACK_FILE_MAX_BYTES = 512_000;
export const SKILL_MD_MAX_BODY_LENGTH = 32_000;
// SKILL_CONFIG_* 别名保留或重导出
```

---

## 8. 日志（服务端）

```typescript
{ event: "skill_skip", reason: "missing_skill_md" | "not_found" | "disabled" | "body_too_long" }
{ event: "skill_read_file", packId, path, ok: boolean }
{ event: "skills_load_error", ... }
```

---

## 9. 故事映射

| 故事/AC | 本节 |
| --- | --- |
| US-C1, AC-P9 | §3 prompt 合并 |
| US-C2, AC-P10 | §4 read_skill_file |
| US-C3, AC-P11 | §4.4 无执行 tool |
| US-C4 | §6 降级 |
| Q13 | §5 Turn read 展示 |
