# 实现计划（3B 预览）：0.0.9 个人信息与默认模型偏好

## 文档信息

| 项 | 内容 |
| --- | --- |
| 版本 | `0.0.9` |
| 阶段 | 3A 仅规划；**代码在阶段 3B 实施** |
| 约束 | TypeORM + SQLite；实体 `src/server/db/entities/`；控制台 API 前缀 `/api/console` |

---

## 1. 3B 建议文件路径清单

### 1.1 Route Handlers（Next.js App Router）

| 文件 | 方法 | 说明 |
| --- | --- | --- |
| `src/app/api/console/profile/route.ts` | `GET` | 聚合：profile + preference（见 api-spec） |
| `src/app/api/console/profile/personal/route.ts` | `PATCH` | 昵称、手机号 |
| `src/app/api/console/profile/preference/route.ts` | `PATCH` | `preferredModelConfigId` |

（若倾向单文件拆分少目录，也可用 `route.ts` 内多导出——以项目既有风格为准。）

### 1.2 数据层

| 文件 | 说明 |
| --- | --- |
| `src/server/db/entities/User.ts` | 增加 `preferredModelConfigId`（及可选 `ManyToOne`） |
| `src/server/db/data-source.ts` | 确保实体已注册（通常无需改，除非新实体） |
| 迁移策略 | 与仓库现有 TypeORM 迁移/sync 方式一致；SQLite 新增可空列 **低风险** |

### 1.3 DTO / 类型

| 位置 | 说明 |
| --- | --- |
| `src/common/types` | 若 `ConsoleProfileResponse` 等跨前端复用，集中定义并由 `index.ts` 导出 |
| `src/server/...` | 服务端组装 `preferenceStale`、`preferredModel` 摘要的逻辑 |

### 1.4 既有 API 修改点

| 文件 | 变更 |
| --- | --- |
| `src/app/api/console/models/[id]/route.ts`（或当前 DELETE 所在路径） | `DELETE` 成功路径内：若删除 id 等于当前用户 `preferredModelConfigId`，**清空指针**（见 data-models 文档） |

（具体文件名以仓库 0.0.8 实际为准，3B 时 grep `UserModelConfig` + `DELETE`。）

---

## 2. `console-menu` 合并（设计 §7.2）

| 文件 | 变更 |
| --- | --- |
| `src/app/console/console-menu.tsx` | 将「个人信息」「用户配置」**合并为一项**，`path` 指向 **`/console/profile`**，名称与设计一致（如「账号与偏好」）；**删除**原 `/console/settings` 独立菜单项，避免双高亮与重复 |

**侧栏高亮**：单一路径后 `selectedKeys` 与现有一致即可。

---

## 3. `/console/settings` → `/console/profile` 重定向落点

设计推荐 **302** 至 canonical `/console/profile`。可选实现：

| 层级 | 做法 | 优点 | 备注 |
| --- | --- | --- | --- |
| **`next.config.ts` → `redirects`** | 静态重定向 `/console/settings` → `/console/profile` | 集中、无 React 树、易搜 | 当前仓库 `next.config.ts` 较简，**推荐优先** |
| **`src/app/console/settings/page.tsx`** | `import { redirect } from "next/navigation"; redirect("/console/profile");` | 可扩展条件逻辑、AB | 需保留 `settings` 目录占位 |

**3B 建议**：优先 **`next.config.ts`**；若需保留 `metadata` 或后续在中间层打点，再改为 `page.tsx` **服务端** `redirect()`（避免客户端闪烁）。

**HTTP 语义**：Next `redirects` 默认 **307**（见 Next 文档版本差异）；若必须严格 **302**，在 `next.config` 的 `redirects` 中查对应 **`permanent: false`** 行为或文档——**以 Next 当前版本为准**；设计侧接受「书签可达同一页」即可。

---

## 4. 页面层（前端 4 阶段，此处仅列依赖）

| 文件 | 说明 |
| --- | --- |
| `src/app/console/profile/page.tsx` | 由占位改为真实页（调用 `GET/PATCH`） |
| `src/app/console/settings/page.tsx` | 删除或改为纯 redirect（若不用 config） |

---

## 5. 自测清单（3B 完成后）

- 未登录访问 `GET /api/console/profile` → 401。
- 登录后聚合字段完整；无偏好时 `preferredModelConfigId` 与 `preferredModel` 为 null。
- `PATCH personal` 改昵称/手机；手机冲突与注册一致。
- `PATCH preference` 指向他人 `UserModelConfig` id → 404 + `MODEL_CONFIG_NOT_FOUND`。
- 删除当前默认模型配置后，指针清空，`GET` 无 stale（或短暂 stale 后自愈）。

---

## 6. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-04-12 | 3A 初稿 |
