# Data Models（预留方向）- version 0.0.1

## 1. 文档定位

- 本文档是阶段 3A 数据模型方向说明。
- 目标是沉淀后续可实现的数据结构草案，不在 `0.0.1` 执行建表或持久化。
- `0.0.1` 四页面为静态占位，不依赖任何数据库实体。

## 2. 技术约束（后续版本）

- ORM：TypeORM
- 数据库：SQLite
- 说明：以上仅作为后续技术路线约束，`0.0.1` 不落地迁移、不创建实体代码。

## 3. 模型域划分（Draft）

### 3.1 用户与认证域

1. `User`
   - `id`（string）
   - `email`（string, unique）
   - `telNo`（string, 11 位数字, unique）
   - `nickName`（string, 1-32 字符）
   - `passwordHash`（string）
   - `role`（string, nullable；0.0.1 后续阶段不作为控制台权限区分依据）
   - `status`（enum: `active` | `disabled`）
   - `createdAt` / `updatedAt`（datetime）

2. `Session`
   - `id`（string）
   - `userId`（string, fk -> User.id）
   - `tokenHash`（string）
   - `expiresAt`（datetime）
   - `createdAt`（datetime）

### 3.2 对话域

1. `ChatSession`
   - `id`（string）
   - `userId`（string, fk -> User.id）
   - `title`（string）
   - `createdAt` / `updatedAt`（datetime）

2. `ChatMessage`
   - `id`（string）
   - `sessionId`（string, fk -> ChatSession.id）
   - `role`（enum: `system` | `user` | `assistant`）
   - `content`（text）
   - `tokens`（number, nullable）
   - `createdAt`（datetime）

### 3.3 控制台配置域

1. `AppConfig`
   - `id`（string）
   - `key`（string, unique）
   - `value`（text/json string）
   - `updatedBy`（string, fk -> User.id, nullable）
   - `updatedAt`（datetime）

2. `DashboardSnapshot`（可选）
   - `id`（string）
   - `metricKey`（string）
   - `metricValue`（number）
   - `capturedAt`（datetime）

## 4. 关系草案（Draft）

- `User` 1 - N `Session`
- `User` 1 - N `ChatSession`
- `ChatSession` 1 - N `ChatMessage`
- `User` 1 - N `AppConfig`（按 `updatedBy` 追踪）

## 4.1 控制台权限说明（后续约束）

- 当前口径：控制台阶段不区分 `admin` 和 `user`。
- 用户角色细分与管理后台权限模型，延后到后续“管理后台”版本单独设计与落地。

## 5. 数据治理与安全方向（后续）

- 密码仅存 `passwordHash`，禁止明文。
- `telNo` 需做 11 位数字格式校验（建议正则：`^[0-9]{11}$`）。
- `nickName` 需做长度与字符合法性校验，避免注入与超长存储。
- 会话凭证仅存哈希，原始 token 不入库。
- 对话内容涉及隐私时，后续需补充分级与清理策略。
- 控制台配置变更后续应具备审计字段。

## 6. 0.0.1 落地状态

- 不创建 TypeORM Entity。
- 不执行 SQLite 初始化与 migration。
- 不提供数据读写 API。
- 不在页面接入任何真实数据。

> 结论：本文件为后续版本（>0.0.1）数据建模参考，当前版本仅保留方向，不实施。
