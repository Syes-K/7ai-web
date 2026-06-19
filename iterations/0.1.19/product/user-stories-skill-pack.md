# 用户故事与验收标准：Skill Pack 目录包（version 0.1.19）

本文档为 `prd.md` 的子文档，便于评审与测试用例编号。

---

## Epic A：个人控制台 — Skill Pack 管理

### US-A1 查看我的 Skill Pack 列表

**作为** 已登录用户  
**我想要** 在控制台查看我名下所有 Skill Pack 的列表（名称、描述、文件数、启用状态、被助手引用数）  
**以便** 集中维护可复用的目录型技能包  

**验收标准：**

- [ ] **AC-P1**：未登录访问 `/console/skills` 被重定向登录；匿名调用 Pack API 返回 401。
- [ ] **AC-P2**：列表仅返回当前 `userId` 记录；切换账号后内容变化。
- [ ] 列展示 `fileCount`（或等价）与 Pack 内 `SkillPackFile` 行数一致。
- [ ] `referencedAssistantCount` 与 `AssistantSkillBinding` 一致。

### US-A2 新建 Skill Pack 与编辑文件树

**作为** 已登录用户  
**我想要** 新建 Pack 并在文件树中编辑多个文件（至少 `SKILL.md`）  
**以便** 构建与 Cursor 兼容的目录型 Skill  

**验收标准：**

- [ ] **AC-P3**：保存/启用前 **必须** 存在非空 `SKILL.md`；否则字段级错误。
- [ ] **AC-P4**：界面为 **文件树 + 多文件编辑器**；**不存在** 0.1.18 单 TextArea `content` 主编辑模式。
- [ ] 可新建、重命名、删除包内文件；`path` 不允许 `..` 或绝对路径。
- [ ] 同一用户 **重名** Pack 保存失败（409），错误双语可读。
- [ ] 超 `SKILL_PACK_MAX_FILES` 或 `SKILL_PACK_MAX_TOTAL_BYTES` 拒绝保存。

### US-A3 编辑 SKILL.md 与 frontmatter 同步

**作为** 已登录用户  
**我想要** 在 `SKILL.md` 中使用 YAML frontmatter 声明 name/description  
**以便** 与 Cursor Skill 习惯一致且列表元数据自动更新  

**验收标准：**

- [ ] 保存 `SKILL.md` 时，若 frontmatter 含 `name` / `description`，主表字段 **同步更新**（具体冲突策略见开放问题 #6）。
- [ ] 运行时合并 system prompt **不包含** frontmatter，仅 Markdown 正文。
- [ ] `SKILL.md` 正文超过 `SKILL_MD_MAX_BODY_LENGTH` 时拒绝或截断策略明确（见开放问题 #9）。

### US-A4 Zip / 文件夹导入

**作为** 已登录用户  
**我想要** 上传 zip 或导入与 `.cursor/skills/<name>/` 同构的文件夹  
**以便** 快速迁移本机已有 Skill  

**验收标准：**

- [ ] **AC-P5**：合法 zip（含根级 `SKILL.md`）导入后，文件树路径与压缩包内相对路径一致。
- [ ] 缺 `SKILL.md` 的 zip → 导入失败，错误指明缺失文件。
- [ ] 导入含 `scripts/` 的 Pack 成功后，展示 **「MVP 不支持脚本执行」** 说明（Alert/徽章）。
- [ ] 导入后列表可见，名称默认取自 frontmatter `name` 或文件夹名（见开放问题 #7）。

### US-A5 启用 / 禁用 Pack

**作为** 已登录用户  
**我想要** 切换 Pack 启用状态而不删除文件  
**以便** 临时下线某技能包  

**验收标准：**

- [ ] **AC-P8**：`enabled=false` 时，该 Pack **不得** 进入 `loadSkillPackRefsForChatTurn`，且 **不得** 授权 `read_skill_file`。
- [ ] 助手侧仍挂载已禁用 Pack 时，表单展示警告条（对齐 MCP inactive）。

### US-A6 删除 Pack

**作为** 已登录用户  
**我想要** 删除不再使用的 Pack  
**以便** 减少列表噪音  

**验收标准：**

- [ ] **AC-P7**：仍被助手引用 → **禁止删除**（409 + 引用数）。
- [ ] 无引用时删除成功，级联删除所有 `SkillPackFile`。
- [ ] 删除后历史消息不追溯修改；仅影响后续 Agent 构建。

---

## Epic B：助手管理 — Pack 挂载

### US-B1 在助手上多选挂载 Pack

**作为** 已登录用户  
**我想要** 在助手新建/编辑时多选挂载 Skill Pack  
**以便** 该助手下的对话自动加载这些技能  

**验收标准：**

- [ ] **AC-P6**：助手可挂载 0~N 个 Pack；`skillConfigIds` 保存回显一致。
- [ ] 超 `SKILL_PACK_MAX_PER_ASSISTANT` 拒绝保存。
- [ ] 仅可选择当前用户存在的 pack id；伪造 id 被拒绝（422/403）。
- [ ] 选择器展示 Pack `name`；可选展示文件数或「含 scripts」标签（设计待定）。

### US-B2 挂载关系不影响会话实体

**作为** 产品经理/测试  
**我想要** 明确 Skill 挂在助手而非 chat 会话  
**以便** 避免错误预期「本会话临时挂 Skill」  

**验收标准：**

