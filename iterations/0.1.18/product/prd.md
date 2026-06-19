# PRD：控制台 Skills 管理与助手挂载（version 0.1.18）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.18` |
| 阶段 | 产品需求（阶段 1） |
| 状态 | 草案，待产品确认 |
| 前置迭代 | `0.1.7`（对话 Turn 管道与 skills 占位）；`0.1.9`（MCP 控制台 + 助手挂载模式）；`0.1.16`（console 全量 i18n） |

---

## 1. 背景与问题陈述

7ai-web 是对话平台，用户已在个人控制台完成 **模型**、**MCP**、**知识库**、**助手** 的配置，并在对话链路中通过助手绑定将 MCP 注入 Agent tools、将知识库用于 RAG。

**Skills（产品语义）** 指 **服务端技能包**：在对话构建 Agent 时，将用户定义的技能说明 **合并进系统提示（system prompt）**，以塑造助手行为、领域规范或工作流指令。这与 **Cursor 编辑器内的 Skill 文件**（`.cursor/skills/`、本地开发辅助）**不是同一层级**，不得混用概念或复用同一套存储。

当前代码已预留加载机制，但 **未实现业务数据与控制台管理**：

| 位置 | 现状 |
| --- | --- |
| `src/server/chat/turn-capabilities.ts` | `loadSkillPackRefsForChatTurn` 返回 `[]`；`skillRefsToExtraSystemText` 返回 `""` |
| `resolveSystemPromptWithSkills` | 已实现「基础 prompt + skills 追加」合并逻辑 |
| `src/server/chat/langchain-agent.ts` | `getAssistantAgent` 并行调用 `resolveSystemPromptWithSkills` 与 `resolveAllToolsForAgent` |
| 控制台 | 无 Skills 菜单与 CRUD；助手表单仅有知识库、MCP 挂载，无 Skills 多选 |
| 对话 Turn UI | `ChatWorkspace` 可识别含 `skill` 的子步骤文案，但 `turn-runtime.ts` 尚无 `skills_resolution` 步骤 |

用户原话期望：**在 console 配置 skills，在 assistant 上挂载，对话中即可生效**——与 MCP 的「用户级资源 CRUD + 助手多选挂载 + 运行时解析」模式一致。

---

## 2. 目标（Goals）

1. **可治理**：登录用户可在个人控制台完成 Skills 的增删改查、启用/停用；数据 **用户私有**，读写经 `userId` 隔离。
2. **可组合**：单个助手可挂载 **0 个或多个** Skills（与知识库、MCP 并列配置）；关系清晰、可审计。
3. **可运行时一致**：绑定助手的会话在 **与 MCP 相同的 Agent 构建路径** 中加载 Skills，经 `resolveSystemPromptWithSkills` 合并进最终 `systemPrompt`，**不得**在路由或 Agent 层旁路拼装第二套提示词。
4. **可验收**：功能范围、权限、失败降级与 AC 可测试；与「无助手 / 无 Skills / Skills 禁用」场景兼容。
5. **体验一致**：控制台 Skills 页与 API 错误遵循 **0.1.16+ console 全量 i18n** 规范（UI 双语；UGC 内容不翻译）。

---

## 3. 非目标（Non-Goals）

- **不**实现 Cursor IDE Skill 文件的上传、同步或 `.cursor/skills` 互通。
- **不**在本期实现 Skills 内的 **程序化 MCP / 工具引用**（结构化 skill pack 含 `toolRefs`）；MCP 仍仅通过助手 **MCP 挂载** 注入 tools（见第 6 节边界）。
- **不**实现 Skills **版本历史**、发布审批、团队共享库或 Skills 市场（可列为后续迭代）。
- **不**实现「系统预置 Skills」的管理端下发（除非产品确认纳入 MVP，默认 **仅用户自建**）。
- **不**改变知识库检索、MCP tools 解析的既有语义；Skills 仅影响 system prompt 文本。
- **不**要求对话 UI 默认展示「本轮已加载 Skills 全文」或合并后 prompt 预览（调试能力可后续单独立项）。

---

## 4. 用户与核心场景

| 角色 | 说明 |
| --- | --- |
| 普通登录用户 | 拥有个人控制台、助手与对话会话；可创建 Skills 并挂载到自有助手。 |

**核心场景：**

1. 用户在控制台 **Skills 管理** 新建一条技能（名称、描述、正文、启用开关），保存后在列表可见。
2. 用户在 **助手管理** 新建/编辑助手时，与知识库、MCP 并列 **多选挂载 Skills**，保存后回显一致。
3. 用户选择该助手开始对话；Agent 构建时加载已启用且仍存在的 Skills，将正文 **追加** 到助手基础 system prompt 之后，模型按合并后的指令回复。
4. 用户禁用某 Skill 或从助手解绑后，后续对话 **不再** 注入该 Skill 文案。

