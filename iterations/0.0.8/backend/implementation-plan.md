# 实现计划：控制台「模型管理」服务端（version 0.0.8，阶段 3B 指引）

## 说明

本文档供 **阶段 3B** 实现代码时使用；**3A 仅产出文档，不写源码。**

---

## 1. 实现顺序（建议）

1. **枚举与常量**  
   - 在 `@/common/enums` 增加 `ModelProvider`（或等价）及聚合导出。  
   - 在 `@/common/constants` 增加控制台模型列表默认 `page` / `pageSize` 上限等（与 admin 列表对齐的可复用值）。

2. **错误码**  
   - 在 `ErrorCode` 中增加「模型配置不存在」等业务码（若采用），避免 handler 内硬编码。

3. **类型**  
   - 在 `@/common/types` 定义列表项 DTO、POST/PATCH body 类型（若跨层复用）。

4. **数据层**  
   - 新增实体 `UserModelConfig`（名称以数据模型文档为准）。  
   - 注册数据源；本地 SQLite 同步或迁移按项目惯例。

5. **密钥处理模块**（若采用加密存储）  
   - `server/model-config/` 下：加密、解密、掩码展示函数；中文模块注释说明安全边界。

6. **Route Handlers**  
   - `src/app/api/console/models/route.ts`：`GET` 列表、`POST` 创建。  
   - `src/app/api/console/models/[id]/route.ts`：`PATCH` 更新、**`DELETE` 物理删除**；可选 `GET` 单条。  
   - 每个 handler：**首行或紧随 `runtime` 导出后**调用 `getCurrentUser()`，未登录 `jsonError(..., HttpStatus.UNAUTHORIZED)`。

7. **自测**  
   - 手动或用脚本：未登录 401、非法 provider、POST 成功、PATCH 空字符串不改密钥、列表仅掩码、**DELETE 成功 204/200、越权 id 返回 404**。

---

## 2. 分页与查询

- 采用 **`page` + `pageSize` + `total` + `items`**（与 `admin/users` 一致），便于控制台 ProTable 对接。  
- `skip`/`take` 在 Repository 或 QueryBuilder 中实现；`where userId = :uid`。

---

## 3. 校验规则汇总（实现清单）

- `provider` ∈ {`ALYUN`,`GLM`,`DEEPSEEK`}。  
- `modelName`：trim，非空，长度上限与实体一致。  
- `apiKey`：POST trim 后非空；PATCH 省略或 `""` 表示不更新。  
- 所有写操作及 **删除** 校验 **资源归属** `userId === currentUser.id`。

---

## 4. 与 `getModel` / 环境变量密钥的并存说明（假设）

当前 `src/server/llm/model.ts` 中 `getModel` **固定使用** `process.env.CHAT_LLM_API_KEY`，与「按模型配置存储多把 Key」尚未打通。

**本迭代（3B）假设**：

- 控制台 CRUD **独立完成**，对话路由**仍可按现状**使用环境变量密钥（若未改 `getModel`）。  
- **后续迭代**可约定：`getModel` 或上层调用链根据「用户所选模型配置 id」读取解密后的 Key，并传入 `ChatOpenAI`；或与默认 env Key 的优先级策略由产品定。  
- 文档目的：避免 3B 强行耦合对话改造；**不在本文件展开具体代码**。

---

## 5. 迁移 / SQLite 策略

- 与 `User`、`Conversation` 实体风格保持一致（`PrimaryColumn` UUID、`CreateDateColumn` / `UpdateDateColumn`）。  
- 若仓库已有 TypeORM migration 目录，则新增 migration；否则按现有 `data-source` 的 `synchronize` 约定并在 implementation-notes 中注明仅限开发环境。

---

## 6. 供 3B 参考的文件路径清单（非 exhaustive）

| 路径 | 用途 |
|------|------|
| `src/server/http/json-response.ts` | `jsonError` |
| `src/common/enums/http.ts` | `ErrorCode` / `HttpStatus` 扩展 |
| `src/server/auth/session-user.ts` | `getCurrentUser()` |
| `src/server/db/data-source.ts` | 注册实体 |
| `src/server/db/entities/User.ts` | 实体风格参考 |
| `src/app/api/admin/users/route.ts` | 分页响应形态参考 |
| `src/app/api/chat/conversations/route.ts` | 未登录 401 写法参考 |
| `src/server/llm/model.ts` | `MODEL_PROVIDER_BASE_URL` 键对齐 |

**新增（预期）**：

- `src/server/db/entities/UserModelConfig.ts`（或最终表名对应实体）  
- `src/app/api/console/models/route.ts`  
- `src/app/api/console/models/[id]/route.ts`  
- 可选 `src/server/model-config/*`（掩码、加解密）

---

## 7. 3B 完成后文档回写

- 在 `iterations/0.0.8/backend/implementation-notes.md`（3B 创建）中补充：环境变量列表、本地自测步骤、与本文档的偏差说明。
