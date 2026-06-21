# 数据模型：Skills 治理与体验优化（version 0.1.21）

> **仓库现状**：TypeORM + `better-sqlite3`（`synchronize: true`）。本文在 **0.1.20** 模型上演进为 **系统级 Skill Pack**；**运行时 Turn 快照语义不变**，仅字段演进。

---

## 1. 与 0.1.20 对照总表

| 维度 | 0.1.20 | 0.1.21 |
| --- | --- | --- |
| `UserSkillConfig.userId` | NOT NULL；per-user 隔离 | **删除列** |
| `name` 唯一约束 | `(userId, name)` UNIQUE | **全局** `name` UNIQUE |
| `SkillPackFile.userId` | NOT NULL 冗余 | **删除列** |
| Pack 上限 | `SKILL_CONFIG_MAX_PER_USER` = 50 | **`SKILL_PACK_MAX_SYSTEM`** = 200（系统全局） |
| skip 快照 | `skipped[].reason?: string` | + **`reasonCode?: SkillPackSkipReasonCode`** |
| C1b 子步骤 | `safeMessage` | + **`safeMessageKey?: string`** |
| 引用计数 | per-user binding count | **全局** binding count |

**不变**：`alwaysLoad`、`enabled`、`SkillScriptRun`、`AssistantSkillBinding` 表结构（binding 仍含 `userId` = 助手所有者）。

---

## 2. 实体变更：`UserSkillConfig`

**决策 B1**：**保留**表名 `user_skill_configs` 与类名 `UserSkillConfig`；更新类注释。

### 2.1 字段（迁移后）

| 字段 | TypeORM | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | varchar(36) PK | UUID | **迁移保留** |
| ~~`userId`~~ | — | **删除** | 0.1.21 治理定稿 |
| `name` | varchar(64) | **UNIQUE 全局** | 系统内唯一 |
| `description` | varchar(500) nullable | | import 同步 + P1 回退 |
| `content` | text nullable | deprecated | 保持 nullable |
| `enabled` | boolean default true | | import 同步 |
| `alwaysLoad` | boolean default false | | import 同步 |
| `createdAt` / `updatedAt` | datetime | | 不变 |

### 2.2 索引变更

```typescript
// 删除
@Index(["userId", "updatedAt"])
@Index(["userId", "name"], { unique: true })

// 新增
@Index(["updatedAt"])
@Index(["name"], { unique: true })
```

### 2.3 实体注释（3B）

```typescript
/** 系统 Skill Pack 元数据；正文在 skill_pack_files。0.1.21 起为平台全局资产，无 userId。 */
@Entity("user_skill_configs")
export class UserSkillConfig { ... }
```

---

## 3. 实体变更：`SkillPackFile`

| 字段 | 0.1.20 | 0.1.21 |
| --- | --- | --- |
| `userId` | NOT NULL | **删除** |
| `packId` + `path` | UNIQUE | **保留** UNIQUE |
| 其余 | 不变 | 不变 |

**索引变更**

```typescript
// 删除
@Index(["userId", "packId"])

// 保留
@Index(["packId", "path"], { unique: true })
@Index(["packId"])
```

**查询约定**：所有 `pack-files.ts` 方法签名 **去掉** `userId` 参数；按 `packId` 隔离即可。

---

## 4. 不变实体（引用）

| 实体 | 0.1.21 角色 |
| --- | --- |
| `AssistantSkillBinding` | 仍存 `skillConfigId`；迁移后 id 不变则绑定有效 |
| `Assistant` | 用户/系统助手均挂载 **同一系统库** Pack id |
| `SkillScriptRun` | 仍按 **`userId`（对话用户）** 审计；不变 |
| `ChatTurn` | `stepsSnapshotJson` 内 C1b 字段演进 |

---

## 5. 数据迁移脚本

**决策 Q27**：一次性切换；**无双写**。建议独立脚本 + 部署前 **SQLite 备份**。

**建议路径**：`src/server/db/migrations/0.1.21-system-skill-packs.ts`  
（若项目继续 `synchronize: true`，仍 **推荐** 显式 SQL 处理 name 冲突与列删除顺序。）

### 5.1 迁移步骤（顺序不可乱）

```text
① 备份数据库文件
② 检测 name 全局冲突（见 §5.2）
③ 重命名冲突行 name（事务内）
④ 删除 user_skill_configs.userId 列（SQLite 需重建表）
⑤ 删除 skill_pack_files.userId 列（同上）
⑥ 重建 UNIQUE(name) 与索引
⑦ 验证：AssistantSkillBinding 条数不变；Pack id 不变
```

### 5.2 name 冲突策略（决策 B2）

**问题**：多用户曾拥有同名 Pack（per-user unique 允许 `"greeting-test"` × N）。

**算法**

1. 查询所有 `user_skill_configs`，按 `name` 分组，找出 `count > 1` 的组
2. 每组内按 `createdAt ASC, id ASC` 排序
3. **第一条**保留原 `name`
4. 其余各行：`name = name + ' (migrated-' + userId.slice(0, 8) + ')'`
5. 若后缀后仍冲突（极端）→ 追加 `-2`、`-3` …
6. 输出迁移报告 `{ originalName, packId, oldUserId, newName }[]` 至 log

**不合并 Pack**：不同用户的 Pack **保持独立 id**（助手绑定依赖 id 稳定）。

### 5.3 SQLite 列删除（示例思路）

SQLite 不支持 `DROP COLUMN`（旧版）；TypeORM `synchronize` 可能自动处理。生产迁移建议：