详细用户故事见 **`user-stories-skills.md`**。

---

## 5. 功能范围

### 5.1 概念定义

| 术语 | 定义 |
| --- | --- |
| **Skill / 技能包** | 一条用户私有的、可复用的 **指令正文**（产品层称「技能包」），运行时转为 system prompt 追加片段。 |
| **UserSkillConfig**（建议实体名） | 用户级 Skill 配置记录，语义对齐 `UserMcpConfig`。 |
| **AssistantSkillBinding**（建议中间表） | 助手 ↔ Skill 多对多绑定，语义对齐 `AssistantMcpBinding`。 |
| **ChatSkillPackRef** | 运行时引用 `{ id }`，已存在于 `turn-capabilities.ts`。 |

### 5.2 数据模型（产品语义）

建议字段（研发可微调列名与类型，**语义不得缺失**）：

**UserSkillConfig**

| 字段组 | 建议字段 | 说明 |
| --- | --- | --- |
| 标识 | `id`、`userId` | UUID；**必须**归属当前用户。 |
| 展示 | `name`、`description?` | 名称用于列表与助手选择器；**同一用户下 `name` 唯一**（对齐 MCP）。 |
| 内容 | `content` | **Markdown 或纯文本** 技能正文（见开放问题 #2）；存入 DB，运行时按约定格式合并进 system prompt。 |
| 状态 | `enabled` | `false` 时不得被对话运行时加载。 |
| 审计 | `createdAt`、`updatedAt` | 标准时间戳。 |

**本期默认不包含**：`version`、修订历史、`toolRefs` JSON、系统预置标记 `isSystem`。

**AssistantSkillBinding**

| 字段 | 说明 |
| --- | --- |
| `id`、`userId`、`assistantId`、`skillConfigId` | 与 `AssistantMcpBinding` 同构；`(assistantId, skillConfigId)` 唯一。 |

**建议常量上限**（对齐 MCP 量级，可在开放问题中调整）：

| 常量 | 建议值 | 说明 |
| --- | --- | --- |
| `SKILL_CONFIG_MAX_PER_USER` | 50 | 每用户 Skill 条数上限 |
| `SKILL_CONFIG_MAX_PER_ASSISTANT` | 10 | 每助手挂载上限 |
| `SKILL_CONFIG_MAX_BINDINGS_PER_CHAT_TURN` | 10 | 单轮对话实际加载上限（去重后 slice） |
| `SKILL_CONFIG_NAME_MAX_LENGTH` | 64 | 对齐 MCP 名称 |
| `SKILL_CONFIG_DESCRIPTION_MAX_LENGTH` | 500 | 对齐 MCP 描述 |
| `SKILL_CONFIG_CONTENT_MAX_LENGTH` | 16_000 | 正文上限（约 2× 助手 prompt 默认上限） |

### 5.3 个人控制台 — Skills 管理

**导航与路由**

- 侧栏新增顶级入口，与「MCP 管理」同级，路径建议 **`/console/skills`**（`/[locale]/console/skills`）。
- 菜单 key / i18n：`page.console.shell.menu.skills`（中英各一）。

**列表能力**

- 列：名称、描述摘要、启用状态、更新时间、**被助手引用数**（`referencedAssistantCount`，对齐 MCP 列表）。
- 支持按名称关键字过滤；分页策略与 MCP 列表一致。

**新建 / 编辑**

- 表单：名称（必填）、描述（可选）、正文 `content`（必填，多行编辑器）、启用开关。
- 校验：长度上限、名称唯一（冲突返回 409）、正文非空。
- **无**「测试连接」类操作（与 MCP 差异）；可选展示「字符数 / 上限」提示。

**删除**

- **默认策略（推荐，对齐现行 MCP）**：若该 Skill 仍被至少一个助手挂载 → **禁止删除**，返回 409 + 引用数量；用户须先在助手侧解绑。
- 删除成功后列表不再展示；运行时不再加载。

**i18n**

- **纳入** console 双语：页面 metadata、表格、表单、按钮、空状态、toast、Popconfirm。
- 新增 `messages/{en,zh}/page/console/skills.json`；`/api/console/skills/**` 错误走 `tApiMessage`。
- Skill 的 `name`、`description`、`content` 为 **UGC**，不做自动翻译。

### 5.4 助手管理 — Skills 挂载

**配置入口**

- 在助手新建/编辑 Modal 中，于 **知识库**、**MCP 挂载** 区块旁（顺序建议：知识库 → MCP → **Skills**）增加 **Skills 多选**。
- 交互对齐 MCP：`Select mode="multiple"`、无可用 Skill 时空态 Alert + 跳转 `/console/skills`、已选但 `enabled=false` 时警告条。
- 子资源 API 建议：`GET/PUT /api/console/assistants/:id/skill-configs`，请求体 `{ skillConfigIds: string[] }`。

