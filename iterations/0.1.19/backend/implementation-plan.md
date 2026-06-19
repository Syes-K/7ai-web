# 实现计划：Skill Pack 服务端（version 0.1.19）

阶段 **3B** 执行顺序；本文档不写业务代码，仅列步骤、依赖、文件清单与自测要点。

---

## 1. 目标对齐

| 来源 | 要点 |
| --- | --- |
| PRD / 用户故事 | AC-P1~P14；Epic A~E |
| 设计 | 文件树 API、zip 导入、read tool、Turn read 计数、scripts 不执行 |
| 3A 契约 | `api-spec.md`、`data-models.md` |
| 硬约束 | `withApiWrapper` + `getRequestUserContext`；TypeORM + SQLite；LangChain tool；中文注释 |

---

## 2. 实施顺序总览

```text
① 数据层（实体 + 常量 + ErrorCode + 迁移脚本）
    ↓
② 领域模块（path/frontmatter/文件 CRUD/import/校验/DTO）
    ↓
③ HTTP API（CRUD 演进 + files + import）
    ↓
④ 运行时（SKILL.md merge + read_skill_file + Turn 统计）
    ↓
⑤ i18n keys + 自测 + implementation-notes
```

**前端依赖**：③ 完成后可并行对接列表/详情；④ 完成后对接 Turn read 展示。

---

## 3. 步骤 ① — 数据层

### 3.1 实体

| 任务 | 文件 |
| --- | --- |
| 新增 `SkillPackFile` | `src/server/db/entities/SkillPackFile.ts` |
| `UserSkillConfig.content` → nullable + 注释 deprecated | `src/server/db/entities/UserSkillConfig.ts` |
| 注册实体 | `src/server/db/data-source.ts` |

### 3.2 常量与枚举

| 任务 | 文件 |
| --- | --- |
| 追加 `SKILL_PACK_*` 配额常量 | `src/common/constants/index.ts` |
| 扩展名白名单/拒绝列表 | 同上或 `skill-pack-extensions.ts` |
| 新增 ErrorCode | `src/common/enums/http.ts` |
| 可选：`SKILL_PACK_*` 类型 | `src/common/types/skill-pack.ts` |

### 3.3 迁移

| 任务 | 文件 |
| --- | --- |
| `migrateSkillContentToPackFiles` 幂等脚本 | `src/server/db/migrate-skill-content-to-pack-files.ts` |
| `initialize()` 调用 | `data-source.ts` |

**自测**

- 空库启动：表创建成功
- 含 0.1.18 数据：每条 content → 一条 SKILL.md；content 清空
- 重复启动：不重复 insert（Q8 skip）
- 已有 files 的 pack：skip

---

## 4. 步骤 ② — 领域模块

| 文件 | 职责 |
| --- | --- |
| `src/server/skill/pack-path.ts` | `normalizePackFilePath`、扩展名校验 |
| `src/server/skill/pack-frontmatter.ts` | strip、extract、wrap 迁移模板 |
| `src/server/skill/pack-files.ts` | list/get/upsert/delete/move、配额聚合、`assertSkillMdPresent` |
| `src/server/skill/pack-import.ts` | zip 解压、路径过滤、UTF-8 检测、skip 列表 |
| `src/server/skill/skill-pack-file-validation.ts` | 单文件/Pack 级校验 + `tApiMessage` |
| `src/server/skill/skill-config-dto.ts` | **改**：去掉 content；加 fileCount/hasScripts |
| `src/server/skill/skill-config-validation.ts` | **改**：去掉 validateSkillContent；POST 不再要 content |
| `src/server/skill/assistant-skill-bindings.ts` | 基本不变 |
| `src/server/skill/parse-skill-config-ids.ts` | 不变 |

**注释要求**：pack-path 安全规则、import 跳过原因、frontmatter 覆盖策略。

---

## 5. 步骤 ③ — HTTP API

### 5.1 主资源 CRUD 演进

| 文件 | 变更 |
| --- | --- |
| `src/app/api/console/skill-configs/route.ts` | GET 聚合 fileCount/hasScripts；POST 创建 + 默认 SKILL.md |
| `src/app/api/console/skill-configs/[id]/route.ts` | PATCH 去掉 content；enabled 校验 SKILL.md；DELETE 级联 files |

### 5.2 文件子资源（新）

| 文件 | 方法 |
| --- | --- |
| `skill-configs/[id]/files/route.ts` | GET list、PUT batch |
| `skill-configs/[id]/files/[...path]/route.ts` | GET/PUT/PATCH/DELETE 单文件 |

### 5.3 导入（新）

| 文件 | 方法 |
| --- | --- |
| `skill-configs/import/route.ts` | POST multipart zip / folder |

### 5.4 助手子资源

| 文件 | 变更 |
| --- | --- |
| `assistants/[id]/skill-configs/route.ts` | **无逻辑变更**；确认列表选项字段兼容 |

### 5.5 i18n

`messages/en/api/message.json`、`messages/zh/api/message.json` — 见 `api-spec.md` §10。

**自测（API 矩阵）**

