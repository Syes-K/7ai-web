# API 规范：控制台个人信息与默认模型偏好（0.0.9）

## 文档信息

| 项 | 内容 |
| --- | --- |
| 版本 | `0.0.9` |
| 阶段 | 3A（文档-only） |
| 上游 | `iterations/0.0.9/product/prd-profile-settings.md`、`iterations/0.0.9/design/spec-profile-settings.md` |
| 技术对齐 | Next.js Route Handlers、`getCurrentUser()`、`jsonError` / `ErrorCode` / `HttpStatus`（`@/common/enums`） |

---

## 1. 与 `GET /api/auth/me` 的职责划分（推荐）

| 接口 | 职责 | 本迭代是否变更 |
| --- | --- | --- |
| **`GET /api/auth/me`** | 轻量「当前登录用户」：`PublicUser`（`id`、`email`、`nickName`、`telNo`），供壳、布局、多页共用 | **不建议**在本迭代为其增加 `preferredModelConfigId` 或模型摘要，避免会话探测接口变胖、非控制台页也拉取偏好数据 |
| **控制台聚合接口（见下）** | 个人信息展示 + 默认模型偏好指针及摘要，供 `/console/profile` 首屏与保存后刷新 | **新增** |

**推荐**：前端控制台「账号与偏好」页以 **`GET /api/console/profile`（或等价路径）** 为聚合数据源；全局仅需昵称等仍可用 `GET /api/auth/me`。

**PATCH 分工**：与设计的「模块级独立保存」一致，拆成 **个人信息 PATCH** 与 **偏好 PATCH** 两个子资源（或同一路由下按路径区分），避免单 PATCH 多可选块导致语义含糊与误 PATCH。

---

## 2. 鉴权与通用约定

- **鉴权**：与现有控制台 API 一致，依赖 **Session Cookie** + `credentials: "include"`；Handler 内 **`getCurrentUser()`**，未登录返回 **`401`**，`ErrorCode.UNAUTHORIZED`，文案可与现有一致（如「未登录」）。
- **Content-Type**：`application/json; charset=utf-8`。
- **用户隔离**：所有读写必须限定 **当前 `user.id`**；禁止按请求体传入 `userId` 跨用户操作。

---

## 3. 接口列表

### 3.1 `GET /api/console/profile`

**用途**：单页首屏聚合——个人信息 + 当前默认模型偏好（指针 + 摘要），可选一并满足列表入口（见响应字段策略）。

**成功 `200`** JSON 建议结构：

```ts
{
  "profile": {
    "email": string,       // 只读展示，与 PRD「不可改邮箱」一致
    "nickName": string,
    "telNo": string | null
  },
  "preference": {
    "preferredModelConfigId": string | null,
    /** 指针有效时与列表项结构对齐，便于只读摘要（Provider Tag + modelName） */
    "preferredModel": {
      "id": string,
      "provider": string,
      "modelName": string,
      "updatedAt": string  // ISO 8601，与 0.0.8 列表 DTO 一致即可
    } | null,
    /** 指针存在但行已删或归属不一致时：仅摘要失效，见 §3.4 */
    "preferenceStale": boolean
  }
}
```

**字段说明**：

- **`preferenceStale`**：当 `preferredModelConfigId` 非空但在库中找不到对应行、或不属于当前用户时，置 `true`，`preferredModel` 为 `null`（与设计 §8.3「原默认配置已失效」一致）。后端可选择是否在发现脏指针时**异步修正**为清空指针（见数据模型文档）。
- **列表数据源**：本页编辑态下拉仍使用现有 **`GET /api/console/models`**（分页参数与 0.0.8 一致）；聚合 GET **不必**重复返回全量列表，避免与模型管理页两套分页语义；若产品坚持「一次请求拿全量选项」，可作为 P1 在本文档增补 `GET /api/console/profile?include=modelOptions`（本 3A 文档默认 **不**要求）。

---

### 3.2 `PATCH /api/console/profile/personal`

**用途**：仅更新 **昵称、手机号**；**禁止**接受或修改 `email`。

**请求体**（字段均可选时需定义策略——建议「至少一项」或「全量替换可编辑字段」二选一，3B 实现时锁死一种）：

