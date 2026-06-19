# 服务端文档索引（version 0.1.18 — Skills）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.18` |
| 阶段 | **3A（仅文档）** |
| 上游 | `iterations/0.1.18/product/`、`iterations/0.1.18/design/` |
| 参考实现 | `iterations/0.1.9/backend/`（MCP 对称模式）、`src/server/mcp/*`、`src/app/api/console/mcp-configs/**` |

---

## 文档列表

| 文件 | 说明 |
| --- | --- |
| [api-spec.md](./api-spec.md) | REST API 完整规格：`/api/console/skill-configs` CRUD、助手子资源 `skill-configs`、鉴权、错误码与 `api/message.json` key 映射 |
| [data-models.md](./data-models.md) | `UserSkillConfig`、`AssistantSkillBinding` 实体、索引、与 MCP 对照、TypeORM 登记与迁移策略 |
| [implementation-plan.md](./implementation-plan.md) | 3B 分步实现：DB → API → 运行时 → Turn → i18n |
| [risks-and-open-items.md](./risks-and-open-items.md) | 风险、测试要点、与前端交接项 |

---

## 本期范围摘要

- **仅用户自建** `UserSkillConfig`；无系统预置、无 `toolRefs`、无连接测试。
- **助手多对多挂载** `AssistantSkillBinding`；子资源 `GET/PUT /api/console/assistants/:id/skill-configs`。
- **运行时**：`loadSkillPackRefsForChatTurn` + `skillRefsToExtraSystemText` → `resolveSystemPromptWithSkills`；合并格式 `## Skill: {name}` + 原样 `content`，块间 `\n\n---\n\n`，按 `skillConfigId` 字典序。
- **上限**：50 / 10 / 10 / 16000（用户条数 / 助手挂载 / 单轮加载 / 正文长度）。
- **删除被引用**：409 + `SKILL_CONFIG_REFERENCED_BY_ASSISTANT`；`enabled=false` 运行时静默跳过。
- **Turn**：新增 `C1b` / `skills_resolution`（介于 knowledge 与 MCP 之间）。
- **i18n**：Console 与 API 错误双语（`tApiMessage`）；UGC 字段不翻译。

---

## 3B 入口文件（速查）

| 类别 | 路径 |
| --- | --- |
| 实体 | `src/server/db/entities/UserSkillConfig.ts`、`AssistantSkillBinding.ts` |
| 数据层登记 | `src/server/db/data-source.ts` |
| 领域模块（建议） | `src/server/skill/*`（对称 `src/server/mcp/*`） |
| API | `src/app/api/console/skill-configs/**`、`src/app/api/console/assistants/[id]/skill-configs/route.ts` |
| 运行时 | `src/server/chat/turn-capabilities.ts` |
| Turn | `src/server/chat/turn-runtime.ts`、`src/app/api/chat/conversations/[conversationId]/messages/route.ts` |
| 常量 / 枚举 | `src/common/constants/index.ts`、`src/common/enums/http.ts` |
| i18n | `messages/{en,zh}/api/message.json` |

---

## 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-18 | 3A 初稿 |
