# 设计说明（总览）— Skill Pack 增强（version 0.1.20）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.20` |
| 阶段 | 设计（阶段 2） |
| 上游 | `iterations/0.1.20/product/` 全套 |
| 前置设计 | `iterations/0.1.19/design/`（**本期演进**，非替换） |
| 风格基线 | 0.1.19 控制台 Drawer/ProTable；0.1.7 Turn 管道 C1b |

---

## 1. 已确认产品决策（设计定稿）

| ID | 决策 | 设计落点 |
| --- | --- | --- |
| D1 | **按需加载** 替代全量 merge | `resolveSkillPackSelectionForTurn` |
| D2 | Turn 区分 mounted / loaded / skipped / read / run | `SkillsTurnUiSnapshot` 演进 |
| D3 | **`run_skill_script`** 沙箱执行 `scripts/` | 替换 0.1.19「只读不执行」 |
| D4 | `alwaysLoad` 表字段权威 | Pack 详情顶栏 Switch + 列表 Tag |
| D5 | 路由失败 **不** silent 全量加载 | `intentSource=failed_safe` |
| D6 | MVP 意图输入仅 name + description（Q19） | intent agent prompt |
| D7 | `mounted=0` 隐藏 C1b（Q21） | `ChatWorkspace` + 路由层可不 emit |
| D8 | 历史 Turn `merged[]` legacy（Q22） | `localize-turn-detail.ts` + 快照归一化 |
| D9 | 结构化快照 + UI locale i18n（Q20） | 不持久化 safeMessage 死字符串 |

---

## 2. 与 0.1.19 差异（设计重点）

| 维度 | 0.1.19 | 0.1.20 |
| --- | --- | --- |
| SKILL.md 合并 | **全部** mounted Pack | 仅 **loaded**（意图路由 + alwaysLoad） |
| Turn 快照 | `merged[]` | `mounted[]` + `loaded[]` + `skipped[]` |
| Turn 摘要 | 「已合并 N 个」 | 「已挂载未选用」/「已加载」/ read/run 组合 |
| `read_skill_file` 白名单 | mounted refs | **loaded** refs |
| `run_skill_script` | 不存在（TODO） | **注册**；白名单 = loaded |
| 控制台 scripts | Tag「只读」+ Alert「不执行」 | Tag「含脚本」+ 沙箱可运行说明 |
| Pack 元数据 | name、description、enabled | + **`alwaysLoad`** |
| Agent 入口 | 三处独立 `loadSkillPackRefsForChatTurn` | **单入口 selection** + `userMessageText` |

**保留不变：** 路由 `/console/skills`、挂载链 Pack → 助手 → 会话、C1b `skills_resolution` order=12、read 统计机制、MCP/知识库并行。

---

## 3. 运行时架构

```mermaid
flowchart TB
  subgraph Turn["Chat Turn（有 assistantId + userMessage）"]
    A[getAssistantAgent]
    S[resolveSkillPackSelectionForTurn]
    I[skill-pack-intent-agent]
    C[resolveSystemPromptWithSkills<br/>仅 selectedRefs]
    D[resolveAllToolsForAgent<br/>read + run on selectedRefs]
    E[resolveSkillsTurnUiSnapshot<br/>同源 selection]
    F[createAgent loop]
  end
  A --> S
  S --> I
  S --> C
  S --> D
  S --> E
  C --> F
  D --> F

  subgraph PackFiles["Pack 内文件"]
    MD[SKILL.md → prompt 仅 loaded]
    REF[data/、reference → read_skill_file]
    SCR[scripts/*.py|.sh → read + run_skill_script]
  end
  C --> MD
  D --> REF
  D --> SCR
```

**单轮数据流（关键衔接）：**

