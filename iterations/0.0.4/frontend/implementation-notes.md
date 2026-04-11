# 前端实现说明：提示词模版（0.0.4）

## 代码位置

- 页面：`src/app/admin/prompts/page.tsx`（CSR，依赖 `AdminShell` 内 `App` 以使用 `message` / `modal`）。
- 侧栏：`src/app/admin/admin-menu.tsx`（文案「提示词模版」，路径 `/admin/prompts`）。
- 模版校验（与后端共用）：`src/common/prompt/validatePromptTemplate.ts`。

## 行为摘要

- 进入页 `GET /api/admin/prompt-config`；401 跳转 `/login?redirect=/admin/prompts`。
- `fileState === "invalid_json"` 时顶部 `Alert`；表单项纵向布局，`name` + 问号 `Tooltip(desc)`；`value` 为 `ProFormTextArea`（`autoSize` 6～20 行）。
- 每项 **`extra`**：`mt-2` 与正文区间距；若有 `params`，展示「支持参数：」+ **`Tag`**（`Tooltip` 为 `description`）；下方灰字 **配置 key**。
- 校验：`value` 非空 + **`validatePromptTemplate`**（仅允许 `{参数名}`，且须在 `params[].name` 中；非法 `{` 拒绝）。
- 「保存」先表单校验，再二次确认，`PUT` 整表提交；成功后刷新表单与 `fileState`；「重置」恢复代码内置 `DEFAULT_PROMPT_CONFIG`（含 `params`）。
- 开发环境页脚展示 `data/promptConfig.json` 路径提示。

## 与设计的对应

- 对齐 `iterations/0.0.4/design/spec-prompt-management.md`：标题「提示词模版」、整表保存、Tooltip、Alert、单列 maxWidth 960px、参数 Tag/Tooltip、`{参数}` 校验。

## 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-04-11 | 同步：提示词模版命名、`params` 展示、共用校验、重置行为说明 |
