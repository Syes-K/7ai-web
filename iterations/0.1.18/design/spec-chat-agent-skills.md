# 规格：对话 — Agent 运行时 Skills 与 Turn 步骤（version 0.1.18）

**相关代码（研发对照）：**

| 模块 | 路径 |
| --- | --- |
| Skills 加载占位 | `src/server/chat/turn-capabilities.ts` |
| System prompt 合并 | `resolveSystemPromptWithSkills`（同文件） |
| Agent 构建 | `src/server/chat/langchain-agent.ts` → `getAssistantAgent` |
| Turn 快照 | `src/server/chat/turn-runtime.ts` |
| Turn UI | `src/components/chat/ChatWorkspace.tsx` |
| 消息路由 | `src/app/api/chat/conversations/[conversationId]/messages/route.ts` |

---

## 1. 触发条件与边界

| 条件 | 行为 |
| --- | --- |
| 会话 **无** `assistantId` | `loadSkillPackRefsForChatTurn` → `[]`；不追加文案；Turn 步 **skipped 或隐藏** |
| 助手未挂载 Skill | 同上 |
| 挂载项均 `enabled=false` 或已删除 | 无追加；Turn 步隐藏（对齐 MCP not mounted） |
| 部分 Skill 不可用 | **静默跳过**该条（Q5）；其余照常合并；structured log |
| DB 查询整类失败 | 跳过全部 Skills，仅用基础 prompt；error log；**不阻塞**对话 |

**与 MCP / 知识库：** 三路 **并行独立**（US-C4）；Skills **仅** 影响 system prompt 文本。

---

## 2. 加载链路（AC-S7）

```
getAssistantAgent(ctx)
  ├─ resolveChatAssistantSystemPrompt(ctx)     → baseSystemPrompt
  ├─ resolveSystemPromptWithSkills(base, ctx)
  │    ├─ loadSkillPackRefsForChatTurn(ctx)    → ChatSkillPackRef[]
  │    └─ skillRefsToExtraSystemText(ctx, refs) → extra string
  ├─ resolveAllToolsForAgent(ctx)              → MCP tools（不变）
  └─ createAgent({ systemPrompt: merged, tools })
```

**禁止：** 在 `messages/route.ts` 或路由层 **重复拼接** Skills 文案。

---

## 3. 绑定解析规则

### 3.1 `loadSkillPackRefsForChatTurn`

1. 若 `!ctx.assistantId` → `[]`
2. 查 `AssistantSkillBinding` where `assistantId` + `userId`
3. 取 `skillConfigId` 列表 → **去重**
4. **稳定排序：** 按 `skillConfigId` **字典序 ascending**（Q3）
5. `slice(0, SKILL_CONFIG_MAX_BINDINGS_PER_CHAT_TURN)`（10）
6. 过滤：`UserSkillConfig` 存在且 `enabled === true`
7. 返回 `ChatSkillPackRef[]`（`{ id: skillConfigId }`）

### 3.2 `skillRefsToExtraSystemText`

对每个有效 ref（按序）：

1. 加载 `UserSkillConfig`（可批量查询优化）
2. 若记录缺失 → **log + skip**（Q5）
3. 生成块：

```text
## Skill: {name}
{content}
```

- `{name}`：DB `name` 字段（trim）
- `{content}`：DB `content` **原样**（Markdown 源，不 strip、不 HTML 渲染）（Q2）

4. 多块之间：`"\n\n---\n\n"`
5. 全部块 join 后 trim；空则返回 `""`

### 3.3 `resolveSystemPromptWithSkills`

（现有逻辑保持）

```typescript
const extra = await skillRefsToExtraSystemText(ctx, refs);
const t = extra.trim();
return t ? `${baseSystemPrompt}\n\n${t}` : baseSystemPrompt;
```

**之后** `langchain-agent.ts` 仍追加 `CHAT_LANGUAGE_REPLY_SUFFIX`（不变）。

---

## 4. Turn 管道 — `skills_resolution`（Q6 MVP）

### 4.1 新增子步定义

在 `turn-runtime.ts` 的 `ORDERED_STEPS` 中，**插入于 C1 与 C2 之间**：

```typescript
{ stepKey: "C1b", mainStage: "C", subStage: "skills_resolution" },
// 原有 C2 mcp_tools_resolution 顺序后移
```

| 字段 | 值 |
| --- | --- |
| stepKey | `C1b` |
| mainStage | `C` |
| subStage | `skills_resolution` |
| 展示顺序（UI order） | **12**（knowledge=10, skills=12, mcp=15） |

### 4.2 状态机（messages/route.ts）

在 Agent 构建前（与 knowledge / MCP 步同级阶段 C）：

| 阶段 | updateStep | safeMessage 来源 |
| --- | --- | --- |
| 开始 | `C1b` → `running` | — |
| 成功 | `C1b` → `completed` | `skillsSafeMessage(locale, snapshot)` |
| 无助手 | `C1b` → `skipped` 或 completed + 可隐藏文案 | `turnSafe.skillsNoAssistant` |
| 无挂载/全跳过 | `completed` + 隐藏 | `turnSafe.skillsNotMounted` |
| 整类失败 | `completed`（不 failed，不阻塞） | `turnSafe.skillsSkipped` 或等价「未加载」 |

