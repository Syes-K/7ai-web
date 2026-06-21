# 迭代结项 — version 0.1.21

## 验收门控

- [x] 产品：范围与 [product/open-questions.md](./product/open-questions.md) 一致
- [x] 设计：Admin Skills / 控制台退场 / Turn i18n 与 spec 一致（允许 [deviations.md](./deviations.md)）
- [x] Backend：`npx tsc --noEmit` 通过
- [x] Frontend：[frontend/test-checklist.md](./frontend/test-checklist.md) 核心场景走通
- [x] 联调：Admin 导入 Pack → 助手挂载 → 对话 loaded/run 回归（0.1.20 场景 B）

**结项签字**：**已验收**（2026-06-21 用户确认）。

---

## 手动确认记录（全流程）

| 时点 | 确认内容 |
| --- | --- |
| 2026-06-20 | 迭代版本 **0.1.21** |
| 2026-06-20 | 产品：Q1/Q2/Q8/Q10/Q16 逐条确认；其余按建议默认 |
| 2026-06-20 | 设计阶段：用户 **进入设计阶段** |
| 2026-06-20 | Backend 3A：用户 **next** |
| 2026-06-20 | Backend 3B + Frontend：用户 **进入阶段 4** |
| 2026-06-21 | 联调：**skill-catalog 缺 `enabled` 导致多选不可选** — 前端 `enabled ?? true` |
| 2026-06-21 | 联调：**`getDataSource` 并发初始化** — `initPromise` 单例锁 |
| 2026-06-21 | 联调：**发送失败无提示** — `failSend` + Toast + 恢复草稿 |
| 2026-06-21 | 产品微调：**移除**「部分已挂载的技能包已停用」Alert |
| 2026-06-21 | **结项验收**：用户确认 **已验收**，迭代关闭 |

---

## 交付摘要

### P0 — 已实现

| 主题 | 要点 |
| --- | --- |
| **治理** | 删除 `UserSkillConfig.userId`；迁移 `0.1.21-system-skill-packs.ts`；name 全局 UNIQUE |
| **Admin API** | `/api/admin/skill-configs`（GET/DELETE/import/files 只读） |
| **Catalog** | `GET /api/console/skill-catalog`（enabled only） |
| **Console 废弃** | `/api/console/skill-configs/**` → 410 |
| **Admin UI** | `/admin/skills`；只读 Drawer；零保存 |
| **控制台** | 侧栏移除 skills；`/console/skills` admin 302 / 用户 404 |
| **助手挂载** | catalog 多选；admin 可见「管理技能包」链 |
| **Turn i18n** | `reasonCode` + `safeMessageKey` + `localize-turn-detail` 扩展 |

### P1 — 已实现

| 主题 | 要点 |
| --- | --- |
| **description 回退** | import 时 frontmatter 空 → SKILL.md 首段 / 文件夹名 |
| **failed_safe 详情** | `skillsIntentFailedBody` i18n |
| **Admin 助手技能多选** | UI 就绪（binding API 见偏差） |

### Out — 未做（与 PRD 一致）

Intent 快模型、沙箱容器化、`skill_script_runs` 审计 UI

---

## 核心验收场景

### A. Admin Skills

| 步骤 | 期望 |
| --- | --- |
| Admin 导入 zip | 列表出现；frontmatter 同步 name/desc/enabled/alwaysLoad |
| 只读详情 | 无 Save/Switch；文件树可预览 |
| 重新导入 | id 不变；文件更新 |
| 删除已挂载 Pack | 409 + 引用助手名 |

### B. 控制台与助手

| 步骤 | 期望 |
| --- | --- |
| 普通用户侧栏 | 无「技能包」 |
| 助手技能多选 | **可选中** catalog 项；保存 binding |
| admin 用户 | 见「管理技能包」→ `/admin/skills` |

### C. 对话回归（0.1.20）

| 步骤 | 期望 |
| --- | --- |
| 挂载系统 Pack + 相关问题 | C1b loaded；read/run 可用 |
| 英文 UI 历史 Turn | 摘要/详情本地化（#17） |
| skip reason | i18n（非 LLM 中文原文） |

### D. 联调修复（本期补丁）

| 场景 | 期望 |
| --- | --- |
| 服务未启动 / 断网发送 | 顶部 Toast「网络异常，请重试」；草稿恢复；无假「已发送」气泡 |
| `npm start` 并发首请求 | 无 `prepare` undefined 崩溃 |

---

## 环境变量（无新增必填）

沿用 0.1.20；新增常量 `SKILL_PACK_MAX_SYSTEM=200`（代码内，非 env）。

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `SKILL_PACK_INTENT_TIMEOUT_MS` | 15000 | 意图路由 |
| `SKILL_SCRIPT_*` | 见 `.env.example` | 脚本沙箱 |

---

## 移交下期（0.1.22+ 候选）

| 主题 | 说明 | 优先级 |
| --- | --- | --- |
| **Admin 系统助手 skill binding API** | `PUT /api/admin/assistants/:id/skill-configs` | P1 |
| **console/skills 死代码清理** | 删除 `SkillsClient` 等遗留 | P3 |
| **Intent 快模型** | 降低 intent 延迟 | P2 |
| **沙箱加固** | 容器 / 硬无网络 | P2 |
| **审计 UI** | `skill_script_runs` | P3 |

---

## 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-21 | 结项清单、联调修复、移交项 |
| 2026-06-21 | 用户验收通过 |
