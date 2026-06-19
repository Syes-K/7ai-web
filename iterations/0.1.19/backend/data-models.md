# 数据模型：Skill Pack 与 skill_pack_files（version 0.1.19）

> **仓库现状**：TypeORM + `better-sqlite3`（`src/server/db/data-source.ts`）。本文描述 0.1.19 演进：**保留** `user_skill_configs` / `assistant_skill_bindings`，**新增** `skill_pack_files`，**弃用** `content` 作为运行时权威来源。

---

## 1. 与 0.1.18 对照总表

| 维度 | 0.1.18 | 0.1.19 |
| --- | --- | --- |
| 主表 | `UserSkillConfig` + **`content` text NOT NULL** | 同表名；**`content` deprecated**；权威内容在 files 表 |
| 文件表 | 无 | **`SkillPackFile`** → `skill_pack_files` |
| 运行时 prompt 来源 | `row.content` | `skill_pack_files.path='SKILL.md'` body（去 frontmatter） |
| 运行时 tools | 无 | `read_skill_file` 读 `skill_pack_files` |
| 列表 DTO | 含 `content` | `fileCount`、`hasScripts` |
| 助手绑定 | `AssistantSkillBinding.skillConfigId` | **不变**（语义 packId） |
| 迁移 | 无 | `content` → `SKILL.md` 行 |

---

## 2. 实体：`UserSkillConfig`（表 `user_skill_configs`）

**Q11 定稿**：沿用表名与实体类名；代码层可 type alias `UserSkillPack`。

| 字段 | TypeORM | 约束 | 0.1.19 说明 |
| --- | --- | --- | --- |
| `id` | varchar(36) PK | UUID | 不变；迁移后 id **不变** → 绑定无需改 |
| `userId` | varchar(36) | NOT NULL，索引 | 不变 |
| `name` | varchar(64) | NOT NULL | 不变；可与 SKILL.md frontmatter 同步 |
| `description` | varchar(500) nullable | — | 不变 |
| **`content`** | text | 0.1.18 NOT NULL | **deprecated**：迁移后 NULL 或空；**禁止**运行时读取 |
| `enabled` | boolean | default true | 不变 |
| `createdAt` | datetime | — | 不变 |
| `updatedAt` | datetime | — | 不变 |

### 2.1 索引（不变）

```typescript
@Entity("user_skill_configs")
@Index(["userId", "updatedAt"])
@Index(["userId", "name"], { unique: true })
export class UserSkillConfig { ... }
```

### 2.2 3B 实体变更

```typescript
/** 用户私有 Skill Pack 元数据；正文在 SkillPackFile（path='SKILL.md' 等）。 */
@Column({ type: "text", nullable: true })
content!: string | null; // deprecated — 仅迁移期可读；新代码不写
```

- `synchronize: true` 下将列改为 **nullable**（SQLite ALTER 由 TypeORM 处理）
- 新创建 Pack：**不**写 `content`（或写 NULL）

---

## 3. 实体：`SkillPackFile`（表 `skill_pack_files`，**新**）

| 字段 | TypeORM | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | varchar(36) PK | UUID v4 | — |
| `packId` | varchar(36) | NOT NULL，FK 逻辑 → `user_skill_configs.id` | Pack 归属 |
| `userId` | varchar(36) | NOT NULL，索引 | **冗余**；所有查询带 `userId` 隔离 |
| `path` | varchar(512) | NOT NULL | POSIX 相对路径，如 `SKILL.md`、`scripts/search.py` |
| `content` | text | NOT NULL | **UTF-8 文本**（Q3 MVP 无 blob） |
| `createdAt` | datetime | CreateDateColumn | 可选 |
| `updatedAt` | datetime | UpdateDateColumn | 可选 |

### 3.1 索引与唯一

```typescript
@Entity("skill_pack_files")
@Index(["userId", "packId"])
@Index(["packId", "path"], { unique: true })
@Index(["packId"])
export class SkillPackFile { ... }
```

| 索引 | 用途 |
| --- | --- |
| **`UNIQUE(packId, path)`** | 同 Pack 路径唯一 |
| `(userId, packId)` | 用户隔离批量加载、import |
| `(packId)` | 级联删除、fileCount 聚合 |

### 3.2 路径约束（应用层）

