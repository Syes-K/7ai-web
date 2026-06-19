# PRD：Skill Pack 目录包（替换 0.1.18 单正文 Skills）（version 0.1.19）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.19` |
| 阶段 | 产品需求（阶段 1） |
| 状态 | 草案，待产品确认 |
| 前置迭代 | `0.1.18`（已交付单字段 `content` Skills，**本期直接替换**）；`0.1.7`（Turn 管道与 Agent/tools 循环）；`0.1.9`（助手挂载模式） |
| 结构参考 | `.cursor/skills/ui-ux-pro-max/`（`SKILL.md` + `scripts/` + `data/`） |

---

## 1. 背景与问题陈述

### 1.1 0.1.18 已交付但不符合预期

0.1.18 实现了用户级 Skills 管理与助手挂载，但将 Skill 建模为 **单字段 Markdown 正文**（`UserSkillConfig.content`），运行时经 `skillRefsToExtraSystemText` 整块拼进 system prompt。

**挂载链（0.1.18 与本期不变）**：

```text
控制台 Skill Pack
  → 助手 AssistantSkillBinding（多选挂载 pack id）
  → 会话 Conversation.assistantId
  → 每轮 chat getAssistantAgent → resolveSystemPromptWithSkills / tools
```

**关键澄清**：Skill **挂在助手上**，经会话 `assistantId` 间接生效；**不是**直接挂在 chat 会话实体上。无助手会话 **不加载** Skills。

### 1.2 用户真实期望

用户期望的是 **Claude Code / Cursor 式目录型 Skill 包**：

| 要素 | 说明 |
| --- | --- |
| 入口文件 | 根目录 **`SKILL.md`**，含 YAML frontmatter（`name`、`description` 等） |
| 附属文件 | 可选 `reference.md`、`examples.md`、`scripts/*.py`、`data/*.csv` 等 |
| 复杂工作流 | 多步 shell、Python、循环——依赖 **Agent ↔ tools 循环** +（远期）脚本执行 |

仓库内参考：`.cursor/skills/ui-ux-pro-max/`（`SKILL.md` + `scripts/search.py` + `data/*.csv`）。

### 1.3 本期定位

**0.1.19 是对 0.1.18 Skills 方案的重大修订/替换**，不是小补丁：

- **替换**单段 `content` 模型，**不长期并存**两种 Skill 类型。
- **MVP 达成「目录包存储 + 多文件编辑 + 导入 + 运行时读包」**；**脚本执行推迟至 0.1.20+**。

---

## 2. 目标（Goals）

1. **形态对齐**：Skill 以 **Skill Pack（目录包）** 存储，目录结构与 Cursor/Claude **层 2** 兼容（`SKILL.md` 必填 + 相对路径附属文件）。
2. **可治理**：登录用户在控制台完成 Pack CRUD、启用/停用、zip/文件夹导入；数据 **用户私有**，`userId` 隔离。
3. **可组合**：助手仍通过 **`AssistantSkillBinding` 多选挂载 pack id**；与知识库、MCP 并列，语义与 0.1.18 一致。
4. **可运行时一致**：
   - 解析各 Pack 的 **`SKILL.md` 正文**（剥离 frontmatter）合并进 system prompt，**替代** 0.1.18 的 `content` 块。
   - 向 Agent 注入 **`read_skill_file` 类 LangChain Tool**，按需读取包内其他文件（`reference.md`、`data/` 等）。
   - **`scripts/` 在 MVP 仅可读，不可执行**；UI 与文档明确说明限制。
5. **可迁移**：对 0.1.18 已有单正文 Skill 给出 **默认迁移策略**（见 §8）。
6. **体验一致**：控制台纳入 **0.1.16+ console 全量 i18n**；废弃单 TextArea 正文编辑。

---

## 3. 非目标（Non-Goals）— 0.1.19

