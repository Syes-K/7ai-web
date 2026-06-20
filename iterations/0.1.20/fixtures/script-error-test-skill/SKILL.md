---
name: 脚本异常测试包
description: 0.1.20 联调用：run_skill_script 各类失败场景（非零退出、异常、超时、参数错误、stderr）
---

# 脚本异常测试包（Script Error Test Pack）

用于验证 **`run_skill_script` 失败路径**：非 0 exitCode、Python 异常、超时、参数错误、shell 失败。

## 何时使用

用户提到「脚本异常测试」「script error test」「测试 run 失败」时启用。

## 按用户意图选择脚本（只跑一个，除非用户要求多项）

| 用户意图关键词 | 脚本 | args | 期望 |
| --- | --- | --- | --- |
| 非零退出 / exit code | `scripts/fail_exit.py` | 无 | exitCode=42，stderr 含 `FAIL_42` |
| Python 异常 / crash | `scripts/crash.py` | 无 | exitCode≠0，stderr 含 `ValueError` |
| 超时 / timeout | `scripts/hang.py` | 无 | tool 返回 timeout（默认 30s；用户可说「5 秒超时」则 timeoutMs=5000） |
| 参数错误 / bad args | `scripts/bad_args.py` | 无（故意不传） | exitCode=2，stderr 含 `usage` |
| shell 失败 | `scripts/fail.sh` | 无 | exitCode=1，stderr 含 `SHELL_FAIL` |

## 执行步骤

1. `read_skill_file` → `data/error-catalog.json` 确认脚本列表。
2. 根据上表 **只调用一次** `run_skill_script`（除非用户要求连续测多种）。
3. **如实汇报** tool 返回的 `exitCode`、stdout、stderr 或 `Error:` 前缀消息；**不要** 假装成功。
4. 固定回复模板：

```text
[Script Error Test]
场景：{场景名}
脚本：{path}
结果：exitCode={code 或 timeout/error}
stdout：{首行或 empty}
stderr：{首行或 empty}
Pack：script-error-test
```

## 约束

- 路径必须在 `scripts/` 且为 `.py` 或 `.sh`。
- 测「路径非法」时 **不要** 真执行：向用户说明应使用 `scripts/not-exist.py` 会返回 tool Error。
- 失败 run **仍计入** Turn `scriptRunCount`（超时与非零 exit 均计数；tool 层 quota/path 拒绝不计）。