| 规则 | 说明 |
| --- | --- |
| 禁止 `..`、`\`、绝对路径、NUL | `normalizePackFilePath` |
| 统一 `/` 分隔 | 存储已归一化形式 |
| `SKILL.md` | 根相对路径 **必填**（保存/启用/import 前校验） |
| `scripts/*` | 允许存储；运行时只 read |

### 3.3 级联删除

| 操作 | 行为 |
| --- | --- |
| DELETE Pack | 删除该 `packId` 下 **全部** `skill_pack_files` |
| DELETE 单文件 | 禁止删除唯一 `SKILL.md` |

**实现**：应用层事务（推荐）或 SQLite FK `ON DELETE CASCADE`（3B 可选，TypeORM `@ManyToOne onDelete: 'CASCADE'`）。

---

## 4. 实体：`AssistantSkillBinding`（不变）

与 0.1.18 **同构**；`skillConfigId` 语义为 **packId**。

```typescript
@Index(["assistantId", "skillConfigId"], { unique: true })
```

**迁移**：**零改动**；旧 id 指向的 Pack 迁移后仍有 `SKILL.md` 等价正文。

---

## 5. 关系简图

```
User 1 --- * UserSkillConfig (Pack 元数据)
User 1 --- * SkillPackFile (经 packId + userId)
UserSkillConfig 1 --- * SkillPackFile
User 1 --- * Assistant
Assistant * --- * UserSkillConfig  （经 AssistantSkillBinding.skillConfigId）
```

**对话解析链（0.1.19）**

```
Conversation.assistantId
  → AssistantSkillBinding → skillConfigId[]（去重、字典序、slice 10）
  → UserSkillConfig（enabled=true）
  → ChatSkillPackRef[] { id }
  ├─→ buildSkillsMergeResult：load SkillPackFile(path='SKILL.md') → strip frontmatter → prompt
  └─→ read_skill_file tool：load SkillPackFile(packId, path) 白名单内
```

---

## 6. 常量（`@/common/constants`）

### 6.1 新增（Q1 定稿）

| 常量 | 值 | 说明 |
| --- | --- | --- |
| `SKILL_PACK_MAX_FILES` | 100 | 每 Pack 文件数 |
| `SKILL_PACK_MAX_TOTAL_BYTES` | 2_000_000 | Pack 总字节 |
| `SKILL_PACK_FILE_MAX_BYTES` | 512_000 | 单文件 |
| `SKILL_MD_MAX_BODY_LENGTH` | 32_000 | SKILL.md 正文（去 frontmatter）上限 |

### 6.2 保留 / 别名

| 0.1.18 常量 | 0.1.19 |
| --- | --- |
| `SKILL_CONFIG_NAME_MAX_LENGTH` | 保留；可 re-export 为 `SKILL_PACK_NAME_MAX_LENGTH` |
| `SKILL_CONFIG_DESCRIPTION_MAX_LENGTH` | 保留 |
| `SKILL_CONFIG_MAX_PER_USER` | 50 |
| `SKILL_CONFIG_MAX_PER_ASSISTANT` | 10 |
| `SKILL_CONFIG_MAX_BINDINGS_PER_CHAT_TURN` | 10 |
| `SKILL_CONFIG_CONTENT_MAX_LENGTH` | **deprecated**；不再用于校验 |

**扩展名白名单**：建议 `SKILL_PACK_ALLOWED_EXTENSIONS` 数组 + `SKILL_PACK_DENIED_EXTENSIONS`（见 `api-spec.md` §8）。

---

## 7. DTO 演进

### 7.1 列表/详情 JSON

```typescript
export type SkillPackListItemJson = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  fileCount: number;
  hasScripts: boolean;
  createdAt: string;
  updatedAt: string;
  referencedAssistantCount: number;
};
```

**移除** `content`。`fileCount` / `hasScripts` 由聚合查询或子查询计算：

```sql
-- hasScripts 示例
EXISTS (
  SELECT 1 FROM skill_pack_files f
  WHERE f.packId = s.id AND f.path LIKE 'scripts/%'
)
```

### 7.2 文件 DTO

```typescript
export type SkillPackFileMetaJson = {
  path: string;
  sizeBytes: number;
  updatedAt: string;
};

export type SkillPackFileContentJson = SkillPackFileMetaJson & {
  content: string;
};
```

### 7.3 领域模块（3B 建议）

| 模块 | 路径 | 职责 |
| --- | --- | --- |
| DTO | `skill-config-dto.ts` | 列表项、import summary |
| 校验 | `skill-config-validation.ts` | 元数据；**新增** `skill-pack-file-validation.ts` |
| 路径 | `pack-path.ts` | normalize、扩展名 |
| frontmatter | `pack-frontmatter.ts` | strip、sync metadata |
| 文件 CRUD | `pack-files.ts` | list/get/upsert/delete/move、配额汇总 |
| 导入 | `pack-import.ts` | zip/multipart 解析 |
| 绑定 | `assistant-skill-bindings.ts` | **不变** |
| 运行时读 | `pack-file-read.ts` 或合入 `turn-capabilities.ts` | merge + read tool |

---

## 8. 运行时类型扩展

`src/server/chat/turn-capabilities.ts`：

```typescript
export type SkillsTurnUiSnapshot = {
  assistantMissing: boolean;
  merged: Array<{ id: string; name: string }>;
  skippedCount?: number;
  loadFailed?: boolean;
  /** Q13 MVP */
  readToolEnabled: boolean;
  readFileCount: number;
  readFileSamples?: string[]; // 最多 5 条 "name:path"
};
```

`buildSkillsMergeResult` 改造：

- 批量 load `SkillPackFile` where `path='SKILL.md'`
- skip reason：`missing_skill_md` | `body_too_long` | `not_found` | `disabled`

---

## 9. 迁移策略（0.1.18 → 0.1.19）

### 9.1 脚本：`migrateSkillContentToPackFiles`

**位置**：`src/server/db/migrate-skill-content-to-pack-files.ts`  
**调用**：`data-source.ts` 的 `initialize()` 后（与 `migrateKnowledgeBaseMcpToAssistantMcp` 并列）。

**幂等**：每条 `user_skill_configs`：

| 步骤 | 动作 |
| --- | --- |
| 1 | 若该 `id` 在 `skill_pack_files` 已有行 → **skip** + log `{ event: "skill_migrate_skip", reason: "files_exist", id }`（Q8） |
| 2 | 若 `content` NULL/空 → log `{ reason: "empty_content" }`；skip |
| 3 | 生成 SKILL.md（见 `spec-migration-0.1.18.md`） |
| 4 | INSERT `skill_pack_files` 一行 |
| 5 | UPDATE `user_skill_configs SET content = NULL`（或 ''） |

**SKILL.md 模板**

```markdown
---
name: {row.name}
description: {row.description ?? ""}
---

