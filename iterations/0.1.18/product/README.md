# iterations/0.1.18/product

本目录为版本 **0.1.18** 的产品需求产出（阶段 1）：**控制台 Skills 管理与助手挂载**。

| 文件 | 说明 |
| --- | --- |
| `prd.md` | 主 PRD：背景、目标、范围、数据模型、运行时合并、验收汇总、设计交接 |
| `user-stories-skills.md` | 用户故事与分项 AC（Epic A–D） |
| `open-questions.md` | 待产品确认项与建议默认 |

---

## 需求摘要（5 条）

1. 新增用户级 **`UserSkillConfig`** CRUD 与控制台 **`/console/skills`**（对齐 MCP 管理体验）。
2. 助手表单增加 **Skills 多选挂载**（`AssistantSkillBinding`），与知识库、MCP 并列。
3. 对话运行时实现 **`loadSkillPackRefsForChatTurn` + `skillRefsToExtraSystemText`**，经既有 **`resolveSystemPromptWithSkills`** 合并进 system prompt。
4. Skills 本期为 **纯文本指令追加**，**不** 结构化引用 MCP；MCP 仍走助手 MCP 绑定。
5. Console **全量 i18n**；删除被助手引用的 Skill 时 **禁止删除**（对齐 MCP 409 策略）。

---

## 与代码/迭代的对照

| 参考 | 路径 |
| --- | --- |
| Skills 占位 | `src/server/chat/turn-capabilities.ts` |
| Agent 注入 | `src/server/chat/langchain-agent.ts` |
| MCP 模式 PRD | `iterations/0.1.9/product/prd.md` |
| Turn 管道定义 | `iterations/0.1.7/product/prd-chat-turn-pipeline.md` |
| 助手 MCP 挂载 UI | `src/app/[locale]/console/assistants/AssistantsClient.tsx` |
| Console i18n 规范 | `iterations/0.1.16/product/prd.md` |

---

阶段结束说明：以上内容供产品与研发评审；**下一阶段（设计）由父 agent 在用户确认门控后调度**。
