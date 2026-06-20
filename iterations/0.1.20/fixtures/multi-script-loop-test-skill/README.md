# multi-script-loop-test-skill — 0.1.20 多脚本循环测试包

验证单轮对话内 **多次 `run_skill_script`**：交替调用 **Python**（`tick.py`）与 **bash**（`ping.sh`），并统计 Turn run 次数。

## 包内文件

| 路径 | 用途 |
| --- | --- |
| `SKILL.md` | Agent 循环调用指引 |
| `data/loop-config.json` | 默认/最大轮数与脚本路径 |
| `scripts/init.py` | 循环前初始化（1 次） |
| `scripts/tick.py` | 奇数轮 tick（args: total, round） |
| `scripts/ping.sh` | 偶数轮 ping（args: round） |
| `scripts/finalize.py` | 循环后收尾（args: total） |

## 默认 3 轮时的调用序

| 次序 | 脚本 | args |
| --- | --- | --- |
| 1 | `scripts/init.py` | — |
| 2 | `scripts/tick.py` | `["3", "1"]` |
| 3 | `scripts/ping.sh` | `["2"]` |
| 4 | `scripts/tick.py` | `["3", "3"]` |
| 5 | `scripts/finalize.py` | `["3"]` |

**共 5 次** `run_skill_script`（等于默认每 Turn 配额上限）。

## 导入

```bash
cd iterations/0.1.20/fixtures
zip -r multi-script-loop-test-skill.zip multi-script-loop-test-skill/
```

控制台 → 技能包管理 → 导入 Zip → 挂载到测试助手。

## 对话测试

### 用例 A — 默认 3 轮（推荐）

**发送：**

```text
请运行循环脚本测试，用默认 3 轮
```

**期望：**

- Turn：`ran 5 script(s)`（或摘要含 run 5）
- 详情：init / tick / ping / tick / finalize
- 回复含 `[Loop Test]`、`INIT_OK`、`TICK`、`PONG`、`DONE`

### 用例 B — 2 轮（低于配额）

**发送：**

```text
多脚本循环测试，跑 2 轮
```

**期望：** 4 次 run（init + tick + ping + finalize）

### 用例 C — 5 轮（超单 Turn 配额）

平台默认 **5 次 run / Turn**。5 轮完整流程需 **7 次** run，第二轮用户消息继续「从第 4 轮跑到第 5 轮」或调大 `SKILL_SCRIPT_MAX_RUNS_PER_TURN` 环境变量。

| 轮数 N | run 次数 (N+2) | 是否单 Turn 内可完成（默认配额 5） |
| --- | --- | --- |
| 2 | 4 | 是 |
| 3 | 5 | 是（刚好满配额） |
| 4 | 6 | 否 |
| 5 | 7 | 否 |

## 与 greeting-test-skill 对比

| | greeting-test-skill | multi-script-loop-test-skill |
| --- | --- | --- |
| 主要工具 | `read_skill_file` | `run_skill_script` × 多次 |
| 脚本数 | 1 | 4 |
| 循环 | 无 | 有（奇偶交替两种脚本） |

## 参考

- 产品：`iterations/0.1.20/product/user-stories-skill-pack-script-run.md`
- 后端自测：`iterations/0.1.20/backend/implementation-notes.md`
