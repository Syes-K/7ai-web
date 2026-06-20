# 用户故事：Skill Pack 脚本沙箱执行（version 0.1.20）

Epic 映射 `prd.md` §5.3。与按需加载 **同一迭代**；run 白名单依赖 **本轮已加载（loaded）** Pack。

---

## Epic E — run_skill_script

### US-E1 运行 scripts/ 下 Python

**作为** 挂载含 `scripts/search.py` 的 Pack（如 ui-ux-pro-max）的用户  
**当** 我提出与该 SKILL 相关的 UI 设计问题  
**期望** Agent 可调用 **`run_skill_script`** 执行脚本  
**且** 回答引用 stdout 结果

**AC**

- [ ] path 非 `scripts/` 前缀 → tool 返回错误，不执行
- [ ] 未加载 Pack 的 packId → 不可用（见 US-E7）
- [ ] 成功时返回 stdout + exitCode

---

### US-E2 沙箱安全边界

**作为** 平台  
**期望** 脚本在隔离环境运行：**默认无出站网络**、超时强制终止、工作目录限定

**AC**

- [ ] 脚本内尝试 curl/wget 外网 → 失败或空（按 **Q8** 实现）
- [ ] 超过 `timeoutMs`（或默认 30s）→ 终止 + 错误信息
- [ ] 无法读取 Pack 外路径、无法写系统目录（**Q12**）

---

### US-E3 配额与审计

**作为** 运营/安全  
**期望** 每 Turn run 次数有上限；每次 run 留审计记录

**AC**

- [ ] 超 **Q10** 上限 → tool 拒绝并返回配额错误
- [ ] 审计含 userId、packId、path、exitCode、durationMs（**Q14**）
- [ ] 超 **Q11** 日限额 → 拒绝

---

### US-E4 Turn 展示脚本运行

**作为** 用户  
**当** 本轮运行了脚本  
**期望** Turn 技能包步骤显示 **「运行 N 个脚本」**；展开可见 path + exitCode

**AC**

- [ ] 用户向中文文案（无 tool 名）
- [ ] run 失败也计入详情（exitCode ≠ 0，**Q15**）
- [ ] 与 read 同时发生时组合摘要（见 US-E8）

---

### US-E5 与 read 区分

**作为** 用户  
**期望** Agent 仍可用 `read_skill_file` **阅读** 脚本源码；run **仅** 执行

**AC**

- [ ] read `scripts/foo.py` 返回源码文本
- [ ] run 同路径返回执行输出，非源码

---

### US-E6 控制台文案升级

**作为** 技能包管理用户  
**期望** 「含脚本」说明从「只读不执行」改为「可在对话沙箱中运行」+ 安全提示

**AC**

- [ ] zh/en `skills.json`、`assistants.json` 更新
- [ ] help.scripts Drawer：无网络、超时、仅 scripts/、配额（**Q10–Q11**）
- [ ] 移除或替换 Pack 详情「MVP 只读不执行」Alert

---

### US-E7 未加载 Pack 不可 run

**作为** 用户  
**当** 问候包因「问天气」未被选用（按需加载）  
**期望** Agent 误调 run 也 **无法** 对该 packId 执行

**AC**

- [ ] 与 Epic A 一致；白名单 = loaded packs only（**Q16**）

---

### US-E8 组合摘要 read + run

**作为** 用户  
**当** 本轮既 read 又 run  
**期望** Turn 摘要形如「已加载 1 个；读取 2 个文件；运行 1 个脚本」

**AC**

- [ ] 中英文 i18n key 组合正确
- [ ] details 分块：已读取 / 已运行脚本

---

### US-E9 greeting-test 夹具 hello.py

**作为** 测试人员  
**当** 挂载更新后的 greeting-test-skill 并触发 run 意图  
**期望** `run_skill_script` 可执行 `scripts/hello.py` 且 stdout 含预期字符串

**AC**

- [ ] 夹具 `SKILL.md` 已更新：允许 run hello.py（替换「不要运行 scripts」）
- [ ] Turn 显示 run 1 次；exitCode=0

---

## 测试夹具

| 夹具 | 用例 |
| --- | --- |
| `iterations/0.1.19/fixtures/greeting-test-skill/`（更新 SKILL.md + hello.py 验收说明） | run 成功 |
| `.cursor/skills/ui-ux-pro-max/`（导入 zip） | 相关 UI 问题触发 `scripts/search.py` |

**夹具维护（产品要求）**：在 `iterations/0.1.19/fixtures/greeting-test-skill/SKILL.md` 增加 0.1.20 节：按需加载下仅相关轮次加载；`scripts/hello.py` 可通过 `run_skill_script` 执行（implementation 阶段更新文件，非本阶段代码）。

---

## 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-19 | 初稿 |
| 2026-06-19 | 增 US-E8/E9；Q 引用对齐 open-questions |
