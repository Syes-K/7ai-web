# 服务端实现说明：模型公有/私有、标签、管理后台与运行时（0.0.10）

## 文档信息

| 项 | 内容 |
| --- | --- |
| 版本 | `0.0.10` |
| 上游文档 | `product/prd-model-visibility-and-admin.md`、`0.0.8` 模型管理、`0.0.9` 账号与偏好 |
| 关联前端说明 | `../frontend/implementation-notes.md` |

---

## 1. 数据模型：`UserModelConfig`

| 字段 | 说明 |
| --- | --- |
| `id` | UUID |
| `userId` | 创建者；公有行在管理后台创建时为 **当前管理员 id**（审计） |
| `visibility` | `ModelConfigVisibility`：`private`（默认）\| `public` |
| `provider` | 与 `MODEL_PROVIDER_BASE_URL` 键一致（如 `ALYUN`、`GLM`、…） |
| `modelName` | 厂商侧模型名 |
| `apiKeyCipher` | AES-256-GCM 密文 |
| `tags` | `simple-json`，字符串数组；**仅允许**常量 `MODEL_CONFIG_TAG_OPTIONS` 中的值（见 §6）；旧数据非法值在 DTO 输出时过滤 |
| `createdAt` / `updatedAt` | TypeORM 时间戳 |

**索引**：`["userId", "updatedAt"]`、`["visibility", "updatedAt"]`。

**表名**：`user_model_configs`（`synchronize: true` 开发环境自动演进；生产若关同步需手写迁移）。

---

## 2. 选用与校验：`findModelConfigUsableByUser`

**文件**：`src/server/model-config/find-usable-config.ts`

**语义**：`configId` 存在 **且** `(visibility = public OR userId = 当前用户)` 时返回实体，否则 `null`。

**调用方（节选）**：

| 场景 | 说明 |
| --- | --- |
| `getConsoleProfileResponse` | 解析偏好指针是否仍可选用；失效则清空指针并置 `preferenceStale` / `vectorPreferenceStale` |
| `getChatRuntimeModel` | 用户偏好指向的配置须可选用 |
| `PATCH /api/console/profile/preference` | `applyModelPrefPointer`：写入 `preferredModelConfigId` / `preferredVectorModelConfigId` 前校验 |
| `GET/PATCH /api/console/models/[id]` | 单条访问与更新前（经 `findModelConfigUsableByUser` 或等价逻辑） |

---

## 3. 控制台 API：`/api/console/models`

**鉴权**：`getRequestUserContext()`；未登录 **401**。

**分页查询参数**（GET）：`page`（≥1）、`pageSize`（1…`CONSOLE_MODEL_LIST_MAX_PAGE_SIZE`），缺省与校验见路由实现。

| 方法 | 行为 |
| --- | --- |
| **GET** | QueryBuilder：`(visibility = public) OR (userId = 当前用户)`，按 `updatedAt`、`id` 倒序分页；响应 `{ items, total, page, pageSize }`。 |
| **POST** | 仅创建 **private**。Body：`provider`、`modelName`、`apiKey`（必填）；**`tags`** 可选，为字符串数组，服务端 **`parseModelConfigTags`** 校验（见 §6）。 |
| **GET /[id]** | 单条：可选用则 **200** + `ModelConfigListItem`；否则 **404** `MODEL_CONFIG_NOT_FOUND`。 |
| **PATCH /[id]** | 仅 **本人私有** 行：`{ id, userId: 当前用户 }`。Body 可含 `provider`、`modelName`、`apiKey`（空串表示不改密钥）、**`tags`**（若带键则整组替换）。公有行对普通用户 **404**。 |
| **DELETE /[id]** | 仅本人私有；**事务**内删配置并清空当前用户 `preferredModelConfigId` / `preferredVectorModelConfigId` 若指向该 id。**204**。 |

**创建行**：`createUserModelConfigRow`（`src/server/model-config/create-model-config.ts`），控制台传 `ModelConfigVisibility.Private` + `tags`。

---

## 4. 管理后台 API：`/api/admin/model-configs`

**鉴权**：`withAdminApi`（管理员）；**401** / **403** 与项目一致。

| 方法 | 行为 |
| --- | --- |
| **GET** | 仅 `visibility = public`，分页约定同控制台。 |
| **POST** | 新建 **public**（`createUserModelConfigRow(..., ModelConfigVisibility.Public)`）。Body 与控制台 POST 对齐（含可选 `tags`）。 |
| **GET /[id]** | 须为 **public**，否则 **404**。 |
| **PATCH /[id]** | 更新公有模型；Body 与控制台 PATCH 对齐。 |
| **DELETE /[id]** | 删除公有行；**事务**内将所有用户 `preferredModelConfigId`、`preferredVectorModelConfigId` 等于该 id 的字段置 **`NULL`**。**204**。 |

---

## 5. DTO 与类型

