# 管理后台文案对照表 — Admin Skills（version 0.1.21）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.21` |
| 命名空间 | `page.admin.skills`（主）、`page.admin.shell.menu.skills` |
| 语义源 locale | `en` |
| 基线 | `messages/*/page/console/skills.json`（迁移源） |
| UGC 不译 | Pack `name`、`description`、文件 `content` |

---

## 1. Shell 菜单增量

| Key | en | zh |
| --- | --- | --- |
| `page.admin.shell.menu.skills` | Skill Packs | 技能包 |

`meta.description`（shell）可增量：「…models, **skill packs**, prompts…」

---

## 2. 页面 Metadata

| Key | en | zh |
| --- | --- | --- |
| `meta.title` | Skill Packs \| Admin | 技能包 \| 管理后台 |
| `meta.description` | Import and manage system Skill Packs for assistants. | 导入并管理系统技能包，供助手挂载使用。 |
| `title` | Skill Packs | 技能包 |

---

## 3. 产品说明 Alert（更新 — 无在线编辑）

| Key | en | zh |
| --- | --- | --- |
| `alert.productScope.message` | What are Skill Packs? | 什么是技能包？ |
| `alert.productScope.description` | Import zip folders compatible with `.cursor/skills/`. Packs are **managed by importing zip only**—edit locally, then re-import. In chat, only packs relevant to each question are loaded (unless marked Always load). Scripts under `scripts/` can run in a sandbox. | 支持导入与 `.cursor/skills/` 同构的 zip。**仅通过导入 zip 管理**—请在本地编辑后重新导入。对话中仅加载与问题相关的包（「始终加载」除外）。`scripts/` 下脚本可在沙箱中运行。 |

---

## 4. 工具栏

| Key | en | zh |
| --- | --- | --- |
| `toolbar.import` | Import Zip | 导入 Zip |
| `toolbar.refresh` | Refresh | 刷新 |
| `toolbar.searchPlaceholder` | Search by name | 按名称搜索 |
| `toolbar.search` | Search | 搜索 |

**移除（不得出现在 admin）：** `toolbar.create`

---

## 5. 列表列

| Key | en | zh |
| --- | --- | --- |
| `columns.name` | Name | 名称 |
| `columns.description` | Description | 描述 |
| `columns.fileCount` | Files | 文件数 |
| `columns.hasScripts` | Scripts | 含脚本 |
| `columns.alwaysLoad` | Always load | 始终加载 |
| `columns.enabled` | Status | 启用 |
| `columns.updatedAt` | Updated | 更新时间 |
| `columns.actions` | Actions | 操作 |
| `columns.detail` | Details | 详情 |
| `columns.reimport` | Re-import | 重新导入 |
| `columns.delete` | Delete | 删除 |

**移除：** `columns.edit`、`columns.assistantRefs`

---

## 6. Tag

| Key | en | zh |
| --- | --- | --- |
| `tag.enabled` | Enabled | 启用 |
| `tag.disabled` | Disabled | 停用 |
| `tag.hasScripts` | Has scripts | 含脚本 |
| `tag.alwaysLoad` | Always load | 始终加载 |
| `tag.scriptsSandbox` | Sandbox | 沙箱 |

---

## 7. 空态

| Key | en | zh |
| --- | --- | --- |
| `empty.noPacks` | No Skill Packs yet | 暂无技能包 |
| `empty.importHint` | Import a zip Skill Pack to get started (compatible with Cursor and similar tools). | 导入 zip 技能包即可开始（兼容 Cursor 等工具）。 |

**移除：** `empty.createFirst`、`empty.noSkills`（console 命名）

---

## 8. 只读详情 Drawer

| Key | en | zh |
| --- | --- | --- |
| `drawer.title` | Skill Pack details | 技能包详情 |
| `drawer.reimport` | Re-import | 重新导入 |
| `meta.readOnlyHint` | To change name, description, enabled, or always load, edit SKILL.md frontmatter in your zip and re-import. | 如需修改名称、描述、启用或始终加载，请编辑 zip 内 SKILL.md 的 frontmatter 后重新导入。 |
| `meta.name` | Name | 名称 |
| `meta.description` | Description | 描述 |
| `meta.enabled` | Status | 启用状态 |
| `meta.alwaysLoad` | Always load | 始终加载 |
| `meta.updatedAt` | Updated | 更新时间 |
| `preview.truncated` | File is large; showing the first portion only. | 文件较大，仅显示部分内容。 |
| `preview.loadError` | Could not load file content. | 无法加载文件内容。 |
| `empty.noFiles` | No files in this pack | 此包内暂无文件 |

