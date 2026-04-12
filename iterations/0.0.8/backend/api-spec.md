# API 规范：控制台「模型管理」（version 0.0.8）

## 文档信息

| 项 | 内容 |
|----|------|
| 版本 | `0.0.8` |
| 对齐 | `iterations/0.0.8/product/prd-model-management.md`、`iterations/0.0.8/design/spec-model-management.md` §8 |
| 技术约定 | `jsonError` / `ErrorCode` / `HttpStatus`（`src/server/http/json-response.ts`、`src/common/enums`） |
| 鉴权 | 各 Route Handler **开头**调用 `getCurrentUser()`（`src/server/auth/session-user.ts`）；`null` 时返回 **401** JSON，与 `/api/chat/*` 一致。**未**使用 `withConsoleApi` 封装时，每个 handler 内显式校验会话（本迭代采用此方式，与现有 chat 路由手写校验一致）。 |

---

## 1. Provider 枚举（请求/响应值）

- **允许的字符串键**（大小写敏感，与 `src/server/llm/model.ts` 中 `MODEL_PROVIDER_BASE_URL` 的键一致）：`ALYUN` | `GLM` | `DEEPSEEK`。
- **人类可读名**（仅前端展示；API 存/取键，不存中文名）：见 PRD 附录；后端校验只认三键。
- **实现时**：建议在 `@/common/enums` 增加 `ModelProvider`（或等价常量对象）并聚合导出，避免魔法字符串。

---

