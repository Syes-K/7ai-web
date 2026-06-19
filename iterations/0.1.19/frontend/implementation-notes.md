# 前端实现说明 — Skill Pack 0.1.19

**版本**：`0.1.19`  
**范围**：控制台技能包管理重构、助手挂载增量、对话 Turn 展示

---

## 0. 收尾变更（迭代验收前）

- 移除迁移 Banner / 首次打开迁移 Toast（用户不再需要 0.1.18→0.1.19 提示）
- 控制台 Alert、助手 extra、空态 importHint 改为**用户向**文案（Cursor / Claude Code 等兼容说明）
- Turn 详情 skills 块 i18n 映射保留；摘要行 locale 问题移交 0.1.20

## 1. 实现概览

| 区域 | 路径 | 说明 |
| --- | --- | --- |
| 技能包列表 + Drawer | `src/app/[locale]/console/skills/SkillsClient.tsx` | ProTable（fileCount/hasScripts）；废弃 content Modal |
| Pack 详情 Drawer | `.../skills/components/PackDetailDrawer.tsx` | Tree + 编辑器；files API；元数据 PATCH |
| Zip/文件夹导入 | `.../skills/components/PackImportModal.tsx` | `POST /api/console/skill-configs/import` |
| 工具函数 | `.../skills/pack-utils.ts` | 路径编码、树构建、UTF-8 字节估算 |
| 助手挂载 | `src/app/[locale]/console/assistants/AssistantsClient.tsx` | 选项展示 fileCount / hasScripts Tag |
| Turn 详情本地化 | `src/common/chat/localize-turn-detail.ts` | skills 详情块 i18n |
| Turn 快照解析 | `src/components/chat/ChatWorkspace.tsx` | C1b `resolveSubStepForStageItem` 补 skill 键 |

---

## 2. 主要交互

### 2.1 列表页 `/console/skills`

- **新建**：小 Modal（名称/描述）→ `POST /api/console/skill-configs` → 打开详情 Drawer（含预置 `SKILL.md`）
- **导入 Zip**：Dragger +「选择文件夹」（webkitdirectory multipart）→ 成功打开 Drawer
- **编辑**：行操作打开 Drawer，加载 `GET .../files` + 单文件 `GET .../files/[path]`
- **删除**：409 助手引用 Modal（沿用 0.1.18）

### 2.2 详情 Drawer

- 桌面：左侧 Tree（28%）+ 右侧 monospaced TextArea
- 窄屏（`< md`）：`Select` 切换当前文件
- 保存当前 / 保存全部（batch `PUT .../files`）
- 新建文件、重命名（PATCH）、删除（禁止删唯一 `SKILL.md`）
- `scripts/` 节点 Badge「只读」+ 顶栏 Warning Alert

### 2.3 助手挂载

- `Select` `optionRender`：`{name} · {count} files` + 含脚本 Tag
- extra 文案：按问题加载说明（用户向）；含脚本 Tag Tooltip 更新

### 2.4 对话 Turn

- 后端已输出 `skillsMergedWithRead` 与 read 详情；前端补全 `turn.detail.*` skills keys 与 `localizeDetailBlock` 映射
- `resolveSubStepForStageItem` 增加 `skill` → C1b，刷新后 details 可正确展开

---

## 3. i18n

| 文件 | 变更 |
| --- | --- |
| `messages/{en,zh}/page/console/skills.json` | 全量升级为技能包文案 |
| `messages/{en,zh}/page/console/assistants.json` | 技能包挂载、选项、scripts Tag |
| `messages/{en,zh}/page/console/shell.json` | 菜单「技能包管理」（已有则保持） |
| `messages/{en,zh}/page/chat.json` | `turn.stage.skill`、`turn.detail.skills*` |

`messages/{en,zh}/api/message.json` 中 turnSafe skills 文案由后端阶段已写入，前端未改。

---

## 4. 自测要点

```bash
npm run dev
# 或 npm run build && npm start
```

| # | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 打开 `/console/skills` | 列表含文件数、脚本 Tag 列；无 contentPreview |
| 2 | 新建技能包 | 创建后 Drawer 打开，树含 `SKILL.md` |
| 3 | 编辑 SKILL.md 保存 | 成功；若 frontmatter 含 name/description 则 Toast 同步 |
| 4 | 新建 `reference.md` | 树新增；切换文件 dirty 确认 |
| 5 | 导入 `.cursor/skills` 同构 zip | 201 + Drawer；含 scripts 时 Warning |
| 6 | 助手编辑 → 技能包多选 | 选项含文件数；含脚本 Tag |
| 7 | 对话（挂载含 read 的 Pack） | Turn「技能包」步 summary 含 read 次数；展开见已读文件列表 |
| 8 | 关闭迁移 Banner | 刷新不再显示 |
| 9 | `npm run build` | 通过 |

---

## 5. 依赖

无新增 npm 包；沿用 `antd` + `@ant-design/pro-components`。

---

## 6. 与设计文档对应

| 设计 | 实现 |
| --- | --- |
| `spec-skill-pack-console.md` | SkillsClient + PackDetailDrawer + PackImportModal |
| `spec-assistant-skill-bindings.md` | AssistantsClient optionRender |
| `spec-migration-0.1.18.md` | Banner + 迁移 Drawer + firstOpen toast |
| `copy-console-en-zh.md` / `copy-chat-en-zh.md` | 见 §3 |

详见 `deviations.md` 偏差项。
