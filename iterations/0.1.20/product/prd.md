# PRD：Skill Pack 增强（version 0.1.20）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.20` |
| 阶段 | 产品需求（阶段 1） |
| 状态 | 待用户确认 |
| 前置迭代 | `0.1.19` Skill Pack（目录包 + `read_skill_file`；`scripts/` 只读不执行） |

---

## 1. 概述

在 **0.1.19 Skill Pack** 基础上，同一迭代交付两大 **P0** 能力：

1. **按需加载（Skill Pack Intent Routing）**：仅在与用户问题相关时合并技能包；Turn 区分 **挂载 / 加载 / 读取 / 运行**。
2. **脚本沙箱执行（`run_skill_script`）**：在服务端沙箱中运行 Pack 内 `scripts/` 下脚本，兑现 0.1.19 路线图承诺。

**挂载链（不变）**：

```text
控制台 Skill Pack
  → 助手 AssistantSkillBinding（多选挂载 pack id）
  → 会话 Conversation.assistantId
  → 每轮 Turn：意图路由 → 合并 SKILL.md → 注册 tools
```

---

## 2. 问题陈述

| 现象（0.1.19 联调） | 用户理解 | 实际行为（代码） |
| --- | --- | --- |
| 问「天津天气」，Turn 显示「Merged 1 Skill Pack(s)」 | 技能包被用上了 | `resolveSystemPromptWithSkills` **全量合并** 已挂载 Pack 的 `SKILL.md`，与天气无关 |
| 问候测试包挂载后，普通闲聊也显示「已合并」 | 每句话都走技能 | 模型多数 **忽略** 无关 SKILL 指令；Turn 仍显示「已合并」 |
| 摘要含 `system prompt`、`read_skill_file` | 界面语言不一致 | `messages/*/api/message.json` 中 `turnSafe.skillsMerged*` 含开发术语；部分 detail 仍写死英文或未全面走 i18n |

**核心矛盾**：Turn 文案表达的是 **已加载（loaded）= 已合并进 prompt**，用户需要的是 **是否与本题相关 / 是否真正用到（read / run）**。0.1.19 将「挂载即加载」写死在 `loadSkillPackRefsForChatTurn` → `buildSkillsMergeResult` 全链路。

---

## 3. 术语（统一）

| 术语 | 英文（实现/日志） | 定义 |
| --- | --- | --- |
| **挂载** | mounted | 助手 `AssistantSkillBinding` 上配置且 Pack `enabled=true` 的集合；**每轮都存在**，与问题无关 |
| **加载 / 选用** | loaded / selected | 本轮经意图路由（或 `alwaysLoad`）**合并 `SKILL.md` 进 system prompt** 的 Pack 子集 |
| **未选用** | skipped | 已挂载但本轮 **不** 合并 `SKILL.md` 的 Pack |
| **读取** | read | Agent 调用 `read_skill_file` 成功次数（仅 **已加载** Pack 白名单） |
| **运行** | run | Agent 调用 `run_skill_script` 成功/失败次数（仅 **已加载** Pack + `scripts/` 路径） |
| **已使用（MVP）** | used | **不** 做模型遵循度判定；MVP 以 **loaded + read + run** 可观测行为为准 |

**与 0.1.19 字段映射**：快照中现有 `merged[]` 语义改为 **`loaded[]`**（本轮已合并）；新增 `mounted[]`、`skipped[]`。历史 Turn 无新字段时，前端 **兼容**：`loaded := merged`，`mounted := merged`（视为 0.1.19 全量加载）。

---

## 4. 目标与非目标

### 4.1 目标

1. **按需加载**：本轮仅将 **相关** 的已挂载 Pack 的 `SKILL.md` 合并进 prompt；无关 Pack **不合并**。
2. **Turn 语义清晰**：摘要与详情区分 mounted / loaded / skipped / read / run；无关时不误导为「已加载」。
3. **可配置兜底**：Pack 级 **`alwaysLoad`**，满足必须每轮生效的合规/人格类技能。
4. **用户向文案**：Turn / 控制台去掉 `system prompt`、`read_skill_file`、`Merged ... into` 等开发术语；中英文 UI 均走 i18n。
5. **脚本执行**：`run_skill_script` 沙箱运行已加载 Pack 的 `scripts/`；控制台「含脚本」从只读说明升级为可运行说明。

