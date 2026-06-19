# greeting-test-skill — 0.1.19 测试用 Skill Pack

简单目录包，用于验证 **导入 → 编辑 → 助手挂载 → 对话 read_skill_file** 全链路。

## 包内文件

| 路径 | 用途 |
| --- | --- |
| `SKILL.md` | 入口说明，合并进 system prompt |
| `data/greetings.md` | 供 `read_skill_file` 按需读取 |
| `scripts/hello.py` | 触发 `hasScripts` 标签；MVP **不执行** |

## 导入方式

### 方式 A：导入 Zip（推荐）

1. 在项目根执行：

```bash
cd iterations/0.1.19/fixtures
zip -r greeting-test-skill.zip greeting-test-skill/
```

2. 打开 **控制台 → 技能包管理 → 导入 Zip**
3. 选择 `greeting-test-skill.zip`
4. 确认列表出现「问候测试技能包」，`fileCount = 3`，`hasScripts = 含脚本`

### 方式 B：控制台新建后手动添加

1. **新建技能包**，在 Drawer 中新建/粘贴上述三个文件路径与内容。

## 对话测试步骤

1. **助手**：Personal 助手 → 技能包挂载 → 勾选「问候测试技能包」→ 保存
2. **会话**：使用该助手新建对话
3. **发送**：`请用技能包测试打个招呼，用中文`
4. **期望**：
   - Turn 步骤 C1b 出现技能包相关文案；若 Agent 调用了 read，有 read 次数
   - 回复含 `[Skill Pack 测试]`，问候语来自 `data/greetings.md`（非编造）

## 额外用例

| 输入 | 期望 |
| --- | --- |
| `Say hello in English using the skill pack` | 英文问候 + 同上模板 |
| `scripts 里的 hello.py 能跑吗？` | 说明 MVP 只读不执行；可读脚本内容 |

## 参考

- 产品：`iterations/0.1.19/product/user-stories-skill-pack.md`
- 设计：`iterations/0.1.19/design/spec-skill-pack-console.md`