```text
userMessageText
  → resolveSkillPackSelectionForTurn(ctx, text)
       ├─ mountedRefs = loadSkillPackRefsForChatTurn(ctx)
       ├─ alwaysLoad ids → selectedIds（无条件）
       ├─ intent agent → selectedIds（其余 Pack）
       └─ skipped = mounted − loaded
  → selectedRefs（= loaded）
       ├─ skillRefsToExtraSystemText(ctx, selectedRefs)
       ├─ skillPackRefsToReadTools(ctx, selectedRefs)
       ├─ skillPackRefsToRunTools(ctx, selectedRefs)   // 新增
       └─ resolveSkillsTurnUiSnapshot 使用同一 selection 结果
```

**禁止：** `resolveSystemPromptWithSkills`、`resolveAllToolsForAgent`、`resolveSkillsTurnUiSnapshot` 各自独立调用 `loadSkillPackRefsForChatTurn` 并全量 merge（0.1.19 bug 根因）。

---

## 4. Turn C1b 状态机

### 4.1 术语与快照字段

见 `spec-skill-pack-intent-routing.md` §5.1 `SkillsTurnUiSnapshot` 完整类型。

**归一化（读历史 / SSE 组装前）：**

```typescript
function normalizeSkillsTurnUi(raw: SkillsTurnUiSnapshot): SkillsTurnUiSnapshot {
  if (raw.mounted?.length) return raw;
  if (raw.merged?.length) {
    // Q22 legacy 0.1.19
    return {
      ...raw,
      mounted: raw.merged,
      loaded: raw.merged,
      skipped: [],
    };
  }
  return { ...raw, mounted: raw.mounted ?? [], loaded: raw.loaded ?? [] };
}
```

### 4.2 步骤可见性（Q21）

| 条件 | C1b 是否展示 | step.status | 摘要 key |
| --- | --- | --- | --- |
| `assistantMissing` | **展示** | `completed` | `skillsNoAssistant` |
| `loadFailed` | **展示** | `completed` 或 `failed`（沿用 0.1.19） | `skillsLoadSkipped` |
| `mounted.length === 0` | **隐藏** | — | — |
| `mounted > 0`, `loaded === 0`, `intentSource !== failed_safe` | **展示** | `completed` | `skillsMountedNotSelected` |
| `mounted > 0`, `loaded === 0`, `intentSource === failed_safe` | **展示** | `completed` | `skillsSelectionFailed` |
| `loaded > 0` | **展示** | `completed` | `skillsLoaded*` 组合（见 §4.3） |

**实现要点：**

- `messages/route.ts`：`mounted===0` 且无 `assistantMissing/loadFailed` 时 **不 push** C1b subStep（与 MCP 无挂载一致）。
- `ChatWorkspace.shouldHideUnboundSkillsStep`：同步识别 `skillsNotMounted` **仅** 在 `mounted===0` 场景；**不再** 把 `loaded===0` 误判为未挂载。

### 4.3 摘要组合矩阵（`skillsSafeMessage`）

设 `mountedCount`、`loadedCount`、`readCount`、`runCount`（run 含成功与失败，Q15）。

| loaded | read | run | i18n key |
| --- | --- | --- | --- |
| 0 | — | — | `skillsMountedNotSelected` 或 `skillsSelectionFailed` |
| >0 | 0 | 0 | `skillsLoaded` |
| >0 | >0 | 0 | `skillsLoadedWithRead` |
| >0 | 0 | >0 | `skillsLoadedWithRun` |
| >0 | >0 | >0 | `skillsLoadedWithReadAndRun` |

参数：`mountedCount`（未选用摘要）、`count`（loaded）、`readCount`、`runCount`。

**禁止文案：** `system prompt`、`read_skill_file`、`Merged ... into`、`run_skill_script`（用户向层）。

### 4.4 Details 块顺序与密度

