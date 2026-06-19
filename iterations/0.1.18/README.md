# 迭代说明（version 0.1.18 — Skills 管理）

本迭代为 **Skills 控制台 + 助手挂载 + 对话合并** 的首版实现（单字段 Markdown 正文）。**运行时与数据形态已在 0.1.19 被 Skill Pack 目录包替换**；本目录文档保留作需求与设计快照。

## 文档索引

| 阶段 | 路径 |
| --- | --- |
| 产品 | `product/prd.md`、`product/user-stories-skills.md`、`product/open-questions.md` |
| 设计 | `design/design-spec.md`、`design/spec-skills-console.md`、`design/spec-assistant-skill-bindings.md`、`design/spec-chat-agent-skills.md` |
| 服务端 | `backend/api-spec.md`、`backend/data-models.md`、`backend/implementation-plan.md`、`backend/implementation-notes.md` |
| 前端 | `frontend/implementation-notes.md` |

## 本轮关键决策（历史）

1. **挂载链**：`UserSkillConfig` → `AssistantSkillBinding` → 会话 `assistantId` → Turn（非会话直挂）。
2. **数据**：单表 `user_skill_configs.content` 文本字段。
3. **运行时**：`content` 拼进 system prompt；**无** Skill 专用 tools。
4. **Turn**：`C1b` / `skills_resolution` 展示合并数量。

## 与 0.1.19 关系

| 0.1.18 | 0.1.19 替换 |
| --- | --- |
| 单 `content` TextArea | 目录包 + `skill_pack_files` |
| 无 files API | files / import API |
| 无 read tool | `read_skill_file` |
| — | 迁移 `content` → `SKILL.md` |

**仓库当前代码**：以 **0.1.19 Skill Pack** 为准；0.1.18 单正文 UI 已移除。

## 当前状态

- **已完成**：需求 → 设计 → 服务端 → 前端（0.1.18 周期内）
- **已演进**：产品形态不满足「Cursor 式目录 Skill」预期 → **0.1.19 直接替换**（见 `../0.1.19/README.md`）
- **后续**：按需加载与脚本执行见 `../0.1.20/product/prd.md`

## 验收（历史）

见 `frontend/implementation-notes.md`；联调请以 0.1.19 测试夹具 `../0.1.19/fixtures/greeting-test-skill/` 为准。