### 4.2 非目标（本期不做）

- 自动判断模型是否「遵循了」SKILL.md 正文。
- 会话级临时挂载/卸载技能包。
- 替换助手挂载模型（仍 Pack → 助手 → 会话 `assistantId` → Turn）。
- **`scripts/` 以外路径** 的执行；用户上传二进制作为脚本入口。
- 沙箱 **出站网络可配置放行**（本期默认禁止）。
- 替换 MCP / 知识库挂载语义。

---

## 5. 方案概要

### 5.1 技能包意图路由（Skill Pack Intent Routing）

在每轮 **Agent 构建之前**（Turn 步骤 **C1b `skills_resolution`**，与 C1 知识库注入同阶段、在 C2 MCP 之前），增加路由步骤：

**输入**

- 本轮用户消息文本（与 KB 注入同源）
- 助手已挂载且 **enabled** 的 Pack 列表：`id`、`name`、`description`（表字段；可选附加 `SKILL.md` 正文摘要 ≤ 400 字，见 open-questions **Q19**）
- 各 Pack 的 **`alwaysLoad`** 标志

**输出**

- `selectedPackIds[]`（= 本轮 **loaded**）
- `skippedPackIds[]` + 可选 `skipReason`（用户向简短中文，最多 5 条入 Turn details）
- `intentSource`：`always_load` | `intent_agent` | `failed_safe`（见 **Q2**；**不做** keyword_fallback / 全量 legacy 降级）

**默认策略（建议默认，见 open-questions）**

1. `alwaysLoad === true` 的 Pack **无条件** 进入 `selectedPackIds`。
2. 对其余 Pack，调用 **轻量意图分类器**（新建 `skill-pack-intent-agent.ts`，对齐 `knowledge-retrieval-intent-agent.ts` 模式：低温模型 + JSON `{ selectedIds: string[], reason?: string }`）。
3. 分类失败（超时 / 非法 JSON）：**不加载** 非 `alwaysLoad` 包；Turn 摘要「技能包选用暂不可用」；`intentSource=failed_safe`。

**与知识库差异**

| 维度 | 知识库（现状） | 技能包（0.1.20） |
| --- | --- | --- |
| 挂载 | 助手多选 KB | 助手多选 Pack |
| 触发 | 向量检索 + 阈值（`injection.ts`） | **意图路由** 选 Pack，再合并 SKILL.md |
| 未命中 | 无片段注入 | **不合并** 该 Pack 的 SKILL.md |
| 工具 | 无（注入即内容） | `read_skill_file` + `run_skill_script`（白名单 = **loaded** Pack） |

### 5.2 运行时行为变更（相对 0.1.19 代码）

| 环节 | 0.1.19（现状） | 0.1.20 |
| --- | --- | --- |
| 解析挂载 | `loadSkillPackRefsForChatTurn` → 全部 mounted | 不变；另增 **intent 路由** 得 `selectedRefs` |
| SKILL.md 合并 | `skillRefsToExtraSystemText(ctx, allRefs)` | 仅 **`selectedRefs`** |
| Turn UI 快照 | `resolveSkillsTurnUiSnapshot` 与 merge **同源全量** | `mounted` + `loaded` + `skipped` 分字段 |
| `read_skill_file` 白名单 | `skillPackRefsToReadTools(ctx, allRefs)` | **`selectedRefs` only** |
| `run_skill_script` | 不存在（`turn-capabilities.ts` TODO） | **注册**；白名单同 loaded；path 须 `scripts/` |
| `skillsSafeMessage` | `merged.length===0` → `skillsNotMounted` | **区分**「未挂载」与「已挂载未选用」（见 §5.4） |
| Agent 入口 | `getAssistantAgent` 并行 prompt + tools + snapshot | 须传入 **同一** `selectedRefs`（避免 snapshot 与 prompt 不一致） |

**关键衔接**：`langchain-agent.ts` 中 `getAssistantAgent` 当前并行调用 `resolveSystemPromptWithSkills` 与 `resolveSkillsTurnUiSnapshot`，二者各自调用 `loadSkillPackRefsForChatTurn`。**0.1.20 须抽取单轮 `resolveSkillPackSelectionForTurn(ctx, userMessageText)`**，供 prompt、tools、Turn UI 共用。

### 5.3 脚本沙箱执行（`run_skill_script`）

