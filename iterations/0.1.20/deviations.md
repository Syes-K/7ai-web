# 跨阶段偏差汇总 — version 0.1.20

相对 **产品 PRD / 设计 spec / backend 3A** 的实现与联调差异。前端专项见 [frontend/deviations.md](./frontend/deviations.md)。

---

## 1. 联调后代码调整（2026-06-20）

| 项 | 原设计 / PRD | 实际实现 | 原因 |
| --- | --- | --- | --- |
| **意图路由超时** | 1500ms；P95 ≤ 1.5s | 默认 **15000ms**（`SKILL_PACK_INTENT_TIMEOUT_MS`） | 联调：主对话模型 intent 常 >1.5s → `failed_safe` / timeout；日志 `ms:1540, error:timeout` |
| **沙箱 scripts 注入** | 3A：仅目标脚本写入 `scripts/{basename}` | 复制 Pack 内 **全部 `scripts/**`** + 保留路径 | `ui-ux-pro-max/search.py` 依赖 `core.py`；单文件导致 ImportError |
| **Q12 cwd 表述** | 文档写 cwd=沙箱根或 workspace | **cwd = `workspace/`**；`data/`、`scripts/` 在沙箱根 | 与 `init.py` / `core.py` 路径约定一致 |

---

## 2. 前端（摘自 frontend/deviations.md）

| 项 | 偏差 |
| --- | --- |
| 列表 optional secondary「沙箱」Tag | 未实现 |
| Help body 加粗 | 纯文本 |
| `enabled` vs `alwaysLoad` | enabled 仍保存按钮；alwaysLoad 即时 PATCH |

---

## 3. 文档 / 夹具（非代码）

| 项 | 说明 |
| --- | --- |
| 新增夹具 | `fixtures/multi-script-loop-test-skill`、`script-error-test-skill`（PRD 未列，联调补充） |
| `greeting-test-skill.zip` | SKILL.md 已更新 run 说明；zip **未强制重打**（可文件夹导入） |
| `.env.example` | 补充 `SKILL_PACK_INTENT_TIMEOUT_MS=15000` |

---

## 4. 有意不变（产品已确认）

| 项 | 决策 |
| --- | --- |
| Skills **用户级** 私有 | 0.1.19 延续；系统级目录讨论 **defer 下期** |
| Q19 | MVP 意图不含 SKILL 正文摘要 |
| Q21 | mounted=0 隐藏 C1b |
| failed_safe | 不 silent 全量 merge |

---

## 5. 仍存在的已知限制

- 子进程沙箱；网络隔离 best-effort
- KB intent **无**硬超时，Skill intent **有**（行为不一致）
- Turn UI 不展示 intent 失败原因（仅 log）
- 配额拒绝不计入 `scriptRunCount`（符合 Q15 对 spawn 的定义）

---

## 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-20 | 结项汇总：超时、沙箱 scripts、前端偏差 |