**约束**

- 仅可选择 **当前用户** 下存在的 Skill id；伪造他人 id → 服务端拒绝（422/403，策略与 MCP 一致）。
- 保存时校验：`skillConfigIds.length <= SKILL_CONFIG_MAX_PER_ASSISTANT`；重复 id 去重。
- 禁用项：选择器中 **已挂载但已禁用** 的项可保留显示；**新选** 时禁用项不可选（对齐 MCP `enabled` 行为）。

### 5.5 对话运行时 — Skills 加载与合并

**触发条件**

- 会话存在 **`assistantId`**（助手会话）；无助手时使用默认 `CHAT_SYSTEM_PROMPT`，**不加载** Skills。
- 从 `AssistantSkillBinding` 读取该助手挂载的 `skillConfigId`，去重、排序（建议按 `skillConfigId` 字典序稳定排序），过滤 `UserSkillConfig.enabled === true` 且记录仍存在，再 `slice(0, SKILL_CONFIG_MAX_BINDINGS_PER_CHAT_TURN)`。

**合并规则（本期默认）**

1. 基础 system prompt：`resolveChatAssistantSystemPrompt` 得到的助手 `prompt` 或默认提示。
2. 对每个有效 Skill，生成追加片段（建议格式，设计可微调）：

   ```text
   ## Skill: {name}
   {content}
   ```

3. 多个 Skill 之间以 `\n\n---\n\n` 分隔。
4. 最终：`resolveSystemPromptWithSkills(base, ctx)` → `base + "\n\n" + joinedSkills`（trim 后为空则不加）。
5. 之后仍追加既有 `CHAT_LANGUAGE_REPLY_SUFFIX`（`langchain-agent.ts` 现状不变）。

**与 MCP / 知识库关系**

| 能力 | 注入点 | 本期关系 |
| --- | --- | --- |
| 知识库 | RAG 上下文注入 | 并行独立 |
| MCP | `resolveAllToolsForAgent` → tools | 并行独立 |
| Skills | `resolveSystemPromptWithSkills` → system prompt | **仅文本**；不自动挂载 MCP |

**失败降级（默认）**

| 情况 | 行为 |
| --- | --- |
| 某 Skill 已删除 / 不可用 | **静默跳过**该条；其余 Skill 仍合并；服务端 structured log |
| 某 Skill `enabled=false` | 运行时忽略（与 MCP 一致） |
| 全部 Skill 不可用 | 等价无 Skills，仅使用基础 system prompt；**不阻塞** 对话 |
| DB 查询异常 | **整类 Skills 跳过**，回退基础 prompt；记录 error 日志；不向用户暴露堆栈 |

**Turn 管道 UI（可选增强，非阻塞 MVP）**

- 可在 `turn-runtime` 增加 `skills_resolution` 子步骤（如 C1.5 或 C3），在 `ChatWorkspace` 推理面板展示「Skills 加载 · 已合并 N 项」；若本期排期紧张，可 **仅实现服务端加载**，UI 步骤列为设计待办（对话侧已有 `turn.stage.skill` 文案 key）。

### 5.6 与 MCP 模式对照

| 维度 | MCP（0.1.9 现状） | Skills（0.1.18 目标） |
| --- | --- | --- |
| 用户资源实体 | `UserMcpConfig` | `UserSkillConfig` |
| 助手绑定表 | `AssistantMcpBinding` | `AssistantSkillBinding` |
| 控制台路径 | `/console/mcp` | `/console/skills` |
| 运行时入口 | `loadMcpBindingsForChatTurn` | `loadSkillPackRefsForChatTurn` |
| 运行时效果 | LangChain tools | system prompt 追加 |
| 连接测试 | 有 | **无** |
| 删除被引用 | 禁止删除（409） | **同左（推荐）** |
| 助手表单 | `mcpConfigIds` 多选 | `skillConfigIds` 多选 |

---

## 6. 关键产品决策（建议默认）

以下在 PRD 中给出 **建议默认**；标注 **开放问题** 的项须用户确认后定稿。

