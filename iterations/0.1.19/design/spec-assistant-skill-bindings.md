# 规格：助手管理 — Skill Pack 多选挂载（version 0.1.19）

**宿主**：`src/app/[locale]/console/assistants/AssistantsClient.tsx`  
**参考**：`iterations/0.1.18/design/spec-assistant-skill-bindings.md`（**交互不变，文案与选项展示增量**）  
**API**：`GET/PUT /api/console/assistants/:id/skill-configs` — `{ skillConfigIds: string[] }`（id = packId）

---

## 1. 变更摘要（相对 0.1.18）

| 维度 | 0.1.18 | 0.1.19 |
| --- | --- | --- |
| 挂载对象语义 | Skill 文本包 | **Skill Pack（目录包）** |
| 选项 label | `{name}` | `{name}` + 可选副信息 |
| extra 文案 | 合并 system prompt | + **按需 read_skill_file**；scripts 不执行 |
| 区块标题 | Skills 挂载 | **技能包挂载**（i18n 更新） |
| 交互结构 | 不变 | 不变 |

**无需改动：** 区块顺序（知识库 → MCP → 技能包）、`Select mode="multiple"`、inactive 逻辑、保存顺序、`tagRender`、409/422 处理。

---

## 2. 入口与区块顺序（不变）

```
… 基础信息
── 知识库 ──
── MCP 挂载 ──
── 技能包挂载 ──          ← skillConfigIds 多选
```

---

## 3. 多选控件 — 增量

### 3.1 选项来源

`GET /api/console/skill-configs` 列表项扩展：

```typescript
type SkillPackOption = {
  id: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  fileCount?: number;
  hasScripts?: boolean;
};
```

### 3.2 label 格式（US-B1）

**默认：**

```text
{name}
```

**可选增强（推荐 MVP 纳入）：**

```text
{name} · {fileCount} files
```

若 `hasScripts === true`，option 末尾增加 `Tag` 尺寸 `small`：「含脚本」+ Tooltip「对话中仅可读，不执行」。

**disabled Pack：** 与 0.1.18 相同 — 不可新选；已选保留 + 橙色 Tag「（已停用）」。

### 3.3 extra 文案更新

`form.skills.extra` 要点（见 `copy-console-en-zh.md`）：

- 选中 Pack 的 **`SKILL.md`** 合并进 system prompt
- Agent 可通过 **`read_skill_file`** 读取包内其他文件
- **`scripts/` 在 MVP 不执行**；与 MCP 工具独立

### 3.4 警告条（不变）

- `alert.skillsInactive` / `alert.skillsInactiveDesc` — 文案中 Skill → 技能包
- `alert.noSkills` — 链至 `/console/skills`

---

## 4. 数据加载与保存（不变）

与 0.1.18 §4 相同：`loadSkillOptions` + `loadAssistantSkillConfigs` + 创建/编辑 PUT 顺序。

**Toast key 保留：** `toast.skillsBindFailedOnCreate` / `OnSave`

---

## 5. 查看模式（不变）

只读 chips / disabled Select；系统助手规则同 MCP/KB。

---

## 6. 故事映射

| 故事/AC | 本节 |
| --- | --- |
| US-B1, AC-P6 | §3 选项与上限 |
| US-B2, AC-P12 | 挂载链文案（extra） |
| US-A5, AC-P8 | §3.4 inactive |
| US-E1 | `copy-console-en-zh.md` §3 |
