# 控制台文案对照表 — Skill Pack 增量（version 0.1.19）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.19` |
| 范围 | 技能包管理页、Shell 菜单、助手挂载、导入、迁移、scripts 警告、API 错误 |
| 基线 | `iterations/0.1.18/design/copy-console-en-zh.md`（**以下 key 为新增或替换**） |
| UGC 不译 | Pack 内 `name`、`description`、文件 `content` |

---

## 1. Shell 增量（`page.console.shell`）

| Key | en | zh | 说明 |
| --- | --- | --- | --- |
| `menu.skills` | Skill Packs | 技能包管理 | **替换** 0.1.18「Skills 管理」 |

---

## 2. 技能包页（`page.console.skills`）

### 2.1 Metadata

| Key | en | zh |
| --- | --- | --- |
| `meta.title` | Skill Packs \| Console | 技能包管理 \| 控制台 |
| `meta.description` | Directory-based skill packs with SKILL.md and optional files; merged at chat time. | 目录型技能包（SKILL.md + 附属文件），在对话时加载。 |

### 2.2 页面

| Key | en | zh |
| --- | --- | --- |
| `title` | Skill Packs | 技能包管理 |
| `alert.productScope.message` | Server-side Skill Packs | 服务端技能包 |
| `alert.productScope.description` | Import zip folders compatible with `.cursor/skills/`. SKILL.md is merged into the system prompt; other files are read on demand. **Scripts are not executed in this version.** | 支持导入与 `.cursor/skills/` 同构的 zip。SKILL.md 合并进 system prompt；其他文件按需读取。**当前版本不执行脚本。** |

### 2.3 工具栏

| Key | en | zh |
| --- | --- | --- |
| `toolbar.create` | New Skill Pack | 新建技能包 |
| `toolbar.import` | Import Zip | 导入 Zip |
| `toolbar.refresh` | Refresh | 刷新 |
| `toolbar.searchPlaceholder` | Search by name | 按名称搜索 |
| `toolbar.search` | Search | 搜索 |

### 2.4 列

| Key | en | zh |
| --- | --- | --- |
| `columns.fileCount` | Files | 文件数 |
| `columns.hasScripts` | Scripts | 脚本 |
| `tag.hasScripts` | Has scripts | 含脚本 |
| `tag.scriptsReadOnly` | Read-only | 只读 |

**移除 / 废弃：** `columns.contentPreview`、`form.content.*`

### 2.5 空态

| Key | en | zh |
| --- | --- | --- |
| `empty.noSkills` | No Skill Packs yet | 尚未添加技能包 |
| `empty.createFirst` | Create your first Skill Pack | 新建第一个技能包 |
| `empty.importHint` | Or import a zip from `.cursor/skills/` | 或从 `.cursor/skills/` 导入 zip |

### 2.6 详情 Drawer

| Key | en | zh |
| --- | --- | --- |
| `drawer.create.title` | New Skill Pack | 新建技能包 |
| `drawer.edit.title` | Edit Skill Pack | 编辑技能包 |
| `drawer.saveFile` | Save file | 保存当前文件 |
| `drawer.saveAll` | Save all | 保存全部 |
| `drawer.unsaved.title` | Unsaved changes | 有未保存的修改 |
| `drawer.unsaved.description` | Switch file without saving? | 切换文件将丢失未保存内容，是否继续？ |
| `fileTree.newFile` | New file | 新建文件 |
| `fileTree.newFolder` | New folder | 新建文件夹 |
| `fileTree.rename` | Rename | 重命名 |
| `fileTree.delete` | Delete | 删除 |
| `fileTree.skillMdRequired` | SKILL.md is required | 须包含 SKILL.md |

### 2.7 表单 / SKILL.md

| Key | en | zh |
| --- | --- | --- |
| `form.name.label` | Name | 名称 |
| `form.description.label` | Description | 描述 |
| `form.enabled.label` | Enable this Skill Pack | 启用该技能包 |
| `form.skillMd.extra` | YAML frontmatter optional. Body is merged into the system prompt (frontmatter stripped). Max body {max} characters. | 可选 YAML frontmatter。正文合并进 system prompt（frontmatter 会被剥离）。正文最多 {max} 字符。 |
| `toast.syncedFromFrontmatter` | Name/description synced from SKILL.md | 已从 SKILL.md 同步名称/描述 |

### 2.8 scripts 警告（AC-P11）

| Key | en | zh |
| --- | --- | --- |
| `alert.scriptsReadOnly.message` | Scripts in this pack are read-only | 此包内的脚本为只读 |
| `alert.scriptsReadOnly.description` | The agent can read files under `scripts/` but **cannot run** them in v0.1.19. Script execution is planned for a future release. | Agent 可读取 `scripts/` 下文件，但 **v0.1.19 不会执行**。脚本执行能力将在后续版本提供。 |
| `alert.scriptsReadOnly.tooltip` | Read source only; no execution | 仅可读源码，不会执行 |
| `help.scripts.title` | About scripts in Skill Packs | 技能包中的脚本 |
| `help.scripts.body` | (Rich text: read_skill_file vs no run_skill_script; ui-ux-pro-max example) | （说明 read 与不可执行；0.1.20 预告） |

