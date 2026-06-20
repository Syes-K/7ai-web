# 实现计划：Skill Pack 增强服务端（version 0.1.20）

阶段 **3B** 执行顺序；本文档不写业务代码，仅列步骤、依赖、文件清单与自测要点。

---

## 1. 目标对齐

| 来源 | 要点 |
| --- | --- |
| PRD / 用户故事 | Epic A~E；US-A1~A5、B1~B2、C1~C4、E1~E9 |
| 设计 | `spec-skill-pack-intent-routing.md`、`spec-run-skill-script.md` |
| 3A 契约 | `api-spec.md`、`data-models.md` |
| 硬约束 | `withApiWrapper`；TypeORM + SQLite；LangChain tool；中文注释 |
| **实施顺序** | **P0-A 意图路由 → P0-B run 沙箱**（Q18） |

---

## 2. 实施顺序总览

```text
① 数据层（alwaysLoad 列 + SkillScriptRun 实体 + 常量）
    ↓
② P0-A 意图路由（skill-pack-intent-agent + resolveSkillPackSelectionForTurn）
    ↓
③ P0-A Agent/Turn 衔接（langchain-agent、assistant、messages/route、快照演进）
    ↓
④ P0-A Console/DTO/frontmatter（alwaysLoad API + 同步）
    ↓
⑤ P0-B run 沙箱（sandbox + run-skill-script-tool + 配额 + 审计）
    ↓
⑥ P0-B Turn run 统计 + read tool description 更新
    ↓
⑦ i18n keys + 自测 + implementation-notes 补充
```

**前端可并行**：④ 完成后对接 alwaysLoad Switch；③ 完成后对接 Turn 文案；⑤ 完成后对接 run 展示。

---

## 3. 与 0.1.19 差异清单

| 文件 | 0.1.19 | 0.1.20 变更 |
| --- | --- | --- |
| `turn-capabilities.ts` | 全量 merge；`merged`；三处独立 load | **`resolveSkillPackSelectionForTurn`**；`mounted/loaded/skipped`；`resolveAllToolsForAgent(ctx, selectedRefs)` |
| `langchain-agent.ts` | 并行 prompt/tools/snapshot 各自 load | 先 selection，再传入 `selectedRefs`；**`userMessageText`** |
| `assistant.ts` | 无 `userMessageText`；仅 read 统计 | 传 `userMessageText`；**run 统计**合并 |
| `read-skill-file-tool.ts` | mounted 白名单；「read-only scripts」 | **loaded** 白名单；description 改 run 提示 |
| `skill-pack-intent-agent.ts` | 不存在 | **新建** |
| `run-skill-script-tool.ts` | TODO | **新建** |
| `skill-script-sandbox.ts` | 不存在 | **新建**（建议） |
| `UserSkillConfig.ts` | 无 alwaysLoad | **+alwaysLoad** |
| `SkillScriptRun.ts` | 不存在 | **新建** |
| `pack-frontmatter.ts` | name/description | **+alwaysLoad 解析** |
| `pack-files.ts` | sync name/description | **+sync alwaysLoad** |
| `pack-import.ts` | 同上 | 导入写 **alwaysLoad** |
| `skill-config-dto.ts` | 无 alwaysLoad | **+alwaysLoad** |
| `skill-configs/[id]/route.ts` | PATCH 无 alwaysLoad | **+alwaysLoad** |
| `messages/route.ts` | `skillsSafeMessage` 用 `merged`；loaded=0 误报未挂载 | **重写**分支 + C1b 隐藏 + 去 readOnlyNote |
| `common/constants` | 无 script 配额 | **+SKILL_SCRIPT_*** |

---

## 4. 步骤 ① — 数据层

### 4.1 实体

| 任务 | 文件 |
| --- | --- |
| `UserSkillConfig` + `alwaysLoad` | `src/server/db/entities/UserSkillConfig.ts` |
| 新建 `SkillScriptRun` | `src/server/db/entities/SkillScriptRun.ts` |
| 注册实体 | `src/server/db/data-source.ts` |

### 4.2 常量