| 项 | 说明 |
| --- | --- |
| **脚本沙箱执行** | **不**执行 `scripts/` 下任何文件；**无** `run_skill_script` tool（见 §0.1.20 路线图） |
| 本机 Agent 桥 | **不**连接用户本机 shell / Cursor IDE Agent |
| Git 同步 | **不**实现与远程仓库双向同步 |
| Skill 市场 | **不**实现公共市场、订阅、评分 |
| 版本历史 | **不**实现 Pack 修订历史、diff、回滚 |
| 系统预置 Pack | 默认 **仅用户自建**（与 0.1.18 Q1 一致，除非另行确认） |
| 会话级挂载 | **不**支持「仅本会话挂载 Skill、不写助手」 |
| 与 MCP 程序化互引 | Pack **不可** 结构化引用 MCP id；MCP 仍走助手 MCP 绑定 |

---

## 4. 路线图预告（0.1.20+，本期不实现）

写入 PRD 供研发与用户对齐预期，**不得**在 0.1.19 排期实现：

| 能力 | 说明 |
| --- | --- |
| **`run_skill_script`** | 服务端沙箱执行 Pack 内 `scripts/`（Python/shell 等待定） |
| **配额与超时** | 每用户/每 Turn 脚本 CPU、内存、时长上限 |
| **审计** | 脚本调用日志、失败原因、安全拦截记录 |
| **复杂循环** | 仍走现有 chat `createAgent` + tools 循环；脚本作为 **新增 Tool** 接入 `resolveAllToolsForAgent` |

**0.1.19 与 0.1.20 的边界（产品承诺）**：

> MVP **明确不执行脚本**。用户可在 `SKILL.md` 中描述脚本用法，但 Agent 在 0.1.19 **只能读取** `scripts/` 路径与文件内容，**不能** invoke 执行。控制台与帮助文案须醒目提示。

---

## 5. 与 0.1.18 差异表

| 维度 | 0.1.18（被替换） | 0.1.19（本期） |
| --- | --- | --- |
| **Skill 形态** | 单记录 + 单字段 `content`（Markdown 正文） | **Skill Pack** + 多文件 `PackFile`（`path` + `content`） |
| **必填内容** | 表单 `content` 非空 | 包内 **`SKILL.md` 必填**（根相对路径） |
| **元数据** | 表字段 `name`、`description` 独立维护 | 表字段保留；**可从 `SKILL.md` frontmatter 同步**（保存/导入时） |
| **控制台编辑** | 单 TextArea | **文件树 + 多文件编辑器**；支持 **zip 导入** |
| **导入** | 无 | zip 上传 / 文件夹结构导入（同构 `.cursor/skills/<name>/`） |
| **运行时 system prompt** | `## Skill: {name}\n{content}` | `## Skill: {name}\n{SKILL.md 正文（无 frontmatter）}` |
| **运行时 tools** | 无 Skill 专用 tool | **`read_skill_file(packId, path)`**（命名见开放问题） |
| **`scripts/`** | 不适用（无目录） | **存储、展示、可读**；**MVP 不执行** |
| **助手挂载** | `AssistantSkillBinding.skillConfigId` | **语义不变**（挂载 pack id；列名可演进） |
| **挂载链** | 助手 → 会话 assistantId → Turn | **不变** |
| **数据兼容** | — | **不长期并存**；一次性迁移 0.1.18 数据（§8） |

---

## 6. 用户与核心场景

| 角色 | 说明 |
| --- | --- |
| 普通登录用户 | 拥有控制台、助手与对话；可创建/导入 Skill Pack 并挂载到自有助手。 |

**核心场景：**

1. 用户从本机 `.cursor/skills/my-skill/` **zip 导入**或控制台 **新建 Pack**，在文件树中编辑 `SKILL.md` 与附属文件，保存后列表可见。
2. 用户在助手表单 **多选挂载** 若干 Pack；保存回显与 MCP 一致。
3. 用户选择该助手对话；Agent 构建时：
   - 将各 Pack 的 `SKILL.md` 正文 **追加** 到助手 system prompt；
   - 注册 **`read_skill_file`**，Agent 可按需读取 `reference.md`、`data/*.csv` 等；
   - 若 Skill 指引运行 `scripts/search.py`，Agent **仅能读文件内容**，**不能执行**（MVP）。
4. 用户禁用 Pack 或从助手解绑后，后续对话不再注入该 Pack。

