# 设计目录索引（version 0.1.20 — Skill Pack 增强）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.20` |
| 阶段 | 设计（阶段 2） |
| 上游产品 | `../product/prd.md`、`user-stories-skill-pack-intent.md`、`user-stories-skill-pack-script-run.md`、`open-questions.md` |
| 前置设计 | `iterations/0.1.19/design/`（Skill Pack 目录包 + read only） |
| 状态 | **已完成** |

---

## 本期两大 Epic

| 优先级 | 能力 | 设计文档 |
| --- | --- | --- |
| **P0-A** | 意图路由 + `alwaysLoad` + Turn 挂载/加载/未选用/读取 | `spec-skill-pack-intent-routing.md` |
| **P0-B** | `run_skill_script` 沙箱 + Turn run 展示 + 控制台「含脚本」升级 | `spec-run-skill-script.md` |

二者同一迭代交付；run 工具白名单依赖 **本轮已加载（loaded）** Pack。

---

## 文档清单

| 文件 | 说明 |
| --- | --- |
| [design-spec.md](./design-spec.md) | 总览：运行时架构、Turn 状态机、与 0.1.19 差异、代码锚点 |
| [spec-skill-pack-intent-routing.md](./spec-skill-pack-intent-routing.md) | 意图路由、`alwaysLoad` UX/API、`resolveSkillPackSelectionForTurn` |
| [spec-run-skill-script.md](./spec-run-skill-script.md) | `run_skill_script` 沙箱、配额、Turn/控制台文案 |
| [copy-chat-en-zh.md](./copy-chat-en-zh.md) | 对话 Turn `turnSafe.*` 增量（zh/en key） |
| [copy-console-en-zh.md](./copy-console-en-zh.md) | 控制台技能包/助手 i18n 增量 |

---

## 已确认决策摘要（open-questions 默认定稿）

| ID | 决策 | 设计落点 |
| --- | --- | --- |
| Q1 | 低温 LLM 意图分类器 | `skill-pack-intent-agent.ts`（对齐 KB intent） |
| Q2 | 路由失败 → `failed_safe`；不 silent 全量 merge | Turn 摘要 + 非 always 不加载 |
| Q3 | `alwaysLoad` 表字段权威；frontmatter 同步 | 控制台 Switch + 导入 |
| Q4 | 未选用 → C1b `completed` | 非 failed |
| Q5 | 未选用展示 reason，最多 5 条 | details「未选用」块 |
| Q19 | MVP 仅用 name + description | 意图输入不含 SKILL 摘要 |
| Q20 | 结构化快照 + 前端 i18n | 不存 locale 死字符串 |
| Q21 | `mounted=0` 隐藏 C1b | 对齐 MCP 无挂载隐藏 |
| Q22 | legacy `merged[]` 映射 | `localize-turn-detail.ts` |
| Q6–Q16 | 子进程沙箱、py/sh、无网络、5/turn、100/day | `spec-run-skill-script.md` |

---

## 代码锚点（0.1.19 → 0.1.20）

| 模块 | 路径 | 本期变更 |
| --- | --- | --- |
| Turn 能力 | `src/server/chat/turn-capabilities.ts` | selection 单入口；`mounted/loaded/skipped`；注册 run tool |
| Agent 构建 | `src/server/chat/langchain-agent.ts` | 传入 `userMessageText`；prompt/tools/snapshot 同源 |
| Read tool | `src/server/skill/read-skill-file-tool.ts` | 白名单 = **loaded** refs；description 去「不执行」 |
| 消息路由 | `src/app/api/chat/conversations/[conversationId]/messages/route.ts` | `skillsSafeMessage` / `skillsDetailsFromUi` 重写 |
| Turn 详情 i18n | `src/common/chat/localize-turn-detail.ts` | loaded/skipped/run legacy 映射 |
| Turn UI | `src/components/chat/ChatWorkspace.tsx` | 隐藏逻辑 + 新 safeMessage 集合 |
| 控制台 | `src/app/[locale]/console/skills/SkillsClient.tsx` | `alwaysLoad` Switch/Tag；脚本文案升级 |
| 意图分类 | **新建** `src/server/skill/skill-pack-intent-agent.ts` | 对齐 `knowledge-retrieval-intent-agent.ts` |
| Run tool | **新建** `src/server/skill/run-skill-script-tool.ts` | 沙箱 + 配额 + 审计 |
| Frontmatter | `src/server/skill/pack-frontmatter.ts` | + `alwaysLoad` 解析 |

---

## 下游交接

| 阶段 | 读取 | 重点 |
| --- | --- | --- |
| Backend 3A | 全部 design + product | API/schema、selection 状态机、`run_skill_script` 契约、迁移 |
| Backend 3B | `spec-skill-pack-intent-routing.md` §4、`spec-run-skill-script.md` §3 | 实现顺序：**路由 → run 沙箱** |
| Frontend | copy 两份 + intent spec §6、run spec §5 | Turn 展示、控制台 Switch、隐藏 C1b |

---

## 用户故事映射

| 故事 | 设计落点 |
| --- | --- |
| US-A1～A5 | `spec-skill-pack-intent-routing.md` §5 Turn |
| US-B1～B2 | `spec-skill-pack-intent-routing.md` §3 alwaysLoad |
| US-C1～C4 | `copy-chat-en-zh.md`、`design-spec.md` §4 |
| US-D1～D2 | `copy-console-en-zh.md` |
| US-E1～E9 | `spec-run-skill-script.md` |

---

## 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-19 | 初稿：意图路由 + run_skill_script 设计全套 |
| 2026-06-20 | 结项：状态已完成 |