**背景**：0.1.19 仅可读 `scripts/`（如 `ui-ux-pro-max/scripts/search.py`），SKILL.md 写的 `python3 scripts/...` 无法跑通。

**Tool 契约（产品层，细节交 backend 3A）**

| 项 | 说明 |
| --- | --- |
| 名称 | `run_skill_script` |
| 参数 | `packId`（UUID）、`path`（**必须** `scripts/` 前缀）、`args[]`（可选字符串数组）、`timeoutMs`（可选，≤ 上限） |
| 前置 | Pack **本轮已加载** 且 **enabled**；文件存在于 `skill_pack_files` |
| 输出 | stdout/stderr 文本、`exitCode`；超时/沙箱拒绝 → 结构化错误字符串（供 Agent 自我修正） |
| 语言 MVP | **Python 3**（`.py`）+ **bash**（`.sh`）；其它扩展名拒绝 |
| 隔离 | 子进程沙箱：默认 **无出站网络**、临时工作目录、CPU/内存/时长上限 |
| 配额 | 每 Turn 最大 **N** 次 run、每用户日限额（见 open-questions **Q10–Q11**） |
| 审计 | 记录 userId、packId、path、exitCode、durationMs；可选表 `skill_script_runs` |

**与 read 的关系**

- `read_skill_file`：任意允许扩展名的文本文件，**不执行**。
- `run_skill_script`：**仅** `scripts/` 下可执行脚本。

**控制台 / 文案**

- 「含脚本」Tag Tooltip：「可在对话中按技能说明运行（沙箱）」+ 无网络/超时提示。
- 移除或替换 0.1.19「MVP 只读不执行」Alert；help Drawer 说明安全边界。

**Turn 统计**

- 扩展 `SkillsTurnUiSnapshot`：`scriptRunCount`、`scriptRunSamples`（≤5，格式 `packName:path:exitCode`）。
- 摘要组合示例：「已加载 1 个；读取 2 个文件；运行 1 个脚本」。

### 5.4 Pack 级「始终加载」（`alwaysLoad`）

| 项 | 说明 |
| --- | --- |
| 存储 | `user_skill_configs.alwaysLoad` boolean，默认 **`false`** |
| 控制台 | Pack 详情顶栏 Switch「始终加载」+ 说明：「每轮对话都会应用此技能包，即使与问题看似无关」 |
| 列表 | Tag「始终加载」 |
| 导入 | zip 默认 `false`；`SKILL.md` frontmatter 可选 `alwaysLoad: true`（保存/导入时 **同步至表字段**，策略对齐 0.1.19 name/description，见 **Q3**） |
| API | `GET/PATCH /api/console/skill-configs/:id` 读写 `alwaysLoad`；列表项 JSON 含 `alwaysLoad` |

### 5.5 Turn 展示语义（用户向）

**C1b 摘要（safeMessage）**

| 场景 | 中文示例 | 英文方向 |
| --- | --- | --- |
| 无助手 | 未绑定助手，未加载技能包 | No assistant bound… |
| 未挂载（mounted=0） | 助手未挂载技能包 | Assistant has no Skill Packs… |
| 已挂载，本轮均未选用（loaded=0） | **已挂载 {mounted} 个，本轮未选用** | Mounted {mounted}; none selected this turn |
| 路由失败（failed_safe） | 技能包选用暂不可用，本轮未加载可选包 | Skill selection unavailable… |
| 已加载，无 read/run | 已加载 {loaded} 个技能包 | Loaded {loaded} Skill Pack(s) |
| 已加载 + read | 已加载 {loaded} 个；读取 {read} 个文件 | …read {read} file(s) |
| 已加载 + run | 已加载 {loaded} 个；运行 {run} 个脚本 | …ran {run} script(s) |
| 组合 read + run | 已加载 {loaded} 个；读取 {read} 个文件；运行 {run} 个脚本 | 组合文案 |

**禁止** 再出现：`system prompt`、`read_skill_file`、`Merged ... into`。

**详情块（details）**

| 块标题（用户向） | 内容 |
| --- | --- |
| 已挂载 | 助手配置的全部 Pack 名（muted） |
| 本轮已加载 | · {name}（仅 loaded） |
| 未选用 | · {name} — {简短原因}（最多 5 条） |
| 已读取文件 | packName + path（沿用 0.1.19） |
| 已运行脚本 | packName + path + exitCode（最多 5 条） |