**单条 Skill 跳过：** **不** 写入用户可见 safeMessage（Q5）；汇总仍按 **成功合并数** 计数。

### 4.3 `SkillsTurnUiSnapshot`（建议）

```typescript
type SkillsTurnUiSnapshot = {
  assistantMissing: boolean;
  /** 成功合并进 prompt 的 Skill 摘要（不含正文） */
  merged: Array<{ id: string; name: string }>;
  /** 绑定存在但跳过（禁用/缺失）的数量，仅日志/可选 debug，默认不进 UI */
  skippedCount?: number;
};
```

### 4.4 `skillsSafeMessage` 文案规则

| 场景 | api.message key | 示例 en |
| --- | --- | --- |
| 无助手 | `turnSafe.skillsNoAssistant` | No assistant bound; Skills not loaded. |
| 无有效 Skill | `turnSafe.skillsNotMounted` | Assistant has no active Skills mounted. |
| 已合并 N 项 | `turnSafe.skillsMerged` | Merged {count} Skill(s) into system prompt. |
| 整类跳过 | `turnSafe.skillsLoadSkipped` | Skills could not be loaded; using base prompt only. |

**不展示：** 合并后全文、单条 skip 原因、token 数（Q9）。

### 4.5 Turn 详情 blocks（可选，轻量）

若 `merged.length > 0`，`details` 可含：

```typescript
{
  title: tApiMessage(locale, "turnSafe.detail.skillsMergedTitle"), // "Merged Skills"
  content: merged.map(s => `· ${s.name}`).join("\n"),  // 仅名称列表，无 content 正文
}
```

**禁止** 在 details 中输出 `content` 全文（token / 隐私）。

---

## 5. ChatWorkspace UI 改造

### 5.1 现有兼容

`ChatWorkspace` 已通过 `subStage.toLowerCase().includes("skill")` 识别 Skill 步；`subStage: "skills_resolution"` **满足**。

### 5.2 建议增强

| 项 | 改法 |
| --- | --- |
| 查找步 | 优先 `stepByKey.get("C1b")`，fallback `subStage === "skills_resolution"` |
| 隐藏逻辑 | 新增 `shouldHideUnboundSkillsStep(step, labels)`，对齐 MCP：当 safeMessage 为 `skillsNoAssistant` / `skillsNotMounted` 且无 details 时 **不渲染** |
| 展示顺序 | `buildTurnStageItems` 中 skills order **12**（在 knowledge 与 mcp 之间） |
| `buildTurnProcessRows` | 同步插入 C1b 行 |

### 5.3 阶段标签

沿用 `page.chat.turn.stage.skill`（已有 en/zh）；若需更精确可改为「Skills 合并」——见 `copy-chat-en-zh.md`。

### 5.4 用户感知级别（Q5）

| 事件 | UI |
| --- | --- |
| 正常合并 | Turn 面板一行：状态 + 「已合并 N 项」 |
| 单条 skip | **无** Toast、无脚注 |
| 整类失败 | Turn 行可选简短说明；**不**阻塞助手气泡 |
| 与 MCP 同时存在 | 两行独立展示（skills 在 mcp 之前） |

---

## 6. 日志（服务端，不对用户）

Structured log 字段建议：

```typescript
{
  event: "skill_skip" | "skills_load_error",
  userId, assistantId, skillConfigId?,
  reason: "not_found" | "disabled" | "db_error",
}
```

---

## 7. 常量（`src/common/constants`）

与 MCP 对称新增：

```typescript
export const SKILL_CONFIG_NAME_MAX_LENGTH = 64;
export const SKILL_CONFIG_DESCRIPTION_MAX_LENGTH = 500;
export const SKILL_CONFIG_CONTENT_MAX_LENGTH = 16_000;
export const SKILL_CONFIG_MAX_PER_USER = 50;
export const SKILL_CONFIG_MAX_PER_ASSISTANT = 10;
export const SKILL_CONFIG_MAX_BINDINGS_PER_CHAT_TURN = 10;
```

---

## 8. API 错误码（backend 3A 预告）

| ErrorCode | message key |
| --- | --- |
| `SKILL_CONFIG_NOT_FOUND` | `skillConfigNotFound` |
| `SKILL_CONFIG_NAME_CONFLICT` | `skillConfigNameConflict` |
| `SKILL_CONFIG_REFERENCED_BY_ASSISTANT` | `skillConfigReferencedByAssistant` |
| validation | `validation.invalidSkillConfigIds`、`skillConfigIdsRequired`、`skillConfigLimitReached` 等 |

详见 backend 阶段文档；Turn safe 文案见 `copy-chat-en-zh.md`。

---

## 9. 故事映射

| 故事/AC | 本节 |
| --- | --- |
| US-C1, AC-S7 | §2–3 合并路径与格式 |
| US-C2, AC-S8 | §1 边界 |
| US-C3, AC-S9 | §3 skip、§6 日志 |
| US-C4 | §1 与 MCP 并行 |
| Q6 | §4 Turn 步 |
