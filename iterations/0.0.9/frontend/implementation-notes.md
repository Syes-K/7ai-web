# 前端实现说明：账号与偏好页（0.0.9）

## 路径

- **`src/app/console/profile/page.tsx`**：单页双模块（`Card`：个人信息、默认模型配置）；模块级编辑/保存/取消；对接 `GET/PATCH /api/console/profile/*` 与 `GET /api/console/models`（`pageSize` 取 `CONSOLE_MODEL_LIST_MAX_PAGE_SIZE` 拉取候选项）。

## 行为要点

- **标题**：`PageContainer` `title="账号与偏好"`，与侧栏一致。
- **个人信息**：只读 `Descriptions`；编辑态 `Form`（邮箱 `disabled`）；手机留空提交为 `null`。
- **默认模型**：只读展示 Provider `Tag` + `modelName`（复用 `model-provider-ui`）；`preferenceStale` 时 **`Alert` warning**；无登记时 `Empty` + 链至 `/console/models`；无模型时「编辑」禁用 + `Tooltip`。
- **偏好编辑**：`Select` `showSearch` + `allowClear`（清空即 `preferredModelConfigId: null`）。

## 自测建议

1. 登录打开 `/console/profile`，两模块只读数据正确。
2. 改昵称/手机保存后只读更新；手机与他人冲突提示与接口一致。
3. 有模型时选默认、保存；在模型管理删除该条后回到本页应出现 stale 或已清空（依后端）。
4. `/console/settings` 应跳到 `/console/profile`（`next.config` + `settings/page.tsx`）。

## 偏差

- 未实现 `beforeunload` 脏数据提示（设计为可选 P1）。