| # | 决策点 | 建议默认 | 状态 |
| --- | --- | --- | --- |
| D1 | Skill 数据模型 | `name`、`description?`、`content`、`enabled`；**无 version** | 建议采纳 |
| D2 | 内容形态 | **纯 system prompt 追加**（Markdown 源文本按约定块合并）；不做结构化 toolRefs | 建议采纳 |
| D3 | 系统预置 vs 用户自建 | **仅用户自建**；系统级 prompt 仍走 admin prompts | 开放问题 #1 |
| D4 | 助手挂载 | 多选；与 KB/MCP 并列；上限见 5.2 常量 | 建议采纳 |
| D5 | 删除仍被引用 | **禁止删除** + 409 + 引用数（对齐 MCP） | 建议采纳 |
| D6 | 运行时失败 | **静默跳过**单条；全失败退化为无 Skills | 建议采纳 |
| D7 | console i18n | **纳入** 0.1.16 双语规范 | 建议采纳 |
| D8 | 与 MCP 边界 | Skill **不可** 程序化引用 MCP；助手分别挂载；正文可自然语言提及工具 | 建议采纳 |
| D9 | 合并顺序 | 绑定 id 稳定排序后依次追加 | 开放问题 #3 |
| D10 | 正文格式 | 存储 Markdown；合并时 **原样** 写入 system prompt（不渲染 HTML） | 开放问题 #2 |

---

## 7. 验收标准（汇总）

| 编号 | 验收摘要 |
| --- | --- |
| AC-S1 | 未登录无法访问 Skills 页面与 API（401 / 重定向登录）。 |
| AC-S2 | 用户 A 无法读写用户 B 的 Skills 与助手绑定。 |
| AC-S3 | Skills CRUD 后列表与详情字段一致；名称唯一冲突有明确错误。 |
| AC-S4 | 助手可挂载 0~N 个 Skills，保存回显一致；超上限拒绝。 |
| AC-S5 | 被助手引用的 Skill **不可删除**（409）；解绑后可删。 |
| AC-S6 | `enabled=false` 的 Skill 不参与对话合并；助手侧已挂载时有警告态。 |
| AC-S7 | 助手会话经 `resolveSystemPromptWithSkills` 合并 Skills 正文；实现路径经过 `getAssistantAgent`，无旁路。 |
| AC-S8 | 无助手或无 Skills 时，system prompt 与改造前一致（除有 Skills 时）。 |
| AC-S9 | 部分 Skill 不可用时会话仍可完成；基础 prompt 仍生效。 |
| AC-S10 | console Skills 页与 `/api/console/skills/**` 错误在 en/zh 下与界面语言一致。 |

分项 AC 与用户故事见 **`user-stories-skills.md`**。

---

## 8. 与现有实现的衔接点

| 能力 | 现状 | 本期衔接 |
| --- | --- | --- |
| 控制台菜单 | `getConsoleMenuRoutes` 5 项 | 增加 Skills 菜单项与 `page.tsx` |
| 助手表单 | `AssistantsClient` 含 KB、MCP | 增加 Skills 多选与子 API |
| 实体 / DB | 无 Skill 表 | 新增 `UserSkillConfig`、`AssistantSkillBinding` |
| Turn 能力 | `turn-capabilities.ts` 占位 | 实现 `loadSkillPackRefsForChatTurn`、`skillRefsToExtraSystemText` |
| Agent | `langchain-agent.ts` 已调用 | 无需改入口，仅占位函数有实义 |
| 常量 | `src/common/constants` 有 MCP 上限 | 增加 SKILL_* 对称常量 |
| i18n | console 全量双语 | 新增 skills 页面 json + api message keys |

---

## 9. 依赖与风险

| 类型 | 说明 |
| --- | --- |
| 依赖 | 用户登录、助手 CRUD、对话 Agent 构建链路已稳定。 |
| Token 成本 | 多 Skills 追加可能显著增加 system prompt 长度；需 **正文上限** 与 **每助手挂载上限**。 |
| 提示词冲突 | 助手 `prompt` 与多 Skill 指令可能矛盾；产品层提示用户在 Skill 正文写「与助手基础设定配合」；不做自动冲突检测（非本期）。 |
| 安全 | Skill 正文进入模型上下文，需防 XSS 于 **控制台预览**（若设计有预览）；对话侧为模型文本非 HTML 渲染。 |
| 混淆风险 | 须在 UI 文案中区分「服务端 Skills」与 Cursor Skill，避免用户误以为上传 `.md`  skill 文件即可。 |

---

## 10. 待设计项清单（交接 design）

| 项 | 说明 |
| --- | --- |
| Skills 列表 / 表单页 | 布局、正文编辑器（TextArea vs Markdown 编辑器）、空状态 |
| 助手 Modal Skills 区块 | 与 MCP 区块视觉层级、警告条、管理链接 |
| 合并块格式 | `## Skill: name` 与分隔符是否对用户可见（仅运行时） |
| Turn 推理面板 | 是否新增 `skills_resolution` 步骤及 copy |
| 图标 | 侧栏菜单图标选型 |
| 删除确认 | Popconfirm 文案与引用数展示 |

---

## 11. 修订记录

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-18 | 0.1.18 | 初稿 |

---

## 12. 开放问题

详见 **`open-questions.md`**；定稿后回写本节与 README。
