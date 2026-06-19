# 数据模型：UserSkillConfig、AssistantSkillBinding（version 0.1.18）

> **仓库现状**：持久化使用 **TypeORM + `better-sqlite3`**（`src/server/db/data-source.ts`），实体位于 `src/server/db/entities/`。**非 Prisma**。下文以 TypeORM 实体 + SQLite 逻辑约束描述；与 MCP 实体 **`UserMcpConfig` / `AssistantMcpBinding`** 对称。

---

## 1. 实体：`UserSkillConfig`（表名 `user_skill_configs`）

用户私有 Skill（服务端技能包）一行对应一条记录；语义对齐 `UserMcpConfig`，**不含** MCP 专有字段（transport、endpoint、credentials、lastCheck*）。

| 字段 | TypeORM 类型建议 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | `varchar(36)` PK | UUID v4 | 与 `UserMcpConfig.id` 一致 |
| `userId` | `varchar(36)` | NOT NULL，索引 | 逻辑 FK → `User.id`；**所有查询** `where: { userId }` |
| `name` | `varchar(64)` | NOT NULL | 展示名；**同一用户下唯一** |
| `description` | `varchar(500)` nullable | — | 可选摘要 |
| `content` | `text` | NOT NULL | **Markdown 源字符串**；运行时原样合并进 system prompt（Q2） |
| `enabled` | `boolean` | NOT NULL，默认 `true` | `false` 时运行时不加载；助手侧仍可挂载 |
| `createdAt` | `datetime` | CreateDateColumn | — |
| `updatedAt` | `datetime` | UpdateDateColumn | — |

**本期不包含**：`version`、`toolRefs`、`isSystem`、修订历史。

### 1.1 索引与唯一

```typescript
@Entity("user_skill_configs")
@Index(["userId", "updatedAt"])
@Index(["userId", "name"], { unique: true })
export class UserSkillConfig { ... }
```

- `(userId, updatedAt)`：列表按更新时间排序。
- `(userId, name)` **UNIQUE**：与 MCP / 知识库名称策略一致；冲突时 API 409 + `SKILL_CONFIG_NAME_CONFLICT`。

### 1.2 常量（`@/common/constants`）

| 常量 | 值 | 用途 |
| --- | --- | --- |
| `SKILL_CONFIG_NAME_MAX_LENGTH` | 64 | 对齐 `MCP_CONFIG_NAME_MAX_LENGTH` |
| `SKILL_CONFIG_DESCRIPTION_MAX_LENGTH` | 500 | 对齐 MCP |
| `SKILL_CONFIG_CONTENT_MAX_LENGTH` | 16_000 | 正文上限 |
| `SKILL_CONFIG_MAX_PER_USER` | 50 | POST 前 count 校验 |
| `SKILL_CONFIG_MAX_PER_ASSISTANT` | 10 | PUT skill-configs 校验 |
| `SKILL_CONFIG_MAX_BINDINGS_PER_CHAT_TURN` | 10 | 运行时 slice |

---

## 2. 实体：`AssistantSkillBinding`（表名 `assistant_skill_bindings`）

助手与用户 Skill 配置的 **多对多** 中间表；语义对齐 `AssistantMcpBinding`。

| 字段 | TypeORM 类型建议 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | `varchar(36)` PK | UUID | 便于审计 |
| `userId` | `varchar(36)` | NOT NULL，索引 | 冗余但**强烈建议**；与助手、Skill 的 userId 一致 |
| `assistantId` | `varchar(36)` | NOT NULL | FK → `assistants.id` |
| `skillConfigId` | `varchar(36)` | NOT NULL | FK → `user_skill_configs.id` |
| `createdAt` | `datetime` | CreateDateColumn | 可选；**排序以 skillConfigId 字典序为准**（Q3），非 createdAt |

### 2.1 索引与唯一

```typescript
@Entity("assistant_skill_bindings")
@Index(["userId", "skillConfigId"])
@Index(["assistantId"])
@Index(["assistantId", "skillConfigId"], { unique: true })
export class AssistantSkillBinding { ... }
```

- **`UNIQUE(assistantId, skillConfigId)`**：同一助手不重复挂载同一 Skill。
- `INDEX(userId, skillConfigId)`：删除 Skill 前统计助手引用数（409）。
- `INDEX(assistantId)`：按助手加载挂载列表。

### 2.2 外键与级联（逻辑）

| 操作 | 行为 |
| --- | --- |
| 删除 **助手** | 应 **级联删除** 其 Skill 绑定行（与 MCP 绑定一致；实现可在 `deleteAssistant` 或 DB 层处理）。 |
| 删除 **Skill** | **禁止硬删**若仍被引用；`COUNT(bindings) > 0` → API 409。无引用时 DELETE Skill 行；**不**自动删绑定（因已被拦截）。 |
| 插入绑定 | 校验：`Assistant.userId === UserSkillConfig.userId === binding.userId`（AC-S2）。 |

---

## 3. 与现有实体的关系简图

```
User 1 --- * UserSkillConfig
User 1 --- * Assistant
Assistant * --- * UserSkillConfig   （经 AssistantSkillBinding）
Assistant * --- * UserMcpConfig     （已有 AssistantMcpBinding）
Assistant * --- * KnowledgeBase     （已有 AssistantKnowledgeBase）
```

