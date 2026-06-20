# script-error-test-skill — run_skill_script 异常场景测试包

## 导入

```bash
cd iterations/0.1.20/fixtures
zip -r script-error-test-skill.zip script-error-test-skill/
```

控制台导入 zip → 挂载到助手（可与循环测试包二选一挂载，避免意图路由选错）。

**建议**：测试异常时 **只挂载本包**，或开启 **始终加载**，避免 `failed_safe` / 未选用。

## 对话输入速查

| 测什么 | 发送内容 | Turn 期望 |
| --- | --- | --- |
| 非零 exit | `请运行脚本异常测试：非零退出` | run 1 次，详情 exitCode=42 |
| Python 崩溃 | `脚本异常测试：Python crash` | run 1 次，exitCode≠0，stderr 有 ValueError |
| 超时 | `脚本异常测试：超时，5秒超时` | run 1 次，exitCode 空或 timeout 文案 |
| 参数错误 | `脚本异常测试：参数错误` | run 1 次，exitCode=2 |
| shell 失败 | `脚本异常测试：shell 失败` | run 1 次，exitCode=1 |

## 不新建脚本也能测的场景（任意已加载 Pack）

| 场景 | 怎么说 / 怎么做 | tool 行为 | 计入 runCount？ |
| --- | --- | --- | --- |
| 路径非法 | 「运行 data/foo.py」 | `Error: path must be under scripts/` | **否** |
| 文件不存在 | 「运行 scripts/not-exist.py」 | `Error: script not found` | **否** |
| 未加载 Pack | 先问无关问题使包未选用，再要求 run | `Error: packId not available` | **否** |
| Turn 配额 | 同一 Turn 连续 run 6 次 | 第 6 次 quota 拒绝 | **否** |
| 错误参数 | 用循环包：`tick.py` 不传 args | exitCode=2 | **是** |

## 与循环测试包分工

| 包 | 用途 |
| --- | --- |
| `multi-script-loop-test-skill` | 多轮 **成功** 路径 |
| `script-error-test-skill` | 各类 **失败** 路径 |
| `greeting-test-skill` | read + 可选 run hello |