### 2.9 导入

| Key | en | zh |
| --- | --- | --- |
| `import.title` | Import Skill Pack | 导入技能包 |
| `import.dragHint` | Drop a .zip file here or click to upload | 拖拽 zip 到此处或点击上传 |
| `import.folderButton` | Select folder | 选择文件夹 |
| `import.missingSkillMd` | Root SKILL.md is required | 压缩包根目录须包含 SKILL.md |
| `import.skippedFiles` | Skipped {count} file(s) | 已跳过 {count} 个文件 |
| `import.conflict` | A Skill Pack with this name already exists | 同名技能包已存在 |
| `toast.imported` | Skill Pack imported | 导入成功 |

### 2.10 迁移 Banner（`migration.*`）

| Key | en | zh |
| --- | --- | --- |
| `migration.banner.title` | Skills upgraded to Skill Packs | Skills 已升级为技能包 |
| `migration.banner.description` | Your existing instructions now live in SKILL.md. You can add more files or import from Cursor. | 原有指令已写入 SKILL.md，可添加文件或从 Cursor 导入。 |
| `migration.drawer.title` | What changed in v0.1.19 | v0.1.19 变更说明 |
| `migration.toast.firstOpen` | This pack was migrated from a single-text Skill | 此包由旧版单正文 Skill 自动迁移 |

### 2.11 Modal / 删除（沿用 0.1.18 key，替换 Skill → Skill Pack）

| Key | en | zh |
| --- | --- | --- |
| `modal.create.title` | New Skill Pack | 新建技能包 |
| `modal.edit.title` | Edit Skill Pack | 编辑技能包 |
| `confirm.delete.title` | Delete this Skill Pack? | 确定删除该技能包？ |
| `confirm.delete.description` | Files in the pack will be removed. Unmount from assistants first if referenced. | 包内文件将一并删除。若仍被助手引用，请先解除挂载。 |

---

## 3. 助手页增量（`page.console.assistants`）

| Key | en | zh |
| --- | --- | --- |
| `section.skillsMount` | Skill Pack mount | 技能包挂载 |
| `form.skills.label` | Skill Packs | 技能包 |
| `form.skills.manageLink` | Manage Skill Packs… | 管理技能包… |
| `form.skills.placeholder` | Select Skill Packs | 选择技能包 |
| `form.skills.extra` | SKILL.md is merged into the system prompt; other files can be read via read_skill_file. Scripts are read-only and not executed. Independent from MCP tools. | SKILL.md 合并进 system prompt；其他文件可通过 read_skill_file 读取。scripts/ 只读不执行。与 MCP 工具独立。 |
| `form.skills.optionFiles` | {name} · {count} files | {name} · {count} 个文件 |
| `alert.noSkills` | No Skill Packs available | 暂无可用技能包 |
| `alert.noSkillsAction` | Create one in <skillsLink>Skill Packs</skillsLink> first. | 请先在<skillsLink>技能包管理</skillsLink>中添加。 |
| `alert.skillsInactive` | Some mounted Skill Packs are disabled | 部分已挂载的技能包已停用 |
| `alert.skillsInactiveDesc` | Disabled packs are not loaded in chat. Enable or remove them. | 已停用的技能包不会在对话中加载，请启用或移除。 |

---

## 4. API 错误增量（`api.message`）

| Key | en | zh |
| --- | --- | --- |
| `skillPackFileNotFound` | Pack file not found. | 包内文件不存在 |
| `skillPackMissingSkillMd` | SKILL.md is required and must not be empty. | 须包含非空的 SKILL.md |
| `skillPackImportInvalid` | Import failed: invalid or unsupported files. | 导入失败：存在无效或不支持的文件 |
| `skillPackSizeLimit` | Skill Pack exceeds size or file count limits. | 技能包超出大小或文件数限制 |
| `skillPackNameConflict` | A Skill Pack with this name already exists. | 同名技能包已存在 |
| `validation.skillMdBodyMaxLength` | SKILL.md body exceeds the maximum length. | SKILL.md 正文超出长度上限 |
| `validation.skillPackPathInvalid` | Invalid file path. | 文件路径无效 |

**保留：** `skillConfigNotFound`、`skillConfigReferencedByAssistant`、`validation.skillAssistantMountLimit` 等（pack 语义）。

---

## 5. 不在范围

- Pack 内 UGC 翻译
- Turn 步文案（见 `copy-chat-en-zh.md`）
- 合并后 prompt 预览
