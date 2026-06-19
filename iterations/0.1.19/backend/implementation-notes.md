# 实现说明：Skill Pack 服务端（version 0.1.19 — 阶段 3B）

阶段 3B 已完成：将 0.1.18 单字段 `UserSkillConfig.content` 替换为 **Skill Pack 目录包**（`skill_pack_files` + files/import API + `read_skill_file` LangChain Tool）。

---

## 1. 已实现文件

### 1.1 新增

| 文件 | 职责 |
| --- | --- |
| `src/server/db/entities/SkillPackFile.ts` | Pack 文件实体 |
| `src/server/db/migrate-skill-content-to-pack-files.ts` | 幂等迁移 content → SKILL.md |
| `src/server/skill/pack-path.ts` | 路径归一化、扩展名校验 |
| `src/server/skill/pack-frontmatter.ts` | frontmatter 剥离/同步/默认模板 |
| `src/server/skill/pack-files.ts` | list/get/upsert/delete/move/聚合 |
| `src/server/skill/pack-import.ts` | zip / 文件夹 multipart 导入 |
| `src/server/skill/skill-pack-file-validation.ts` | 单文件/Pack 配额校验 |
| `src/server/skill/read-skill-file-tool.ts` | `read_skill_file` + Turn 统计 collector |
| `src/app/api/console/skill-configs/import/route.ts` | POST import |
| `src/app/api/console/skill-configs/[id]/files/route.ts` | GET list / PUT batch |
| `src/app/api/console/skill-configs/[id]/files/[...path]/route.ts` | 单文件 CRUD |
| `src/types/adm-zip.d.ts` | adm-zip 类型声明 |

### 1.2 修改

| 文件 | 变更摘要 |
| --- | --- |
| `UserSkillConfig.ts` | `content` nullable deprecated |
| `data-source.ts` | 注册实体 + 迁移调用 |
| `common/constants/index.ts` | `SKILL_PACK_*` 配额与扩展名 |
| `common/enums/http.ts` | `SKILL_PACK_FILE_*` ErrorCode |
| `skill-config-dto.ts` | `fileCount` / `hasScripts`；移除 content |
| `skill-config-validation.ts` | 拒绝 content；移除 validateSkillContent |
| `skill-configs/route.ts` | POST 预置 SKILL.md；GET 聚合 |
| `skill-configs/[id]/route.ts` | PATCH enabled 校验；DELETE 级联 files |
| `turn-capabilities.ts` | merge 读 SKILL.md；read tool 注册；resolveAllTools 重构 |
| `langchain-agent.ts` | 暴露 skillsReadCollector |
| `assistant.ts` | onSkillsTurnFinalized + read 统计 |
| `messages/route.ts` | skillsMergedWithRead / read details |
| `messages/en/api/message.json` | API + Turn i18n |
| `messages/zh/api/message.json` | 同上 |
| `package.json` / lock | 依赖 `adm-zip` |

### 1.3 基本不变（已确认）

- `assistant-skill-bindings.ts`
- `parse-skill-config-ids.ts`
- `assistants/[id]/skill-configs/route.ts`

---

## 2. 构建结果

```text
npm run build
✓ Compiled successfully
✓ Linting and checking validity of types（通过）
✓ Generating static pages (61/61)
```

本地若 `.env` 无读权限，Next 可能在 **Collecting build traces** 阶段报 `EPERM`（环境权限，非业务代码）；TypeScript 编译与类型检查已通过。

---

## 3. 运行时要点

| 能力 | 行为 |
| --- | --- |
| Prompt 合并 | `SkillPackFile(path='SKILL.md')` body（去 frontmatter） |
| read tool | `read_skill_file(packId, path)`；白名单 = 本 Turn 挂载 Pack |
| resolveAllToolsForAgent | `native + read_skill_file + MCP`；无 MCP 有 Skill 仍注册 read |
| scripts/ | 可读；**不**执行（0.1.20 预留 `run_skill_script` 注释） |
| Turn Q13 | Agent 完成后 `readFileCount` / `readFileSamples` 注入 C1b |

---

## 4. 迁移

- 启动时 `migrateSkillContentToPackFiles`：有 files 则 skip；否则 `content` → 一行 `SKILL.md` 并 NULL content。
- 助手绑定 `skillConfigId`（packId）**不变**。

---

## 5. 自测要点（建议顺序）

### 5.1 API

1. **POST** `/api/console/skill-configs` 无 content → 201，`fileCount=1`
2. **GET** 列表含 `fileCount`、`hasScripts`（无 content）
3. **PUT** `.../files/SKILL.md` 带 frontmatter name → 主表 name 同步
4. 单文件 >512KB / Pack >2MB / 文件数 >100 → 422
5. **DELETE** 唯一 SKILL.md → 422 `skillMdDeleteForbidden`
6. **POST** import 缺 SKILL.md zip → 422 `skillMdRequiredOnImport`
7. import 含 `scripts/` → `hasScripts=true`
8. **DELETE** 被引用 pack → 409

### 5.2 运行时

1. 挂载 Pack 对话 → system prompt 含 `## Skill:` 块（无 frontmatter）
2. Agent 调用 `read_skill_file` 读 `reference.md` / `scripts/*.py` → 返回文本
3. 无 MCP 仅有 Skill → tools 仍含 `read_skill_file`
4. Turn C1b：`readFileCount>0` 时 `skillsMergedWithRead` + read details
5. 非法 path / 未挂载 packId → Error 字符串，不计入 read 计数

### 5.3 迁移

1. 0.1.18 库有 content 无 files → 启动后 `fileCount>=1`，content NULL
2. 重复启动不重复 insert
3. 迁移前后助手对话 prompt 正文等价

---

## 6. 前端交接

- 控制台 `SkillsClient.tsx` **仍使用 0.1.18 content 字段**，需在阶段 4 改为 files API + import。
- 契约见 `iterations/0.1.19/backend/api-spec.md`。

---

## 7. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-19 | 3B 实现完成 |
