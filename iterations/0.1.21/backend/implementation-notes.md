# 实现说明：Skills 治理服务端（version 0.1.21）

阶段 **3B** 代码交付与自测要点。

---

## 1. 变更清单

### 数据层

| 文件 | 变更 |
| --- | --- |
| `src/server/db/entities/UserSkillConfig.ts` | 删除 `userId`；`name` 全局 UNIQUE |
| `src/server/db/entities/SkillPackFile.ts` | 删除 `userId` |
| `src/server/db/migrations/0.1.21-system-skill-packs.ts` | name 冲突重命名 + 表重建（**synchronize 前**执行） |
| `src/server/db/data-source.ts` | 启动前调用迁移 |
| `src/server/db/migrate-skill-content-to-pack-files.ts` | 插入 files 不再写 `userId` |

### 领域层

| 文件 | 变更 |
| --- | --- |
| `src/server/skill/pack-files.ts` | 去 `userId`；`getPackById`；import 专用 `syncPackMetadataFromSkillMd`（含 enabled） |
| `src/server/skill/pack-import.ts` | 系统库 `createPackFromImport`；**`overwritePackFromImport`**；P1 `resolveImportDescription` |
| `src/server/skill/skill-config-dto.ts` | `AdminSkillPackListItemJson` / `SkillCatalogItemJson` |
| `src/server/skill/assistant-skill-bindings.ts` | `listAssistantsReferencingSkill`；全局 Pack 校验 |
| `src/server/skill/skill-config-api-responses.ts` | 410 / 403 统一响应 |
| `src/server/skill/skill-pack-intent-agent.ts` | `reasons` → `SkillPackSkipReasonCode` |
| `src/server/chat/turn-capabilities.ts` | Pack 查询去 `userId`；`skipped[].reasonCode` |
| `src/server/skill/read-skill-file-tool.ts` | Pack 查询去 `userId` |
| `src/server/skill/run-skill-script-tool.ts` | 同上 |
| `src/server/skill/skill-script-sandbox.ts` | Pack files 查询去 `userId` |

### API

| 路径 | 处置 |
| --- | --- |
| `src/app/api/admin/skill-configs/**` | **新建** GET 列表/详情、DELETE、POST import、files 只读 |
| `src/app/api/console/skill-catalog/route.ts` | **新建** GET（enabled only） |
| `src/app/api/console/skill-configs/**` | **410** stub |

### Turn / i18n

| 文件 | 变更 |
| --- | --- |
| `src/common/types/skill-turn.ts` | `reasonCode`、`TurnDetailBlock`、`TurnSubStepSnapshot` |
| `src/common/enums/skill-pack-skip-reason.ts` | B6 枚举 |
| `src/common/chat/turn-safe-message-keys.ts` | T1 key 解析 + legacy 映射 |
| `src/server/chat/turn-runtime.ts` | `safeMessageKey`、`TurnDetailBlock` details |
| `src/app/api/chat/.../messages/route.ts` | C1b `safeMessageKey`、reasonCode i18n、failed_safe 详情 |
| `messages/{en,zh}/api/message.json` | 新增 skip reason / 410 / 403 / failed_safe keys |

### 常量 / 错误码

| 项 | 值 |
| --- | --- |
| `SKILL_PACK_MAX_SYSTEM` | 200 |
| `ErrorCode.SKILL_CONFIG_CONSOLE_DEPRECATED` | 410 |
| `ErrorCode.SKILL_CONFIG_WRITE_DISABLED` | 403 |
| `HttpStatus.GONE` | 410 |

---

## 2. 自测步骤

### 前置

```bash
# 建议备份 SQLite
cp data/app.db data/app.db.bak.0.1.21

# 类型检查（3B 已通过）
npx tsc --noEmit

# 启动开发服务
npm run dev
```

### API 场景

| # | 操作 | 期望 |
| --- | --- | --- |
| 1 | Admin `POST /api/admin/skill-configs/import`（zip） | 201；`description` 非空（P1 回退） |
| 2 | 同 Pack 再 import + `packId` | 200；id 不变；binding 仍有效 |
| 3 | 非 admin 调 `/api/admin/skill-configs` | 403 `authAdminOnly` |
| 4 | 登录用户 `GET /api/console/skill-catalog` | 200；仅 `enabled=true` |
| 5 | `PUT .../assistants/:id/skill-configs` 系统 Pack id | 200 |
| 6 | 删除被挂载 Pack | 409 + `referencedAssistants[]` |
| 7 | `PATCH /api/admin/skill-configs/:id` | 403 `SKILL_CONFIG_WRITE_DISABLED` |
| 8 | `GET /api/console/skill-configs` | 410 `SKILL_CONFIG_CONSOLE_DEPRECATED` |
| 9 | 对话 Turn（挂载 Pack + 意图路由） | C1b 含 `safeMessageKey`；skipped 含 `reasonCode` |
| 10 | 英文 locale 新 Turn details | skip reason 为英文 i18n，无中文 leak |

### 迁移验证

- [ ] 启动后 log 无 migration 错误
- [ ] 同名 Pack（多用户）→ 最早保留名，其余 `(migrated-{userId前8位})`
- [ ] `AssistantSkillBinding` 条数与 Pack id 不变

---

## 3. Frontend 对接摘要

| 页面 | API |
| --- | --- |
| Admin Skills | `GET/DELETE /api/admin/skill-configs`，`POST .../import`，`GET .../files` |
| 助手多选 | `GET /api/console/skill-catalog` |
| Chat C1b | 优先 `safeMessageKey` + `t()`；details 用 `reasonCode` i18n |
| 删除 409 | `referencedAssistants.map(a => a.name)` |

---

## 4. 联调补丁（2026-06-21）

| 文件 | 变更 |
| --- | --- |
| `src/server/db/data-source.ts` | `initPromise` 并发锁；修复 `Cannot read properties of undefined (reading 'prepare')` |
| `src/migrations/0.1.21-system-skill-packs.ts` | 启动前迁移（删 userId、name 冲突后缀） |

---

## 5. 已知遗留

| 项 | 说明 |
| --- | --- |
| 历史 Turn | 不批量回填 `reasonCode` / `safeMessageKey`（T4）；legacy `reason` 文本展示降级为仅包名（B7） |
| `SKILL_CONFIG_MAX_PER_USER` | 保留 deprecated 别名；import 上限改用 `SKILL_PACK_MAX_SYSTEM` |
| Admin 助手 skill-configs 子资源 | 无独立 admin 路由；binding 校验已在 `replaceAssistantSkillBindings` 全局化 |
| `/console/skills` 遗留源码 | 路由已退场；`SkillsClient` 等待清理 |
| `details.lines[]` | P1 已双写；旧客户端可忽略 |

---

## 6. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-20 | 3B 实现与自测说明 |
| 2026-06-21 | 结项：data-source 并发锁 |
