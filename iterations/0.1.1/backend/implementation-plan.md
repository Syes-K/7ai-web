# 实现计划：助手管理（version 0.1.1）

## 文档信息

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.1` |
| 阶段 | **3A 文档**；**3B** 为编码实现（本文列出建议顺序，不含具体代码） |

---

## 1. 目标

在既有 Next.js App Router + TypeORM（SQLite）架构下，落地 `Assistant` 持久化、控制台与管理后台 API，并与 `iterations/0.1.1/design/spec-assistant-management.md` 页面对齐。

---

## 2. 建议实现顺序（3B）

| 顺序 | 工作项 | 说明 |
| --- | --- | --- |
| 1 | **实体与数据源** | 新增 `Assistant` 实体；`getDataSource` `entities` 数组注册；`synchronize: true` 下本地表自动创建。 |
| 2 | **枚举与常量** | `AssistantScope`；分页常量；长度常量与 PRD/设计一致。 |
| 3 | **DTO 与校验** | `assistantToListItem`、normalize `tags`、字符串长度校验；可选 Zod/手写校验与 `parseModelConfigTags` 风格对齐。 |
| 4 | **控制台路由** | 实现 `GET/POST` `src/app/api/console/assistants/route.ts`；动态段 `src/app/api/console/assistants/[id]/route.ts`（GET/PATCH/DELETE）。查询构建：`WHERE (scope = system OR (scope = personal AND userId = :uid))`，再叠加 `keyword` / `tags` / `scope` 筛选。 |
| 5 | **管理后台路由** | `withAdminApi` 包装 `GET/POST` `/api/admin/assistants`、`/api/admin/assistants/[id]`；仅 `scope = system`。 |
| 6 | **前端** | 替换 `/console/assistants`、`/admin/assistants` 占位页；ProTable 联调；错误与 401/403 与模型页一致。 |
| 7 | **文档回填** | 在 `iterations/0.1.1/backend/implementation-notes.md` 记录实际路径、与本文差异、自测步骤（3B 完成时）。 |

---

## 3. 查询与性能（SQLite）

- **tags 筛选**：数据量较小时可在应用层过滤；若需 DB 层，评估 SQLite JSON1 与 `simple-json` 存储的兼容性（TypeORM `simple-json` 实际存储为 TEXT）。
- **keyword**：`LIKE` 注意索引失效，可接受于 MVP。

---

## 4. 风险与待决

| 项 | 说明 | 建议 |
| --- | --- | --- |
| R1 | 聊天页是否引用 `assistantId` | PRD O1；3B 可只交付 API + 控制台 UI，对话集成另迭代。 |
| R2 | 系统助手 `userId` 为 NULL 与 TypeORM 关系扩展 | 本期无 User 外键必需；保持可空。 |
| R3 | 列表是否返回完整 `prompt` | 若偏大，采用截断字段需在 API 固定并更新 `api-spec.md`。 |

详见 `risks-and-open-items.md`。

---

## 5. 自测清单（3B 完成后执行）

- [ ] 控制台：登录用户可 CRUD 个人助手；系统助手出现在列表且 PATCH/DELETE 拒绝。
- [ ] 管理后台：管理员 CRUD 系统助手；非管理员 403。
- [ ] 筛选：`keyword`、`tags`、`scope` 组合行为符合 `api-spec.md`。
- [ ] 未登录控制台 API 返回 401 JSON。

---

## 6. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-04-13 | 初稿：实现顺序与风险指针 |
