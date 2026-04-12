# 服务端实现说明：个人信息与默认模型偏好（0.0.9，阶段 3B）

## 已实现

- **`User.preferredModelConfigId`**：可空 `varchar(36)`，与 `UserModelConfig.id` 逻辑关联（TypeORM `synchronize` 会加列）。
- **`GET /api/console/profile`**：聚合 `profile` + `preference`；悬空指针会清空并 **`preferenceStale: true`**（当次响应）。
- **`PATCH /api/console/profile/personal`**：仅 `nickName` / `telNo`；禁止 `email`；手机号冲突 **`AUTH_TEL_TAKEN`**（与注册一致 **400**）；至少提供其一字段。
- **`PATCH /api/console/profile/preference`**：body 须含 **`preferredModelConfigId`**（`null` 清空，或非空 UUID 且须为本人 `UserModelConfig`）；返回 `{ preference }`。
- **`DELETE /api/console/models/[id]`**：事务内删除行并 **`users.preferredModelConfigId` SET NULL**（当且仅当指向该 id）。
- **菜单**：`console-menu` 合并为「账号与偏好」→ `/console/profile`。
- **重定向**：`next.config.ts` 将 `/console/settings` → `/console/profile`；`app/console/settings/page.tsx` 亦 `redirect` 兜底。

## 环境 / 数据库

- 开发环境 SQLite：`synchronize: true` 会自动加列；生产若关同步需自行迁移。

## 自测要点

见 `implementation-plan.md` 第 5 节；补充：删除当前默认模型后 `GET /api/console/profile` 的 `preferredModelConfigId` 应为 `null`。
