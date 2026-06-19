# 规格：助手管理 — Skills 多选挂载（version 0.1.18）

**宿主**：`src/app/[locale]/console/assistants/AssistantsClient.tsx`  
**参考区块**：同文件内 **知识库**、**MCP 挂载**（`section.mcpMount` 起）  
**子资源 API**：`GET/PUT /api/console/assistants/:id/skill-configs`  
**请求体**：`{ skillConfigIds: string[] }`

---

## 1. 入口与区块顺序

在助手新建/编辑 **Modal** 内，区块顺序（Q11 / PRD 定稿）：

```
… 基础信息（名称、prompt、icon 等）
── Divider：知识库 ──
  knowledgeBaseIds 多选
── Divider：MCP 挂载 ──
  mcpConfigIds 多选
── Divider：Skills 挂载 ──          ← 本期新增
  skillConfigIds 多选
```

**视觉层级：** 三个挂载区块结构 **对称**（Divider 标题 + 可选 Alert + Form.Item + Select multiple），降低学习成本。

**语义区分（文案层）：**

| 区块 | 标题 key | extra 要点 |
| --- | --- | --- |
| 知识库 | 已有 | RAG 检索 |
| MCP | `section.mcpMount` | 外部工具 |
| Skills | `section.skillsMount` | **文本指令**，合并进 system prompt；**非** Cursor Skill 文件 |

---

## 2. 多选控件规格

### 2.1 组件形态

- `Select` `mode="multiple"`、`maxTagCount="responsive"`、`showSearch`、`optionFilterProp="label"`
- 表单项 `name="skillConfigIds"`
- `Form.useWatch("skillConfigIds", form)` 用于 inactive 检测（对齐 `mcpConfigIdsWatch`）

### 2.2 选项来源

- `GET /api/console/skill-configs`（或轻量 options 端点；设计假设与 MCP 相同用列表 API）
- 选项字段：`id`, `name`, `enabled`, `description?`
- **label 格式：** `{name}`（可选副标题 `(disabled)` 由 option 层处理，与 MCP 不同 transport 后缀）

### 2.3 启用 / 禁用行为（Q8，对齐 MCP）

| 情况 | 选择器 | Chip 展示 |
| --- | --- | --- |
| `enabled === true` | 可选 | 蓝色 Tag，名称 truncate |
| `enabled === false` | **不可新选**（`disabled: !enabled && !alreadySelected`） | 橙色 Tag + `form.skills.inactiveSuffix`「（已停用）」 |
| 已挂载后用户停用 Skill | 选项 disabled，chip 保留 | 触发 warning Alert |

**`tagRender`：** 复制 MCP 模式，颜色 `inactive ? "orange" : "blue"`（或 Skills 专用色 `purple` 以区分 MCP 的 blue——**可选**；默认同 MCP 降低样式分叉）。

### 2.4 空态与加载

- `skillLoading` + `skillOptions.length === 0`：
  - `Alert` `type="info"`：`alert.noSkills`
  - `t.rich("alert.noSkillsAction", { skillsLink })` → `Link href="/console/skills"`
- `Select`：`loading={skillLoading}`，`disabled={skillOptions.length === 0 && !skillLoading}`

### 2.5 警告条（Q8）

当 `hasInactiveMountedSkills === true`（已选 id 中存在 `enabled === false`）：

```
Alert type="warning" showIcon
message: alert.skillsInactive
description: alert.skillsInactiveDesc
```

**不阻断** Modal 提交（与 MCP inactive 一致）。

---

## 3. 表单 label 与 manageLink

```tsx
<Form.Item
  name="skillConfigIds"
  label={
    <span className="flex flex-wrap items-center gap-2">
      <span>{t("form.skills.label")}</span>
      <Link href="/console/skills" className="text-xs ...">
        {t("form.skills.manageLink")}
      </Link>
    </span>
  }
  extra={t("form.skills.extra")}
>
```

**`form.skills.extra` 要点：** 选中项将在对话时追加到助手 system prompt；与 MCP 工具独立。

---

## 4. 数据加载与保存流程

### 4.1 打开编辑 / 查看

与 MCP 并行：

1. `loadSkillOptions()` — 用户全部 Skills 列表
2. `loadAssistantSkillConfigs(assistantId)` — `GET .../skill-configs` → `form.setFieldsValue({ skillConfigIds })`
3. 新建：`skillConfigIds: []` 初始值

### 4.2 提交顺序（US-B3）

**创建助手：**

1. `POST /api/console/assistants` → 得 `assistantId`
2. `PUT .../knowledge-bases`（若有）
3. `PUT .../mcp-configs`
4. **`PUT .../skill-configs`** ← 新增
5. 任一步失败：`message.warning` 对应 toast，**不** rollback 已成功的步骤

**编辑助手：**

1. `PATCH /api/console/assistants/:id`
2. `PUT .../knowledge-bases`
3. `PUT .../mcp-configs`
4. **`PUT .../skill-configs`**

**Skills 绑定失败 toast：**

- 创建：`toast.skillsBindFailedOnCreate`
- 编辑：`toast.skillsBindFailedOnSave`

（对称 `toast.mcpBindFailedOnCreate` / `OnSave`）

### 4.3 校验

| 规则 | 前端 | 后端 |
| --- | --- | --- |
| 数量 ≤ 10 | 可选 `maxCount` 提示 | 422 validation |
| 重复 id | 提交前去重 | 服务端去重 |
| 他人 id | — | 422/403，不泄露存在性 |
| 不存在助手 | — | 404 |

---

## 5. 查看模式（modalMode === "view"）

- Skills 区块与 MCP 一致：**只读**
- 展示已选 Skill 名称 chips 或 disabled Select
- 系统助手：若现有逻辑隐藏 MCP/KB 编辑，Skills 同规则

---

## 6. i18n 扩展位置

**不新建** `assistants-skills.json`；扩展 `messages/{locale}/page/console/assistants.json`：

- `section.skillsMount`
- `form.skills.*`
- `alert.noSkills*`、`alert.skillsInactive*`
- `toast.skillsBindFailed*`

详见 `copy-console-en-zh.md` §4 增量。

---

## 7. 故事映射

| 故事/AC | 本节 |
| --- | --- |
| US-B1, AC-S4 | 多选、上限、回显 |
| US-B2, AC-S2 | 权限隔离 |
| US-B3 | 保存顺序与失败 toast |
| US-A3, AC-S6 | inactive 警告、运行时忽略 |
| US-D1, AC-S10 | assistants.json 扩展 key |