详细用户故事见 **`user-stories-skill-pack.md`**。

---

## 7. 功能范围

### 7.1 概念定义

| 术语 | 定义 |
| --- | --- |
| **Skill Pack / 技能包** | 用户私有、可复用的 **目录型技能包**，至少含 `SKILL.md`，可含任意约定相对路径附属文件。 |
| **Pack File** | Pack 内单个文件：`path`（POSIX 相对路径，如 `scripts/search.py`）+ `content`（文本；二进制见开放问题）。 |
| **UserSkillPack**（建议实体名，可沿用 `UserSkillConfig` 表名演进） | 用户级 Pack **元数据**记录：`name`、`description`、`enabled` 等；**不再**以单字段 `content` 为权威来源。 |
| **SkillPackFile**（建议实体名） | Pack 内文件行：`packId` + `path` + `content`。 |
| **AssistantSkillBinding** | 助手 ↔ Pack 多对多；**语义与 0.1.18 不变**。 |
| **ChatSkillPackRef** | 运行时 `{ id: packId }`；已存在于 `turn-capabilities.ts`。 |

### 7.2 数据模型（产品语义）

#### 7.2.1 UserSkillPack（主表，建议沿用 `user_skill_configs` 或重命名）

| 字段组 | 字段 | 说明 |
| --- | --- | --- |
| 标识 | `id`、`userId` | UUID；归属当前用户。 |
| 展示 | `name`、`description?` | 列表与助手选择器；**同一用户下 `name` 唯一**。可从 `SKILL.md` frontmatter **同步**（导入/保存根文件时）。 |
| 状态 | `enabled` | `false` 时运行时不加载。 |
| 审计 | `createdAt`、`updatedAt` | 标准时间戳。 |
| **废弃** | ~~`content`~~ | **移除或弃用**；权威内容在 `SkillPackFile` 中 `path='SKILL.md'`。 |

#### 7.2.2 SkillPackFile（新表）

| 字段 | 说明 |
| --- | --- |
| `id` | UUID |
| `packId` | FK → UserSkillPack.id |
| `userId` | 冗余，便于隔离查询 |
| `path` | 相对路径，**禁止** `..`、绝对路径、反斜杠；统一 `/` 分隔 |
| `content` | 文本内容（UTF-8）；大文件策略见开放问题 |
| `createdAt`、`updatedAt` | 可选 |

**约束（产品层）**：

| 规则 | 说明 |
| --- | --- |
| `SKILL.md` 必填 | 保存/启用 Pack 前必须存在且非空（frontmatter 除外正文可为指令） |
| 路径唯一 | 同一 `packId` 下 `path` 唯一 |
| `scripts/` | 允许存在；**仅存储与读取**，运行时 **不执行** |
| 包大小 | 总文件数、总字节上限（见开放问题） |

**建议常量（可在开放问题调整）**：

| 常量 | 建议值 | 说明 |
| --- | --- | --- |
| `SKILL_PACK_MAX_PER_USER` | 50 | 对齐 0.1.18 |
| `SKILL_PACK_MAX_PER_ASSISTANT` | 10 | 每助手挂载上限 |
| `SKILL_PACK_MAX_BINDINGS_PER_CHAT_TURN` | 10 | 单轮加载上限 |
| `SKILL_PACK_NAME_MAX_LENGTH` | 64 | 对齐 MCP |
| `SKILL_PACK_DESCRIPTION_MAX_LENGTH` | 500 | 对齐 MCP |
| `SKILL_PACK_MAX_FILES` | 100 | 每 Pack 文件数上限 |
| `SKILL_PACK_MAX_TOTAL_BYTES` | 2_000_000 | 每 Pack 总大小约 2MB |
| `SKILL_PACK_FILE_MAX_BYTES` | 512_000 | 单文件约 512KB |
| `SKILL_MD_MAX_BODY_LENGTH` | 32_000 | `SKILL.md` 正文（去 frontmatter）合并上限 |

#### 7.2.3 AssistantSkillBinding

与 0.1.18 **同构**：`assistantId` + `skillConfigId`（语义为 **packId**）；`(assistantId, skillConfigId)` 唯一。

