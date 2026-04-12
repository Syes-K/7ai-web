# 服务端实现说明：模型管理（0.0.8，阶段 3B）

## 已实现内容

- **实体**：`UserModelConfig`（表 `user_model_configs`），已注册至 `getDataSource()`，`synchronize` 会自动建表。
- **API**（与 `api-spec.md` 对齐）：
  - `GET/POST` → `src/app/api/console/models/route.ts`
  - `GET/PATCH/DELETE` → `src/app/api/console/models/[id]/route.ts`
- **鉴权**：各 handler 使用 `getCurrentUser()`；未登录 **401**。
- **密钥**：`src/server/model-config/api-key-crypto.ts`（AES-256-GCM）；列表/详情仅返回 `apiKeyMasked`。
- **枚举**：`ModelProvider`（`ALYUN` / `GLM` / `DEEPSEEK`）在 `@/common/enums`。
- **错误码**：`ErrorCode.MODEL_CONFIG_NOT_FOUND`；HTTP **204** 用于 `DELETE` 成功（`HttpStatus.NO_CONTENT`）。
- **Middleware**：`/api/console/*` 纳入 matcher；无会话 Cookie 时返回 JSON **401**（与 `/api/admin` 一致）。

## 环境变量

| 变量 | 说明 |
|------|------|
| `MODEL_CONFIG_SECRET` | **强烈建议生产配置**：长度 ≥16；未设置或过短时使用内置派生密钥（启动时会 `console.warn`），避免因未配置导致接口 500。 |
| `SQLITE_PATH` | 可选；默认 `data/app.db`（与项目一致）。 |

## 本地自测建议

1. 登录后 `GET /api/console/models?page=1&pageSize=20` → 200 + `items`/`total`。
2. `POST /api/console/models` body `{ "provider":"ALYUN","modelName":"t","apiKey":"sk-test" }` → 201 + `item.apiKeyMasked` 为掩码。
3. `PATCH /api/console/models/:id` body `{ "modelName":"t2" }` 或 `"apiKey":""` 不改密钥。
4. `DELETE /api/console/models/:id` → 204；重复删除 → 404 + `MODEL_CONFIG_NOT_FOUND`。
5. 未携带 Cookie 访问上述接口 → 401。

## 与迭代文档的偏差

- 无：实现以当前 `iterations/0.0.8/backend/api-spec.md` 为准。

## 未实现 / 后续

- 对话路由 `getModel` 仍使用环境变量单一 Key；按 `implementation-plan.md` 与库内配置打通属后续迭代。