| 顺序 | 块标题 key | 显示条件 | 内容格式 |
| --- | --- | --- | --- |
| 1 | `skillsMountedTitle` | `mounted.length > 0` | `· {name}`（muted 语义，列表完整） |
| 2 | `skillsLoadedTitle` | `loaded.length > 0` | `· {name}` |
| 3 | `skillsSkippedTitle` | `skipped.length > 0` | `· {name} — {reason}`，**最多 5 条**；超出仅计数 `skippedCount` |
| 4 | `skillsReadTitle` | `readFileCount > 0` | `· {packName}：{path}`（沿用 0.1.19） |
| 5 | `skillsScriptRunTitle` | `scriptRunCount > 0` | `· {packName}：{path}（exit {exitCode}）`，最多 5 条 |

**移除：** `skillsReadOnlyNote`（脚本已可 run）；read `scripts/` 时 **不再** 追加只读脚注。

**未选用 reason 默认折叠：** 不单独折叠组件；整块「未选用」仅在 `skipped.length > 0` 时出现。reason 为空时仅显示 `· {name}`。

### 4.5 Agent 完成后统计注入

| 函数 | 时机 | 字段 |
| --- | --- | --- |
| `applySkillReadStatsToTurnUi` | Agent 结束 | `readFileCount`、`readFileSamples` |
| `applySkillScriptRunStatsToTurnUi` | Agent 结束 | `scriptRunCount`、`scriptRunSamples` |

`scriptRunSamples` 格式：`packName:path:exitCode`（backend 组装，前端解析展示）。

---

## 5. 信息架构增量

控制台与 0.1.19 相同；**增量控件：**

- Pack 列表列：Tag「始终加载」（`alwaysLoad`）
- Pack 详情顶栏：`始终加载` Switch（在「启用」Switch 左侧或右侧，见 intent spec）
- 助手挂载区 extra 文案更新（按需加载说明）

对话 Turn：C1b 语义升级；无新路由。

---

## 6. 全局状态矩阵（跨页）

| 场景 | 表现 |
| --- | --- |
| 挂载问候包，问天气 | Turn：**已挂载 1，本轮未选用**；prompt 无问候 SKILL |
| 挂载问候包，问打招呼 | Turn：**已加载 1**；可 read/run |
| alwaysLoad + 问天气 | 该 Pack 在 **已加载**；其余 skipped |
| 意图路由失败 | 非 always **不加载**；摘要选用暂不可用 |
| run 超配额 | tool 错误；Turn 仍计已尝试次数（若 invoke 到达 tool） |
| 0.1.19 历史 Turn | `merged` → loaded=mounted；摘要走 legacy key |
| 助手无挂载 | C1b **隐藏** |
| 未加载 Pack 调 read/run | tool 返回 pack 不在白名单 |

---

## 7. 布局与组件基线

沿用 0.1.19：`PageContainer` + `ProTable` + Drawer 分栏。

**alwaysLoad Switch（顶栏）：**

```text
┌─────────────────────────────────────────────────────────────┐
│ 名称 | [始终加载 Switch] [启用 Switch] | 保存 | 关闭          │
```

- Switch `size="small"`，与启用 Switch 视觉对齐
- `extra` 文案在元数据 Panel 或 Switch 下方 `Typography.Text type="secondary"`

**列表 Tag：**

- `alwaysLoad`：`Tag color="purple"`「始终加载」
- `hasScripts`：`Tag color="gold"`「含脚本」（Tooltip 改为沙箱说明，去「只读」）

---

## 8. 性能与可观测性

| 指标 | 目标 |
| --- | --- |
| 意图路由 P95 | ≤ 1.5s |
| 单次脚本执行 P95 | ≤ 配置 timeout（默认 30s） |
| 日志 | `skill.intent`、`skill_script_run`、`skill_skip` |

---

## 9. 与 PRD 对齐说明

本期设计 **无** 与 PRD 的 intentional 偏差。PRD §5.5 曾写「mounted=0 可隐藏或展示未挂载——设计定稿」；按 Q21 默认定稿为 **隐藏**。

---

## 10. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-19 | 初稿：架构、Turn 状态机、0.1.19 差异 |