**步骤可见性**

- `mounted=0` 且无 `loadFailed`：可 **隐藏** C1b（对齐 MCP 无挂载隐藏逻辑），或展示「未挂载」——设计定稿。
- `mounted>0` 且 `loaded=0`：**必须展示** C1b（核心修复：不再误报「已合并」）。

**渲染策略**

- Turn 持久化：**结构化快照**（`mounted`/`loaded`/`skipped`/counts/samples + `intentSource`），**不**存 locale 死字符串。
- 前端 / SSE 组装 `safeMessage` 与 details 时按 **当前 UI locale** 走 `turnSafe.*` i18n key（`localize-turn-detail.ts` 扩展 legacy 映射）。

### 5.6 助手与控制台 UX 增量

- 助手挂载区 extra：「助手可挂载多个技能包；**对话时仅加载与问题相关的包**（除非设为始终加载）。」
- 技能包管理页 `alert.productScope` 增量一句按需加载。
- **`greeting-test-skill` 夹具**：更新 `SKILL.md` 中「MVP 不执行 scripts」为 0.1.20 行为（可 run `scripts/hello.py`）；见 user-stories 测试夹具节。

---

## 6. 用户场景

1. **无关问题**：挂载「问候测试包」，问「天津天气」→ Turn：**已挂载 1 个，本轮未选用**；回复正常答天气。
2. **相关问题**：「请用技能包测试打个招呼」→ **已加载 1 个**；read `greetings.md` → **读取 1 个文件**。
3. **混合挂载**：A（alwaysLoad 合规）+ B（问候）→ 问天气 → A 加载，B 未选用。
4. **多包选用**：UI 设计包 + 代码审查包，问 review → 仅代码审查包加载。
5. **脚本执行**：挂载 `ui-ux-pro-max`，问 UI 设计 → `run_skill_script` 跑 `scripts/search.py` → Turn **运行 1 个脚本**。

---

## 7. 数据与 API（产品层，细节交 backend 3A）

### 7.1 数据模型

| 变更 | 说明 |
| --- | --- |
| `user_skill_configs.alwaysLoad` | `boolean NOT NULL DEFAULT false` |
| `skill_script_runs`（可选） | userId、packId、path、exitCode、durationMs、createdAt；保留 90 天（**Q14**） |
| Turn 快照字段 | 见 §7.2 |

**frontmatter**：`extractSkillMetadataFromFrontmatter` 扩展解析 `alwaysLoad`（`true`/`false` 字符串）。

### 7.2 Turn 快照（`SkillsTurnUiSnapshot` 演进）

```typescript
// 产品语义；字段名供 design/backend 对齐
type SkillsTurnUiSnapshot = {
  assistantMissing: boolean;
  loadFailed?: boolean;
  intentSource?: "always_load" | "intent_agent" | "failed_safe";
  mounted: Array<{ id: string; name: string }>;
  loaded: Array<{ id: string; name: string }>; // 0.1.19 兼容：旧数据仅 merged → 视作 loaded=mounted
  skipped?: Array<{ id: string; name: string; reason?: string }>;
  skippedCount?: number;
  readToolEnabled?: boolean;
  runToolEnabled?: boolean;
  readFileCount?: number;
  readFileSamples?: string[];
  scriptRunCount?: number;
  scriptRunSamples?: string[];
  /** @deprecated 0.1.20 起用 loaded；读历史 Turn 时 merged 映射为 loaded */
  merged?: Array<{ id: string; name: string }>;
};
```

Agent 完成后：`applySkillReadStatsToTurnUi` + 新增 `applySkillScriptRunStatsToTurnUi`。

### 7.3 Console API

| 端点 | 变更 |
| --- | --- |
| `GET /api/console/skill-configs` | 列表项增加 `alwaysLoad` |
| `GET/PATCH /api/console/skill-configs/:id` | 读写 `alwaysLoad` |
| 导入 | frontmatter `alwaysLoad` → 表字段 |

Chat API：Turn SSE / 消息持久化写入扩展快照；**无**新增 REST（tools 仅 Agent 内部）。

### 7.4 i18n keys（新增/替换，非穷举）

