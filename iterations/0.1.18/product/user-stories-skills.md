# 用户故事与验收标准：Skills 管理 × 助手挂载 × 对话（version 0.1.18）

本文档为 `prd.md` 的子文档，便于评审与测试用例编号。

---

## Epic A：个人控制台 — Skills 管理

### US-A1 查看我的 Skills 列表

**作为** 已登录用户  
**我想要** 在控制台查看我名下所有 Skills 的列表（名称、启用状态、更新时间、被助手引用数）  
**以便** 集中维护可复用的对话指令包  

**验收标准：**

- [ ] **AC-S1**：未登录访问 `/console/skills` 被重定向到登录页；匿名调用 `/api/console/skills` 返回 401。
- [ ] **AC-S2**：列表仅返回当前 `userId` 下的记录；切换账号后内容随之变化。
- [ ] 列表支持按名称关键字过滤（复杂度与 MCP 列表对齐）。
- [ ] 列 `referencedAssistantCount` 与助手绑定关系一致（0 表示未被任何助手挂载）。

### US-A2 新建与编辑 Skill

**作为** 已登录用户  
**我想要** 新建或编辑一条 Skill（名称、描述、正文、启用开关）  
**以便** 在多个助手上复用同一套行为指令  

**验收标准：**

- [ ] **AC-S3**：必填项缺失时保存失败并提示字段级错误；成功保存后再次打开编辑页字段与库中一致。
- [ ] 同一用户下 **重名** 保存失败（409 或等价），错误信息双语且可读。
- [ ] `content` 超过 `SKILL_CONFIG_CONTENT_MAX_LENGTH` 时拒绝保存。
- [ ] `description` 可选；`enabled` 默认 `true`（与 MCP 一致）。

### US-A3 启用 / 禁用 Skill

**作为** 已登录用户  
**我想要** 切换某 Skill 的启用状态而不删除正文  
**以便** 临时下线某指令又保留内容备后用  

**验收标准：**

- [ ] **AC-S6**：`enabled = false` 时，该 Skill **不得** 被 `loadSkillPackRefsForChatTurn` 纳入（即使助手仍挂载）。
- [ ] 列表与编辑页正确展示启用态；切换后即时生效于 **后续** 对话轮次。

### US-A4 删除 Skill

**作为** 已登录用户  
**我想要** 删除不再使用的 Skill  
**以便** 减少列表噪音与误挂载风险  

**验收标准：**

- [ ] **AC-S5**：若该 Skill 仍被至少一个助手挂载 → **禁止删除**，返回 409，提示引用数量（策略与 MCP `MCP_CONFIG_REFERENCED_BY_ASSISTANT` 对齐）。
- [ ] 无引用时删除成功，返回 204；列表不再展示。
- [ ] 删除后历史对话消息 **不 retroactive 修改**；仅影响之后新建的 Agent 构建。

---

## Epic B：助手管理 — Skills 挂载

### US-B1 为助手挂载多个 Skills

**作为** 已登录用户  
**我想要** 在助手新建/编辑界面多选挂载多个 Skills  
**以便** 该助手在对话中自动带上对应行为指令  

**验收标准：**

- [ ] **AC-S4**：同一助手可选择 0~N 个 Skills（N = `SKILL_CONFIG_MAX_PER_ASSISTANT`）；保存后重新打开回显一致。
- [ ] 选择器仅展示当前用户已创建的 Skills；**未启用** 项不可新选，但已挂载的禁用项仍可见并触发警告（对齐 MCP inactive 提示）。
- [ ] 无 Skill 时展示空态 Alert，并提供跳转 `/console/skills` 的链接（locale 感知）。
- [ ] Skills 区块与知识库、MCP 区块同处助手 Modal，保存流程：先保存助手主体，再 `PUT .../skill-configs`（与 MCP 一致）。

### US-B2 挂载权限与隔离

**作为** 平台  
**我想要** 保证用户只能挂载自己的 Skills 到自己的助手  
**以便** 满足数据隔离  

**验收标准：**

- [ ] **AC-S2**：伪造他人 `skillConfigId` 写入绑定时，服务端拒绝（422/403 等统一策略），不泄露资源是否存在。
- [ ] 不能为不存在的助手 id 写入绑定（404）。

### US-B3 助手保存时 Skills 与 MCP/KB 独立

**作为** 已登录用户  
**我想要** Skills 绑定失败时不 silently 丢失 MCP 或知识库配置  
**以便** 减少部分保存带来的困惑  

