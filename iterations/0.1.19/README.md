# 迭代说明（version 0.1.19 — Skill Pack）

本迭代将 0.1.18 **单字段 Skills** 演进为 **目录型 Skill Pack**（`SKILL.md` + 多文件 + zip 导入 + `read_skill_file`）；控制台 Drawer 文件树；Turn 展示 read 次数；**MVP 不执行** `scripts/`。

## 文档索引

| 阶段 | 路径 |
| --- | --- |
| 产品 | `product/prd.md`、`product/user-stories-skill-pack.md`、`product/open-questions.md` |
| 设计 | `design/design-spec.md`、`design/spec-skill-pack-console.md`、`design/spec-assistant-skill-bindings.md`、`design/spec-chat-agent-skill-pack.md`、`design/spec-migration-0.1.18.md` |
| 服务端 | `backend/README.md`、`backend/api-spec.md`、`backend/data-models.md`、`backend/implementation-plan.md`、`backend/implementation-notes.md` |
| 前端 | `frontend/implementation-notes.md`、`frontend/deviations.md`、`frontend/test-checklist.md` |

## 本轮关键决策

1. **形态**：目录包替换 `content`；兼容 `.cursor/skills/` 等同构 zip。
2. **挂载链**：不变（Pack → 助手 → 会话 → Turn）。
3. **运行时**：`SKILL.md` → prompt + **`read_skill_file`**；`scripts/` 只读不执行。
4. **迁移**：幂等 `content` → `SkillPackFile(SKILL.md)`。
5. **文案**：控制台用户向说明；已移除迁移 Banner（0.1.18→0.1.19 提示）。

## 代码落点（摘要）

| 域 | 路径 |
| --- | --- |
| 实体 | `UserSkillConfig`、`SkillPackFile`、`AssistantSkillBinding` |
| 领域 | `src/server/skill/*`（pack-files、import、read-skill-file-tool） |
| API | `/api/console/skill-configs/**`、`/api/console/assistants/:id/skill-configs` |
| 运行时 | `turn-capabilities.ts`、`langchain-agent.ts` |
| 控制台 | `src/app/[locale]/console/skills/**` |
| 对话 | `ChatWorkspace.tsx` C1b、`localize-turn-detail.ts` |

## 测试夹具

`fixtures/greeting-test-skill/` + `greeting-test-skill.zip` — 导入 / read / 助手挂载联调。

## 已知限制（移交 0.1.20）

- **每轮全量合并**所有挂载 Pack（问无关问题仍显示「已加载/已合并」）→ 0.1.20 意图路由。
- **`scripts/` 不可执行** → 0.1.20 `run_skill_script` 沙箱。
- Turn 摘要部分仍为服务端 locale 快照英文 → 0.1.20 用户向文案统一。

## 当前状态

- **已完成**：product → design → backend 3A/3B → frontend；`npm run build` 编译与类型检查通过。
- **偏差**：见 `frontend/deviations.md`（如无独立新建文件夹 UI、迁移 Banner 已删除等）。

## 验收

见 `frontend/test-checklist.md`。
