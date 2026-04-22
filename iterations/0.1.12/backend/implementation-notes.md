# 阶段 3B 实现说明（version 0.1.12）

## 本轮实现范围

- 用户实体新增只读字段 `readOnly`（默认 `false`，用于标识测试账户）。
- 管理端用户更新接口支持修改 `readOnly`。
- 在 API 统一包装层增加只读写操作拦截器。
- 登录态返回的用户 DTO 补充 `readOnly` 字段，供前端识别与展示。
- 为聊天页前端拦截提供只读标记透传（RSC -> Client Component）。

## 关键实现点

### 1) 数据模型

- 文件：`src/server/db/entities/User.ts`
- 变更：新增 `readOnly: boolean` 列，默认值 `false`。
- 说明：项目当前 TypeORM 使用 `synchronize: true`，应用启动后自动同步字段。

### 2) 统一只读拦截

- 新增文件：`src/server/auth/with-readonly-api.ts`
- 能力：
  - 对已登录用户生效；
  - 当用户为测试账户（只读）且请求方法非 `GET` 时，直接返回 `403`；
  - 错误文案固定为：`您访问的是测试账户，不能进行数据的修改和删除`。
- 兼容修复（增量）：
  - 为避免误拦截认证流程，加入豁免路径：
    - `POST /api/auth/login`
    - `POST /api/auth/logout`
- 接入点：`src/server/http/with-api-wrapper.ts`
  - 在 API 统一包装链路中全局挂载拦截器，覆盖所有通过 `withApiWrapper` 导出的路由。

### 3) 管理端用户接口

- 文件：`src/app/api/admin/users/[id]/route.ts`
- `PATCH` 请求支持字段：
  - `status`（原有能力）
  - `readOnly`（新增能力）
- 校验规则：
  - 至少提交一个可更新字段（`status` 或 `readOnly`）；
  - `readOnly` 必须为布尔值。

### 4) 认证 DTO 同步

- 文件：`src/common/types/auth.ts`
- 文件：`src/server/auth/user-dto.ts`
- 变更：`PublicUser`/`toPublicUser` 增加 `readOnly` 字段透出。

### 5) 聊天页只读状态透传

- 文件：`src/app/chat/page.tsx`
- 变更：读取当前用户 `readOnly` 并传给 `ChatWorkspace`。
- 目的：让聊天发送入口可在前端做差异化提示拦截，避免完全依赖后端统一报错文案。

## 接口行为约定

- 只读用户写请求统一返回：
  - HTTP 状态：`403`
  - `error.code`: `FORBIDDEN`
  - `error.message`: `您访问的是测试账户，不能进行数据的修改和删除`

## 回归检查建议

1. 管理员将某账户设为测试账户后，使用该账户调用非聊天写接口（如创建会话、更新配置）应统一拦截。
2. 测试账户调用 `GET` 接口应保持正常。
3. 测试账户登录/退出不应触发只读拦截提示（认证路径已豁免）。
4. 聊天发送由前端入口先拦截；即使绕过前端，后端仍保留只读拦截兜底。
5. 普通账号不受影响，写接口行为与改动前一致。