- **`ModelConfigListItem`**（`@/common/types/model-config.ts`）：`visibility: "private" | "public"`；**`tags: ModelConfigTag[]`**（仅合法预设值，见 §6）。
- **`userModelConfigToListItem`**：`visibility` 缺省按 private；`tags` 经 **`normalizeStoredModelTags`** 过滤未知值。

---

## 6. 标签（tags）

| 项 | 说明 |
| --- | --- |
| 常量 | `@/common/constants`：`MODEL_CONFIG_TAG_OPTIONS`（`免费`、`文本`、`视频`、`声音`、`嵌入`、`对话`）、`MODEL_CONFIG_TAG_OPTION_SET` |
| 写入校验 | `parseModelConfigTags`（`src/server/model-config/parse-model-tags.ts`）：请求体须为字符串数组，元素须在白名单内；trim、去重 |
| 读出规范化 | `normalizeStoredModelTags`：库内历史脏数据不对外暴露 |
| POST | `tags` 省略视为 `[]` |
| PATCH | 请求体 **含 `tags` 键** 时整组替换；省略则不改 |

---

## 7. 对话运行时与默认 LLM

- **`getChatRuntimeModel`**（`src/server/chat/llm-runtime.ts`）：优先用户偏好 `UserModelConfig`（须可选用 + 解密成功）；否则 **`getModel({ temperature: 0.7 })`**，由 **`getModel`** 内从环境变量解析默认 `model` / `provider` / `apiKey`。
- **`getModel`**（`src/server/llm/model.ts`）：入参 **`GetModelOptions`** 对象；未传的 `model` / `provider` / `apiKey` 来自 **`CHAT_LLM_MODEL`、`CHAT_LLM_PROVIDER`、`CHAT_LLM_API_KEY`**（与 `MODEL_PROVIDER_BASE_URL` 联用）。

---

## 8. 控制台 Profile API（与本迭代相关）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/console/profile` | `getConsoleProfileResponse`：个人信息 + 偏好指针 + 可选用解析 |
| PATCH | `/api/console/profile/preference` | 更新 `preferredModelConfigId` / `preferredVectorModelConfigId`（可只传其一）；指针须通过 `findModelConfigUsableByUser` |

**上下文**：`getRequestUserContext`（`src/server/auth/request-user-context.ts`）提供 `user` 等（若路由已用该封装）。

---

## 9. 环境变量（节选）

| 变量 | 说明 |
| --- | --- |
| `CHAT_LLM_API_KEY` | 系统默认对话 API Key（与按模型存储的密钥区分；**原 `OPENAI_API_KEY` 已更名**） |
| `CHAT_LLM_MODEL` / `CHAT_LLM_PROVIDER` | 未选用户模型配置时 `getModel` 使用的默认模型与厂商键 |
| `MODEL_CONFIG_SECRET` | 模型配置 API Key 加解密；生产建议长度 ≥16（参见 `0.0.8` 说明） |
| `SQLITE_PATH` | 可选；默认 `data/app.db` |

详见项目根 `.env.example`。

---

## 10. 错误码与 HTTP

- 校验失败：**422**（`VALIDATION_ERROR`）+ `details[]`（含 `field`）。
- 模型配置不存在：**404** `MODEL_CONFIG_NOT_FOUND`。
- 删除成功：**204** `NO_CONTENT`（控制台/管理端 DELETE）。

---

## 11. 自测建议

1. 管理后台新建公有模型（可带标签）→ 普通用户在控制台列表见「公有」，**不可**编辑/删除；偏好可选中该条，对话走 `getChatRuntimeModel`。
2. 控制台自建私有模型 → 仅本人可改删；列表含公有+本人私有。
3. `PATCH` 标签：省略 `tags` 不改；传 `tags: []` 清空；传非法值 **422**。
4. 管理后台删除公有模型 → 全站用户偏好指针被清空；`GET /api/console/profile` 无悬空 id 或出现 `preferenceStale` 等既有行为。
5. 未登录调上述 API → **401**。

---

## 12. 相关代码路径（速查）

| 模块 | 路径 |
| --- | --- |
| 可见性枚举 | `src/common/enums/model-config-visibility.ts` |
| 标签常量 | `src/common/constants/index.ts`（`MODEL_CONFIG_TAG_*`） |
| 实体 | `src/server/db/entities/UserModelConfig.ts` |
| 创建行 | `src/server/model-config/create-model-config.ts` |
| 标签解析 | `src/server/model-config/parse-model-tags.ts` |
| 可选用查询 | `src/server/model-config/find-usable-config.ts` |
| DTO | `src/server/model-config/user-model-config-dto.ts` |
| 控制台模型路由 | `src/app/api/console/models/route.ts`、`.../models/[id]/route.ts` |
| 管理端模型路由 | `src/app/api/admin/model-configs/route.ts`、`.../model-configs/[id]/route.ts` |
| Profile | `src/server/console-profile/get-console-profile.ts`、`src/app/api/console/profile/preference/route.ts` |
| 对话运行时 | `src/server/chat/llm-runtime.ts`、`src/server/llm/model.ts` |
