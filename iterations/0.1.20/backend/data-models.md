# 数据模型：Skill Pack 增强（version 0.1.20）

> **仓库现状**：TypeORM + `better-sqlite3`（`synchronize: true`）。本文在 **0.1.19** 模型上增量描述 `alwaysLoad`、`skill_script_runs` 与 Turn 快照演进。

---

## 1. 与 0.1.19 对照总表

| 维度 | 0.1.19 | 0.1.20 |
| --- | --- | --- |
| `UserSkillConfig` | name、description、enabled | + **`alwaysLoad`** boolean |
| 审计表 | 无 | **`skill_script_runs`**（新建） |
| Turn 快照 | `merged[]` | `mounted[]` + `loaded[]` + `skipped[]` + run 统计 |
| 运行时 merge | 全部 mounted | 仅 **loaded**（selectedRefs） |
| frontmatter 同步 | name、description | + **alwaysLoad** |

---

## 2. 实体变更：`UserSkillConfig`

**表名不变**：`user_skill_configs`

| 字段 | TypeORM | 约束 | 0.1.20 说明 |
| --- | --- | --- | --- |
| `alwaysLoad` | `boolean` | **NOT NULL DEFAULT false** | Pack 级「始终加载」；每轮无条件进入 `selectedIds` |

### 2.1 3B 实体片段

```typescript
/** 为 true 时每轮对话无条件合并 SKILL.md（意图路由跳过该 Pack）。 */
@Column({ type: "boolean", default: false })
alwaysLoad!: boolean;
```

### 2.2 迁移策略

| 方式 | 说明 |
| --- | --- |
| `synchronize: true` | 新列由 TypeORM 自动 ADD；现有行默认 `false` |
| 幂等 | 无需单独迁移脚本；与 0.1.19 `content` nullable 策略一致 |

### 2.3 frontmatter 权威关系（Q3）

| 操作 | 行为 |
| --- | --- |
| PATCH `alwaysLoad` | **写表**；不要求改 SKILL.md |
| 保存 `SKILL.md` | frontmatter `alwaysLoad: true\|false` → **同步写表**（扩展 `syncPackMetadataFromSkillMd`） |
| zip/文件夹导入 | frontmatter `alwaysLoad` → **同步写表**（扩展 `importPackTransaction`） |
| 新建 Pack | 默认 `alwaysLoad=false`；模板 frontmatter **可不含** 该键 |

### 2.4 frontmatter 解析扩展

`extractSkillMetadataFromFrontmatter` 新增：

```typescript
export function parseAlwaysLoadFromFrontmatter(fm: Record<string, string>): boolean | undefined {
  const raw = fm.alwaysLoad?.trim().toLowerCase();
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}
```

---

## 3. 新实体：`SkillScriptRun`（表 `skill_script_runs`）

**用途**：脚本执行审计（Q14）；保留 **90 天**；本期无控制台 UI（P1）。

| 字段 | TypeORM | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | varchar(36) PK | UUID v4 | — |
| `userId` | varchar(36) | NOT NULL，索引 | 用户隔离 |
| `packId` | varchar(36) | NOT NULL，索引 | Skill Pack id |
| `path` | varchar(512) | NOT NULL | 归一化路径，如 `scripts/hello.py` |
| `exitCode` | int | **nullable** | 超时/kill 可为 null |
| `durationMs` | int | NOT NULL |  wall-clock 耗时 |
| `errorSummary` | varchar(500) | nullable | 超时/沙箱拒绝等简短摘要 |
| `createdAt` | datetime | CreateDateColumn | 用于 90 天清理 |

### 3.1 索引

```typescript
@Entity("skill_script_runs")
@Index(["userId", "createdAt"])
@Index(["userId", "packId"])
@Index(["createdAt"])
export class SkillScriptRun { ... }
```

| 索引 | 用途 |
| --- | --- |
| `(userId, createdAt)` | 日配额 COUNT（`createdAt >= startOfDay`） |
| `(createdAt)` | 定期清理 `createdAt < now - 90d` |
| `(userId, packId)` | 运营排查（P1） |

### 3.2 写入时机

| 场景 | 是否 INSERT |
| --- | --- |
| spawn 后正常结束（含 exitCode≠0） | **是** |
| 超时 kill | **是**（`exitCode=null`，`errorSummary=timeout`） |
| 沙箱拒绝（路径/扩展名等 invoke 前校验） | **否**（仅 log `skill_script_run_denied`） |
| 配额拒绝（turn/day） | **否** |
| pack 未 loaded | **否** |

### 3.3 保留策略（3B 建议）

- 应用启动或每日 cron：**DELETE** `createdAt < now() - 90 days`
- 首期可在 `initialize()` 后跑一次清理；不阻塞 MVP

---

## 4. 不变实体（引用）

| 实体 | 0.1.20 角色 |
| --- | --- |
| `SkillPackFile` | `read_skill_file` / `run_skill_script` 读脚本内容与沙箱 bind |
| `AssistantSkillBinding` | 定义 **mounted** 集合（不变） |
| `ChatTurn` | `stepsSnapshotJson` 内 C1b 步骤 details 结构演进（见 §5） |

---