```json
{
  "nickName": "string",
  "telNo": "string | null"
}
```

**校验**（与现有 `User` 约束对齐）：

- `nickName`：非空、长度上限与现有一致（若注册/API 已有常量则复用 `@/common/constants`）。
- `telNo`：可空；非空时需格式校验；**唯一性**：与注册逻辑一致，冲突时 **`409`** 或 **`422`**（与项目现有注册 `AUTH_TEL_TAKEN` 对齐时优先复用 **`ErrorCode.AUTH_TEL_TAKEN`**，`HttpStatus` 与现有注册接口保持一致）。

**成功 `200`**：返回更新后的 `profile` 片段（与 `GET` 中 `profile` 同形）或完整 `GET /api/console/profile`（3B 二选一，推荐返回片段减小负载）。

**错误**：

| 场景 | HTTP | ErrorCode | 说明 |
| --- | --- | --- | --- |
| 未登录 | 401 | `UNAUTHORIZED` | 同现有 |
| 参数非法 | 400 | `VALIDATION_ERROR` | 昵称/手机号格式、长度等 |
| 手机号与他人冲突 | 与注册一致 | `AUTH_TEL_TAKEN` | 若项目对冲突统一用 409，则改表内 HttpStatus 列 |

---

### 3.3 `PATCH /api/console/profile/preference`

**用途**：设置 **默认模型偏好指针**，指向当前用户名下某条 `UserModelConfig.id`。

**请求体**：

```json
{
  "preferredModelConfigId": "uuid-string | null"
}
```

- **`null`**：清空偏好（若产品允许「无默认」）；若产品不允许清空，3B 中拒绝并 **`VALIDATION_ERROR`**。
- **非空**：必须为 **当前用户** 拥有的 `UserModelConfig` 主键；服务端查询 `WHERE id = ? AND userId = currentUser.id`，不存在则 **`404`** + `ErrorCode.MODEL_CONFIG_NOT_FOUND`（与 0.0.8 控制台模型 API「不泄露他人资源」策略一致）。

**成功 `200`**：返回更新后的 `preference` 对象（与 `GET` 中 `preference` 同形）或完整聚合。

**错误**：

| 场景 | HTTP | ErrorCode |
| --- | --- | --- |
| 未登录 | 401 | `UNAUTHORIZED` |
| `preferredModelConfigId` 非空但记录不存在或不属于当前用户 | 404 | `MODEL_CONFIG_NOT_FOUND` |
| body 结构非法 / id 格式非法 | 400 | `VALIDATION_ERROR` |

**说明**：不要求新增「偏好专用」ErrorCode，除非产品希望前端区分「模型被删」与「从未设置」——当前可用 `preferenceStale` + GET 区分。

---

### 3.4 与 `DELETE /api/console/models/[id]` 的协同（文档级约定）

- 当用户删除的模型行 **恰好是当前 `preferredModelConfigId`** 时，推荐在 **同一事务** 内将用户指针置 `null`（见数据模型文档），`DELETE` 仍返回成功。
- 不要求 `DELETE` 返回 **`409`**（除非产品改为「必须先改偏好再删」）；PRD 倾向由后端定义，与设计「失效后可重选」一致时，**自动清空**更顺。

---

## 4. 错误码汇总（本功能）

| ErrorCode | 使用场景 |
| --- | --- |
| `UNAUTHORIZED` | 未登录 |
| `VALIDATION_ERROR` | 昵称/手机号/请求体校验失败；`preferredModelConfigId` 格式非法 |
| `AUTH_TEL_TAKEN` | 手机号唯一冲突（若本期启用） |
| `MODEL_CONFIG_NOT_FOUND` | 偏好指向的配置不存在或无权（含跨用户 id） |

若后续需要「业务冲突」与模型删除策略强绑定，可新增 `ErrorCode`（如 `PREFERENCE_CONFLICT`），本 3A 不强制。

---

## 5. 路径命名备选

若团队希望所有控制台资源统一前缀，可采用：

- `GET/PATCH /api/console/account/profile` 等——与本文 ` /api/console/profile` **等价**，3B 实现前在本文档与前端约定中择一并全局统一即可。

---

## 6. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-04-12 | 3A 初稿 |
