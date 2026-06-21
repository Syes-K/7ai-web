# 实现计划：Skills 治理服务端（version 0.1.21）

阶段 **3B** 执行顺序；本文档 **不写业务代码**，仅列步骤、依赖、文件清单、自测要点与 **frontend 接口契约**。

---

## 1. 目标对齐

| 来源 | 要点 |
| --- | --- |
| PRD | G1–G6 治理迁移、导入为主、Turn i18n |
| 设计 | `spec-admin-skills`、`spec-console-skills-retirement`、`spec-chat-turn-i18n` |
| 3A 契约 | [api-spec.md](./api-spec.md)、[data-models.md](./data-models.md) |
| 硬约束 | `withApiWrapper` + `withAdminApi`；TypeORM + SQLite；中文注释 |
| **运行时** | 意图路由、run 沙箱、alwaysLoad **不变** |

---

## 2. 实施顺序总览

```text
① 迁移脚本 + 实体（userId 删除、name 全局 UNIQUE）
    ↓
② 领域层去 userId（pack-files、pack-import、assistant-skill-bindings）
    ↓
③ Admin API（skill-configs CRUD 子集 + import 覆盖 + files 只读）
    ↓
④ Catalog API + 助手 binding 校验调整
    ↓
⑤ Console skill-configs 废弃（410）
    ↓
⑥ 运行时（turn-capabilities、intent-agent reasonCode）
    ↓
⑦ Turn i18n（messages/route safeMessageKey、failed_safe 详情、i18n keys）
    ↓
⑧ P1（description 回退、可选 details lines[]）
    ↓
⑨ 自测 + implementation-notes 补充
```

**frontend 并行建议**

| 步骤完成后 | frontend 可开始 |
| --- | --- |
| ③ | Admin Skills 页对接 |
| ④ | 助手页 catalog 多选 |
| ⑤ | 控制台 skills 退场 |
| ⑦ | Turn i18n / ChatWorkspace safeMessageKey |

---

## 3. 与 0.1.20 差异清单

| 文件/域 | 0.1.20 | 0.1.21 变更 |
| --- | --- | --- |
| `UserSkillConfig.ts` | +userId | **-userId**；name 全局 UNIQUE |
| `SkillPackFile.ts` | +userId | **-userId** |
| `pack-files.ts` | 所有查询带 userId | **packId** 隔离 |
| `pack-import.ts` | `createPackFromImport(userId)` | 系统库 + **`overwritePackFromImport`** |
| `skill-config-dto.ts` | +referencedAssistantCount | admin/catalog 分 DTO |
| `console/skill-configs/**` | 完整 CRUD | **410 stub** |
| `admin/skill-configs/**` | 不存在 | **新建** |
| `console/skill-catalog/route.ts` | 不存在 | **新建** |
| `assistant-skill-bindings.ts` | Pack 校验 per-user | **全局** id 校验 + 引用列表 |
| `turn-capabilities.ts` | UserSkillConfig 带 userId | **去 userId** |
| `skill-pack-intent-agent.ts` | reasons 中文文本 | **reasonCode** |
| `skill-turn.ts` | reason?: string | +**reasonCode** |
| `messages/route.ts` | skipped 用 reason 文本 | **reasonCode i18n** + safeMessageKey |
| `common/enums/http.ts` | — | +`SKILL_CONFIG_*` 废弃/写禁用 |
| `common/constants` | MAX_PER_USER | **SKILL_PACK_MAX_SYSTEM** |

**不变文件（逻辑层）**：`run-skill-script-tool.ts`、`skill-script-sandbox.ts`、`read-skill-file-tool.ts`、`resolveSkillPackSelectionForTurn` 主流程。

---

## 4. 步骤 ① — 迁移 + 实体

| 任务 | 文件 |
| --- | --- |
| 迁移脚本（name 冲突 + 删列） | `src/server/db/migrations/0.1.21-system-skill-packs.ts` |
| 更新 `UserSkillConfig` | `src/server/db/entities/UserSkillConfig.ts` |
| 更新 `SkillPackFile` | `src/server/db/entities/SkillPackFile.ts` |
| 常量 | `src/common/constants/index.ts` |
| enum | `src/common/enums/skill-pack-skip-reason.ts` |

