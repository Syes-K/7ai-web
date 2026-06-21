# 服务端文档索引（version 0.1.21 — Skills 治理与体验优化）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.21` |
| 阶段 | **3B 已实现** — 已验收（2026-06-21） |
| 上游 | `iterations/0.1.21/product/`、`iterations/0.1.21/design/` |
| 基线 | `iterations/0.1.20/backend/`（运行时语义 **不变**） |
| 结项 | [../COMPLETION.md](../COMPLETION.md) |

---

## 1. 本期范围摘要

0.1.21 在 **不改变 0.1.20 运行时语义**（按需加载、run 沙箱、alwaysLoad）前提下，完成 **治理边界** 与 **API 拆分**：

| 主题 | 说明 | 优先级 |
| --- | --- | --- |
| 系统技能库 | 删除 `UserSkillConfig.userId`；Pack 全局唯一 `name` | P0 |
| Admin API | `GET/POST(import)/DELETE /api/admin/skill-configs`；文件只读 | P0 |
| Catalog API | `GET /api/console/skill-catalog` — 登录用户读 enabled Pack | P0 |
| Console 退场 | `/api/console/skill-configs` 写操作废弃（410） | P0 |
| Turn i18n | `reasonCode` 枚举持久化；`safeMessageKey`；failed_safe 详情 | P0 / P1 |

**挂载链不变**：系统 Pack → `AssistantSkillBinding` → 会话 → Turn C1b（0.1.20 语义）。

---

## 2. 文档清单

| 文件 | 用途 |
| --- | --- |
| [api-spec.md](./api-spec.md) | Admin skill-configs、catalog、废弃 console API、Turn/SSE 字段变更 |
| [data-models.md](./data-models.md) | 删除 userId、迁移脚本、name 唯一约束、reasonCode 快照 |
| [implementation-plan.md](./implementation-plan.md) | 3B 分步顺序、文件清单、与 frontend 接口契约 |
| [risks-and-open-items.md](./risks-and-open-items.md) | 风险、回滚、未决项 |

---

## 3. 与 0.1.20 后端差异摘要

| 维度 | 0.1.20 | 0.1.21 |
| --- | --- | --- |
| Pack 归属 | 用户级（`userId` 隔离） | **系统级**（无 `userId`） |
| 管理 API | `/api/console/skill-configs` CRUD + 在线 PATCH | **`/api/admin/skill-configs`**；导入为主；**零**元数据 PATCH |
| 助手挂载数据源 | 用户自有 Pack 列表 | **`GET /api/console/skill-catalog`**（enabled only） |
| `name` 唯一性 | per-user `(userId, name)` | **全局** `name` UNIQUE |
| skip reason | LLM 自由文本（中文）→ `details.reason` | **`reasonCode` 枚举** + i18n；新 Turn **不写** `reason` 文本 |
| C1b 子步骤 | 仅 `safeMessage` 字符串 | + **`safeMessageKey`**（快照 + SSE） |
| `SkillPackFile` | 冗余 `userId` 查询隔离 | 删除 `userId`；按 `packId` 隔离 |
| 意图路由 / run 沙箱 | 已实现 | **逻辑不变**；仅去掉 `userId` 过滤 |
| 常量 `SKILL_CONFIG_MAX_PER_USER` | 每用户 50 包上限 | 改为 **系统全局** `SKILL_PACK_MAX_SYSTEM`（默认 200） |

**不变**：`resolveSkillPackSelectionForTurn` 算法、`run_skill_script` 白名单=loaded、C1b 隐藏规则、`skill_script_runs` 审计。

---

## 4. Backend 3A 已定稿决策（B1–B8、T1–T5）

| # | 议题 | **定稿** |
| --- | --- | --- |
| **B1** | 表/实体命名 | **保留** `user_skill_configs` 表名与 `UserSkillConfig` 类名（降低迁移风险）；更新实体注释为「系统 Skill Pack」；**不重命名** `skill_packs` |
| **B2** | name 迁移冲突 | 按 `createdAt ASC, id ASC` 保留首条原名；其余冲突行追加后缀 ` (migrated-{userId前8位})`；迁移报告落日志 |
| **B3** | catalog 端点 | **`GET /api/console/skill-catalog`** 独立端点（登录可读；`enabled=true` only） |
| **B4** | 覆盖导入 API | **`POST /api/admin/skill-configs/import`**；multipart 字段 **`packId`** 表示覆盖（无则新建） |
| **B5** | 文件/元数据写 API | Admin **不提供** POST 空包、PATCH 元数据、PUT/PATCH/DELETE 文件；若保留路由 stub → **403** + `ErrorCode.SKILL_CONFIG_WRITE_DISABLED` |
| **B6** | `reasonCode` 枚举 | `unrelated` / `low_confidence` / `user_small_talk` / `duplicate_coverage` / `other`（**不**扩展 `policy_excluded`） |
| **B7** | 旧 Turn 中文 reason | 无 `reasonCode` 时详情行 **仅显示包名**（`skillsSkippedLineNoReason`）；**不**批量迁移历史 reasonCode |
| **B8** | `/console/skills` | **前端路由**：admin **302** → `/{locale}/admin/skills`；其他用户 **404**（backend 无独立 API） |
| **T1** | `safeMessageKey` 落库 | **写入** C1b 子步骤快照（`stepsSnapshotJson`）**且** SSE 透传；GET messages 重放优先读 key |
| **T2** | 详情 `lines[]` | **P0** 延续文本 `content` + `localize-turn-detail` 行级 legacy；**P1** 可选结构化 `lines[]` |
| **T5** | `failed_safe` 细分 | **统一**一句 `skillsIntentFailedBody`；**不**持久化 `failureKind` |

---

## 5. 3B 代码落点速查（实施时打开）

| 域 | 路径 |
| --- | --- |
| 迁移脚本 | `src/server/db/migrations/0.1.21-system-skill-packs.ts`（建议） |
| 实体 | `UserSkillConfig.ts`、`SkillPackFile.ts` |
| Admin API | `src/app/api/admin/skill-configs/**`（新建） |
| Catalog | `src/app/api/console/skill-catalog/route.ts`（新建） |
| Console 废弃 | `src/app/api/console/skill-configs/**`（410 stub 或删除） |
| 领域逻辑 | `pack-files.ts`、`pack-import.ts`、`skill-config-dto.ts`、`assistant-skill-bindings.ts` |
| 运行时 | `turn-capabilities.ts`、`skill-pack-intent-agent.ts` |
| Turn i18n | `messages/route.ts`；`src/common/enums/skill-pack-skip-reason.ts`（新建） |
| 类型 | `src/common/types/skill-turn.ts` |

完整顺序见 [implementation-plan.md](./implementation-plan.md)。

---

## 6. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-20 | 3A 初稿：治理迁移 + Admin/Catalog API + Turn i18n 契约 |
| 2026-06-21 | 3B 实现与联调补丁；用户验收通过 |
