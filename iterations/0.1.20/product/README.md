# 产品目录索引（version 0.1.20 — Skill Pack 增强）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.20` |
| 阶段 | 需求（阶段 1）✅ |
| 前置 | `0.1.19` Skill Pack（目录包 + read_skill_file；scripts 只读） |
| 状态 | **已完成**（产品确认「按默认执行」2026-06-19） |

---

## 本期两大能力

| 优先级 | 能力 | 动机 |
| --- | --- | --- |
| **P0-A** | **按需加载** + Turn 挂载/加载/读取 + `alwaysLoad` | 0.1.19 联调：天气问句误显示「已合并」 |
| **P0-B** | **`run_skill_script`** 沙箱执行 `scripts/` | 0.1.19 路线图承诺；ui-ux-pro-max 类 Pack 可跑通 |

二者 **同一迭代** 交付；run 工具白名单与 **本轮已加载（loaded）** Pack 绑定。Backend 顺序：**意图路由 → run 沙箱**。

---

## 术语速查

| 用户向 | 含义 |
| --- | --- |
| 挂载 | 助手上配置的 Pack（每轮存在） |
| 加载 / 选用 | 本轮合并 SKILL.md 进 prompt |
| 未选用 | 挂载了但本轮不加载 |
| 读取 | `read_skill_file` 成功次数 |
| 运行 | `run_skill_script` 次数 |

详见 [prd.md §3](./prd.md)。

---

## 文档清单

| 文件 | 说明 |
| --- | --- |
| [prd.md](./prd.md) | 总 PRD：路由 + 沙箱 + Turn + 代码衔接 |
| [user-stories-skill-pack-intent.md](./user-stories-skill-pack-intent.md) | 按需加载、alwaysLoad、Turn 文案 |
| [user-stories-skill-pack-script-run.md](./user-stories-skill-pack-script-run.md) | run_skill_script、沙箱、控制台 |
| [open-questions.md](./open-questions.md) | 未决项与建议默认 |

---

## 下游交接要点

### 设计（阶段 2）

- Turn C1b 状态机：`mounted` / `loaded` / `skipped` / read / run 组合
- Pack 详情「始终加载」Switch + 列表 Tag
- 「含脚本」Tag / Help：只读 → 沙箱可运行
- 历史 Turn（仅 `merged[]`）降级展示
- C1b 在 mounted=0 时是否隐藏（**Q21**）

### Backend 3A（仅文档）

- `skill-pack-intent-agent.ts`：输入/输出 JSON、失败策略
- `resolveSkillPackSelectionForTurn(ctx, userMessageText)` 单入口
- `run-skill-script-tool.ts`：参数、配额、审计表 `skill_script_runs`
- `SkillsTurnUiSnapshot` 字段演进；i18n key 清单
- `user_skill_configs.alwaysLoad` 迁移

### Backend 3B（代码）

- `turn-capabilities.ts`：selection 替代全量 merge；注册 run tool
- `langchain-agent.ts`：传入 userMessageText，prompt/tools/snapshot 同源
- `read-skill-file-tool.ts`：白名单改为 loaded
- `messages/route.ts`：`skillsSafeMessage` 分支（未挂载 vs 未选用）
- `messages/*/api/message.json`：新 turnSafe keys

### Frontend

- Turn 展示 loaded/skipped/run；`localize-turn-detail.ts` legacy 映射
- Pack 详情 alwaysLoad Switch；列表 Tag
- 控制台 / 助手 copy 更新

### 关键代码锚点（0.1.19 现状）

| 文件 | 现状问题 |
| --- | --- |
| `turn-capabilities.ts` | 全量 merge；`merged` 字段 |
| `messages/route.ts` L187–198 | loaded=0 误用 `skillsNotMounted` |
| `read-skill-file-tool.ts` | 白名单 = 全部 mounted |
| `langchain-agent.ts` L77–80 | prompt 与 snapshot 各自 load，缺 selection |

---

## 开放问题

**已全部关闭**（2026-06-19 用户回复「按默认执行」）。定稿见 [open-questions.md §已拍板](./open-questions.md#已拍板closed) 与各表建议默认。

---

## 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-19 | 初稿 |
| 2026-06-19 | 审阅：术语、代码锚点、下游清单、P0-A/B |
| 2026-06-20 | 结项：状态已完成；开放问题已关闭 |