**自测**

- [ ] 迁移前后 Pack **id 不变**
- [ ] 同名 Pack 后缀 `(migrated-…)` 正确
- [ ] `AssistantSkillBinding` 条数不变
- [ ] 全局 `name` UNIQUE 生效

---

## 5. 步骤 ② — 领域层

| 文件 | 职责 |
| --- | --- |
| `pack-files.ts` | 去掉所有 `userId` 参数；`syncPackMetadataFromSkillMd` 仅 import 调用 |
| `pack-import.ts` | `createPackFromImport`；**新增** `overwritePackFromImport`；**P1** description 回退 |
| `assistant-skill-bindings.ts` | `listAssistantsReferencingSkill`；全局 Pack 校验 |
| `skill-config-validation.ts` | 不变或微调 |

**overwrite 事务要点**

```text
1. 锁定 Pack 行
2. DELETE skill_pack_files WHERE packId = :id
3. bulk INSERT entries
4. sync frontmatter → UserSkillConfig 字段
5. 更新 fileCount/hasScripts 聚合（或依赖 loadPackAggregates）
```

---

## 6. 步骤 ③ — Admin API

**目录结构**

```text
src/app/api/admin/skill-configs/
  route.ts              # GET 分页列表
  import/route.ts       # POST import（create + overwrite）
  [id]/
    route.ts            # GET 详情、DELETE
    files/
      route.ts          # GET 列表
      [...path]/route.ts # GET 内容
```

| 路由 | Handler 要点 |
| --- | --- |
| GET `/` | `withAdminApi`；ProTable 分页；keyword |
| GET `/:id` | 详情 + aggregate |
| DELETE `/:id` | 409 + `referencedAssistants` |
| POST `/import` | multipart；`packId` 覆盖分支 |
| GET files | 只读；truncated 大文件 |

**不提供**：POST `/`、PATCH `/:id`、files 写 → 403 stub（可选单独 `route.ts` 返回统一错误）

**自测**

- [ ] 非 admin → 403
- [ ] import 新建 / 覆盖 id 不变
- [ ] 覆盖后 binding 仍有效
- [ ] 被引用删除 → 409 + 助手名列表
- [ ] PATCH → 403

---

## 7. 步骤 ④ — Catalog + 助手 binding

| 文件 | 职责 |
| --- | --- |
| `src/app/api/console/skill-catalog/route.ts` | GET；enabled only；登录鉴权 |
| `src/app/api/console/assistants/[id]/skill-configs/route.ts` | 校验改全局 Pack |
| `src/app/api/admin/assistants/[id]/…` | 同上（若存在） |

**frontend 契约**

```typescript
// AssistantsClient.tsx
const SKILL_CATALOG_API = "/api/console/skill-catalog";
// 响应 items[]: SkillCatalogItemJson
```

**自测**

- [ ] catalog 不含 disabled
- [ ] 普通用户可 GET catalog
- [ ] binding 保存系统 Pack id 成功

---

## 8. 步骤 ⑤ — Console 废弃

| 文件 | 处置 |
| --- | --- |
| `console/skill-configs/route.ts` | GET/POST → **410** |
| `console/skill-configs/[id]/route.ts` | GET/PATCH/DELETE → **410** |
| `console/skill-configs/import/route.ts` | POST → **410** |
| `console/skill-configs/.../files/**` | **410** |

**可选**：短期保留 GET files 只读 alias → **不建议**（增加分叉）。

---

## 9. 步骤 ⑥ — 运行时 reasonCode

| 文件 | 变更 |
| --- | --- |
| `skill-pack-intent-agent.ts` | prompt 输出 code；`parseReasonCode` 校验 enum |
| `turn-capabilities.ts` | `skipped` 写 `reasonCode` 非 `reason`；Pack 查询去 userId |
| `skill-turn.ts` | 类型更新 |

