# 控制台文案对照表 — Skills 增量（version 0.1.18）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.18` |
| 范围 | Skills 管理页、Shell 菜单、助手挂载区块、console API 错误 |
| 规范 | 继承 `iterations/0.1.16/design/design-spec-i18n-console.md` |
| UGC 不译 | Skill 的 `name`、`description`、`content` |

---

## 1. Shell 增量（`page.console.shell`）

### 1.1 侧栏菜单

| Key | en | zh |
| --- | --- | --- |
| `menu.skills` | Skills | Skills 管理 |

### 1.2 Metadata 描述（可选更新）

| Key | en | zh |
| --- | --- | --- |
| `meta.description` | Manage models, assistants, knowledge bases, MCP integrations, and Skills. | 管理模型、助手、知识库、MCP 集成与 Skills。 |

---

## 2. Skills 页（`page.console.skills`）

### 2.1 Metadata

| Key | en | zh |
| --- | --- | --- |
| `meta.title` | Skills \| Console | Skills 管理 \| 控制台 |
| `meta.description` | Reusable instruction packs merged into assistant system prompts at chat time. | 可复用的指令包，在对话时合并进助手系统提示。 |

### 2.2 页面

| Key | en | zh |
| --- | --- | --- |
| `title` | Skills | Skills 管理 |
| `alert.productScope.message` | Server-side Skills | 服务端 Skills |
| `alert.productScope.description` | Instruction text merged into the system prompt when you chat with a mounted assistant. This is not the same as Cursor IDE local Skill files (`.cursor/skills/`). | 对话时合并进系统提示的指令文本。与 Cursor 编辑器内的本地 Skill 文件（`.cursor/skills/`）不是同一概念。 |

### 2.3 工具栏（`toolbar`）

| Key | en | zh |
| --- | --- | --- |
| `toolbar.create` | New Skill | 新建 Skill |
| `toolbar.refresh` | Refresh | 刷新 |
| `toolbar.searchPlaceholder` | Search by name | 按名称搜索 |
| `toolbar.search` | Search | 搜索 |

### 2.4 列（`columns`）

| Key | en | zh |
| --- | --- | --- |
| `columns.name` | Name | 名称 |
| `columns.description` | Description | 描述 |
| `columns.enabled` | Status | 状态 |
| `columns.contentPreview` | Content preview | 正文摘要 |
| `columns.updatedAt` | Updated | 更新时间 |
| `columns.assistantRefs` | Assistants | 助手引用 |
| `columns.actions` | Actions | 操作 |
| `columns.edit` | Edit | 编辑 |
| `columns.delete` | Delete | 删除 |

### 2.5 Tag（`tag`）

| Key | en | zh |
| --- | --- | --- |
| `tag.enabled` | Enabled | 启用 |
| `tag.disabled` | Disabled | 停用 |

### 2.6 空态（`empty`）

| Key | en | zh |
| --- | --- | --- |
| `empty.noSkills` | No Skills yet | 尚未添加 Skill |
| `empty.createFirst` | Create your first Skill | 新建第一个 Skill |

### 2.7 Modal（`modal`）

| Key | en | zh |
| --- | --- | --- |
| `modal.create.title` | New Skill | 新建 Skill |
| `modal.edit.title` | Edit Skill | 编辑 Skill |
| `modal.ok.create` | Create | 创建 |
| `modal.ok.save` | Save | 保存 |
| `modal.cancel` | Cancel | 取消 |

### 2.8 表单（`form`）

| Key | en | zh |
| --- | --- | --- |
| `form.name.label` | Name | 名称 |
| `form.name.placeholder` | e.g. Code review checklist | 例如：代码审查清单 |
| `form.name.rules.required` | Enter a name. | 请输入名称 |
| `form.description.label` | Description | 描述 |
| `form.description.placeholder` | Optional short summary | 可选简短说明 |
| `form.content.label` | Instructions | 指令正文 |
| `form.content.placeholder` | Markdown or plain text instructions for the model… | 写给模型的 Markdown 或纯文本指令… |
| `form.content.rules.required` | Instructions cannot be empty. | 正文不能为空 |
| `form.content.extra` | Stored as Markdown source. At chat time the server prepends `## Skill: {name}` and appends this text to the system prompt (not shown in preview). Max {max} characters. | 以 Markdown 源保存。对话时服务端会在正文前加上 `## Skill: {name}` 并合并进 system prompt（此处不提供预览）。最多 {max} 个字符。 |
| `form.enabled.label` | Enable this Skill | 启用该 Skill |

