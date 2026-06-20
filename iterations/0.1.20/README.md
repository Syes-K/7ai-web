# 迭代说明（version 0.1.20 — Skill Pack 增强）

在 **0.1.19 目录型 Skill Pack** 基础上，交付 **按需加载（意图路由）**、**Turn 挂载/加载/读取/运行多态**、**`alwaysLoad`**、**`run_skill_script` 沙箱**。

## 当前状态

| 阶段 | 状态 | 说明 |
| --- | --- | --- |
| 产品 | **已完成** | 用户确认「按默认执行」（Q1–Q22） |
| 设计 | **已完成** | 全套 spec + copy |
| Backend 3A | **已完成** | API / 数据模型 / 实现计划 |
| Backend 3B | **已完成** | 代码落地 + 联调后补丁（见 [deviations.md](./deviations.md)） |
| Frontend | **已完成** | Turn / 控制台 / i18n |
| **迭代结项** | **待用户验收** | 见 [COMPLETION.md](./COMPLETION.md) |

---

## 文档索引

| 阶段 | 路径 |
| --- | --- |
| 产品 | [product/prd.md](./product/prd.md)、[user-stories-skill-pack-intent.md](./product/user-stories-skill-pack-intent.md)、[user-stories-skill-pack-script-run.md](./product/user-stories-skill-pack-script-run.md)、[open-questions.md](./product/open-questions.md) |
| 设计 | [design/design-spec.md](./design/design-spec.md)、[design/spec-skill-pack-intent-routing.md](./design/spec-skill-pack-intent-routing.md)、[design/spec-run-skill-script.md](./design/spec-run-skill-script.md)、copy 两份 |
| 服务端 | [backend/README.md](./backend/README.md)、api-spec、data-models、implementation-plan、implementation-notes、risks |
| 前端 | [frontend/implementation-notes.md](./frontend/implementation-notes.md)、[deviations.md](./frontend/deviations.md)、[test-checklist.md](./frontend/test-checklist.md) |
| 结项 | [COMPLETION.md](./COMPLETION.md)、[deviations.md](./deviations.md)（跨阶段偏差汇总） |
| 夹具 | [fixtures/README.md](./fixtures/README.md) |

---

## 本期交付能力（P0）

| Epic | 能力 |
| --- | --- |
| **P0-A** | `resolveSkillPackSelectionForTurn` + `skill-pack-intent-agent`；`alwaysLoad`；Turn `mounted/loaded/skipped/read`；read 白名单 = loaded |
| **P0-B** | `run_skill_script` 子进程沙箱；配额 + `skill_script_runs` 审计；Turn run 展示；控制台「含脚本 → 沙箱可运行」 |

**术语**：挂载 → 加载（选用）→ 读取 → 运行。

---

## 关键决策（已确认）

- 开放问题 **Q1–Q22**：产品阶段 **「按默认执行」** 一次性确认（2026-06-19）。
- **Q21**：`mounted=0` 隐藏 C1b（非「未绑定助手」隐藏）。
- **Q2**：意图失败 `failed_safe`，非 `alwaysLoad` 不加载。
- **Skills 归属**：维持 **用户级** Pack（0.1.19 延续）；系统级目录 / 安全治理 → **下期产品确认**（见 COMPLETION §移交）。

---

## 联调后实现补丁（非原 PRD）

| 项 | 说明 |
| --- | --- |
| 意图超时默认 **15s** | 原 PRD/3A 为 1500ms；联调主模型 intent 常 timeout → 改为 `SKILL_PACK_INTENT_TIMEOUT_MS=15000` |
| 沙箱复制 **整个 `scripts/**`** | 原实现仅单文件；为支持 `ui-ux-pro-max` 多文件 import |
| `messages/en/api/message.json` | 修复尾随逗号 JSON 语法错误 |
| 新增测试夹具 | `multi-script-loop-test-skill`、`script-error-test-skill` |

详见 [deviations.md](./deviations.md)。

---

## 代码落点（摘要）

| 域 | 路径 |
| --- | --- |
| 意图路由 | `src/server/skill/skill-pack-intent-agent.ts` |
| 单轮选用 | `src/server/chat/turn-capabilities.ts` |
| Run 沙箱 | `src/server/skill/skill-script-sandbox.ts`、`run-skill-script-tool.ts` |
| 实体 | `UserSkillConfig.alwaysLoad`、`SkillScriptRun` |
| Turn | `messages/route.ts`、`normalize-skills-turn-ui.ts` |
| 前端 | `ChatWorkspace.tsx`、`SkillsClient.tsx`、`PackDetailDrawer.tsx` |
| 环境变量 | `.env.example` → `SKILL_PACK_INTENT_TIMEOUT_MS` 等 |

---

## 测试夹具

| 夹具 | 用途 |
| --- | --- |
| `../0.1.19/fixtures/greeting-test-skill` | read + 按需加载 + hello.py run |
| `fixtures/multi-script-loop-test-skill` | 多轮多脚本循环 run |
| `fixtures/script-error-test-skill` | run 失败 / 超时 / exit≠0 |
| `.cursor/skills/ui-ux-pro-max` | 真实多文件 Pack + `search.py`（需 zip 导入） |

---

## 已知限制（移交下期）

- 子进程沙箱非容器级隔离；出站网络 best-effort。
- Skills 仍为 **用户私有**；重复 import、安全治理未做系统级目录。
- 意图分类仅用 name + description（Q19 P1 可加 SKILL 摘要）。
- Turn 详情 intent 失败原因未在 UI 展示（仅服务端 log）。
- 审计表无控制台 UI。

---

## 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-19 | 全流程 product → frontend 完成 |
| 2026-06-20 | 结项文档：确认项、联调补丁、夹具、移交下期 |