### 7.3 目录与文件约定（兼容 Cursor 层 2）

**标准 Pack 根**（导入后映射为 `path` 相对 Pack 根）：

```text
SKILL.md                 # 必填；YAML frontmatter + Markdown 正文
reference.md             # 可选
examples.md              # 可选
scripts/                 # 可选；MVP 不执行
  search.py
data/                    # 可选
  *.csv
```

**`SKILL.md` frontmatter（建议支持）**：

```yaml
---
name: my-skill
description: >-
  Short description for list and assistant picker.
---
```

- 导入或保存 `SKILL.md` 时：若 frontmatter 含 `name` / `description`，**同步**至主表（用户仍可在元数据表单覆盖，策略见开放问题）。
- 合并进 system prompt 时：**剥离 frontmatter**，仅追加 Markdown 正文。

### 7.4 个人控制台 — Skill Pack 管理

**导航**：沿用 `/console/skills`（或演进为 `/console/skill-packs`，见开放问题）；菜单 i18n 更新文案为「技能包」语义。

**列表**

- 列：名称、描述摘要、文件数、启用状态、更新时间、被助手引用数。
- 过滤、分页对齐 MCP。

**详情 / 编辑（核心改造）**

- **左侧**：Pack 内 **文件树**（文件夹层级由 `path` 推导）。
- **右侧**：当前选中文件的 **多文件编辑器**（`SKILL.md` 建议 Markdown 模式；代码文件 monospace）。
- **操作**：新建文件/文件夹、重命名、删除文件、保存当前文件、保存全部。
- **废弃**：0.1.18 单 TextArea `content` 表单 **移除**。
- **元数据区**：名称、描述、启用开关（可与 frontmatter 双向同步）。

**导入**

| 方式 | 行为 |
| --- | --- |
| **Zip 上传** | 解压后按相对路径写入 `SkillPackFile`；根目录须含 `SKILL.md` |
| **文件夹结构** | 与 `.cursor/skills/<pack-name>/` 同构；`<pack-name>` 可作为默认 `name` 建议 |

- 导入冲突：同名 Pack → 409 或提示覆盖策略（见开放问题）。
- 导入后展示 **scripts/ 不可执行** 说明条（MVP 限制）。

**删除**

- 仍被助手引用 → **禁止删除**（409 + 引用数），与 0.1.18 / MCP 一致。
- 删除 Pack → 级联删除其 `SkillPackFile` 行。

**i18n**

- 新增/更新 `messages/{en,zh}/page/console/skills.json`（或 `skill-packs.json`）。
- Pack 内 UGC（`SKILL.md`、附属文件）**不翻译**。

### 7.5 助手管理 — Pack 挂载

**与 0.1.18 一致**：

- 助手 Modal：**知识库 → MCP → Skills（Pack）** 多选。
- API 语义：`GET/PUT .../skill-configs`，body `{ skillConfigIds: string[] }`（id 为 **packId**）。
- 约束：仅当前用户 Pack、`enabled` 行为、上限校验 **不变**。

### 7.6 对话运行时

#### 7.6.1 触发条件（不变）

- 会话须存在 **`assistantId`**；无助手 → 不加载 Pack、不注册 `read_skill_file`。
- 从 `AssistantSkillBinding` 读取 pack id → 去重、字典序、`enabled` 过滤、`slice` 上限。

#### 7.6.2 System prompt 合并（替代 0.1.18）

1. 基础 prompt：`resolveChatAssistantSystemPrompt`。
2. 对每个有效 Pack：
   - 加载 `path='SKILL.md'` 的 `content`；
   - 剥离 YAML frontmatter；
   - 生成块：`## Skill: {pack.name}\n{body}`。
3. 多块以 `\n\n---\n\n` 分隔。
4. `resolveSystemPromptWithSkills(base, ctx)` → 拼接；之后仍追加 `CHAT_LANGUAGE_REPLY_SUFFIX`。

**失败降级**（与 0.1.18 一致）：

