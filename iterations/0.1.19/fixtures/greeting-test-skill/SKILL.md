---
name: 问候测试技能包
description: 0.1.19 联调用：验证 SKILL.md 合并与 read_skill_file 按需读取
---

# 问候测试技能包（Greeting Test Pack）

本技能包用于 **0.1.19 Skill Pack** 功能验证，行为简单、可预期。

## 何时使用

当用户要求「测试技能包」「打个招呼」「用技能包问候」或类似意图时，按下列流程回复。

## 执行步骤

1. **先确认语言**：若用户未说明，默认中文。
2. **读取问候表**：调用 `read_skill_file`，读取本包内 `data/greetings.md`，按用户语言选择对应问候语。
3. **可选读取脚本说明**：若用户问「脚本能不能跑」，可读 `scripts/hello.py` 并说明：**MVP 仅存储与读取，不执行**。
4. **回复格式**（固定模板，便于人工验收）：

```text
[Skill Pack 测试]
语言：{zh|en}
问候：{从 greetings.md 选取的句子}
来源：data/greetings.md（经 read_skill_file 读取）
Pack：greeting-test-skill
```

## 约束

- 不要编造 greetings.md 里没有的问候语；必须先 read 再回复。
- 不要尝试运行 `scripts/` 下任何文件。
- 若 read 失败，如实说明错误并停止，不要假装已读取。

## 验收检查点（给测试人员）

| 检查项 | 期望 |
| --- | --- |
| Console 导入 | Zip 导入成功，`fileCount ≥ 3`，`hasScripts = true` |
| 助手挂载 | 绑定到 Personal 助手后，新会话生效 |
| Turn C1b | 出现技能包合并步骤；若有 read，显示 read 次数 |
| 对话内容 | 回复含 `[Skill Pack 测试]` 且问候来自 greetings.md |
