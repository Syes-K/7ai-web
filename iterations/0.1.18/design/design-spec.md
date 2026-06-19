# 设计说明（总览）— Skills 管理 × 助手挂载 × 对话（version 0.1.18）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.18` |
| 阶段 | 设计（阶段 2） |
| 上游 | `iterations/0.1.18/product/prd.md`、`user-stories-skills.md`、`open-questions.md` |
| 风格基线 | `iterations/0.1.9/design/`（MCP 控制台模式）、`iterations/0.1.16/design/`（console 全量 i18n） |

---

## 1. 已确认产品决策（设计定稿）

以下开放问题已由产品确认，设计 **不再保留备选分支**：

| ID | 决策 | 设计落点 |
| --- | --- | --- |
| Q1 | 仅用户自建，无系统预置 | 列表无「系统 Skill」筛选；实体无 `isSystem` |
| Q2 | Markdown 源，原样合并；服务端加 `## Skill: {name}` | `spec-chat-agent-skills.md` §3；表单用 `TextArea`，无 Markdown 预览 |
| Q3 | 按 `skillConfigId` 字典序 | 运行时排序规则；Turn 详情列表同序 |
| Q4 | 上限 50 / 10 / 10 / 16000 | 表单 `showCount`、API validation key、助手选择器上限提示 |
| Q5 | 单条跳过不可见，仅 log | 对话侧无 Toast；Turn 步仅汇总「已合并 N 项」 |
| Q6 | Turn 面板纳入 `skills_resolution`（MVP） | `turn-runtime.ts` 新增子步；`ChatWorkspace` 展示 |
| Q7 | 禁止删除（409 + 引用数） | 对齐 MCP `deleteBlocked` 交互 |
| Q8 | 禁用 Skill 不阻止保存助手；展示警告 | 对齐 MCP inactive Alert + tagRender |
| Q9 | 不做合并预览 | 控制台无「预览合并后 prompt」按钮 |
| Q10 | 不做结构化 skill pack | 无 JSON 编辑器、无 `toolRefs` 字段 |
| Q11 | 侧栏 MCP 之后 | `console-menu.tsx` 插入顺序 |
| Q12 | API `/api/console/skill-configs` | 与 `mcp-configs` 命名对称 |

---

## 2. 信息架构（IA）

```
个人控制台 (/[locale]/console)
├── 账号与偏好      (/console/profile)
├── 模型管理        (/console/models)
├── 助手管理        (/console/assistants)     ← 本期：Skills 多选挂载
├── 知识库管理      (/console/knowledge)
├── MCP 管理        (/console/mcp)            ← 外部工具连接
└── Skills 管理     (/console/skills)         ← 本期：新增（文本指令包）

对话 (/[locale]/chat)
└── 助手会话 → 运行时合并 Skills 至 system prompt（与 MCP tools 并行、独立）
```

**心智模型（须在 UI 文案中反复强化）：**

| 能力 | 用户理解 | 运行时效果 |
| --- | --- | --- |
| **Skills** | 可复用的 **行为指令 / 工作流说明**（文本） | 追加到 system prompt |
| **MCP** | 可连接的 **外部工具 / API** | 注册 LangChain tools |
| **知识库** | 可检索的 **文档片段** | RAG 上下文注入 |

Skills 与 MCP **并列配置、语义分离**：正文可自然语言提及工具名，但 **不会** 自动挂载 MCP。

---

## 3. 与现有控制台壳体的衔接

### 3.1 侧栏与路由

| 实现位置 | 变更 |
| --- | --- |
| `src/app/[locale]/console/console-menu.tsx` | 在 MCP 项 **之后** 新增：`path: "/console/skills"`，`key: "skills"`，文案 `page.console.shell.menu.skills` |
| 图标 | 建议 `@ant-design/icons` 的 **`BulbOutlined`**（指令/行为）或 **`ReadOutlined`**（文本包）；**避免** 与 MCP 的 `CloudServerOutlined`、模型的 `ApiOutlined` 重复 |
| `src/app/[locale]/console/skills/page.tsx` | **新建**：`generateMetadata` + 渲染 `SkillsClient`（模式对齐 `mcp/page.tsx`） |
| `ConsoleShell` / `layout.tsx` | 无结构变更；菜单项自动进 ProLayout 侧栏 |