| 用例 | 期望 |
| --- | --- |
| POST 无 content 创建 | 201 + fileCount=1 |
| PUT SKILL.md 同步 frontmatter name | 主表 name 更新 |
| 超 512KB 单文件 | 422 |
| 超 2MB Pack | 422 |
| 删唯一 SKILL.md | 422 |
| import 缺 SKILL.md zip | 422 + details |
| import ui-ux-pro-max zip | 201 + hasScripts=true |
| DELETE 被引用 pack | 409 |

---

## 6. 步骤 ④ — 运行时

### 6.1 `turn-capabilities.ts`

| 函数 | 变更 |
| --- | --- |
| `buildSkillsMergeResult` | 读 `SkillPackFile(SKILL.md)` + strip frontmatter + body 长度 |
| `skillPackRefsToReadTools` | **新增**：构建 `read_skill_file` DynamicStructuredTool |
| `resolveAllToolsForAgent` | 合并 native + **read tool** + MCP（**重构**：即使无 MCP 有 Skill 也注册 read） |
| `resolveSkillsTurnUiSnapshot` | 加 `readToolEnabled`；read 计数在 agent 完成后注入 |
| `SkillsTurnUiSnapshot` | 扩展 Q13 字段 |

**`resolveAllToolsForAgent` 结构修正（相对 0.1.18）**

当前实现在无 MCP 时 early return **不含** Skill tools。3B 须改为：

```text
native
+ skillPackRefsToReadTools(refs)   // 有 refs 即注册
+ mcpTools                         // 可选
```

### 6.2 `read_skill_file` 实现

| 文件 | 职责 |
| --- | --- |
| `src/server/skill/read-skill-file-tool.ts` | tool factory、白名单、path 校验、DB 读、错误字符串 |

**安全自测**

| 用例 | 期望 |
| --- | --- |
| 未挂载 packId | Error 字符串 |
| `../etc/passwd` | invalid path |
| 他人 packId（同 UUID 猜测） | not available |
| `scripts/foo.py` | 返回源码；无 subprocess |
| 跨 user 数据 | 查不到 |

### 6.3 Agent 与 Turn  wiring

| 文件 | 变更 |
| --- | --- |
| `src/server/chat/langchain-agent.ts` | `resolveAllToolsForAgent` 返回值扩展 `skillsTurnUi` / read 统计 hook（或 callback 收集 tool calls） |
| `src/app/api/chat/conversations/[conversationId]/messages/route.ts` | `skillsSafeMessage` 支持 `skillsMergedWithRead`；details read 块 |

**Tool call 统计**：LangChain callback 或 agent invoke 结果中过滤 `read_skill_file` 成功次数。

### 6.4 0.1.20 预留

在 `read-skill-file-tool.ts` 或 `turn-capabilities.ts`：

```typescript
// TODO 0.1.20: run_skill_script — 沙箱执行 scripts/ 下文件；本期不注册
```

---

## 7. 步骤 ⑤ — 文档与自测

| 任务 | 产出 |
| --- | --- |
| 更新 3B 实现说明 | `iterations/0.1.19/backend/implementation-notes.md` |
| 运行时矩阵自测 | 见 `risks-and-open-items.md` §3 |
| 可选单测 | `pack-path.test.ts`、`pack-frontmatter.test.ts` |

---

## 8. 3B 文件清单（完整）

### 8.1 新增

```
src/server/db/entities/SkillPackFile.ts
src/server/db/migrate-skill-content-to-pack-files.ts
src/server/skill/pack-path.ts
src/server/skill/pack-frontmatter.ts
src/server/skill/pack-files.ts
src/server/skill/pack-import.ts
src/server/skill/skill-pack-file-validation.ts
src/server/skill/read-skill-file-tool.ts
src/app/api/console/skill-configs/import/route.ts
src/app/api/console/skill-configs/[id]/files/route.ts
src/app/api/console/skill-configs/[id]/files/[...path]/route.ts
```

### 8.2 修改

```
src/server/db/entities/UserSkillConfig.ts
src/server/db/data-source.ts
src/common/constants/index.ts
src/common/enums/http.ts
src/server/skill/skill-config-dto.ts
src/server/skill/skill-config-validation.ts
src/app/api/console/skill-configs/route.ts
src/app/api/console/skill-configs/[id]/route.ts
src/server/chat/turn-capabilities.ts
src/server/chat/langchain-agent.ts
src/app/api/chat/conversations/[conversationId]/messages/route.ts
messages/en/api/message.json
messages/zh/api/message.json
```

### 8.3 基本不变（确认兼容）

```
src/server/skill/assistant-skill-bindings.ts
src/server/skill/parse-skill-config-ids.ts
src/app/api/console/assistants/[id]/skill-configs/route.ts
```

---

## 9. 前端对接依赖顺序

| 前端能力 | 依赖 API / 运行时 |
| --- | --- |
| 列表 fileCount / hasScripts | ③ GET skill-configs |
| Drawer 文件树 + 编辑器 | ③ files GET/PUT/PATCH/DELETE |
| Zip 导入 | ③ POST import |
| 助手选择器增强 | ③ 列表字段 |
| Turn read 次数 | ④ skillsTurnUi + message.json keys |

---

## 10. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-19 | 3A 初稿：3B 顺序与文件清单 |
