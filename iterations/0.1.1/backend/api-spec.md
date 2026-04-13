# API 规范：助手管理（version 0.1.1）

## 文档信息

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.1` |
| 对齐 | `iterations/0.1.1/product/prd-assistant-management.md`、`iterations/0.1.1/design/spec-assistant-management.md` |
| 错误体 | `jsonError` + `ErrorCode` + `HttpStatus`（`src/server/http/json-response.ts`、`src/common/enums`） |
| 鉴权 | **控制台**：`getRequestUserContext()`（与 `/api/console/models` 一致），未登录 **401**。**管理后台**：`withAdminApi`（与 `/api/admin/model-configs` 等一致），非管理员 **403**。 |

---

## 1. 枚举与常量

- **`scope`**（响应字段）：`system` | `personal`（见 `data-models.md`）。
- **分页**：与控制台模型列表对齐，建议复用或并列定义：
  - `CONSOLE_ASSISTANT_LIST_DEFAULT_PAGE`、`CONSOLE_ASSISTANT_LIST_DEFAULT_PAGE_SIZE`、`CONSOLE_ASSISTANT_LIST_MAX_PAGE_SIZE`
  - 默认值可与 `CONSOLE_MODEL_LIST_*` 相同，便于 UX 一致。

---

## 2. 控制台路由 `/api/console/assistants`

### 2.1 `GET /api/console/assistants`

**说明**：分页列出 **系统助手 ∪ 当前用户的个人助手**；支持按 **名称**（`keyword`）与 **范围**（`scope`）筛选（不按 tags 查询）。

#### 查询参数

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `page` | int ≥ 1 | `1` | |
| `pageSize` | int | 与模型页一致 | 上限 `CONSOLE_ASSISTANT_LIST_MAX_PAGE_SIZE` |
| `keyword` | string | 省略 | 可选；对 **`name`** 子串匹配（`instr(lower(name), lower(keyword))`）。 |
| `scope` | string | `all` | `all` \| `system` \| `personal`；过滤结果子集。 |

非法分页参数：**400**，`ErrorCode.VALIDATION_ERROR`。

#### 响应 200

```json
{
  "items": [ /* AssistantListItem[] */ ],
  "total": 0,
  "page": 1,
  "pageSize": 20
}
```

#### 排序

建议：`updatedAt DESC`，其次 `id DESC`（与模型列表一致）。

---

### 2.2 `POST /api/console/assistants`

**说明**：仅创建 **个人助手**；**禁止**在 body 中指定 `scope: system`（若传入则忽略或 **400**，建议 **400** 显式拒绝）。

#### 请求体

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| `name` | string | 必填；trim 后非空；max 64 |
| `prompt` | string | 必填；trim 后非空；max 建议 8000 |
| `icon` | string \| null | 可选；max 16 |
| `openingMessage` | string \| null | 可选；max 2000 |
| `tags` | string[] | 可选；服务端 normalize |

#### 响应 201

```json
{ "item": { /* AssistantListItem */ } }
```

---

### 2.3 `GET /api/console/assistants/[id]`

**说明**：单条详情。授权：

- `scope === system`：任意登录用户可读；
- `scope === personal`：仅当 `userId === 当前用户`。

否则 **404**（不泄露存在性）或 **403**（团队若统一「个人资源不存在返回 404」，与模型 API 对齐）。

#### 响应 200

`{ "item": AssistantListItem }`（字段完整，含 `prompt`）。

---

### 2.4 `PATCH /api/console/assistants/[id]`

**说明**：仅允许 **个人** 且 **本人** 记录；系统助手或个人非本人 ⇒ **404** 或 **403**（与项目惯例一致）。

#### 请求体

部分更新；未出现字段表示不改。规则同 POST 的字段校验（仅对出现的字段校验）。

#### 响应 200

`{ "item": AssistantListItem }`。

---

### 2.5 `DELETE /api/console/assistants/[id]`

**说明**：同上，仅个人且本人；**物理删除**。

#### 响应 200

`{ "ok": true }` 或 **204 No Content**（二选一，3B 与前端统一）。

---

## 3. 管理后台路由 `/api/admin/assistants`

### 3.1 `GET /api/admin/assistants`

**说明**：仅 **`scope === system`** 的分页列表；可支持 `keyword`（语义同控制台，但结果集仅为系统助手）。

#### 查询参数

同 §2.1，**无** `scope` 或固定等价于 `system`。

#### 响应 200

同 §2.1 结构。

---

### 3.2 `POST /api/admin/assistants`

**说明**：创建 **系统助手**；`userId` 存 **`NULL`**；**不可**指定归属普通用户。

#### 请求体

与 §2.2 相同字段集合（`name`、`prompt`、`icon`、`openingMessage`、`tags`）；服务端强制 `scope=system`。

#### 响应 201

`{ "item": AssistantListItem }`。

---

### 3.3 `GET /api/admin/assistants/[id]`

**说明**：仅当该 id 为 **system** 助手；否则 **404**。

#### 响应 200

`{ "item": AssistantListItem }`。

---

### 3.4 `PATCH /api/admin/assistants/[id]`

**说明**：更新系统助手；非系统 id ⇒ **404**。

#### 响应 200

`{ "item": AssistantListItem }`。

---

### 3.5 `DELETE /api/admin/assistants/[id]`

**说明**：删除系统助手；非系统 ⇒ **404**。

---

## 4. 错误码约定（摘要）

| 场景 | HTTP | ErrorCode |
| --- | --- | --- |
| 未登录（控制台） | 401 | `UNAUTHORIZED` |
| 非管理员（admin） | 403 | 与 `withAdminApi` 一致 |
| 参数非法 | 400 | `VALIDATION_ERROR` |
| 无权或资源不存在（控制台写系统/他人个人） | 404 或 403 | 与 `PATCH /api/console/models/[id]` 对公有模型行为对齐 |

---

## 5. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-04-13 | 初稿：控制台/管理端 REST 拆分与鉴权规则 |