### 2.9 确认与删除拦截（`confirm` / `deleteBlocked`）

| Key | en | zh |
| --- | --- | --- |
| `confirm.delete.title` | Delete this Skill? | 确定删除该 Skill？ |
| `confirm.delete.description` | This cannot be undone. Assistants must unmount it first if referenced. | 删除后无法恢复。若仍被助手引用，请先在助手管理中解除挂载。 |
| `deleteBlocked.title` | Cannot delete | 无法删除 |
| `deleteBlocked.body` | Open <assistantsLink>Assistant management</assistantsLink> to remove mounts first. | 请先在<assistantsLink>助手管理</assistantsLink>中解除挂载。 |

### 2.10 Toast（`toast`）

| Key | en | zh |
| --- | --- | --- |
| `toast.created` | Skill created | 已创建 |
| `toast.saved` | Skill saved | 已保存 |
| `toast.deleted` | Skill deleted | 已删除 |

---

## 3. 助手页增量（`page.console.assistants`）

| Key | en | zh |
| --- | --- | --- |
| `section.skillsMount` | Skills mount | Skills 挂载 |
| `form.skills.label` | Skills | Skills |
| `form.skills.manageLink` | Manage Skills… | 管理 Skills… |
| `form.skills.placeholder` | Select Skills | 选择 Skills |
| `form.skills.extra` | Selected instructions are merged into the system prompt at chat time. They do not register MCP tools. | 选中项会在对话时合并进 system prompt，不会注册 MCP 工具。 |
| `form.skills.inactiveSuffix` | (disabled) | （已停用） |
| `alert.noSkills` | No Skills available | 暂无可用 Skill |
| `alert.noSkillsAction` | Create one in <skillsLink>Skills management</skillsLink> first. | 请先在<skillsLink>Skills 管理</skillsLink>中添加。 |
| `alert.skillsInactive` | Some mounted Skills are disabled | 部分已挂载的 Skill 已停用 |
| `alert.skillsInactiveDesc` | Disabled Skills are not merged in chat. Enable or remove them. | 已停用的 Skill 不会在对话中合并，请启用或移除。 |
| `toast.skillsBindFailedOnCreate` | Assistant created, but Skills mount failed | 助手已创建，但 Skills 挂载保存失败 |
| `toast.skillsBindFailedOnSave` | Assistant saved, but Skills mount failed | 助手已保存，但 Skills 挂载保存失败 |

---

## 4. API 错误增量（`api.message`）

### 4.1 Top-level

| Key | en | zh |
| --- | --- | --- |
| `skillConfigNotFound` | Skill configuration not found. | Skill 配置不存在 |
| `skillConfigNameConflict` | A Skill with this name already exists. | 名称已存在 |
| `skillConfigReferencedByAssistant` | Cannot delete: this Skill is still mounted on one or more assistants. Remove it from Assistant management first. | 无法删除：仍被助手引用，请先在助手管理中解除 Skills 挂载。 |

### 4.2 Validation

| Key | en | zh |
| --- | --- | --- |
| `validation.invalidSkillConfigIds` | One or more Skill configurations are invalid. | 包含无效 Skill 配置 |
| `validation.skillConfigIdsRequired` | skillConfigIds must be an array (may be empty). | 须提供 skillConfigIds 数组（可为空数组） |
| `validation.skillConfigIdsInvalid` | Invalid skillConfigIds format. | 格式无效 |
| `validation.skillConfigLimitReached` | Skill configuration limit reached. | 已达 Skill 配置上限 |
| `validation.skillContentMaxLength` | Instructions exceed the maximum length. | 正文超出长度上限 |
| `validation.skillAssistantMountLimit` | Too many Skills mounted on this assistant. | 该助手挂载的 Skill 数量已达上限 |

---

## 5. `src/i18n/request.ts` 注册

```typescript
import skills from "../../messages/en/page/console/skills.json";
// zh 同理

page: {
  console: {
    // …existing
    skills: skills.default,
  },
},
```

---

## 6. 不在范围

- Skill UGC 字段翻译
- 合并后 system prompt 预览文案（Q9 不做）
- Chat Turn 步文案（见 `copy-chat-en-zh.md`）