| 情况 | 行为 |
| --- | --- |
| 缺少 `SKILL.md` 或为空 | **跳过该 Pack**；log `skill_skip` |
| Pack 已删 / 禁用 | 跳过 |
| DB 异常 | 整类 Skills 跳过，回退基础 prompt |

#### 7.6.3 `read_skill_file` Tool（MVP 新增）

| 属性 | 说明 |
| --- | --- |
| 类型 | LangChain Tool，经 `resolveAllToolsForAgent` 与 MCP tools **合并**注入 `createAgent` |
| 作用域 | **仅可读当前 Turn 已加载的 Pack**（助手挂载且 enabled 的 pack id 集合） |
| 参数 | `packId`（或 pack 名称，见开放问题）、`path`（包内相对路径） |
| 返回 | 文件文本内容；不存在 / 无权限 → 结构化错误字符串（供 Agent 自我修正） |
| **`scripts/`** | **允许读取**路径与内容；**禁止**执行、子进程、网络 |

**Agent 循环**：遵循 `0.1.7` Turn 管道——`createAgent({ tools })` 支持多轮 tool call；`read_skill_file` 与 MCP tools 同一循环，**不是**一次性 RAG。

**Turn UI（建议）**

- `skills_resolution` 步骤展示：已合并 N 个 Pack；可选展示「已启用 read_skill_file」。
- **不**默认展示 `scripts/` 执行状态（MVP 无执行）。

#### 7.6.4 与 MCP / 知识库关系

| 能力 | 注入点 | 本期 |
| --- | --- | --- |
| 知识库 | RAG System 消息 | 独立 |
| MCP | `resolveAllToolsForAgent` | 独立 |
| Skill Pack 正文 | `resolveSystemPromptWithSkills` | `SKILL.md` 正文 |
| Skill Pack 附属文件 | **`read_skill_file` tool** | 按需读取 |
| Skill Pack 脚本 | — | **MVP 不注入执行类 tool** |

---

## 8. 迁移策略（0.1.18 → 0.1.19）

**产品建议默认（推荐采纳）**：

| 策略 | 说明 |
| --- | --- |
| **一次性自动迁移（默认）** | 部署 0.1.19 时运行迁移：每条旧 `UserSkillConfig.content` → 新建 `SkillPackFile(path='SKILL.md')`，正文包裹为带 frontmatter 的 `SKILL.md`（`name`/`description` 从旧字段填入）；**清空或弃用 `content` 列** |
| **手工重建（备选）** | 用户自行导入 zip；旧单正文记录可标记只读或删除（需无助手引用） |
| **助手绑定** | `AssistantSkillBinding` **无需变更**（id 不变） |
| **回滚** | 产品 **不承诺** 0.1.19 → 0.1.18 内容回滚；迁移前建议用户导出 |

**迁移后验收**：原助手挂载的 Skill 在对话中仍能合并 `SKILL.md` 等价正文；列表 `name` 不变。

---

## 9. 关键产品决策（已拍板）

| # | 决策 | 状态 |
| --- | --- | --- |
| D1 | Skill 形态 = **目录包 Skill Pack** | **已确认** |
| D2 | **直接替换** 0.1.18 `content`，不长期双轨 | **已确认** |
| D3 | **脚本 MVP 不执行**；0.1.20 服务端沙箱 + `run_skill_script` | **已确认** |
| D4 | 挂载链：**Pack → 助手 → 会话 assistantId → Turn** | **已确认** |
| D5 | 支持 **zip / 文件夹导入**（Cursor 同构） | **已确认** |
| D6 | 运行时：**`SKILL.md` → system prompt** + **`read_skill_file` tool** | **已确认** |
| D7 | 助手挂载语义不变（pack id 多选） | **已确认** |
| D8 | 迁移默认：**一次性 content → SKILL.md** | **建议采纳** |
| D9 | 删除被引用 Pack：**禁止删除**（409） | **建议采纳**（延续 0.1.18） |
| D10 | Console **全量 i18n** | **建议采纳** |

---

## 10. 验收标准（汇总）