**菜单顺序（Q11 定稿）：** profile → models → assistants → knowledge → mcp → **skills**

### 3.2 布局与组件基线

- **页面容器**：`PageContainer`（与 MCP / 知识库一致）
- **列表**：`ProTable` + `actionRef`；工具栏「名称搜索 | 刷新 | 新建」
- **表单**：`Modal` + `Form`（新建/编辑）；宽度 `520px`（正文 `TextArea` 较高时可 `640px`）
- **主题**：沿用 `shellDarkTheme`；不引入第二套控制台主题
- **i18n**：新增 `messages/{en,zh}/page/console/skills.json`；`src/i18n/request.ts` 注册 `page.console.skills`

### 3.3 断点与 a11y

- 表格窄屏横向滚动；操作列 `fixed: "right"`
- 删除：`Popconfirm` + 409 时 `Modal.warning`（焦点陷阱交给 antd）
- 正文 `TextArea`：`aria-describedby` 关联字符数 hint（通过 `Form.Item` `extra`）

---

## 4. Skills 与 MCP 的差异点（设计重点）

| 维度 | MCP（0.1.9） | Skills（0.1.18） |
| --- | --- | --- |
| 资源语义 | 外部服务连接 | 文本指令包 |
| 列表特色列 | 传输方式、连接摘要、最近检测 | **正文摘要**（首行截断）、**字符数**（可选列或 Tooltip） |
| 表单特色字段 | transport、endpoint、credentials | **`content` 多行正文**（必填） |
| 行内操作 | 编辑、**测试连接**、删除 | 编辑、删除（**无测试**） |
| 运行时入口 | `loadMcpBindingsForChatTurn` → tools | `loadSkillPackRefsForChatTurn` → system prompt |
| Turn 子步 | `C2` / `mcp_tools_resolution` | **`C1b` / `skills_resolution`**（插在 C1 与 C2 之间） |
| 助手挂载 API | `PUT .../mcp-configs` | `PUT .../skill-configs` |
| 删除被引用 | 409 `MCP_CONFIG_REFERENCED_BY_ASSISTANT` | 409 `SKILL_CONFIG_REFERENCED_BY_ASSISTANT`（对称命名） |
| 与 Cursor Skill | — | UI **须** 在页面说明区区分「服务端 Skills ≠ Cursor 编辑器 Skill 文件」 |

---

## 5. 关键页面与文档索引

| 页面/区块 | 路由或宿主 | 子规格 |
| --- | --- | --- |
| Skills 列表 + CRUD | `/console/skills` | `spec-skills-console.md` |
| 助手 Modal Skills 挂载 | `/console/assistants` | `spec-assistant-skill-bindings.md` |
| 对话运行时 + Turn 步 | `/chat` | `spec-chat-agent-skills.md` |
| Console i18n 文案 | — | `copy-console-en-zh.md` |
| Chat Turn 文案 | — | `copy-chat-en-zh.md` |

---

## 6. 全局状态矩阵（跨页）

| 场景 | 表现 |
| --- | --- |
| Skills 列表为空 | Empty + CTA「新建 Skill」 |
| 列表加载失败 | `message.error` + 工具栏刷新 |
| 401 | `redirectToLocaleLogin(locale, consolePath)` |
| 名称冲突 | 409 Toast，字段级提示 `name` |
| 删除被助手引用 | `Modal.warning` + 链至助手管理 |
| 助手无 Skill 可选 | `Alert` info + 链至 `/console/skills` |
| 助手挂载了已禁用 Skill | `Alert` warning（不阻断保存） |
| 对话无助手 / 无挂载 | Turn 步 **隐藏**（对齐 MCP `shouldHideUnbound*`） |
| 部分 Skill 加载失败 | 用户无感知；Turn 汇总仍显示成功合并数 |

---

## 7. 用户故事 / AC 映射

| 编号 | 设计落点 |
| --- | --- |
| US-A1~A4, AC-S1~S5 | `spec-skills-console.md` |
| US-B1~B3, AC-S4、S6 | `spec-assistant-skill-bindings.md` |
| US-C1~C4, AC-S7~S9 | `spec-chat-agent-skills.md` |
| US-D1, AC-S10 | `copy-console-en-zh.md` + 0.1.16 i18n 规范 |

---

## 8. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-18 | 初稿，承接 product 0.1.18；开放问题全部定稿 |
