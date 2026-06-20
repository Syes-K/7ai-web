---
name: 多脚本循环测试包
description: 0.1.20 联调用：多轮 run_skill_script 循环，交替调用 Python 与 shell 脚本，验证 Agent 工具链与 Turn run 统计
---

# 多脚本循环测试包（Multi-Script Loop Test Pack）

用于验证 **0.1.20 `run_skill_script`** 在单轮对话内 **多次、循环、多脚本** 调用。

## 何时使用

用户提到以下任一意图时启用本包：

- 「循环脚本测试」「多轮脚本」「loop test」「多脚本测试」
- 「运行 N 轮循环」（N 默认 3，最大 5）

## 执行流程（必须严格按序，不可跳过）

1. **读取配置**：`read_skill_file` → `data/loop-config.json`，确认 `defaultRounds` 与 `maxRounds`。
2. **解析轮数 N**：用户指定则用其值（≤ maxRounds），否则用 `defaultRounds`。
3. **初始化（1 次）**：`run_skill_script` → `scripts/init.py`（无 args）。stdout 须含 `INIT_OK`。
4. **循环 N 轮**（i = 1 … N）：
   - **奇数轮 i**：`run_skill_script` → `scripts/tick.py`，args = `[str(N), str(i)]`
   - **偶数轮 i**：`run_skill_script` → `scripts/ping.sh`，args = `[str(i)]`
5. **收尾（1 次）**：`run_skill_script` → `scripts/finalize.py`，args = `[str(N)]`。stdout 须含 `DONE`。
6. **汇总回复**（固定模板，便于人工验收）：

```text
[Loop Test]
轮数：{N}
脚本调用次数：{1 + N + 1}（init + N×tick/ping + finalize）
init：{init stdout 首行}
循环摘要：
{逐轮 tick/ping 的 stdout 一行}
finalize：{finalize stdout 首行}
Pack：multi-script-loop-test
```

## 约束

- **每一轮必须实际调用** `run_skill_script`，不可凭记忆编造 stdout。
- 若某次 run 失败（非 0 exitCode 或 error），停止后续步骤，在回复中说明失败脚本与 exitCode。
- 未加载本包时不得 run；与 0.1.20 白名单一致。
- 默认 **不** 使用 `alwaysLoad`；仅在与循环/多脚本测试相关时由意图路由加载。

## 验收检查点

| 检查项 | 期望 |
| --- | --- |
| Turn C1b | `ran {runCount} script(s)`，runCount = N + 2（init + finalize + N 轮） |
| Turn 详情 | 展开可见 init / tick 或 ping / finalize 路径与 exitCode |
| 3 轮默认 | runCount = 5 |
| 5 轮 | runCount = 7（不超过每 Turn 配额 5 时需用户分两轮测——见 README） |
