# 产品目录索引（version 0.1.21 — Skills 治理与体验优化）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.21` |
| 阶段 | 需求（阶段 1） |
| 前置 | `0.1.20` Skill Pack 增强（按需加载 + run_skill_script + Turn 多态） |
| 状态 | **已验收**（2026-06-21） |

---

## 本期四大目标

| 优先级 | 主题 | 动机 |
| --- | --- | --- |
| **P0-A** | **Skills 迁管理后台** | 技能包属系统资产，仅管理员配置；对齐 `/admin/assistants`、`/admin/models` |
| **P0-B** | **导入为主、零保存** | 只读详情；元数据导入同步；无在线编辑/无 Switch |
| **P0-C** | **对话 Turn i18n 补齐** | 0.1.20 测试 #17 + 联调遗留：历史 Turn 语言切换、硬编码文案 |
| **P1** | **治理模型定稿** | 0.1.20 结项「用户级 vs 系统级」移交；迁 admin 须一并落地 |
| **P2** | **0.1.20 移交项（部分）** | Intent 失败 UX、frontmatter description；其余排期外 |

---

## 术语速查（沿用 0.1.20）

| 用户向 | 含义 |
| --- | --- |
| 挂载 | 助手上配置的 Pack（每轮存在） |
| 加载 / 选用 | 本轮合并 SKILL.md 进 prompt |
| 未选用 | 挂载了但本轮不加载 |
| 读取 | `read_skill_file` 成功次数 |
| 运行 | `run_skill_script` 次数 |

---

## 文档清单

| 文件 | 说明 |
| --- | --- |
| [prd.md](./prd.md) | 总 PRD：范围 In/Out、用户故事索引、验收标准、移交项排期 |
| [user-stories-admin-skills-migration.md](./user-stories-admin-skills-migration.md) | 控制台 → 管理后台迁移、权限、数据模型、助手挂载 |
| [user-stories-skills-import-only.md](./user-stories-skills-import-only.md) | 导入为主 UX、只读预览、移除在线编辑 |
| [user-stories-chat-i18n.md](./user-stories-chat-i18n.md) | Turn / Chat 未国际化文案审计与补齐 |
| [open-questions.md](./open-questions.md) | 开放问题 + 建议默认（供「按默认执行」或逐条确认） |

---

## 下游交接要点（设计阶段 2）

| 域 | 待设计项 |
| --- | --- |
| Admin Skills 页 | 列表 / 导入 / 只读详情 / 删除；菜单 icon 与排序（建议紧邻 assistants） |
| 导入覆盖流 | 警告文案；frontmatter 同步 name/desc/enabled/alwaysLoad |
| 控制台退场 | `/console/skills` 404 或重定向；助手页挂载下拉数据源改为系统库 |
| Turn i18n | `localize-turn-detail` 扩展；**reasonCode + i18n**（Q16） |
| 空状态 | 系统库无 Pack 时助手挂载区 copy |

---

## 关键代码锚点（0.1.20 现状）

| 文件 | 现状 |
| --- | --- |
| `src/app/[locale]/console/skills/` | 用户级 CRUD + PackDetailDrawer 多保存 |
| `src/app/[locale]/admin/admin-menu.tsx` | 无 skills 菜单项 |
| `src/app/api/console/skill-configs/` | 用户 API；须迁或镜像 admin API |
| `UserSkillConfig` | 含 `userId` 用户私有；**删除 userId**，演进为全局系统 Pack |
| `console-menu.tsx` L46 | 控制台侧栏含 skills 入口 |
| `PackDetailDrawer.tsx` | 元数据保存 + 单文件保存 + 新建/重命名/删除 |
| `ChatWorkspace.tsx` L56–73 | 硬编码中英 Turn safeMessage 集合 |
| `skill-pack-intent-agent.ts` L87–95 | skip reason 由 LLM 输出中文，英文 UI 未本地化 |

---

## 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-20 | 用户确认 Q1/Q2/Q8/Q10/Q16 |
| 2026-06-21 | 结项：Q3–Q27 按默认关闭 |
