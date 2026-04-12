# 前端实现说明：控制台「模型管理」（0.0.8）

## 路径与文件

| 文件 | 说明 |
|------|------|
| `src/app/console/models/page.tsx` | `ProTable` 列表、`Modal`+`Form` 新建/编辑、`Popconfirm` 删除 |
| `src/app/console/models/model-provider-ui.ts` | Provider 中文名、Tag 配色、Select 选项（与 PRD / `ModelProvider` 枚举一致） |

## 对接 API

- `GET /api/console/models?page&pageSize` → 分页数据
- `POST /api/console/models` → 新建（`apiKey` 必填）
- `PATCH /api/console/models/:id` → 编辑；**`apiKey` 仅在有输入时写入 body**（留空不修改）
- `DELETE /api/console/models/:id` → 物理删除；成功后 `actionRef.reload()`
- 401：跳转登录并带 `redirect=/console/models`

## 交互与设计对齐

- 工具栏：**新建模型**（主按钮）、**刷新**
- 列：模型名称、Provider（Tag）、API Key（掩码）、最近更新、操作（编辑 / 删除）
- Modal 宽 520px，`maskClosable={false}`，编辑时 API Key 占位说明「留空则不修改」
- 删除：`Popconfirm` 含模型名与不可恢复提示

## 自测建议

1. 登录后打开 `/console/models`，列表与分页正常。
2. 新建一条 → 列表出现；编辑名称；编辑 Key 留空保存后掩码不变。
3. 删除 → 列表减少；无会话时接口 401 并跳转登录。

## 偏差与后续

- 删除后若当前页被删空，依赖用户切换分页或刷新；未自动「回到上一页」（设计为建议项）。
- 对话页选用列表中的模型：仍属后续迭代（PRD Out of Scope）。
