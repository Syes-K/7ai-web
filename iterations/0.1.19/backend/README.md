# 服务端文档索引（version 0.1.19 — Skill Pack）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.19` |
| 阶段 | **3A（仅文档，禁止业务代码）** |
| 上游 | `iterations/0.1.19/product/`、`iterations/0.1.19/design/` |
| 前置实现 | `0.1.18` 单字段 `UserSkillConfig.content`（**本期替换**） |
| 下游 | 3B 实现 → 前端阶段 4 对接 |

---

## 1. 本期范围摘要

0.1.19 将 Skill 从 **单 Markdown 正文** 演进为 **目录型 Skill Pack**：

| 能力 | 说明 |
| --- | --- |
| 存储 | 主表 `user_skill_configs`（沿用表名）+ 新表 `skill_pack_files` |
| 必填 | 每 Pack 须含 `SKILL.md`；frontmatter 可同步 `name`/`description` |
| 控制台 API | 保留 `/api/console/skill-configs`；新增 **files 子资源** 与 **import** |
| 运行时 | `SKILL.md` 正文 → system prompt；**`read_skill_file`** LangChain Tool 读附属文件 |
| MVP 边界 | **`scripts/` 仅可读，不执行**；`run_skill_script` 预留至 **0.1.20** |
| 迁移 | 部署时 `content` → `SkillPackFile(path='SKILL.md')`（见 `data-models.md` §4） |
| Turn | `skills_resolution` 扩展 **read 次数**（Q13 MVP） |

**挂载链不变**：Pack → `AssistantSkillBinding` → 会话 `assistantId` → Turn。

---

## 2. 文档清单

| 文件 | 用途 |
| --- | --- |
| [api-spec.md](./api-spec.md) | REST 契约：CRUD 演进、files 子资源、import、`read_skill_file` 运行时契约、错误码 |
| [data-models.md](./data-models.md) | 实体、索引、与 0.1.18 对照、迁移 DDL 策略 |
| [implementation-plan.md](./implementation-plan.md) | 3B 实施顺序、模块清单、自测要点 |
| [risks-and-open-items.md](./risks-and-open-items.md) | 风险、安全边界、前端交接、0.1.20 预留 |

---

## 3. 与 0.1.18 后端文档关系

| 0.1.18 | 0.1.19 变更 |
| --- | --- |
| `content` 字段 CRUD | **移除**请求/响应中的 `content`；改 files API |
| 列表项含 `content` | 改为 `fileCount`、`hasScripts` |
| 运行时读 `row.content` | 读 `skill_pack_files` 中 `path='SKILL.md'`，剥离 frontmatter |
| 无 Skill tool | 新增 **`read_skill_file`** |
| 无迁移 | 新增 **`migrateSkillContentToPackFiles`** |

助手子资源 `GET/PUT .../assistants/:id/skill-configs` **语义不变**（id = packId）。

---

## 4. 3B 代码落点速查

| 域 | 路径 |
| --- | --- |
| 实体 | `src/server/db/entities/SkillPackFile.ts`；改 `UserSkillConfig.ts` |
| 迁移 | `src/server/db/migrate-skill-content-to-pack-files.ts` |
| 领域 | `src/server/skill/*`（pack-files、import、frontmatter、path 校验） |
| API | `src/app/api/console/skill-configs/**` |
| 运行时 | `src/server/chat/turn-capabilities.ts`、`langchain-agent.ts` |
| 常量 | `src/common/constants/index.ts` |
| i18n | `messages/{en,zh}/api/message.json` |

完整顺序见 [implementation-plan.md](./implementation-plan.md)。

---

## 5. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-19 | 3A 初稿：Skill Pack 替换 0.1.18 单正文 |