**移除：** `drawer.create`、`drawer.edit`、`drawer.saveFile`、`drawer.saveAll`、`drawer.unsaved.*`、`modal.create`、`modal.edit`、`modal.ok.*`、`form.*`（输入校验）、`fileTree.newFile`、`rename`、`delete`（文件操作）

**保留（只读树）：** `fileTree.scriptRunnable`、`fileTree.scriptRunnableTooltip`、`fileTree.skillMdRequired`

---

## 9. 导入 Modal

| Key | en | zh |
| --- | --- | --- |
| `import.title` | Import Skill Pack | 导入技能包 |
| `import.overwriteTitle` | Re-import Skill Pack | 重新导入技能包 |
| `import.overwriteWarning` | This will **replace all files** in "{name}". Pack id and assistant bindings stay the same. Metadata will be re-synced from SKILL.md frontmatter. | 将**替换**技能包「{name}」内的**全部文件**。Pack id 与助手挂载关系不变。元数据将从 SKILL.md frontmatter 重新同步。 |
| `import.dragHint` | Drop a .zip file here or click to upload | 将 .zip 拖入此处或点击上传 |
| `import.folderButton` | Select folder | 选择文件夹 |
| `import.missingSkillMd` | Root SKILL.md is required | 根目录须包含 SKILL.md |
| `import.skippedFiles` | Skipped {count} file(s) | 已跳过 {count} 个文件 |
| `import.conflict` | A Skill Pack with this name already exists | 已存在同名技能包 |

---

## 10. 脚本 Alert / Help

| Key | en | zh |
| --- | --- | --- |
| `alert.scriptsSandbox.message` | This pack includes runnable scripts | 此包包含可运行脚本 |
| `alert.scriptsSandbox.description` | When this pack is loaded and the skill instructions call for it, the assistant can run scripts under `scripts/` in a sandbox. No outbound network by default. Timeouts and per-turn limits apply. | 当技能包被加载且技能说明需要时，助手可在沙箱中运行 `scripts/` 下脚本。默认无出站网络。受超时与每轮次数限制。 |
| `alert.scriptsSandbox.tooltip` | Runnable in chat sandbox | 可在对话沙箱中运行 |
| `help.scripts.title` | Scripts in Skill Packs | 技能包中的脚本 |
| `help.scripts.body` | 1) Read file contents vs run scripts in a sandbox. 2) Only scripts/; .py and .sh. 3) No outbound network. 4) Limits: {perTurn} runs per turn, {perDay} per day. 5) Example: ui-ux-pro-max scripts/search.py. | 1) 阅读文件与运行脚本的区别。2) 仅 scripts/；.py 与 .sh。3) 无出站网络。4) 限额：每轮 {perTurn} 次、每日 {perDay} 次。5) 示例：ui-ux-pro-max 的 scripts/search.py。 |

---

## 11. 删除

| Key | en | zh |
| --- | --- | --- |
| `confirm.delete.title` | Delete this Skill Pack? | 删除此技能包？ |
| `confirm.delete.description` | All files will be removed. Unmount from assistants first if still referenced. | 将删除包内全部文件。若仍被助手挂载，请先解绑。 |
| `deleteBlocked.title` | Cannot delete | 无法删除 |
| `deleteBlocked.body` | Still mounted on: {names}. Remove bindings in Assistant management first. | 仍被以下助手挂载：{names}。请先在助手管理中解除挂载。 |
| `link.assistants` | Assistant management | 助手管理 |

---

## 12. Toast

| Key | en | zh |
| --- | --- | --- |
| `toast.deleted` | Skill Pack deleted | 已删除技能包 |
| `toast.imported` | Skill Pack imported | 技能包已导入 |
| `toast.loadFailed` | Could not load pack details. | 无法加载技能包详情。 |

**移除引用：** `toast.created`、`toast.saved`、`toast.syncedFromFrontmatter`、`toast.alwaysLoadUpdated`

---

## 13. Console 助手页增量（`page.console.assistants`）

| Key | en | zh |
| --- | --- | --- |
| `alert.noSkills` | No Skill Packs available | 暂无可用技能包 |
| `alert.noSkills.description` | Ask an administrator to import Skill Packs in the admin console. | 请联系管理员在管理后台导入技能包。 |
| `form.skills.manageLinkAdmin` | Manage Skill Packs | 管理技能包 |

**废弃：** `alert.noSkillsAction`（含 console/skills 链接）、`form.skills.manageLink`

---

## 14. Admin 助手页增量（`page.admin.assistants`）