**Intent prompt 增量**

```text
reasons 的值必须是以下之一：unrelated, low_confidence, user_small_talk, duplicate_coverage, other
```

**自测**

- [ ] 新 Turn skipped 含 reasonCode
- [ ] 英文 UI details 无中文 reason  leak
- [ ] 0.1.20 联调场景 A/B 仍通过

---

## 10. 步骤 ⑦ — Turn i18n

| 文件 | 变更 |
| --- | --- |
| `messages/route.ts` | `skillsSafeMessage` 返回 `{ text, key }`；details reasonCode；failed_safe body |
| `messages/en|zh/api/message.json` | 新增 keys |
| `src/common/chat/turn-safe-message-keys.ts` | **新建** legacy 映射（frontend 也用） |

**C1b 写入快照**

```typescript
updateStep("C1b", {
  safeMessage: text,
  safeMessageKey: key,
  details: skillsDetailsFromUi(locale, ui),
});
```

**自测**

- [ ] GET 历史消息含 safeMessageKey
- [ ] 语言切换测试 #17
- [ ] legacy Turn（中文 reason）仅显示包名

---

## 11. 步骤 ⑧ — P1

| 任务 | 文件 |
| --- | --- |
| description 回退 | `pack-import.ts` |
| failed_safe 详情 | `messages/route.ts` |
| 结构化 lines[]（可选） | `messages/route.ts` + `skill-turn.ts` |

---

## 12. Frontend 接口契约摘要

| 页面 | API | 方法 |
| --- | --- | --- |
| Admin Skills 列表 | `/api/admin/skill-configs` | GET |
| Admin 详情/文件 | `/api/admin/skill-configs/:id` + `/files` | GET |
| Admin 导入 | `/api/admin/skill-configs/import` | POST |
| Admin 删除 | `/api/admin/skill-configs/:id` | DELETE |
| Console/Admin 助手 | `/api/console/skill-catalog` | GET |
| 助手 binding | `.../assistants/:id/skill-configs` | PUT |
| Chat Turn | `.../messages` SSE/GET | 字段增量 |

**鉴权错误处理**

- Admin：`handleAdminApiAuthStatus(status, locale, returnPath)`
- Catalog：`handleConsoleApiAuthStatus`（401 跳登录）

**删除 409 UX**

```typescript
if (err.code === ErrorCode.SKILL_CONFIG_REFERENCED_BY_ASSISTANT) {
  // Modal.error：err.referencedAssistants.map(a => a.name)
}
```

---

## 13. 3B 关键文件优先级

| 优先级 | 文件 |
| --- | --- |
| P0 | `migrations/0.1.21-system-skill-packs.ts` |
| P0 | `UserSkillConfig.ts`、`SkillPackFile.ts` |
| P0 | `pack-files.ts`、`pack-import.ts` |
| P0 | `admin/skill-configs/**` |
| P0 | `console/skill-catalog/route.ts` |
| P0 | `turn-capabilities.ts`、`skill-pack-intent-agent.ts` |
| P0 | `messages/route.ts` |
| P1 | `console/skill-configs/**` 410 |
| P1 | description 回退、failed_safe body |
| P2 | details `lines[]` 结构化 |

---

## 14. 端到端验收场景

| # | 场景 | 期望 |
| --- | --- | --- |
| 1 | Admin import ui-ux-pro-max | 列表出现；description 非空（P1） |
| 2 | Admin 覆盖 re-import | id 不变；文件树更新；binding 有效 |
| 3 | 非 admin 调 admin API | 403 |
| 4 | 普通用户 GET catalog | 200；仅 enabled |
| 5 | 助手挂载系统 Pack → 对话 | loaded + run 与 0.1.20 一致 |
| 6 | 删除被挂载 Pack | 409 + 助手名 |
| 7 | 英文 UI 历史 Turn | 全英文（#17） |
| 8 | intent failed_safe | 摘要 + P1 详情一句 |
| 9 | console skill-configs POST | 410 |

---

## 15. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-20 | 3A：3B 分步计划与 frontend 契约 |
