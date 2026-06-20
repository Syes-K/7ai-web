# 用户故事：Skill Pack 按需加载（version 0.1.20）

Epic 映射 `prd.md` §5～§6。验收标准可测、可演示。

**术语**：**挂载** = 助手配置；**加载** = 本轮合并 SKILL.md；**未选用** = 挂载但未加载。

---

## Epic A — 意图路由

### US-A1 无关问题不加载技能包

**作为** 挂载了「问候测试包」的用户  
**当** 我问「天津今天天气怎么样」  
**期望** 本轮 **不** 将问候包的 SKILL.md 合并进模型输入  
**且** Turn 显示 **「已挂载 1 个，本轮未选用」**（非「已加载」）

**AC**

- [ ] 回复不包含 `[Skill Pack 测试]` 等包内强制模板（除非模型自发）
- [ ] Turn C1b 摘要不出现「已加载 N 个」当 loaded=0
- [ ] `read_skill_file` 不可访问未加载 Pack（tool 返回 pack 不在白名单）
- [ ] Turn details「未选用」含问候测试包名称（可选含 reason）

---

### US-A2 相关问题加载对应包

**作为** 挂载问候测试包的用户  
**当** 我说「请用技能包测试打个招呼，用中文」  
**期望** 问候包被 **选用并加载**  
**且** Turn 显示 **「已加载 1 个技能包」**；若 read 则带读取次数

**AC**

- [ ] 包名出现在 Turn 详情「本轮已加载」
- [ ] Agent 可 read `data/greetings.md`（仅限已加载 Pack）
- [ ] 回复含 `[Skill Pack 测试]` 且问候来自 greetings.md（夹具行为）

---

### US-A3 多包挂载 selective

**作为** 同时挂载「问候测试包」和「UI 设计包」（或第二测试包）的用户  
**当** 我只问 UI 相关问题  
**期望** 仅 UI 相关 Pack 被加载；问候包在「未选用」

**AC**

- [ ] Turn details 同时含「本轮已加载」与「未选用」块
- [ ] 未选用包名称正确；loaded + skipped 并集 = mounted

---

### US-A4 路由失败安全行为

**作为** 平台  
**当** 意图分类调用失败（超时/非法 JSON）  
**期望** 非 `alwaysLoad` 包 **不加载**；Turn 摘要「技能包选用暂不可用」（见 open-questions **Q2**）

**AC**

- [ ] 结构化 log：`intentSource=failed_safe`
- [ ] Turn 文案与 Q2 策略一致；**不** silent 全量 merge
- [ ] `alwaysLoad` 包仍加载（若有）

---

### US-A5 区分「未挂载」与「已挂载未选用」

**作为** 用户  
**期望** Turn **不** 在「已挂载但未选用」时显示「助手未挂载技能包」

**AC**

- [ ] mounted>0, loaded=0 → 摘要 **不是** `skillsNotMounted`
- [ ] mounted=0 → 摘要为「未挂载」或隐藏步骤（见 **Q21**）
- [ ] 修复 0.1.19 bug：`skillsSafeMessage` 在 merged=0 时一律 `skillsNotMounted`

---

## Epic B — 始终加载

### US-B1 Pack 标记始终加载

**作为** 用户  
**当** 我在 Pack 详情开启 **「始终加载」**  
**期望** 每轮对话都合并该 Pack 的 SKILL.md，即使用户问题无关

**AC**

- [ ] PATCH/保存持久化 `alwaysLoad=true`
- [ ] 列表或详情有 Tag「始终加载」
- [ ] 问「天津天气」时该 Pack 仍在「已加载」列表

---

### US-B2 导入与 frontmatter

**作为** 用户  
**当** zip 内 SKILL.md frontmatter 含 `alwaysLoad: true`  
**期望** 导入后 Pack 的 `alwaysLoad` 为 true（同步策略见 open-questions **Q3**）

**AC**

- [ ] 导入后 Switch 为开
- [ ] 表字段与 frontmatter 一致；元数据区修改 Switch 写表

---

## Epic C — Turn 与文案

### US-C1 多态 Turn 摘要（中文 UI）

**作为** 中文界面用户  
**当** 我查看 Turn 技能包步骤  
**期望** 摘要为中文用户向文案，**无** `system prompt`、`Merged ... into`、`read_skill_file`

**AC**

- [ ] mounted>0, loaded=0 → 「已挂载 N 个，本轮未选用」
- [ ] loaded>0, read=0, run=0 → 「已加载 N 个技能包」
- [ ] loaded>0, read>0 → 「已加载 N 个；读取 M 个文件」
- [ ] 英文 UI 有对应 en 文案（新 key，非直译旧 merged 句）

---

### US-C2 详情块：挂载 vs 加载 vs 未选用

**作为** 用户  
**当** 我展开 Turn 技能包步骤  
**期望** 看到：已挂载列表、本轮已加载、未选用（含可选原因）

**AC**

- [ ] 块标题用户向（非 API 字段名 `merged`）
- [ ] skipped 最多 5 条 reason（见 **Q5**）

---

### US-C3 无关时不误导

**作为** 用户  
**当** 本轮未选用任何包（且无非 always 的 loaded）  
**期望** **不** 显示「已完成 · 已合并 1 个技能包」类误导句

**AC**

- [ ] 与 US-A1 一致；截图级验收：greeting-test + 「天津天气」

---

### US-C4 历史 Turn 兼容

**作为** 用户  
**当** 我查看 0.1.19 会话中的旧 Turn  
**期望** 技能包步骤仍可读，不崩溃

**AC**

- [ ] 仅有 `merged[]` 的快照正常展示（legacy 映射，见 **Q22**）
- [ ] `localize-turn-detail.ts` 覆盖旧中文/英文 title

---

## Epic D — 助手与控制台

### US-D1 助手挂载说明更新

**作为** 配置助手的用户  
**期望** 挂载区 extra：多包挂载、**按问题加载**、始终加载例外

**AC**

- [ ] zh/en `assistants.json` 更新
- [ ] 交互结构不变（仍多选）

---

### US-D2 控制台帮助与 Alert

**作为** 技能包管理页用户  
**期望** 顶部说明提及「相关时才加载」

**AC**

- [ ] `alert.productScope` 增量一句按需加载
- [ ] import/编辑流程无回归

---

## 测试夹具

沿用 `iterations/0.1.19/fixtures/greeting-test-skill/`（**SKILL.md 须更新** 0.1.20 脚本可 run 说明，见 script-run 文档）：

| 用例 | 输入 | 期望 Turn |
| --- | --- | --- |
| 无关 | 「天津天气」 | 已挂载 1，**未选用** |
| 相关 | 「请用技能包测试打个招呼」 | **已加载** 1 |
| always | 问候包 alwaysLoad + 「天津天气」 | **已加载** 1（问候包） |
| 多包 | 问候 + UI 包，问 UI | UI loaded，问候 skipped |

---

## 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-19 | 初稿 |
| 2026-06-19 | 补 US-A5/C4；修正 Q3 引用；术语统一 |
