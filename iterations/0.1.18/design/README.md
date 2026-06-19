# 设计目录索引（version 0.1.18 — Skills）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.18` |
| 阶段 | 设计（阶段 2） |
| 上游产品 | `../product/prd.md`、`user-stories-skills.md`、`open-questions.md` |
| 状态 | 待用户确认后进入 backend 3A |

---

## 文档清单

| 文件 | 说明 |
| --- | --- |
| [design-spec.md](./design-spec.md) | 总览：IA、壳体衔接、Skills vs MCP 差异、全局状态 |
| [spec-skills-console.md](./spec-skills-console.md) | `/console/skills` 列表与 Modal CRUD |
| [spec-assistant-skill-bindings.md](./spec-assistant-skill-bindings.md) | 助手 Modal Skills 多选挂载 |
| [spec-chat-agent-skills.md](./spec-chat-agent-skills.md) | 运行时加载、prompt 合并、`skills_resolution` Turn 步 |
| [copy-console-en-zh.md](./copy-console-en-zh.md) | Console + 助手挂载 i18n key 草案 |
| [copy-chat-en-zh.md](./copy-chat-en-zh.md) | Turn 步 `turnSafe.*` 与 chat 标签增量 |

---

## 已确认产品决策摘要

- 仅用户自建；API `/api/console/skill-configs`
- Markdown 原样合并 + 服务端 `## Skill: {name}` 块
- 排序：`skillConfigId` 字典序；上限 50/10/10/16000
- 删除被引用 → 409；禁用 Skill → 警告不阻断保存
- Turn MVP 含 `skills_resolution`（stepKey `C1b`）；单条 skip 仅 log

---

## 下游交接

| 阶段 | 读取本目录 | 重点 |
| --- | --- | --- |
| Backend 3A | 全部 | 实体、API、ErrorCode、`turnSafe` key、合并逻辑 |
| Backend 3B | `spec-chat-agent-skills.md` | `turn-capabilities.ts` 实现 |
| Frontend | `spec-skills-console.md`、`spec-assistant-skill-bindings.md`、copy 文件 | ProTable/Modal、AssistantsClient 扩展 |

---

## 参考设计

- MCP 模式：`iterations/0.1.9/design/`
- Console i18n：`iterations/0.1.16/design/`
