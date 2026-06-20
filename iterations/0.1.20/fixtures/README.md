# 测试夹具 — version 0.1.20

| 夹具 | zip | 主要验证 |
| --- | --- | --- |
| [greeting-test-skill](../../0.1.19/fixtures/greeting-test-skill/) | [greeting-test-skill.zip](../../0.1.19/fixtures/greeting-test-skill.zip) | 按需加载、read、`hello.py` run |
| [multi-script-loop-test-skill](./multi-script-loop-test-skill/) | [multi-script-loop-test-skill.zip](./multi-script-loop-test-skill.zip) | 多轮 py/sh 循环 run（默认 3 轮 = 5 次） |
| [script-error-test-skill](./script-error-test-skill/) | [script-error-test-skill.zip](./script-error-test-skill.zip) | exit≠0、crash、timeout、参数错误 |

## 仓库内参考 Pack（非 zip）

- `.cursor/skills/ui-ux-pro-max/` — 打 zip 导入（排除 `__pycache__`）；验证多文件 `search.py` + 设计类问题 intent 命中。

## 导入

控制台 → 技能包管理 → 导入 Zip → 挂载助手 → **新会话**测试。

**提示**：避免 intent 未命中时可开 **始终加载**；意图超时见 `SKILL_PACK_INTENT_TIMEOUT_MS`（默认 15s）。
