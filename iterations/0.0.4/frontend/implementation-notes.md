# 前端实现说明：提示词管理（0.0.4）

## 代码位置

- 页面：`src/app/admin/prompts/page.tsx`（CSR，依赖 `AdminShell` 内 `App` 以使用 `message`）。

## 行为摘要

- 进入页 `GET /api/admin/prompt-config`；401 跳转 `/login?redirect=/admin/prompts`。
- `fileState === "invalid_json"` 时顶部 `Alert`；表单项纵向布局，`name` + 问号 `Tooltip(desc)` + 次要 `key` 文案；`value` 为 `Input.TextArea`（`autoSize` 6～20 行）。
- 「保存」`PUT` 整表提交；成功后刷新表单与 `fileState`；「重置」恢复上次成功加载的快照。
- 开发环境页脚展示 `data/promptConfig.json` 路径提示。

## 与设计的对应

- 对齐 `iterations/0.0.4/design/spec-prompt-management.md`：整表保存、Tooltip、Alert、占位符说明区、单列 maxWidth 960px。
