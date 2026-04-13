# 前端实现说明：助手管理（version 0.1.1）

## 文档信息

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.1` |
| 对应设计 | `iterations/0.1.1/design/spec-assistant-management.md` |
| 对应 API | `iterations/0.1.1/backend/api-spec.md` |

---

## 页面与路径

| 页面 | 路由 | 源码 |
| --- | --- | --- |
| 控制台助手 | `/console/assistants` | `src/app/console/assistants/page.tsx` |
| 系统助手管理 | `/admin/assistants` | `src/app/admin/assistants/page.tsx` |

壳与侧栏沿用既有 `ConsoleShell` / `AdminShell` 与 `console-menu` / `admin-menu`（助手菜单项已存在）。

---

## 实现要点

### 控制台

- **ProTable**：服务端分页；筛选区在表格上方（名称搜索、范围），请求参数 `keyword`、`scope` 与后端一致（**不提供按 tags 搜索**）。
- **类型列**：`system` → 金色 `Tag`「系统」，`personal` → 默认「个人」。
- **系统行**：**查看** 打开只读 Modal；**编辑 / 删除** 禁用，外层 **`Tooltip` + `span`**（满足 Ant Design 对 disabled 按钮的提示要求），文案：**「系统助手请在管理后台维护」**。
- **空列表**：`locale.emptyText` 引导新建或等待系统助手。
- **工具栏**：与模型页一致，**新建**（`type="primary"` + `ghost`）在 **刷新** 左侧。

### 管理后台

- 仅系统助手；列表筛选为 **名称**；**新建系统助手** 与 **刷新** 顺序、按钮样式与 `admin/models` 对齐。
- **空列表**：`locale.emptyText` 提示新建。

### 表单

- 字段：名称、提示词（多行 + `showCount`）、emoji 图标、开场白、tags（`Select` `mode="tags"`）；校验长度与 `@/common/constants` 中 `ASSISTANT_*` 一致。

---

## 与设计的偏差（deviations）

| 项 | 设计 | 实现 |
| --- | --- | --- |
| 筛选区位置 | 可为 `toolbar` 或 `search` 区 | 置于 **表格上方独立一行**，避免与工具栏按钮挤在一行 |
| 去对话使用 | §3.4 可选 | **未做**（PRD O1 非强制）；仅 Alert 说明 |

---

## 自测建议

1. 控制台：空表、仅系统、仅个人、混合列表；系统行 Tooltip、查看只读弹窗。
2. 管理端：403 跳转 `console?notice=admin_forbidden`（与非管理员一致）。
3. 窄屏下表格横向滚动 `scroll.x` 可正常拖动。

---

## 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-04-13 | 初稿：对齐设计空态、Tooltip、工具栏样式；筛区位置记入偏差 |