- [ ] **AC-P12**：修改会话级字段 **不能** 单独挂载 Pack；仅 `Conversation.assistantId` 间接生效。
- [ ] 切换会话到无助手 → 不加载 Pack。
- [ ] 切换会话到另一助手 → 加载 **该助手** 挂载的 Pack 集合。

---

## Epic C：对话运行时 — 合并与读取

### US-C1 SKILL.md 合并进 system prompt

**作为** 使用已挂载 Pack 助手的用户  
**我想要** 对话时 Agent 遵循各 Pack 的 `SKILL.md` 指令  
**以便** 获得与 Cursor Skill 类似的行为塑造  

**验收标准：**

- [ ] **AC-P9**：助手会话经 `resolveSystemPromptWithSkills` 合并；实现路径经过 `getAssistantAgent`，无旁路。
- [ ] 合并块格式 `## Skill: {name}\n{SKILL.md body}`，多块 `\n\n---\n\n` 分隔。
- [ ] 多 Pack 按 pack id **字典序**稳定排序（延续 0.1.18 Q3）。
- [ ] 缺 `SKILL.md` 的 Pack 被跳过，其余仍合并；会话不阻塞。

### US-C2 Agent 按需读取包内文件

**作为** 使用含 `reference.md` / `data/` 的 Pack 的用户  
**我想要** Agent 在对话中读取附属文件内容  
**以便** 复杂 Skill 不必把所有内容塞进 `SKILL.md`  

**验收标准：**

- [ ] **AC-P10**：`read_skill_file`（或定稿命名）作为 LangChain Tool 注入 `createAgent`。
- [ ] 传入已加载 Pack 的合法 `path` → 返回文件文本。
- [ ] 传入未挂载 packId 或 `../` 路径 → 返回错误信息，不泄露其他用户数据。
- [ ] Tool 调用走现有 Agent ↔ tools 循环（对齐 `0.1.7` Turn 管道）。

### US-C3 scripts 目录 MVP 仅可读不执行

**作为** 导入含 `scripts/search.py` 的用户  
**我想要** 明确知道 MVP 不会执行脚本  
**以便** 正确预期产品能力边界  

**验收标准：**

- [ ] **AC-P11**：Agent **无** `run_skill_script` 或等价执行 tool。
- [ ] `read_skill_file('...', 'scripts/search.py')` **允许**返回源码文本。
- [ ] `SKILL.md` 中描述「运行 python scripts/...」时，Agent 仅能读文件，**不能**产生子进程执行结果（无沙箱输出）。
- [ ] Turn 推理面板 **不**展示「脚本已执行」类状态。

### US-C4 失败降级

**作为** 用户  
**我想要** 部分 Pack 异常时对话仍可继续  
**以便** 不因单包损坏导致整轮失败  

**验收标准：**

- [ ] Pack 已删、禁用、缺 `SKILL.md` → 跳过该 Pack，structured log。
- [ ] Skills 整类 DB 失败 → 回退基础 system prompt，不注册 Skill tools（或注册空集）。
- [ ] 用户侧 **无** 堆栈暴露；与 0.1.18 低调策略一致。

---

## Epic D：迁移与兼容

### US-D1 从 0.1.18 单正文自动迁移

**作为** 已在 0.1.18 创建单正文 Skill 的用户  
**我想要** 升级到 0.1.19 后原有助手挂载仍生效  
**以便** 无缝过渡  

**验收标准：**

- [ ] **AC-P13**：迁移脚本将旧 `content` 写入 `SkillPackFile(path='SKILL.md')`，frontmatter 含原 `name`/`description`。
- [ ] 迁移后 `AssistantSkillBinding` 无需重新配置。
- [ ] 对话合并结果与迁移前 `content` 正文 **语义等价**（允许增加 frontmatter 剥离差异）。
- [ ] 旧 `content` 列不再作为运行时来源。

### US-D2 手工导入替代迁移

**作为** 高级用户  
**我想要** 选择不从单正文自动迁移而自行 zip 导入  
**以便** 完全按 Cursor 目录重建 Pack  

**验收标准：**

- [ ] 文档说明手工路径：解绑助手 → 删除旧 Pack → zip 导入新 Pack → 重新挂载。
- [ ] 自动迁移 **不覆盖** 用户已手工导入的同 id Pack（见开放问题 #8）。

---

## Epic E：国际化与文案

### US-E1 控制台双语与边界说明

**作为** 中英文用户  
**我想要** Skills/Pack 控制台与 API 错误使用界面语言  
**以便** 理解 MVP 能力边界（尤其脚本不执行）  

**验收标准：**

- [ ] **AC-P14**：`page/console/skills`（或 successor）与 `/api/console/skill-configs/**` 错误 en/zh 一致。
- [ ] 文案明确：**Skill 挂在助手**；**脚本 0.1.20 才支持执行**。
- [ ] Pack 内 UGC 不做自动翻译。

---

## 测试场景矩阵（建议）

| 场景 | 助手 | Pack 状态 | 预期 |
| --- | --- | --- | --- |
| 无助手会话 | — | 任意 | 无合并、无 read tool |
| 单 Pack + SKILL.md | 有 | enabled | 合并正文 |
| Pack + data/csv | 有 | enabled | 合并 + Agent 可读 csv |
| Pack + scripts/py | 有 | enabled | 可读源码，**无执行** |
| 缺 SKILL.md | 有 | enabled | 跳过该 Pack |
| 禁用但仍挂载 | 有 | disabled | 跳过 + 助手警告 |
| 0.1.18 迁移数据 | 有 | enabled | 等价旧 content |

---

## 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-19 | 0.1.19 初稿 |