## 5. Turn 快照：`SkillsTurnUiSnapshot` 演进

**存储位置**：不单独建表；嵌于 `ChatTurn.stepsSnapshotJson` → C1b `details` 与 Agent 完成后二次更新的 `safeMessage`。**结构化字段**由 backend 组装，**不**持久化 locale 死字符串（Q20）。

### 5.1 完整类型（3B 落点：`turn-capabilities.ts` 或 `common/types/skill-turn.ts`）

```typescript
export type SkillPackUiRef = { id: string; name: string };

export type SkillPackSkippedRef = SkillPackUiRef & { reason?: string };

export type SkillsTurnUiSnapshot = {
  assistantMissing: boolean;
  loadFailed?: boolean;
  intentSource?: "always_load" | "intent_agent" | "failed_safe" | "skipped";
  /** 助手挂载且 enabled 的全部 Pack */
  mounted: SkillPackUiRef[];
  /** 本轮合并 SKILL.md 进 prompt 的 Pack */
  loaded: SkillPackUiRef[];
  /** 挂载但本轮未加载（最多 5 条入 details） */
  skipped?: SkillPackSkippedRef[];
  /** 未选用总数（含未展示 reason 的条目） */
  skippedCount?: number;
  readToolEnabled?: boolean;
  runToolEnabled?: boolean;
  readFileCount?: number;
  /** ≤5，格式 packName:path */
  readFileSamples?: string[];
  scriptRunCount?: number;
  /** ≤5，格式 packName:path:exitCode */
  scriptRunSamples?: string[];
  /** @deprecated 0.1.20+ 用 loaded；读历史时映射 */
  merged?: SkillPackUiRef[];
};
```

### 5.2 `SkillPackSelectionResult`（单轮内部，可不持久化）

```typescript
export type SkillPackSelectionResult = {
  mountedRefs: ChatSkillPackRef[];
  selectedRefs: ChatSkillPackRef[]; // = loaded 白名单
  mounted: SkillPackUiRef[];
  loaded: SkillPackUiRef[];
  skipped: SkillPackSkippedRef[];
  skippedCount: number;
  intentSource: "always_load" | "intent_agent" | "failed_safe" | "skipped";
  loadFailed: boolean;
};
```

### 5.3 Legacy 归一化（Q22）

**落点建议**：`src/common/utils/normalize-skills-turn-ui.ts`（或 `turn-capabilities.ts` 导出）

```typescript
export function normalizeSkillsTurnUi(raw: SkillsTurnUiSnapshot): SkillsTurnUiSnapshot {
  if (raw.mounted?.length) {
    return {
      ...raw,
      mounted: raw.mounted ?? [],
      loaded: raw.loaded ?? [],
      skipped: raw.skipped ?? [],
    };
  }
  if (raw.merged?.length) {
    return {
      ...raw,
      mounted: raw.merged,
      loaded: raw.merged,
      skipped: [],
      skippedCount: 0,
    };
  }
  return {
    ...raw,
    mounted: raw.mounted ?? [],
    loaded: raw.loaded ?? [],
    skipped: raw.skipped ?? [],
  };
}
```

### 5.4 C1b 步骤可见性（Q21）

| 条件 | 是否 push/update C1b |
| --- | --- |
| `assistantMissing` | **展示** |
| `loadFailed` | **展示** |
| `mounted.length === 0` 且无上述 | **不 push**（隐藏） |
| `mounted > 0` | **展示**（含 loaded=0「未选用」） |

### 5.5 Agent 完成后统计注入

| 函数 | 字段 |
| --- | --- |
| `applySkillReadStatsToTurnUi`（已有） | `readFileCount`、`readFileSamples` |
| `applySkillScriptRunStatsToTurnUi`（新建） | `scriptRunCount`、`scriptRunSamples` |

`assistant.ts` 在 Agent 结束后应合并 **read + run** 再回调 `onSkillsTurnFinalized`。

---

## 6. DTO 变更

### 6.1 `SkillConfigListItemJson` / `SkillConfigDetailItemJson`

```typescript
export type SkillConfigListItemJson = {
  // ...0.1.19 字段
  alwaysLoad: boolean;
};
```

### 6.2 Console PATCH body

```typescript
type PatchBody = {
  name?: unknown;
  description?: unknown;
  enabled?: unknown;
  alwaysLoad?: unknown; // 新增
};
```

校验：`parseBoolean(body.alwaysLoad, row.alwaysLoad)`。

---

## 7. 配额计数模型（内存 + DB）

| 配额 | 存储 | 计数窗口 |
| --- | --- | --- |
| 每 Turn | **进程内** `SkillScriptRunStatsCollector`（对齐 read collector） | 单轮 Agent 生命周期 |
| 每用户/日 | **DB** `COUNT(skill_script_runs) WHERE userId AND createdAt >= startOfDayUTC` | 自然日（服务器时区 UTC 或 `TZ` 环境变量，3B 统一文档化） |

Turn 配额在 `run_skill_script` invoke **spawn 前**检查；日配额在 spawn 前查询 DB。

---

## 8. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-19 | 3A：alwaysLoad、skill_script_runs、SkillsTurnUiSnapshot 演进 |