| Key | en | zh |
| --- | --- | --- |
| `alert.noSkillsAdmin.description` | Import Skill Packs from the Skill Packs page first. | 请先在技能包页面导入。 |

（若复用 console `form.skills.*`，可抽公共 key 至 `page.common.skills` — **本期可选**，默认 admin/console 各写一份。）

---

## 15. API message 增量（`api.message`）

| Key | en | zh |
| --- | --- | --- |
| `skillConfigNameUnique` | Name must be unique globally (max {maxLength} characters). | 名称须全局唯一（最长 {maxLength} 字）。 |
| `skillConfigReferencedByAssistant` | Cannot delete: mounted on one or more assistants. | 无法删除：仍被助手挂载。 |

更新原「同一用户下」措辞为「全局」。

---

## 16. console → admin i18n key 映射表

实现时：`useTranslations("page.admin.skills")` 替换 `page.console.skills`；按下列映射改 key 或原样复用。

| `page.console.skills` | `page.admin.skills` | 动作 |
| --- | --- | --- |
| `meta.title` | `meta.title` | 改文案（Admin 后缀） |
| `meta.description` | `meta.description` | 改文案 |
| `title` | `title` | 复用 |
| `alert.productScope.*` | `alert.productScope.*` | 改 description |
| `alert.scriptsSandbox.*` | `alert.scriptsSandbox.*` | 复用 |
| `toolbar.create` | — | **删除** |
| `toolbar.import` | `toolbar.import` | 复用 |
| `toolbar.refresh` | `toolbar.refresh` | 复用 |
| `toolbar.searchPlaceholder` | `toolbar.searchPlaceholder` | 复用 |
| `toolbar.search` | `toolbar.search` | 复用 |
| `columns.*` | `columns.*` | 增 `alwaysLoad`；`edit`→`detail`；增 `reimport` |
| `tag.*` | `tag.*` | 复用 |
| `empty.noSkills` | `empty.noPacks` | **重命名** |
| `empty.createFirst` | — | **删除** |
| `empty.importHint` | `empty.importHint` | 复用 |
| `drawer.create` | — | **删除** |
| `drawer.edit` | `drawer.title` | **改** |
| `drawer.saveFile` | — | **删除** |
| `drawer.saveAll` | — | **删除** |
| `drawer.unsaved.*` | — | **删除** |
| `fileTree.newFile` | — | **删除** |
| `fileTree.newFolder` | — | **删除** |
| `fileTree.rename` | — | **删除** |
| `fileTree.delete` | — | **删除** |
| `fileTree.skillMdRequired` | `fileTree.skillMdRequired` | 复用 |
| `fileTree.scriptRunnable` | `fileTree.scriptRunnable` | 复用 |
| `fileTree.scriptRunnableTooltip` | `fileTree.scriptRunnableTooltip` | 复用 |
| `modal.create` | — | **删除** |
| `modal.edit` | — | **删除** |
| `modal.ok.*` | — | **删除** |
| `modal.cancel` | — | **删除**（Modal 若仍需取消，用 antd 默认或 `common.cancel`） |
| `modal.save` | — | **删除** |
| `form.name.*` | — | **删除** |
| `form.description.*` | — | **删除** |
| `form.enabled.*` | — | **删除** |
| `form.alwaysLoad.*` | — | **删除**（只读改 `meta.alwaysLoad`） |
| `form.skillMd.extra` | — | **删除** |
| `import.*` | `import.*` | 增 `overwriteTitle`、`overwriteWarning` |
| `help.scripts.*` | `help.scripts.*` | 复用 |
| `confirm.delete.*` | `confirm.delete.*` | 微调 description |
| `deleteBlocked.*` | `deleteBlocked.*` | body 改枚举名 |
| `link.assistants` | `link.assistants` | 复用 |
| `toast.created` | — | **删除** |
| `toast.saved` | — | **删除** |
| `toast.deleted` | `toast.deleted` | 复用 |
| `toast.loadFailed` | `toast.loadFailed` | 复用 |
| `toast.imported` | `toast.imported` | 复用 |
| `toast.syncedFromFrontmatter` | — | **删除** |
| `toast.alwaysLoadUpdated` | — | **删除** |

### 16.1 request.ts 注册

```typescript
// src/i18n/request.ts
admin: {
  // …existing
  skills: skills.default,  // messages/{locale}/page/admin/skills.json
},
```

### 16.2 死 key 审计

迁移完成后 grep `page.console.skills` — 应零引用（`messages` 文件可删或保留 deprecated 注释）。

---

## 17. JSON 文件路径

```
messages/en/page/admin/skills.json
messages/zh/page/admin/skills.json
```

---

## 18. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-20 | 初稿 |
