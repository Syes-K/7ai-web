# 设计目录索引（version 0.1.19 — Skill Pack）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.19` |
| 阶段 | 设计（阶段 2） |
| 上游产品 | `../product/prd.md`、`user-stories-skill-pack.md`、`open-questions.md` |
| 替换 | `iterations/0.1.18/design/` 单正文 Skills 方案 |
| 状态 | 待用户确认后进入 backend 3A |

---

## 文档清单

| 文件 | 说明 |
| --- | --- |
| [design-spec.md](./design-spec.md) | 总览：IA、与 0.1.18 差异、运行时 read tool、scripts 不执行 |
| [spec-skill-pack-console.md](./spec-skill-pack-console.md) | 文件树 UI、多文件编辑、zip 导入、scripts 警告 |
| [spec-assistant-skill-bindings.md](./spec-assistant-skill-bindings.md) | 助手 Pack 挂载（相对 0.1.18 增量） |
| [spec-chat-agent-skill-pack.md](./spec-chat-agent-skill-pack.md) | read_skill_file、SKILL.md 解析、Turn 步、与 MCP 合并 |
| [spec-migration-0.1.18.md](./spec-migration-0.1.18.md) | content → SKILL.md 迁移 UX 与脚本说明 |
| [copy-console-en-zh.md](./copy-console-en-zh.md) | Console + 助手 i18n 增量 |
| [copy-chat-en-zh.md](./copy-chat-en-zh.md) | Turn read 相关文案（Q13） |

---

## 已确认决策摘要

- **目录包** 替换单 `content`；`SKILL.md` 必填 + frontmatter
- 路由保留 `/console/skills`、`/api/console/skill-configs`；表名沿用 + `skill_pack_files`
- 运行时：`SKILL.md` → prompt + **`read_skill_file`**；**无**脚本执行
- 配额：2MB / 512KB / 100 文件；文本扩展名白名单
- Turn MVP 展示 **read 文件次数**（Q13）
- 迁移：自动 content → SKILL.md；首次登录 Banner

---

## 下游交接

| 阶段 | 读取 | 重点 |
| --- | --- | --- |
| Backend 3A | 全部 | `SkillPackFile` 实体、files/import API、read tool、迁移脚本 |
| Backend 3B | `spec-chat-agent-skill-pack.md` | `turn-capabilities.ts`、`resolveAllToolsForAgent` |
| Frontend | `spec-skill-pack-console.md`、`spec-assistant-skill-bindings.md`、copy | Drawer 分栏、Tree、Upload、AssistantsClient 文案 |

---

## 参考

| 参考 | 路径 |
| --- | --- |
| 0.1.18 设计 | `iterations/0.1.18/design/` |
| MCP 控制台模式 | `iterations/0.1.9/design/spec-mcp-console.md` |
| Cursor Skill 示例 | `.cursor/skills/ui-ux-pro-max/` |
| 现有 Skills 页 | `src/app/[locale]/console/skills/SkillsClient.tsx` |
