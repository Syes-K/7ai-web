# iterations/0.1.19/product

本目录为版本 **0.1.19** 的产品需求产出（阶段 1）：**Skill Pack 目录包（替换 0.1.18 单正文 Skills）**。

| 文件 | 说明 |
| --- | --- |
| `prd.md` | 主 PRD：背景、与 0.1.18 差异表、Goals/Non-Goals、数据模型、运行时、控制台、迁移、验收 |
| `user-stories-skill-pack.md` | 用户故事与分项 AC（Epic A–E） |
| `open-questions.md` | 待确认项（包大小、扩展名、tool 命名等）与已拍板决策 |

---

## 需求摘要（6 条）

1. **Skill 形态升级为目录包**：`SKILL.md`（frontmatter + 正文）+ 可选多文件（`reference.md`、`scripts/`、`data/` 等），结构兼容 `.cursor/skills/<name>/`。
2. **直接替换 0.1.18**：废弃单字段 `content` 与单 TextArea 编辑；**不长期并存**两种类型。
3. **控制台**：文件树 UI、多文件编辑、zip/文件夹导入；列表仍走 `/console/skills`（文案改为技能包语义）。
4. **运行时**：`SKILL.md` 正文合并 system prompt；新增 **`read_skill_file`** LangChain Tool 按需读包内文件；**`scripts/` MVP 仅可读、不执行**。
5. **挂载链不变**：Pack → **助手** `AssistantSkillBinding` → 会话 `assistantId` → chat Turn（**非**会话直挂）。
6. **迁移**：默认一次性将 0.1.18 `content` 转为 `SKILL.md` 文件；0.1.20 预告服务端沙箱 `run_skill_script`。

---

## 与 0.1.18 的核心变化

| 0.1.18 | 0.1.19 |
| --- | --- |
| 一条记录一段 Markdown | 一个 Pack 多条 `SkillPackFile` |
| 仅 system prompt 追加 | system prompt + **`read_skill_file` tool** |
| 无导入 | zip / 文件夹导入 |
| 无 scripts 概念 | scripts **存储+可读，不执行** |

---

## 参考路径

| 参考 | 路径 |
| --- | --- |
| 被替换 PRD | `iterations/0.1.18/product/prd.md` |
| 0.1.18 数据模型 | `iterations/0.1.18/backend/data-models.md` |
| Cursor Skill 示例 | `.cursor/skills/ui-ux-pro-max/` |
| Turn 能力入口 | `src/server/chat/turn-capabilities.ts` |
| Agent 编排 | `src/server/chat/langchain-agent.ts` |
| Turn 管道 | `iterations/0.1.7/design/spec-chat-turn-pipeline.md` |

---

## 开放问题速览

详见 `open-questions.md`。优先确认：

- Q1 包大小上限
- Q2 允许扩展名
- Q4 `read_skill_file` 命名
- Q8 自动迁移冲突策略
- Q10 路由是否保留 `/console/skills`

---

阶段结束说明：以上内容供产品与研发评审；**下一阶段（设计）由父 agent 在用户确认门控后调度**。