**验收标准：**

- [ ] Skills 绑定 API 失败时，toast 提示失败（对齐 `toast.mcpBindFailedOnSave` 模式）；助手主体与其他绑定状态以实际 API 结果为准。
- [ ] 创建助手时若 Skills 绑定失败，仍提示助手已创建 + Skills 绑定失败 warning（对齐 MCP 创建流程）。

---

## Epic C：对话 — Skills 运行时合并

### US-C1 助手会话合并 Skills 到 system prompt

**作为** 使用挂载了 Skills 的助手的用户  
**我想要** 对话时模型自动遵循这些 Skills 中的指令  
**以便** 无需在每条消息里重复说明规则  

**验收标准：**

- [ ] **AC-S7**：给定助手 A 挂载 Skill-s1、s2（均 enabled）；发送消息构建 Agent 时，`resolveSystemPromptWithSkills` 产出的 prompt **包含** s1、s2 正文（可通过集成测试断言子串或 mock DB）。
- [ ] 实现路径须经过 `getAssistantAgent` → `resolveSystemPromptWithSkills`，不得在 POST message 路由层重复拼接。
- [ ] 多个 Skill 合并顺序 **稳定**（与 PRD / 开放问题 #3 定稿一致）。
- [ ] 合并后仍追加 `CHAT_LANGUAGE_REPLY_SUFFIX`（语言回复后缀行为不变）。

### US-C2 无助手或无 Skills 时兼容

**作为** 使用未挂载 Skills 的助手或未绑定助手的用户  
**我想要** 对话行为与改造前一致  
**以便** 不受影响  

**验收标准：**

- [ ] **AC-S8**：无 `assistantId` 时，`loadSkillPackRefsForChatTurn` 返回空；system prompt 为默认 `CHAT_SYSTEM_PROMPT`（+ 语言后缀）。
- [ ] 助手未挂载任何 Skill，或挂载的均为 disabled / 已删除：不产生追加文案。

### US-C3 Skills 加载失败降级

**作为** 用户  
**我想要** 在某个 Skill 不可用或加载异常时仍能收到模型回复  
**以便** 对话不被单条配置错误完全阻断  

**验收标准：**

- [ ] **AC-S9**：模拟 s1 记录缺失、s2 正常：合并结果仅含 s2；主对话仍可生成助手正文。
- [ ] 全部 Skill 不可用时退化为仅基础 system prompt；**不要求** 用户刷新页面。
- [ ] 服务端记录 structured log（含 `userId`、`assistantId`、`skillConfigId`、reason）；**不向用户展示** 堆栈。
- [ ] **默认不 Toast** 单条 Skill 跳过（与 MCP「低调失败」策略一致）；若产品定稿需提示，见开放问题 #5。

### US-C4 Skills 与 MCP 并行不互相替代

**作为** 同时挂载 Skills 与 MCP 的助手的用户  
**我想要** Skills 影响「怎么说、遵循什么流程」，MCP 提供「能调用什么工具」  
**以便** 两类能力各司其职  

**验收标准：**

- [ ] 同一助手同时挂载 Skills 与 MCP 时：`resolveSystemPromptWithSkills` 与 `resolveAllToolsForAgent` **均被调用**；MCP tools 数量不受 Skills 数量影响。
- [ ] Skill 正文中 **不会** 因提及工具名而自动注册 LangChain tool（无隐式 MCP 绑定）。

---

## Epic D：国际化（console）

### US-D1 Skills 控制台双语

**作为** 使用英文界面的用户  
**我想要** Skills 管理页与相关 API 错误均为英文  
**以便** 与 0.1.16 控制台体验一致  

**验收标准：**

- [ ] **AC-S10**：`/en/console/skills` 下表格、表单、按钮、空状态、确认弹窗均为英文 key 驱动。
- [ ] `/api/console/skills/**` 与 `/api/console/assistants/:id/skill-configs` 错误在 `Accept-Language` / locale 上下文下返回对应语言 `error.message`。
- [ ] 助手 Modal 内 Skills 区块文案纳入 `page/console/assistants.json` 扩展 key。
- [ ] Skill 的 `name`/`description`/`content` **不** 自动翻译（UGC 原则不变）。

---

## 与 PRD 的交叉引用

- 数据模型、合并格式、上限常量：见 `prd.md` 第 5 节。
- 删除策略、系统预置、Turn UI：见 `open-questions.md`。
- 与 Cursor Skill 的区分：见 `prd.md` 第 1、3 节。
