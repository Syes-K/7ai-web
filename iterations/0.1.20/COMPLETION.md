# 迭代结项 — version 0.1.20

## 验收门控

- [ ] 产品：范围与 [open-questions.md](./product/open-questions.md) 一致
- [ ] 设计：Turn / 控制台与 spec 一致（允许 [deviations.md](./deviations.md) 已记录偏差）
- [ ] Backend：`npm run build` 或 `npx tsc --noEmit` 通过
- [ ] Frontend：[test-checklist.md](./frontend/test-checklist.md) 核心场景走通
- [ ] 联调：至少一条 **intent 命中 + run 成功**（ui-ux-pro-max 或 greeting hello.py）

**结项签字**：用户确认本迭代可关闭后，将 [README.md](./README.md) 状态改为「已验收」。

---

## 手动确认记录（全流程）

| 时点 | 确认内容 |
| --- | --- |
| 2026-06-19 | 迭代版本 **0.1.20** |
| 2026-06-19 | 产品阶段：**「按默认执行」** — Q1–Q22 全部按建议默认关闭 |
| 2026-06-19 | 设计阶段：用户 **next** 进入 backend 3A |
| 2026-06-19 | Backend 3A：用户 **next** 进入 3B |
| 2026-06-19 | Backend 3B + Frontend：用户 **next** 进入前端并完成 |
| 2026-06-20 | 联调：**意图超时 1.5s → 15s**（解决 `failed_safe` / timeout） |
| 2026-06-20 | 联调：**沙箱复制整个 scripts/**（ui-ux-pro-max search.py 成功 exit 0） |
| 2026-06-20 | **Skills 用户级 vs 系统级**：**下期由产品自行确认**，本期不改动 |

---

## 核心验收场景（建议走查）

### A. 按需加载（greeting-test-skill）

| 输入 | Turn 期望 |
| --- | --- |
| 「天津天气」 | 已挂载，**未选用** |
| 「请用技能包测试打个招呼」 | **已加载 1**；read 可选 |
| alwaysLoad + 无关问题 | 仍在 **已加载** |

### B. 脚本 run（greeting / ui-ux-pro-max）

| 输入 | Turn 期望 |
| --- | --- |
| 「运行 scripts/hello.py」 | ran 1；exit 0 |
| 「黑科技 UI 风格建议」（ui-ux-pro-max 挂载） | loaded 1；ran search.py exit 0 |

### C. 意图失败（历史问题，已缓解）

| 条件 | 旧行为 | 现行为（15s 超时） |
| --- | --- | --- |
| 主模型 intent ~1.5s+ | `failed_safe` / timeout | 通常 `intent_agent` + loaded |

### D. 控制台

- alwaysLoad Switch / Tag
- 「含脚本」→ 沙箱文案
- 助手挂载 extra 含「按需加载」

---

## 环境变量（部署备忘）

| 变量 | 默认（本期代码） | 说明 |
| --- | --- | --- |
| `SKILL_PACK_INTENT_TIMEOUT_MS` | **15000** | 意图路由超时（PRD 原 1500，联调后调整） |
| `SKILL_SCRIPT_DEFAULT_TIMEOUT_MS` | 30000 | 单次脚本 |
| `SKILL_SCRIPT_MAX_RUNS_PER_TURN` | 5 | |
| `SKILL_SCRIPT_MAX_RUNS_PER_USER_DAY` | 100 | |
| `PYTHON_PATH` | python3 | run .py |

见 `.env.example` 与 [backend/implementation-notes.md](./backend/implementation-notes.md)。

---

## 移交下期（0.1.21+ 候选）

| 主题 | 说明 | 优先级建议 |
| --- | --- | --- |
| **Skills 治理模型** | 用户级 vs 系统级 / 混合目录；run 权限 | 产品定 |
| **Intent 失败 UX** | Turn 详情展示 timeout / parse 原因 | P2 |
| **Intent 快模型** | 意图专用 mini 模型，降低延迟与超时 | P2 |
| **沙箱加固** | 容器 / 硬无网络 | P2 |
| **ui-ux-pro-max frontmatter** | 导入后 description 为空影响分类 | P3 |
| **审计 UI** | `skill_script_runs` 控制台 | P3 |

---

## 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-20 | 结项清单与确认记录 |