**对话解析链（Skills）**：

```
Conversation.assistantId
  → AssistantSkillBinding（userId + assistantId）
  → skillConfigId[]（去重、字典序、slice 10）
  → UserSkillConfig（enabled=true 且存在）
  → ChatSkillPackRef[] { id }
  → skillRefsToExtraSystemText → resolveSystemPromptWithSkills
```

**与 MCP 并行、独立**；Skills **不**经知识库或 MCP 表间接挂载。

---

## 4. 运行时类型（已有占位）

定义于 `src/server/chat/turn-capabilities.ts`：

```typescript
export type ChatSkillPackRef = { id: string };
```

3B 实现 `loadSkillPackRefsForChatTurn` 返回 `{ id: skillConfigId }[]`；**不**在 ref 中携带 name/content（正文在 `skillRefsToExtraSystemText` 批量加载）。

**Turn UI 快照（3B 新增，建议同文件或 `turn-capabilities.ts`）**：

```typescript
export type SkillsTurnUiSnapshot = {
  assistantMissing: boolean;
  merged: Array<{ id: string; name: string }>;
  skippedCount?: number; // 仅日志；默认不进 UI
};
```

---

## 5. 与 MCP 实体字段对照

| 概念 | UserMcpConfig | UserSkillConfig |
| --- | --- | --- |
| 标识 | id, userId | 同 |
| 展示 | name, description | 同 |
| 核心 payload | transport, endpoint, metadata, credentialsCipher | **content**（text） |
| 状态 | enabled | 同 |
| 探测 | lastCheckedAt, lastCheckStatus, lastErrorSummary | **无** |
| 列表引用数 | referencedAssistantCount（DTO 计算） | 同 |

| 概念 | AssistantMcpBinding | AssistantSkillBinding |
| --- | --- | --- |
| 字段 | id, userId, assistantId, **mcpConfigId**, createdAt | id, userId, assistantId, **skillConfigId**, createdAt |
| 唯一 | (assistantId, mcpConfigId) | (assistantId, skillConfigId) |
| 列表排序 | mcpConfigId ASC | skillConfigId ASC |

---

## 6. DTO 与仓库层（3B 建议）

对称 `src/server/mcp/`：

| 模块 | 建议路径 | 职责 |
| --- | --- | --- |
| DTO | `src/server/skill/skill-config-dto.ts` | `userSkillConfigToListItemJson`、`ToDetailItemJson` |
| 校验 | `src/server/skill/skill-config-validation.ts` | `validateSkillName`、`validateSkillContent` 等 |
| 解析 PUT body | `src/server/skill/parse-skill-config-ids.ts` | 对称 `parse-mcp-config-ids.ts` |
| 助手绑定 | `src/server/skill/assistant-skill-bindings.ts` | `listSkillConfigIdsByAssistantIds`、`replaceAssistantSkillBindings`、`countAssistantsReferencingSkill` |

**列表项 JSON 类型（建议）**：

```typescript
export type SkillConfigListItemJson = {
  id: string;
  name: string;
  description: string | null;
  content: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  referencedAssistantCount: number;
};
```

---

## 7. TypeORM 登记与迁移策略

### 7.1 当前项目方式

`src/server/db/data-source.ts` 配置：

- `synchronize: true` — 开发环境下**新增实体类并注册后**，启动时 SQLite **自动建表/加列**。
- **无** `migrations/` 目录；历史数据迁移采用 **一次性脚本**（例：`migrateKnowledgeBaseMcpToAssistantMcp` 在 `initialize()` 后调用）。

### 7.2 3B 登记步骤

1. 新建 `UserSkillConfig.ts`、`AssistantSkillBinding.ts`。
2. 在 `data-source.ts` 的 `entities: [...]` 数组**末尾**追加两实体（与 MCP 相邻便于维护）。
3. 重启应用 → SQLite 自动创建 `user_skill_configs`、`assistant_skill_bindings`。
4. **无需**数据 backfill（新表为空）；旧对话行为不变（无绑定时占位函数仍返回空）。

### 7.3 生产 / 零停机（远期）

若未来关闭 `synchronize`：

- 使用 TypeORM `Migration` 接口生成等价 DDL（CREATE TABLE + UNIQUE INDEX），或导出 SQL 手工执行。
- Skills 为** additive** 变更，不影响现有表数据；回滚可 DROP 两新表（需先确认无生产依赖）。

### 7.4 与 MCP 迁移历史的关系

- 本期 **不**修改 `knowledge_base_mcp_bindings` 或 MCP 表结构。
- 不需要类似 `migrate-kb-mcp-to-assistant-mcp` 的 Skills 迁移（无旧表可迁）。

---

## 8. `data-source.ts` 登记示例（3B）

```typescript
import { UserSkillConfig } from "@/server/db/entities/UserSkillConfig";
import { AssistantSkillBinding } from "@/server/db/entities/AssistantSkillBinding";

entities: [
  // ...existing
  UserMcpConfig,
  AssistantMcpBinding,
  UserSkillConfig,      // 新增
  AssistantSkillBinding, // 新增
],
```

---

## 9. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-18 | 3A 初稿 |