| 常量 | 默认值 | 文件 |
| --- | --- | --- |
| `SKILL_PACK_INTENT_TIMEOUT_MS` | `1500` | `src/common/constants/index.ts` |
| `SKILL_SCRIPT_DEFAULT_TIMEOUT_MS` | `30000` | 同上 |
| `SKILL_SCRIPT_MAX_TIMEOUT_MS` | `120000` | 同上 |
| `SKILL_SCRIPT_MAX_RUNS_PER_TURN` | `5` | 同上 |
| `SKILL_SCRIPT_MAX_RUNS_PER_USER_DAY` | `100` | 同上 |
| `SKILL_SCRIPT_OUTPUT_MAX_CHARS` | `32000` | 同上 |
| `RUN_SKILL_SCRIPT_TOOL_NAME` | `"run_skill_script"` | 同上 |
| `SKILL_PACK_INTENT_TAG` | `"SKILL_PACK_INTENT"` | 同上 |

环境变量覆盖见 `implementation-notes.md` §4。

### 4.3 类型（建议）

| 文件 | 内容 |
| --- | --- |
| `src/common/types/skill-turn.ts` | `SkillsTurnUiSnapshot`、`SkillPackSelectionResult` |
| `src/common/types/index.ts` | 导出 |

**自测**：空库启动；`user_skill_configs` 含 `alwaysLoad` 列；`skill_script_runs` 表存在。

---

## 5. 步骤 ② — P0-A 意图路由

| 文件 | 职责 |
| --- | --- |
| `src/server/skill/skill-pack-intent-agent.ts` | 对齐 `knowledge-retrieval-intent-agent.ts`；JSON 解析；1500ms 超时 |
| `src/server/chat/turn-capabilities.ts` | `resolveSkillPackSelectionForTurn`；`buildSkillsTurnUiFromSelection` |

### 5.1 `resolveSkillPackSelectionForTurn` 要点

1. `mountedRefs = loadSkillPackRefsForChatTurn(ctx)`
2. 加载 Pack 行（name、description、alwaysLoad、enabled）
3. `alwaysIds` → 无条件 `selectedIds`
4. `candidates = mounted - alwaysIds`
5. 空消息 / 无 candidates → 跳过 intent 调用
6. 否则 `decideSkillPackIntent({ userId, userMessageText, packs: candidates })`
7. `selectedIds = alwaysIds ∪ intent.selectedIds`（过滤 ⊆ candidates）
8. `skipped = mounted - selected`；附 `reasons`
9. `selectedRefs` 用于 merge + tools

### 5.2 重构现有函数

| 函数 | 变更 |
| --- | --- |
| `resolveSystemPromptWithSkills` | 签名改为 `(base, ctx, selectedRefs?)`；无 refs 时内部走 selection（或强制调用方传入） |
| `resolveSkillsTurnUiSnapshot` | 改为 `buildSkillsTurnUiFromSelection(selection, toolsMeta)` |
| `resolveAllToolsForAgent` | `(ctx, selectedRefs, selection?)`；注册 read + run |

**自测**

- [ ] 挂载问候包 + 「天津天气」→ loaded=0，skipped 含问候包
- [ ] 「请用技能包测试打个招呼」→ loaded=1
- [ ] alwaysLoad + 天气 → 该包在 loaded
- [ ] intent 模拟失败 → failed_safe，非 always 不加载
- [ ] 日志含 `module: skill.intent`

---

## 6. 步骤 ③ — P0-A Agent / Turn 衔接

| 文件 | 变更 |
| --- | --- |
| `langchain-agent.ts` | `GetChatAssistantAgentOptions.userMessageText`；单入口 selection |
| `assistant.ts` | `userMessageText` 透传；`onSkillsTurnFinalized` 含 read（run 在步骤 ⑥） |
| `messages/route.ts` | `skillsSafeMessage` / `skillsDetailsFromUi` 重写；`shouldEmitSkillsStep`；传 `userMessageText` |
| `src/common/utils/normalize-skills-turn-ui.ts` | legacy `merged` 映射（可选独立文件） |

**自测**

- [ ] C1b 在 mounted=0 时不出现
- [ ] mounted>0, loaded=0 摘要为「已挂载 N，本轮未选用」
- [ ] 0.1.19 历史 Turn（仅 merged）展示不崩溃

---

## 7. 步骤 ④ — P0-A Console / frontmatter

| 文件 | 变更 |
| --- | --- |
| `skill-config-dto.ts` | `alwaysLoad` 字段 |
| `skill-configs/[id]/route.ts` | PATCH `alwaysLoad` |
| `pack-frontmatter.ts` | `parseAlwaysLoadFromFrontmatter` |
| `pack-files.ts` | `syncPackMetadataFromSkillMd` 扩展 |
| `pack-import.ts` | 导入事务写 `alwaysLoad` |

**自测**

