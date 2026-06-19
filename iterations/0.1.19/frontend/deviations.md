# 前端偏差说明 — Skill Pack 0.1.19

相对 `iterations/0.1.19/design/` 的已知偏差与假设。

---

## 1. 有意简化（MVP）

| 项 | 设计 | 实现 | 原因 |
| --- | --- | --- | --- |
| 新建文件夹 | 独立「新建文件夹」流程 | 仅「新建文件」；路径可含 `dir/file.md` | 减少 Modal 数量；API 按 path 自动建层级 |
| 迁移 Banner 触发 | 曾迁移 Pack 或 feature flag | 列表有任意 Pack 且未 dismiss | 前端无迁移 API；用「有 Pack 即可能升级用户」启发式 |
| firstOpen 迁移提示 | 迁移 Pack 首次打开 | **每个 Pack id** 首次打开 Drawer 各提示一次 | 无后端 `migrated` 标记；localStorage 按 packId |
| 导入 skipped reason | 表格 i18n 列 | 表格列头为 `path` / `reason` 英文 | 后端 reason code 原样展示；未做 reason→文案映射 |
| 新建 Pack Modal | 可含 enabled Switch | 仅 name/description；enabled 默认 true | 与 API 默认一致；启用在 Drawer 顶栏 Switch |

---

## 2. 未实现（设计可选 / 后续）

| 项 | 说明 |
| --- | --- |
| 文件夹导入客户端打 zip | 直接 multipart `files[]` 上传，依赖后端 folder 模式 |
| 导入 Progress 文案「正在解压…」 | 仅 Progress 条，无单独 i18n 行 |
| Tree 新建文件夹专用 UI | 见 §1 |
| scripts 执行 UI | 按硬约束不实现 |

---

## 3. 组件拆分

设计建议 `PackFileTree.tsx` / `PackFileEditor.tsx` 独立文件；当前合并于 `PackDetailDrawer.tsx` 以降低文件数，行为与设计一致。

---

## 4. 无偏差确认项

- 路由 `/console/skills` 保留
- 废弃单 content TextArea Modal
- Drawer 宽度 `min(1200px, 92vw)`
- 窄屏 Tree → Select
- ProTable 列 fileCount / hasScripts；移除 contentPreview
- 助手挂载交互结构不变
