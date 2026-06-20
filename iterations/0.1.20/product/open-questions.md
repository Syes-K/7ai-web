# 开放问题（version 0.1.20 — Skill Pack 增强）

定稿状态：**已关闭**（2026-06-19「按默认执行」）。每项「建议默认」= 最终决策。

---

## A. 按需加载

| ID | 问题 | 建议默认 | 影响 |
| --- | --- | --- | --- |
| **Q1** | 意图路由实现？ | **低温 LLM 分类器**（新建 `skill-pack-intent-agent.ts`，对齐 `knowledge-retrieval-intent-agent.ts`） | 延迟、可维护性 |
| **Q2** | 路由失败时？ | **不加载** 非 `alwaysLoad` 包；Turn 摘要「技能包选用暂不可用」；`intentSource=failed_safe`；**不做** silent 全量加载 | 可用性 vs 误注入 |
| **Q3** | `alwaysLoad` 存储与 frontmatter？ | **表字段** `user_skill_configs.alwaysLoad` 为权威；保存/导入 `SKILL.md` 时 frontmatter `alwaysLoad` **同步至表**（与 0.1.19 name/description 策略一致）；元数据 Switch 修改 **写表**，不要求用户改 SKILL.md | 迁移、UX |
| **Q4** | Turn「未选用」步骤状态？ | C1b **`completed`** + 摘要「已挂载 N 个，本轮未选用」（非 failed） | UI 语义 |
| **Q5** | 未选用是否展示原因？ | **是**；details「未选用」块含简短 reason，最多 **5** 条 | details 密度 |
| **Q19** | 意图分类器输入是否含 SKILL.md 摘要？ | **MVP 否**：仅用 `name` + `description`（表字段，description 截断 ≤400 字）；P1 可选增加正文首段摘要 | 准确率 vs token/延迟 |

---

## B. 脚本沙箱（run_skill_script）

| ID | 问题 | 建议默认 | 影响 |
| --- | --- | --- | --- |
| **Q6** | 沙箱技术？ | **子进程 + 资源限制**（MVP）；容器 / isolate 后续升级 | 安全、运维 |
| **Q7** | 支持语言？ | **Python 3**（`.py`）+ **bash**（`.sh`） | 实现范围 |
| **Q8** | 网络？ | **默认禁止出站**；本期 **不可** 配置放行 | 安全 |
| **Q9** | 单次 timeout？ | 默认 **30s**，硬上限 **120s**；tool 参数 `timeoutMs` 不得超过上限 | UX |
| **Q10** | 每 Turn run 次数？ | **5 次** / Turn / 用户 | 滥用 |
| **Q11** | 每用户日限额？ | **100 次** / 天（环境变量可覆盖，如 `SKILL_SCRIPT_MAX_RUNS_PER_USER_DAY`） | 成本 |
| **Q12** | 工作目录与文件可见性？ | 临时目录；进程 **cwd** 限定为该 Pack 沙箱根；脚本可读 **同 Pack** 内 `data/` 等只读挂载（只读 bind），**不可** 读其它 Pack 或系统路径 | 数据隔离 |
| **Q13** | args 传递？ | 支持 `args[]` 字符串数组；shell 转义由实现负责（防注入） | 安全 |
| **Q14** | 审计保留？ | 表 `skill_script_runs`；保留 **90 天** | 合规、存储 |
| **Q15** | run 失败是否计入 Turn？ | **是**；计入 `scriptRunCount`；details 标 `exitCode` | 可观测 |
| **Q16** | 未加载 Pack 可 run？ | **否**；白名单 = 本轮 **loaded** Pack（与 read 一致） | Epic A/E 联动 |

---

## C. Turn 与 i18n

| ID | 问题 | 建议默认 | 影响 |
| --- | --- | --- | --- |
| **Q20** | Turn 快照存 locale 字符串还是结构化？ | **结构化**（mounted/loaded/skipped/counts/samples）；`safeMessage` 由前端或 SSE 组装时 **按 UI locale** 查 i18n | 历史消息语言切换 |
| **Q21** | mounted=0 时 C1b 是否隐藏？ | **隐藏**（对齐 MCP 无配置隐藏）；`loadFailed` 或 `assistantMissing` 时 **展示** | UI 噪音 |
| **Q22** | 0.1.19 历史 Turn 兼容？ | 仅有 `merged[]` 时：`loaded := merged`，`mounted := merged`，摘要用 legacy key 映射（`localize-turn-detail.ts`） | 历史会话 |

---

## D. 排期与范围

| ID | 问题 | 建议默认 |
| --- | --- | --- |
| **Q17** | 与 run_script 同迭代？ | **是** — 0.1.20 一并交付（已确认） |
| **Q18** | 实施顺序？ | Backend：**意图路由 → run 沙箱**；前端 Turn/控制台文案可与 P0-A 并行 |

---

## 已拍板（Closed）

| 项 | 决策 |
| --- | --- |
| 0.1.20 范围 | 按需加载 + Turn 多态 + **`run_skill_script`** |
| 脚本路径 | 仅 `scripts/` 前缀 |
| 术语 | **挂载 mounted** / **加载 loaded** / **读取 read** / **运行 run** |
| 0.1.19 read | 保留；白名单改为 **loaded** Pack |
| 控制台「含脚本」 | 从「只读不执行」改为「沙箱可运行」说明 |
| MVP「已使用」 | 以 loaded + read + run 为准，不判模型遵循度 |
| 路由失败 | **不** silent 回退全量 merge（见 Q2 建议默认） |
| **产品确认** | **2026-06-19「按默认执行」** — Q1–Q22 全部按建议默认实施 |

---

## 确认记录

**2026-06-19**：用户回复 **「按默认执行」**，Q1–Q22 均按上表「建议默认」关闭。结项见 [../COMPLETION.md](../COMPLETION.md)。

---

## 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-20 | 标记 Q1–Q22 已确认关闭 |
