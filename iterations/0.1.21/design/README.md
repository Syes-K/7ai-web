# 设计产出索引（version 0.1.21）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.21` |
| 阶段 | 设计（阶段 2）— **已验收**（2026-06-21） |
| 上游 | `iterations/0.1.21/product/`（PRD + 用户故事 + open-questions） |
| 风格基线 | `iterations/0.1.17/design/`（admin i18n）、`iterations/0.1.20/design/`（Skills Turn / console） |

---

## 文档清单

| 文件 | 用途 | 主要读者 |
| --- | --- | --- |
| [design-spec.md](./design-spec.md) | 总设计：信息架构、线框、状态矩阵、交互流、与 PRD 对应 | backend / frontend / 产品 |
| [spec-admin-skills.md](./spec-admin-skills.md) | Admin Skills 列表 / 只读详情 / 导入 / 删除 | frontend、backend 3A |
| [spec-console-skills-retirement.md](./spec-console-skills-retirement.md) | 控制台退场、助手挂载改系统库 | frontend、backend 3A |
| [spec-chat-turn-i18n.md](./spec-chat-turn-i18n.md) | Turn i18n、reasonCode、legacy 映射、safeMessage 结构化 | frontend、backend 3A |
| [copy-admin-en-zh.md](./copy-admin-en-zh.md) | `page.admin.skills` + shell 菜单 + console→admin key 映射 | frontend |
| [copy-chat-en-zh.md](./copy-chat-en-zh.md) | chat/turn 新增与变更文案 | frontend、backend |

---

## 已确认产品决策（设计定稿）

| ID | 决策 | 设计落点 |
| --- | --- | --- |
| Q1 | 仅系统技能库 | 无用户级 Pack CRUD |
| Q2 | 删除 `userId`；name 全局唯一 | `spec-admin-skills` §8 |
| Q8 | 只读预览 + 重新导入 | `PackDetailDrawer` 只读改造 |
| Q10 | 零保存；元数据导入同步 only | 详情无 Switch / 无保存按钮 |
| Q16 | skip reason → `reasonCode` + i18n | `spec-chat-turn-i18n` §4 |
| Q3–Q7, Q9, Q11–Q15, Q17–Q27 | 按 open-questions「建议默认」 | 各 spec 正文 |

---

## 实施顺序建议（供 backend / frontend）

1. 数据迁移 + `/api/admin/skill-configs` + `/api/console/skill-catalog`
2. Admin Skills 页（迁移组件 + 只读改造）
3. 控制台退场 + 助手挂载改 catalog
4. Turn i18n（可与 1 并行；reasonCode 依赖 backend 快照字段）

---

## 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-21 | 结项：design README 状态 |
