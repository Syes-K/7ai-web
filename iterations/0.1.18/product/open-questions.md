# 开放问题（version 0.1.18 — Skills 管理）

本文档汇总 **待产品确认** 项；每项含 **建议默认**。定稿后请同步更新 `prd.md` 第 6、12 节与 `README.md`。

---

## 决策清单

| ID | 问题 | 建议默认 | 影响面 |
| --- | --- | --- | --- |
| **Q1** | 是否支持 **系统预置 Skills**（admin 下发、全员可见）？ | **否**，本期仅 **用户自建** `UserSkillConfig`；系统级提示词继续走 admin prompts | 数据模型、控制台列表、权限 |
| **Q2** | Skill 正文 **存储与合并格式**：纯文本 vs Markdown 源；合并时是否 strip / 转义？ | 存储 **Markdown 源字符串**；合并进 system prompt 时 **原样追加**（不渲染 HTML）；块标题 `## Skill: {name}` 由服务端生成 | 编辑器选型、token 体积 |
| **Q3** | 多 Skill **合并顺序**？ | 按 `skillConfigId` **字典序稳定排序**（与 MCP id 排序一致）；暂不支持用户拖拽优先级 | 运行时、测试断言 |
| **Q4** | **正文与挂载上限**是否采纳 PRD 建议值？ | `SKILL_CONFIG_MAX_PER_USER=50`、`MAX_PER_ASSISTANT=10`、`MAX_BINDINGS_PER_CHAT_TURN=10`、`CONTENT_MAX_LENGTH=16000` | 常量、校验、UX 提示 |
| **Q5** | 运行时 **单条 Skill 被跳过** 时，对用户是否可见？ | **不可见**（仅服务端 log）；与 MCP 部分失败「低调」策略一致 | 对话 UI、Toast |
| **Q6** | 是否在 Turn 推理面板新增 **`skills_resolution`** 步骤？ | **建议纳入 MVP**（轻量：completed + 「已合并 N 项 Skills」）；若排期紧可 **延后**，不阻塞后端合并 | `turn-runtime.ts`、`ChatWorkspace` |
| **Q7** | 删除仍被引用的 Skill：**禁止删除** vs **级联解绑**？ | **禁止删除** + 409 + 引用数（**对齐现行 MCP**） | API、Popconfirm 文案 |
| **Q8** | `enabled=false` 且仍被助手挂载：是否 **阻止保存助手**？ | **不阻止**；保存允许；对话忽略；表单展示 **警告条**（对齐 MCP inactive 警告） | 助手 Modal |
| **Q9** | 是否提供 Skill **预览**（查看合并后进 prompt 的片段）？ | **本期不做**；用户通过编辑正文自检 | 控制台 UI 范围 |
| **Q10** | 是否支持 **结构化 skill pack**（JSON：`instructions` + 可选 `mcpConfigIds`）？ | **本期不做**；Skill 与 MCP **解耦挂载**；结构化列为后续迭代 | 后端解析、产品边界 |
| **Q11** | Skills 菜单在侧栏的 **位置**？ | **MCP 之后**（profile → models → assistants → knowledge → mcp → **skills**） | 导航 |
| **Q12** | API 路径命名：`/api/console/skills` vs `/api/console/skill-configs`？ | **`/api/console/skill-configs`**，与 `mcp-configs` 命名对称 | REST 路由 |

---

## 已建议采纳（无需再议，除非用户反对）

以下在 PRD 中作为默认实现，若评审无异议则视为 **Closed**：

- Skills 产品语义 = **服务端技能包**，非 Cursor Skill 文件。
- 运行时经 `resolveSystemPromptWithSkills`，与 MCP tools 路径分离。
- Console Skills 页 **纳入 i18n**（0.1.16+ 规范）。
- 无 `assistantId` 的会话 **不加载** Skills。
- Skill **不可** 程序化引用 MCP（Q10 否）。

---

## 确认方式

请在回复中逐条确认、修改建议默认、或声明「按 PRD 默认执行」。父 agent 在用户确认门控通过后再进入 **设计阶段**。