- [ ] PATCH alwaysLoad 持久化
- [ ] 导入 frontmatter `alwaysLoad: true` → Switch 对应 true
- [ ] 保存 SKILL.md frontmatter 同步表

---

## 8. 步骤 ⑤ — P0-B run 沙箱

| 文件 | 职责 |
| --- | --- |
| `src/server/skill/skill-script-sandbox.ts` | 临时目录、cwd、py/bash spawn、超时 kill、无网络（`unshare` / `deny` 或平台 best-effort） |
| `src/server/skill/skill-script-quota.ts` | Turn collector + 日 COUNT 查询 |
| `src/server/skill/run-skill-script-tool.ts` | LangChain tool；校验链；调用 sandbox；写审计 |
| `turn-capabilities.ts` | `skillPackRefsToRunTools`；`applySkillScriptRunStatsToTurnUi` |

### 8.1 沙箱目录结构（建议）

```text
/tmp/7ai-skill-run-{uuid}/
  scripts/          ← 从 DB 写出目标脚本
  data/             ← 同 Pack 只读副本（可选 bind）
  workspace/        ← cwd，可写
```

### 8.2 网络隔离（MVP best-effort）

- macOS/Linux：子进程 env 清空代理；可选 `NODE_OPTIONS` 不适用
- Python：不注入网络库禁用（依赖 OS 层；文档化「best-effort 无出站」）
- 验收：夹具脚本 `curl` 失败即可

**自测**

- [ ] `scripts/hello.py` exitCode=0
- [ ] 非 `scripts/` 路径拒绝
- [ ] `.txt` 扩展名拒绝
- [ ] 第 6 次同 Turn run → 配额错误，**不计** scriptRunCount
- [ ] 审计表有记录；日限额可测（可调低 env）

---

## 9. 步骤 ⑥ — P0-B Turn / read 收尾

| 文件 | 变更 |
| --- | --- |
| `read-skill-file-tool.ts` | loaded 白名单 + description |
| `assistant.ts` | `applySkillScriptRunStatsToTurnUi` 链接 |
| `messages/route.ts` | run 摘要/details；移除 readOnlyNote |

**自测**

- [ ] read + run 组合摘要 key 正确
- [ ] run 失败 exitCode≠0 仍计入 details
- [ ] 未 loaded Pack 调用 run → 白名单错误

---

## 10. 步骤 ⑦ — i18n 与夹具

| 任务 | 文件 |
| --- | --- |
| 新增 turnSafe keys | `messages/en/api/message.json`、`messages/zh/api/message.json` |
| greeting-test SKILL.md | `iterations/0.1.19/fixtures/greeting-test-skill/SKILL.md`（允许 run hello.py） |

---

## 11. 3B 关键文件清单（实施时优先打开）

| 优先级 | 文件 |
| --- | --- |
| P0 | `src/server/chat/turn-capabilities.ts` |
| P0 | `src/server/skill/skill-pack-intent-agent.ts`（新建） |
| P0 | `src/server/chat/langchain-agent.ts` |
| P0 | `src/server/chat/assistant.ts` |
| P0 | `src/app/api/chat/conversations/[conversationId]/messages/route.ts` |
| P1 | `src/server/skill/run-skill-script-tool.ts`（新建） |
| P1 | `src/server/skill/skill-script-sandbox.ts`（新建） |
| P1 | `src/server/skill/read-skill-file-tool.ts` |
| P2 | `src/server/db/entities/UserSkillConfig.ts` |
| P2 | `src/server/db/entities/SkillScriptRun.ts`（新建） |
| P2 | `src/server/skill/pack-frontmatter.ts` |
| P2 | `src/app/api/console/skill-configs/[id]/route.ts` |
| 参考 | `src/server/knowledge-base/knowledge-retrieval-intent-agent.ts` |

---

## 12. 端到端验收场景

| # | 场景 | 期望 |
| --- | --- | --- |
| 1 | 问候包 + 「天津天气」 | Turn：已挂载 1，未选用；prompt 无问候 SKILL |
| 2 | 「请用技能包测试打个招呼」 | loaded=1；可 read greetings.md |
| 3 | alwaysLoad + 天气 | 问候包在 loaded |
| 4 | ui-ux-pro-max + UI 问题 | run `scripts/search.py` 成功 |
| 5 | 意图超时 mock | failed_safe 文案；非 always 不加载 |
| 6 | 0.1.19 旧会话 Turn | legacy merged 展示正常 |

---

## 13. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-19 | 3A：P0-A→P0-B 实施计划与文件清单 |