## 2. 路由与 HTTP 方法

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/console/models` | 分页列表（当前登录用户可见范围内） |
| `POST` | `/api/console/models` | 新建一条模型配置 |
| `GET` | `/api/console/models/[id]` | **可选**（3B 可择一）：单条详情，便于编辑页拉取；若前端仅用列表行数据则可不实现 |
| `PATCH` | `/api/console/models/[id]` | 部分更新（含「留空不改密钥」语义） |
| `DELETE` | `/api/console/models/[id]` | **物理删除**当前用户名下该条配置（对齐 PRD US-4、设计 Popconfirm 流程） |

> 路径前缀 `/api/console/` 与「控制台」语义一致；若 3B 发现与现有路由组织冲突，可调整为 `/api/models` 等，但须同步更新本文档与前端。

---

## 3. `GET /api/console/models` — 分页列表

### 3.1 查询参数

与项目管理端惯例对齐（参考 `src/app/api/admin/users/route.ts`）：

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `page` | 整数 ≥ 1 | `1` | 页码 |
| `pageSize` | 整数 1–100 | `20`（建议与 admin 一致，具体默认值可在 `@/common/constants` 中单点定义） | 每页条数 |

非法 `page` / `pageSize`：返回 **400** 或 **422**（与项目内校验类接口保持一致即可），`ErrorCode.VALIDATION_ERROR`，`message` 说明原因；可选 `details` 字段级信息。

### 3.2 排序

- **建议**：`updatedAt DESC`，其次 `id DESC`（与设计 §2.4 一致）。

### 3.3 响应体（200）

```json
{
  "items": [ /* ModelConfigListItem */ ],
  "total": 0,
  "page": 1,
  "pageSize": 20
}
```

### 3.4 列表项 `ModelConfigListItem`（字段约定）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 主键 UUID |
| `provider` | `"ALYUN" \| "GLM" \| "DEEPSEEK"` | 存储键 |
| `modelName` | string | 模型名称 |
| `apiKeyMasked` | string | **仅掩码**，永不返回完整明文（对齐设计 §4.1、§8.5）。建议规则：前 4 + 后 4 可见，中间固定占位（如 `••••••`）；长度不暴露真实密钥长度时可统一占位长度。 |
| `createdAt` | string (ISO 8601) | 创建时间 |
| `updatedAt` | string (ISO 8601) | 更新时间 |

**不**在列表项中返回 `apiKey` 明文字段。

---

## 4. `POST /api/console/models` — 新建

### 4.1 请求体

| 字段 | 类型 | 规则 |
|------|------|------|
| `provider` | string | 必填；须为三键之一 |
| `modelName` | string | 必填；trim 后非空；最大长度与实体字段一致（如 255，见数据模型文档） |
| `apiKey` | string | 必填；trim 后非空 |

### 4.2 响应体（201 `HttpStatus.CREATED`）

建议返回新建资源的**列表项形态**（含 `apiKeyMasked`），便于前端插入列表：

```json
{
  "item": { /* ModelConfigListItem */ }
}
```

（若团队更偏好 `{ "model": ... }` 命名，3B 定一名称并全文统一即可。）

### 4.3 校验失败

- 缺字段、provider 非法、`modelName` / `apiKey` 空：**400** 或 **422**，`VALIDATION_ERROR`，`details` 标字段。

---

## 5. `PATCH /api/console/models/[id]` — 更新

### 5.1 语义（对齐设计 §8.2、§8.3）

- 允许修改 **`provider`**（三键之一）、**`modelName`**、**`apiKey`**。
- **`apiKey`**：**请求体中省略该字段，或值为 `""`（空字符串），表示不修改已存密钥**（trim 后为空视为「不修改」）。
- 若用户提交**非空** `apiKey`：视为**整体替换**为新密钥（trim 后写入）。

### 5.2 请求体（部分更新）

| 字段 | 类型 | 说明 |
|------|------|------|
| `provider` | string | 可选；若提供须为合法三键 |
| `modelName` | string | 可选；若提供则 trim 后须非空 |
| `apiKey` | string | 可选；省略或 `""` → 不改密钥 |

### 5.3 响应体（200）

建议返回更新后的 **`ModelConfigListItem`**（与列表掩码策略一致）：

```json
{
  "item": { /* ModelConfigListItem */ }
}
```

### 5.4 错误情况

| 场景 | HTTP | ErrorCode | 说明 |
|------|------|-----------|------|
| 未登录 | 401 | `UNAUTHORIZED` | 与 chat 一致 |
| `id` 不存在或不属于当前用户 | 404 | 建议新增 `MODEL_CONFIG_NOT_FOUND` 或复用统一「资源不存在」码（3B 在 `ErrorCode` 中补齐并在此定型） | 避免通过枚举探测他人资源 |
| 仅字段校验失败 | 400/422 | `VALIDATION_ERROR` | 含 `details` |
| 并发冲突（若实现乐观锁） | 409 | 建议新增 `RESOURCE_CONFLICT` 或等价（可选） | 对齐设计 §6.4；**MVP 可不实现**，则本行可暂缓 |

---

## 6. `DELETE /api/console/models/[id]` — 删除

### 6.1 语义

- **物理删除**：从存储中移除该条 `UserModelConfig` 记录（无 `deletedAt` 软删字段，见 `data-models.md`）。
- **权限**：仅当记录的 `userId` 与 `getCurrentUser().id` 一致时允许删除；否则返回 **404**（与 PATCH/GET-by-id 的 IDOR 策略一致）。

### 6.2 响应体

- **204 No Content**：成功且无响应体（推荐）；或 **200** + `{ "ok": true }`（3B 与前端约定择一，须统一）。

### 6.3 错误情况

| 场景 | HTTP | ErrorCode | 说明 |
|------|------|-----------|------|
| 未登录 | 401 | `UNAUTHORIZED` | 同上文 |
| `id` 不存在或不属于当前用户 | 404 | 同 PATCH | 避免探测他人资源 |

**无请求体**。

---

## 7. `GET /api/console/models/[id]`（可选）

- **200**：体与 `ModelConfigListItem` 一致（仍仅 `apiKeyMasked`，**不回显明文**）。
- **404**：同 PATCH 不存在规则。

---

## 8. 错误响应格式（统一）

与全局约定一致：

```json
{
  "error": {
    "code": "<ErrorCode>",
    "message": "人类可读说明",
    "details": [ { "field": "...", "message": "..." } ]
  }
}
```

`Content-Type: application/json; charset=utf-8`。

---

## 9. 与 `jsonError` 映射摘要

| 场景 | `code` | `status`（典型） |
|------|--------|------------------|
| 未登录 | `UNAUTHORIZED` | 401 |
| 参数/校验错误 | `VALIDATION_ERROR` | 400 或 422 |
| 记录不存在 | 待定业务码 | 404 |
| 服务端异常 | `INTERNAL_ERROR` | 500 |

**说明**：`ErrorCode` 当前未包含「模型配置不存在」专用项时，3B 应**新增**枚举值并在本文档最终稿中替换「待定」行，避免长期魔法字符串。

---

## 10. 前端对接提示

- 编辑表单：**不回显明文 Key**；密码框留空提交 → 不传 `apiKey` 或传 `""`，与本文档第 5 节一致。
- **删除**：`DELETE` 成功后刷新列表；空页回退见设计说明「删除成功」行为。
- ProTable `request`：使用 `page` / `pageSize` 与响应 `total` 对齐 Ant Design Pagination。