| 编号 | 验收摘要 |
| --- | --- |
| AC-P1 | 未登录无法访问 Skills/Pack 页面与 API。 |
| AC-P2 | 用户 A 无法读写用户 B 的 Pack、文件与助手绑定。 |
| AC-P3 | 创建/导入 Pack 必须含 `SKILL.md`；缺则拒绝保存或导入。 |
| AC-P4 | 文件树可浏览、编辑、增删 Pack 内文件；**无**单 TextArea 正文模式。 |
| AC-P5 | Zip 导入后路径与 `.cursor/skills/<name>/` 同构可对话生效。 |
| AC-P6 | 助手可挂载 0~N 个 Pack；超上限拒绝；保存回显一致。 |
| AC-P7 | 被引用的 Pack **不可删除**（409）。 |
| AC-P8 | `enabled=false` 的 Pack 不参与合并与 `read_skill_file` 授权。 |
| AC-P9 | 助手会话：`SKILL.md` 正文经 `resolveSystemPromptWithSkills` 合并；路径经 `getAssistantAgent`。 |
| AC-P10 | Agent 可调用 `read_skill_file` 读取包内非 `SKILL.md` 文件（如 `data/*.csv`）。 |
| AC-P11 | **`scripts/` 文件可读但无执行 tool**；控制台有 MVP 限制说明。 |
| AC-P12 | 无助手会话：不加载 Pack、不注册 `read_skill_file`。 |
| AC-P13 | 0.1.18 数据经迁移后助手对话行为等价（正文可见于合并 prompt）。 |
| AC-P14 | Console 与 API 错误 en/zh 与界面语言一致。 |

分项 AC 见 **`user-stories-skill-pack.md`**。

---

## 11. 与现有实现的衔接点

| 能力 | 0.1.18 现状 | 0.1.19 衔接 |
| --- | --- | --- |
| `UserSkillConfig` | 含 `content` | 弃用 `content`；新增 `SkillPackFile` |
| `turn-capabilities.ts` | `skillRefsToExtraSystemText` 读 `content` | 改读 `SKILL.md`；新增 Pack 文件加载 |
| `resolveAllToolsForAgent` | 仅 native + MCP | **+ Skill `read_skill_file` tools** |
| `langchain-agent.ts` | 已并行 resolve prompt + tools | 扩展 tools 来源即可 |
| `SkillsClient.tsx` | 单 TextArea | **文件树 + 多文件编辑 + 导入** |
| `AssistantSkillBinding` | 已存在 | **保留**，语义不变 |

---

## 12. 依赖与风险

| 类型 | 说明 |
| --- | --- |
| 依赖 | 0.1.18 Skills 基座、助手挂载、Turn 管道、`createAgent` tools 循环。 |
| Token 成本 | 多 Pack + 大 `SKILL.md` + Agent 多次 `read_skill_file` 增加上下文；需包大小与正文上限。 |
| 用户预期落差 | 导入含 `scripts/` 的 Pack 后 **不能跑脚本**；须 **醒目文案** 避免差评。 |
| 安全 | `read_skill_file` 须严格 **packId 白名单**（当前 Turn 已加载 Pack），防路径遍历。 |
| 迁移 | 自动迁移失败需可回滚脚本或人工修复；迁移窗口内需公告。 |
| 二进制文件 | csv/图片等是否纯文本存储见开放问题。 |

---

## 13. 待设计项清单（交接 design）

| 项 | 说明 |
| --- | --- |
| Pack 详情布局 | 文件树 + 编辑器分栏；移动端降级 |
| 导入流程 | Zip 拖拽、进度、错误文件列表、`SKILL.md` 缺失提示 |
| `scripts/` 不可执行 | 徽章、帮助抽屉、导入后 Alert 文案 |
| 助手 Modal | Pack 选择器展示文件数 / 是否有 scripts |
| `read_skill_file` | Turn 面板是否展示 tool 调用次数 |
| frontmatter 同步 | 保存 `SKILL.md` 后元数据表单联动 UX |
| 迁移提示 | 首次登录 0.1.19 的 Changelog / Banner |

---

## 14. 修订记录

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-19 | 0.1.19 | 初稿：Skill Pack 替换 0.1.18 单正文 |

---

## 15. 开放问题

详见 **`open-questions.md`**。