{row.content}
```

**不修改**：`AssistantSkillBinding`、Pack `id`/`name`。

### 9.2 DDL 策略（SQLite + synchronize）

| 步骤 | 动作 |
| --- | --- |
| 1 | 注册新实体 `SkillPackFile` → 自动 **CREATE TABLE** `skill_pack_files` |
| 2 | 修改 `UserSkillConfig.content` nullable → TypeORM synchronize **ALTER** |
| 3 | 运行迁移脚本 backfill |
| 4 | （可选）后续版本 DROP COLUMN `content` — **本期保留列** 便于回滚观察 |

**等价 DDL（手动 / 未来 Migration）**

```sql
CREATE TABLE IF NOT EXISTS skill_pack_files (
  id VARCHAR(36) PRIMARY KEY NOT NULL,
  packId VARCHAR(36) NOT NULL,
  userId VARCHAR(36) NOT NULL,
  path VARCHAR(512) NOT NULL,
  content TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
  updatedAt DATETIME NOT NULL DEFAULT (datetime('now')),
  UNIQUE (packId, path)
);

CREATE INDEX IF NOT EXISTS idx_skill_pack_files_user_pack
  ON skill_pack_files (userId, packId);
CREATE INDEX IF NOT EXISTS idx_skill_pack_files_pack
  ON skill_pack_files (packId);
```

**回滚（产品不承诺）**：恢复 DB 快照；或 DELETE `skill_pack_files` + 从备份恢复 `content`（运维文档）。

### 9.3 迁移验收（AC-P13）

- 迁移前助手挂载的 Pack，迁移后对话 prompt 含原 `content` 正文
- `fileCount >= 1`；`name` 不变
- 运行时 **不**再读 `user_skill_configs.content`

---

## 10. `data-source.ts` 登记（3B）

```typescript
import { SkillPackFile } from "@/server/db/entities/SkillPackFile";

entities: [
  // ...
  UserSkillConfig,
  AssistantSkillBinding,
  SkillPackFile, // 新增
],

// initialize() 内：
await migrateSkillContentToPackFiles(dataSource);
```

---

## 11. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-19 | 3A 初稿：skill_pack_files、迁移、与 0.1.18 对照 |