```sql
-- user_skill_configs：重建表（示意）
CREATE TABLE user_skill_configs_new (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(64) NOT NULL UNIQUE,
  description VARCHAR(500),
  content TEXT,
  enabled BOOLEAN NOT NULL DEFAULT 1,
  alwaysLoad BOOLEAN NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);
INSERT INTO user_skill_configs_new (id, name, description, content, enabled, alwaysLoad, createdAt, updatedAt)
SELECT id, name, description, content, enabled, alwaysLoad, createdAt, updatedAt
FROM user_skill_configs;
DROP TABLE user_skill_configs;
ALTER TABLE user_skill_configs_new RENAME TO user_skill_configs;
```

`skill_pack_files` 同理（去掉 `userId` 列）。

### 5.4 回滚

| 步骤 | 说明 |
| --- | --- |
| 恢复备份 | 全库替换为迁移前 `.sqlite` |
| 代码回滚 | 部署 0.1.20 标签 |
| 部分回滚 | **不支持**（列已删）；必须全库恢复 |

---

## 6. Turn 快照：`SkillsTurnUiSnapshot` 演进

**落点**：`src/common/types/skill-turn.ts`

### 6.1 `SkillPackSkipReasonCode`（新建 enum）

**文件**：`src/common/enums/skill-pack-skip-reason.ts`（经 `index.ts` 导出）

```typescript
export enum SkillPackSkipReasonCode {
  Unrelated = "unrelated",
  LowConfidence = "low_confidence",
  UserSmallTalk = "user_small_talk",
  DuplicateCoverage = "duplicate_coverage",
  Other = "other",
}
```

### 6.2 `SkillPackSkippedRef` 演进

```typescript
export type SkillPackSkippedRef = SkillPackUiRef & {
  /** 0.1.21+ 结构化 skip 原因；展示走 i18n */
  reasonCode?: SkillPackSkipReasonCode | null;
  /** @deprecated 0.1.21+ 新 Turn 不写；仅历史 Turn legacy */
  reason?: string;
};
```

### 6.3 C1b 子步骤快照（嵌于 `stepsSnapshotJson`）

```typescript
export type TurnSubStepSnapshot = {
  label?: string;
  status?: string;
  safeMessage?: string;
  /** 0.1.21+：稳定 i18n key，如 turnSafe.skillsLoaded */
  safeMessageKey?: string | null;
  details?: Array<{
    title: string;
    content?: string;
    /** P1 可选结构化行 */
    lines?: TurnDetailLine[];
  }>;
  reasonTag?: string;
};
```

**决策 T1**：新 Turn **必须**写 `safeMessageKey`；`safeMessage` 仍写（便于调试与 legacy 客户端）。

### 6.4 Legacy 归一化（不变 + 扩展）

`normalizeSkillsTurnUi`：

- 继续映射 `merged[]` → `mounted/loaded`
- `skipped[]`：有 `reason` 无 `reasonCode` → 展示层 **忽略** reason（B7）

**决策 T4**：**不**批量 UPDATE 历史 Turn 的 `reasonCode`。

---

## 7. DTO 变更

### 7.1 Admin 列表项

见 [api-spec.md §2.7](./api-spec.md) — **无** `referencedAssistantCount`。

### 7.2 Catalog 列表项

```typescript
export type SkillCatalogItemJson = {
  id: string;
  name: string;
  description: string | null;
  fileCount: number;
  hasScripts: boolean;
  alwaysLoad: boolean;
};
```

### 7.3 共享逻辑

- `userSkillConfigToListItemJson` → 拆分为 admin / catalog 映射函数，或增加 `mode: "admin" | "catalog"` 参数
- `loadPackAggregatesByPackIds(ds, packIds)` — **去掉** `userId`

---

## 8. 常量变更

| 常量 | 0.1.20 | 0.1.21 |
| --- | --- | --- |
| `SKILL_CONFIG_MAX_PER_USER` | 50 | **deprecated**；保留别名指向新常量 |
| **`SKILL_PACK_MAX_SYSTEM`** | — | **200**（系统 Pack 总数上限） |

**3B**：import 新建时 `count(*)` 全表与 `SKILL_PACK_MAX_SYSTEM` 比较。

---

## 9. 领域函数签名变更（3B 清单）

| 函数 | 变更 |
| --- | --- |
| `loadPackAggregatesByPackIds(ds, packIds)` | 去 `userId` |
| `getOwnedPack(ds, packId)` → `getPackById` | 去 ownership |
| `createPackFromImport(ds, name, …)` | 去 `userId`；新增 `overwritePackFromImport(ds, packId, …)` |
| `replaceAssistantSkillBindings` | Pack 存在性 **全局**校验 |
| `countAssistantsReferencingSkill` | 改为 `listAssistantsReferencingSkill` 返回 `{id,name}[]` |
| `resolveSkillPackSelectionForTurn` | Pack 查询去 `userId` |
| `buildSkillsMergeResult` | 去 `userId` on file queries |

---

## 10. frontmatter 同步（Q10 — 零保存）

| frontmatter | 表字段 | 时机 |
| --- | --- | --- |
| `name` | `name` | import only |
| `description` | `description` | import only（+ P1 回退） |
| `enabled` | `enabled` | import only；缺省 true |
| `alwaysLoad` | `alwaysLoad` | import only；缺省 false |

**禁止**：PATCH API 写表；`syncPackMetadataFromSkillMd` 仅被 **import 事务** 调用（文件 PUT 废弃后不再从 save-file 触发）。

---

## 11. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-20 | 3A：userId 删除、迁移策略、reasonCode/safeMessageKey 快照 |
