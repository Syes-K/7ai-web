# 服务端文档索引（version 0.1.20 — Skill Pack 增强）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.20` |
| 阶段 | **3B 已完成**（代码 + 联调补丁） |
| 上游 | `iterations/0.1.20/product/`、`iterations/0.1.20/design/` |
| 前置实现 | `0.1.19` Skill Pack |
| 下游 | 前端阶段 4 ✅；结项见 [../COMPLETION.md](../COMPLETION.md) |

---

## 1. 本期范围摘要

在 **0.1.19** 基础上，同一迭代交付两大 **P0** 能力：

| 优先级 | 能力 | 说明 |
| --- | --- | --- |
| **P0-A** | **按需加载（Intent Routing）** | `resolveSkillPackSelectionForTurn` + `skill-pack-intent-agent`；Turn 区分 mounted / loaded / skipped / read |
| **P0-B** | **`run_skill_script` 沙箱** | 子进程执行 `scripts/*.py|.sh`；配额 + `skill_script_runs` 审计 |

**挂载链不变**：Pack → `AssistantSkillBinding` → 会话 `assistantId` → Turn。

**与 0.1.19 核心差异**：

| 维度 | 0.1.19 | 0.1.20 |
| --- | --- | --- |
| SKILL.md 合并 | **全部** mounted Pack | 仅 **loaded**（意图路由 + `alwaysLoad`） |
| Turn 快照 | `merged[]` | `mounted[]` + `loaded[]` + `skipped[]` |
| `read_skill_file` 白名单 | mounted refs | **loaded** refs |
| `run_skill_script` | 不存在（TODO） | **注册**；白名单 = loaded |
| Pack 元数据 | name、description、enabled | + **`alwaysLoad`** |
| Agent 入口 | 三处独立 `loadSkillPackRefsForChatTurn` | **单入口 selection** + `userMessageText` |

---

## 2. 文档清单

| 文件 | 用途 |
| --- | --- |
| [api-spec.md](./api-spec.md) | REST 增量（`alwaysLoad`）、Turn SSE 字段、`read_skill_file` / `run_skill_script` 工具契约 |
| [data-models.md](./data-models.md) | `alwaysLoad` 列、`skill_script_runs` 实体、`SkillsTurnUiSnapshot` 演进与 legacy 归一化 |
| [implementation-plan.md](./implementation-plan.md) | 3B 实施顺序（**路由 → run 沙箱**）、文件清单、与 0.1.19 差异、自测要点 |
| [implementation-notes.md](./implementation-notes.md) | selection 算法、intent agent、沙箱实现要点、错误码、环境变量 |
| [risks-and-open-items.md](./risks-and-open-items.md) | 实现风险与安全边界（开放问题已关闭） |

---

## 3. 与 0.1.19 后端文档关系

| 0.1.19 | 0.1.20 变更 |
| --- | --- |
| 全量 merge `SKILL.md` | 意图路由后仅 merge **selectedRefs** |
| `SkillsTurnUiSnapshot.merged` | 演进为 `mounted` / `loaded` / `skipped`；`merged` deprecated |
| `read_skill_file` 白名单 = mounted | 白名单 = **loaded** |
| `scripts/` 只读不执行 | **`run_skill_script`** 沙箱执行 |
| 无 `alwaysLoad` | 表字段 + frontmatter 同步 |
| 无审计表 | **`skill_script_runs`**（90 天保留） |

控制台 files / import API **语义不变**；仅 DTO 与 frontmatter 同步扩展 `alwaysLoad`。

---

## 4. 3B 代码落点速查

| 域 | 路径 |
| --- | --- |
| **P0-A 意图路由** | `src/server/skill/skill-pack-intent-agent.ts`（新建） |
| **P0-A selection** | `src/server/chat/turn-capabilities.ts` |
| **P0-A Agent 衔接** | `src/server/chat/langchain-agent.ts`、`src/server/chat/assistant.ts` |
| **P0-B run tool** | `src/server/skill/run-skill-script-tool.ts`（新建） |
| **P0-B 沙箱** | `src/server/skill/skill-script-sandbox.ts`（新建，建议） |
| **P0-B 配额/审计** | `src/server/skill/skill-script-quota.ts`（新建，建议） |
| **实体** | `UserSkillConfig.ts`（+alwaysLoad）、`SkillScriptRun.ts`（新建） |
| **DTO/校验** | `skill-config-dto.ts`、`pack-frontmatter.ts`、`pack-files.ts`、`pack-import.ts` |
| **Console API** | `skill-configs/route.ts`、`skill-configs/[id]/route.ts` |
| **Turn 文案** | `messages/route.ts`（`skillsSafeMessage` / `skillsDetailsFromUi` / C1b 隐藏） |
| **常量** | `src/common/constants/index.ts` |
| **类型** | `src/common/types/skill-turn.ts`（新建，建议） |
| **i18n** | `messages/{en,zh}/api/message.json` |

完整顺序见 [implementation-plan.md](./implementation-plan.md)。

---

## 5. 已拍板决策（来自 open-questions，3B 直接实现）

| ID | 决策 |
| --- | --- |
| Q1 | 低温 LLM 意图分类器（对齐 KB intent） |
| Q2 | 路由失败 → `failed_safe`；非 always **不加载** |
| Q3 | `alwaysLoad` 表字段权威；frontmatter 保存/导入时同步 |
| Q19 | MVP 意图输入仅 name + description（≤400 字） |
| Q21 | `mounted=0` 隐藏 C1b |
| Q22 | legacy `merged[]` → `loaded=mounted` |
| Q6–Q16 | 子进程沙箱、py/sh、无网络、5/turn、100/day、审计 90 天 |

---

## 6. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-19 | 3A 初稿：意图路由 + run_skill_script 全套服务端文档 |
| 2026-06-20 | 3B 结项；联调补丁见 [../deviations.md](../deviations.md) |
