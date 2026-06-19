# 风险、开放项与前端交接（version 0.1.19 — Skill Pack）

供 3B、前端与产品对齐；产品开放问题见 `product/open-questions.md`（多数已在设计定稿）。

---

## 1. 风险

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| **Prompt + read 双重 token 成本** | 多 Pack 大 SKILL.md + Agent 多次 read | 配额 2MB/512KB/32KB body；Turn 不展示全文 |
| **用户预期：脚本可跑** | 导入 ui-ux-pro-max 类 Pack 期望执行 | 控制台 + tool description 明确；Turn `skillsReadOnlyNote` |
| **import zip 安全** | zip slip、炸弹、嵌套 zip | path 归一化、总 uncompressed 上限、拒绝嵌套 zip |
| **迁移 partial failure** | 部分 id 迁移失败 | 幂等脚本 + structured log；运维 id 列表 |
| **content 列残留** | 新旧双源漂移 | 运行时 **仅**读 files；迁移 NULL content |
| **`resolveAllToolsForAgent` 结构** | 0.1.18 无 MCP 时不注入 tools | 3B **必须**独立 Skill read 分支 |
| **列表 payload** | 50 pack × 100 files 元数据 | 列表不返回 content；详情按需 GET file |
| **frontmatter 与表单冲突** | 用户困惑 name 来源 | Q6：保存 SKILL 覆盖表单；文档 + Toast |
| **synchronize 生产** | schema 自动变更 | 与项目现状一致；导出等价 DDL（`data-models.md` §9.2） |
| **UTF-8 假设** | 二进制 csv/图片 | Q3 MVP 拒绝非 UTF-8；导入 skip 列表 |

---

## 2. 安全：`read_skill_file` 边界（硬性）

| 层 | 要求 |
| --- | --- |
| **授权** | packId ∈ 本 Turn `loadSkillPackRefsForChatTurn` 结果 |
| **租户** | SQL 必带 `userId = ctx.userId` |
| **路径** | `normalizePackFilePath`；拒绝 `..`、绝对路径、NUL |
| **能力** | 只读 DB `content` 字符串；**无** fs.read、exec、network |
| **scripts/** | 与 `data/` 同等只读；**无** run_skill_script |
| **错误** | 统一 Error 字符串；不泄露跨用户存在性 |
| **日志** | 记录 packId/path/ok；**不** log 文件全文 |

**威胁模型外（本期）**：Prompt 注入、恶意 SKILL.md 指引 — 与 0.1.18 UGC 相同，靠模型策略与用户治理。

---

## 3. 0.1.20 预留：`run_skill_script`

| 项 | 说明 |
| --- | --- |
| **Tool 名** | `run_skill_script`（暂定） |
| **参数** | `packId`, `path`（限制 `scripts/` 前缀）, `args[]`, `timeoutMs` |
| **运行时** | 服务端沙箱（语言/隔离待 0.1.20 选型） |
| **配额** | 每用户/每 Turn CPU、内存、时长 |
| **审计** | 调用日志、拦截记录 |
| **接入点** | `resolveAllToolsForAgent` 与 `read_skill_file` 并列；**本期仅注释预留** |

---

## 4. 开放项状态（研发视角）

| ID | 状态 | 3B 默认 |
| --- | --- | --- |
| Q1 配额 | **Closed** | 2MB / 512KB / 100 |
| Q2 扩展名 | **Closed** | 白名单 + deny 二进制 |
| Q3 二进制 | **Closed** | 仅 UTF-8 text |
| Q4 tool 名 | **Closed** | `read_skill_file` |
| Q5 packId | **Closed** | 仅 UUID |
| Q6 frontmatter | **Closed** | 保存 SKILL 覆盖表单项 |
| Q7 导入名 | **Closed** | frontmatter > 文件夹 > zip 名 |
| Q8 迁移冲突 | **Closed** | 已有 files 则 skip |
| Q9 body 超限 | **Closed** | 拒绝保存，不截断 |
| Q10 路由 | **Closed** | 保留 `/console/skills`、API 路径 |
| Q11 表名 | **Closed** | `user_skill_configs` + `skill_pack_files` |
| Q12 导入同名 | **Closed** | 409 |
| Q13 Turn read | **Closed（MVP）** | skills_resolution 含 read 次数 |
| Q14 系统预置 | **Closed** | 否 |
| Q15 导出 zip | **Closed** | 本期不做 |

---

## 5. 测试要点

### 5.1 API

| 用例 | 期望 |
| --- | --- |
| AC-P1 匿名 | 401 |
| AC-P2 跨用户 | 404 / 422 |
| AC-P3 无 SKILL.md 启用 | 422 |
| AC-P5 zip 导入 | 201 路径一致 |
| AC-P7 删除被引用 | 409 |
| AC-P8 disabled | 不在 refs / read 白名单 |
| 导入同名 | 409 |
| path `../x` | 422 / skip |

### 5.2 运行时

| 用例 | 期望 |
| --- | --- |
| AC-P9 merge | `## Skill:` + body 无 frontmatter |
| AC-P10 read data/csv | tool 返回文本 |
| AC-P11 scripts | 可读；**无** exec tool |
| AC-P12 无助手 | 无 merge、无 read tool |
| AC-P13 迁移 | 等价旧 content |
| read 非法 path | Error 字符串 |
| Q13 Turn | readFileCount > 0 时 UI 文案 |

### 5.3 迁移

| 用例 | 期望 |
| --- | --- |
| 有 content 无 files | 生成 SKILL.md |
| 已有 files | skip |
| 助手绑定 | id 不变，对话仍合并 |

---

## 6. 前端交接

### 6.1 契约文档

| 文档 | 内容 |
| --- | --- |
| `api-spec.md` | REST + read tool 语义 |
| `data-models.md` | 字段、配额、迁移 |

### 6.2 页面对接

| 页面 | API |
| --- | --- |
| `/console/skills` | CRUD + `.../files/**` + `POST import` |
| 助手 Modal | GET skill-configs（含 fileCount/hasScripts） |
| Chat Turn | `skillsTurnUi.readFileCount`、新 safeMessage keys |

### 6.3 类型建议

```typescript
type SkillPackListItem = {
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

type SkillPackFileMeta = { path: string; sizeBytes: number; updatedAt: string };

type SkillPackImportResult = {
  item: SkillPackListItem;
  importSummary: {
    importedFileCount: number;
    skippedFileCount: number;
    skipped: Array<{ path: string; reason: string }>;
    totalBytes: number;
    hasScripts: boolean;
  };
};
```

### 6.4 错误处理

- 409 删除：`SKILL_CONFIG_REFERENCED_BY_ASSISTANT`
- 409 导入/重命名：`SKILL_CONFIG_NAME_CONFLICT` / `SKILL_PACK_FILE_PATH_CONFLICT`
- 422 配额：读 `details[].field`（`files[i].path` 或 `path`）

### 6.5 i18n 分工

| 范围 | 文件 |
| --- | --- |
| 控制台 | `page/console/skills.json` |
| API + Turn | `api/message.json` |
| 后端 | 仅 `tApiMessage` |

---

## 7. 已知 Closed（3B 无需分支）

- 直接替换 content，不双轨
- scripts MVP 不执行
- 挂载链 Pack → 助手 → 会话
- API 路径保留 skill-configs
- 删除被引用 409
- read 仅成功计数进 Turn（默认）

---

## 8. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-19 | 3A 初稿 |
