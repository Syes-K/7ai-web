# 开放问题（version 0.1.19 — Skill Pack）

本文档汇总 **待产品/研发确认** 项；每项含 **建议默认**。定稿后请同步更新 `prd.md` 与 `README.md`。

---

## 决策清单

| ID | 问题 | 建议默认 | 影响面 |
| --- | --- | --- | --- |
| **Q1** | **单 Pack 总大小上限**？ | `SKILL_PACK_MAX_TOTAL_BYTES = 2_000_000`（2MB）；`SKILL_PACK_FILE_MAX_BYTES = 512_000`；`SKILL_PACK_MAX_FILES = 100` | 存储、导入校验、UX 提示 |
| **Q2** | **允许的文件扩展名**？ | 允许常见文本类：`.md`、`.txt`、`.json`、`.yaml`、`.yml`、`.csv`、`.py`、`.sh`、`.js`、`.ts`；**拒绝**明显二进制：`.exe`、`.dll`、`.zip`（包内嵌 zip 拒绝）；无扩展名文件允许 | 安全、导入过滤 |
| **Q3** | **二进制 / 大二进制 CSV** 如何存？ | MVP **仅 UTF-8 文本**；非 UTF-8 或解码失败 → 导入拒绝并列出文件；**不做** blob 列 | `SkillPackFile.content` 类型、导入 |
| **Q4** | **`read_skill_file` tool 命名**？ | 对外名 **`read_skill_file`**；description 英文（对齐 MCP tool）；参数 `packId` + `path` | LangChain tool schema、日志 |
| **Q5** | **`packId` 参数是否改为 pack `name`**？ | **仅用 `packId`（UUID）**；tool description 中附当前 Turn 可用 Pack 的 id→name 映射提示 | Agent 选错 id 概率 |
| **Q6** | **frontmatter 与表字段冲突**？ | 保存 `SKILL.md` 时 frontmatter **覆盖**表单项 `name`/`description`；用户在元数据区修改后若未改 `SKILL.md` 则以表单项为准直至下次保存 SKILL | 双向同步 UX |
| **Q7** | **Zip 导入默认 Pack 名称**？ | 优先 frontmatter `name`；否则 zip 顶层文件夹名；否则文件名去 `.zip` | 列表、唯一名校验 |
| **Q8** | **自动迁移与已有 Pack 冲突**？ | 若同 `id` 已有 `SkillPackFile` 行 → **跳过迁移该条**并 log；不覆盖用户已编辑 Pack | 迁移脚本 |
| **Q9** | **`SKILL.md` 正文超限**？ | 超 `SKILL_MD_MAX_BODY_LENGTH`（建议 32_000）→ **拒绝保存** `SKILL.md`（不静默截断） | 校验、token 控制 |
| **Q10** | **路由命名**：`/console/skills` vs `/console/skill-packs`？ | **保留 `/console/skills`**，仅改 UI 文案为「技能包」；API 保留 `/api/console/skill-configs` 减少破坏性 | 路由、书签、i18n |
| **Q11** | **实体/表命名**：沿用 `UserSkillConfig` 还是 rename？ | **沿用表名 `user_skill_configs`**，代码类型可别名 `UserSkillPack`；新增 `skill_pack_files` | 迁移成本 |
| **Q12** | **导入同名 Pack**？ | **拒绝**（409 `SKILL_PACK_NAME_CONFLICT`）；提示用户改名或删除旧 Pack | 导入 API |
| **Q13** | **Turn 面板展示 `read_skill_file` 调用**？ | **建议纳入 MVP**：在 `skills_resolution` 或独立子步骤展示「已读取文件 · N 次」；排期紧可延后 | `turn-runtime.ts` |
| **Q14** | **系统预置 Pack**？ | **否**（延续 0.1.18 Q1） | 权限、列表 |
| **Q15** | **删除 Pack 时是否允许下载 zip 备份**？ | **本期不做**；用户自行复制文件树 | 控制台范围 |

---

## 已拍板（Closed，无需再议）

| 项 | 决策 |
| --- | --- |
| Skill 形态 | **目录包 Skill Pack**，兼容 Cursor 层 2 |
| 与 0.1.18 | **直接替换** `content`，不长期双轨 |
| 脚本 | **0.1.19 MVP 不执行** `scripts/`；**0.1.20+** 沙箱 + `run_skill_script` |
| 挂载链 | **Pack → 助手 → 会话 assistantId → Turn**（非会话直挂） |
| 导入 | 支持 **zip / 文件夹** 同构导入 |
| 运行时 | `SKILL.md` → system prompt + **`read_skill_file`** |
| 助手挂载 | pack id 多选，语义不变 |

---

## 0.1.20 预告（非本期开放问题，仅供对齐）

以下在 0.1.19 PRD 非目标中已声明，**不在此投票**，但可作为 0.1.20 需求预研输入：

- 沙箱运行时（语言范围、隔离技术选型）
- `run_skill_script` 参数：`packId`、`path`、`args[]`、`timeoutMs`
- 配额：每用户日调用次数、并发限制
- 审计日志保留周期

---

## 确认方式

请在回复中逐条确认、修改建议默认、或声明「按 PRD 默认执行」。父 agent 在用户确认门控通过后再进入 **设计阶段**。
