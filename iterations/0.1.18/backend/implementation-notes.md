# 实现说明（version 0.1.18 — Backend 3B）

阶段 **3B** 服务端代码实现记录。

---

## 已实现

| 模块 | 路径 |
| --- | --- |
| 实体 | `UserSkillConfig`、`AssistantSkillBinding` |
| 领域 | `src/server/skill/*` |
| API | `/api/console/skill-configs`、`/api/console/assistants/:id/skill-configs` |
| 运行时 | `turn-capabilities.ts`：`loadSkillPackRefsForChatTurn`、`skillRefsToExtraSystemText`、`resolveSkillsTurnUiSnapshot` |
| Agent | `langchain-agent.ts` 返回 `skillsTurnUi` |
| Turn | `turn-runtime.ts` 新增 `C1b`；`messages/route.ts` 写入 skills 步骤 |
| i18n | `messages/{en,zh}/api/message.json` |
| 级联 | 删除助手时清理 `AssistantSkillBinding` |

---

## 自测建议

1. `POST /api/console/skill-configs` 创建 Skill；`GET` 列表含 `referencedAssistantCount`。
2. 助手 `PUT .../skill-configs` 挂载；对话时 system prompt 含 `## Skill:` 块。
3. 被引用 Skill `DELETE` → 409；解绑后 204。
4. SSE Turn 含 `C1b` completed 与 `turnSafe.skillsMerged` 文案。

---

## 待前端（阶段 4）

- `/console/skills` 页面
- `AssistantsClient` Skills 多选
- `ChatWorkspace` C1b 步骤展示与隐藏逻辑