| Key 方向 | 用途 |
| --- | --- |
| `turnSafe.skillsMountedNotSelected` | mounted>0, loaded=0 |
| `turnSafe.skillsLoaded` | loaded>0 基础摘要 |
| `turnSafe.skillsLoadedWithRead` | + readCount |
| `turnSafe.skillsLoadedWithRun` | + runCount |
| `turnSafe.skillsLoadedWithReadAndRun` | 组合 |
| `turnSafe.skillsSelectionFailed` | failed_safe |
| `turnSafe.detail.skillsMountedTitle` / `skillsLoadedTitle` / `skillsSkippedTitle` / `skillsScriptRunTitle` | details 块 |

废弃或别名：`skillsMerged`、`skillsMergedWithRead`（历史 Turn 映射）。

---

## 8. 成功指标

| 指标 | 标准 |
| --- | --- |
| 误导性 Turn | 无关对话 **不再** 显示「已加载/已合并 N 个」 |
| 脚本可跑 | 含 `scripts/` 的 Pack 在相关对话中 **可成功 run**（参考 ui-ux-pro-max） |
| 安全 | 沙箱默认无出站网络；超时与配额可测 |
| 用户故事 | AC 通过率 100%（见两篇 user-stories） |
| 性能 | 意图路由 P95 ≤ 1.5s；单次脚本 P95 ≤ 配置 timeout |
| 兼容 | 0.1.19 历史 Turn 展示不崩溃 |

---

## 9. 实施优先级（同一版本内）

| 优先级 | 范围 | 依赖 |
| --- | --- | --- |
| **P0-A** | 意图路由 + `alwaysLoad` + Turn 三态文案 + `read` 白名单改 loaded | 无 |
| **P0-B** | `run_skill_script` 沙箱 + Turn run 展示 + 控制台文案 | **依赖 P0-A 的 loaded 白名单** |
| **P1** | 审计表 UI、日配额运营面板、intent 输入加 SKILL 摘要（**Q19** 若选增强） | 可跟 P0 同期或略后 |

Backend 建议顺序：**路由 → run 沙箱**；前端文案可与 P0-A 并行。

---

## 10. 与 0.1.19 / 现有代码衔接

| 模块 | 0.1.19 现状 | 0.1.20 变更要点 |
| --- | --- | --- |
| `turn-capabilities.ts` | 全量 merge；`SkillsTurnUiSnapshot.merged` | 新增 selection；`mounted`/`loaded`/`skipped`；注册 run tool |
| `langchain-agent.ts` | 三处独立 load refs | 单入口 selection + 传入 userMessageText |
| `read-skill-file-tool.ts` | 白名单 = mounted refs | 白名单 = **loaded** refs |
| `messages/route.ts` | `skillsSafeMessage` / `skillsDetailsFromUi` | 新摘要逻辑 + details 块 + 去 read-only scripts 注记（改为 run 说明） |
| `localize-turn-detail.ts` | legacy「已合并技能包」 | 新增 loaded/skipped/run 映射 |
| `UserSkillConfig` | 无 alwaysLoad | 新列 + DTO |
| `pack-frontmatter.ts` | name/description | + alwaysLoad 解析 |
| `knowledge-retrieval-intent-agent.ts` | KB 意图（参考实现） | 新建 skill-pack-intent-agent |

---

## 11. 待设计项清单（交接 design）

| 项 | 说明 |
| --- | --- |
| Turn 状态机 | mounted/loaded/skipped/read/run 组合与 C1b completed 条件 |
| alwaysLoad Switch | Pack 详情顶栏位置与 Tag 样式 |
| 「未选用」详情 | reason 展示密度、是否默认折叠 |
| 含脚本 Tag / Help | 从只读改为沙箱说明 |
| 历史 Turn | 0.1.19 快照降级展示规则 |
| 步骤隐藏 | mounted=0 时 C1b 是否隐藏 |

---

## 12. 与 0.1.19 路线图关系

| 0.1.19 承诺 | 0.1.20 交付 |
| --- | --- |
| MVP 不执行 scripts | **`run_skill_script` 沙箱执行** |
| 0.1.20+ 按需加载 | **意图路由 + Turn 多态** |
| `read_skill_file` | 保留；白名单改为 **已加载** Pack |

---

## 13. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-19 | 初稿：按需加载 + run_skill_script |
| 2026-06-19 | 审阅补全：术语表、代码衔接、Turn 快照 schema、skillsSafeMessage 分支、实施优先级 |
