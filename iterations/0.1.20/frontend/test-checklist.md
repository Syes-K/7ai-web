# 手动测试清单 — version 0.1.20 前端

## 环境

1. `npm run dev`，登录控制台与对话页。
2. 准备至少两个技能包：一个含 `scripts/`，一个可设 `alwaysLoad`。

## 控制台 — 技能包

| # | 步骤 | 期望 |
| --- | --- | --- |
| 1 | 打开 `/console/skills` 产品说明 Alert | 文案含「按需加载」「始终加载」「沙箱运行」 |
| 2 | 列表：某包 `alwaysLoad=true` | 名称旁紫色 Tag「始终加载」 |
| 3 | 列表：含脚本包 | Tag「含脚本」，Tooltip「可在对话沙箱中运行」 |
| 4 | 打开 Pack 详情 Drawer | 顶栏左侧「始终加载」Switch，右侧「启用」Switch |
| 5 | 切换「始终加载」 | Toast「已更新始终加载设置」；列表 Tag 同步 |
| 6 | 含脚本包详情 | 黄色 Alert「此包包含可运行脚本」；树中脚本节点绿色「可运行」Badge |
| 7 | Help Drawer（脚本说明） | 含每轮 5 次、每日 100 次限额说明 |
| 8 | 保存 SKILL.md（frontmatter 含 alwaysLoad） | Toast 含「始终加载」同步文案 |

## 控制台 — 助手

| # | 步骤 | 期望 |
| --- | --- | --- |
| 9 | 编辑助手 → 技能包表单项 extra | 「仅加载与问题相关的包（始终加载除外）」 |
| 10 | 技能包多选下拉中含脚本项 | Tooltip「加载后可在对话沙箱中运行」 |

## 对话 Turn C1b

| # | 场景 | 期望 |
| --- | --- | --- |
| 11 | 助手未挂载任何技能包 | **不展示** Skill Packs 子步骤 |
| 12 | 挂载多包，问与某包无关的问题 | 摘要「已挂载 N 个，本轮未选用」；详情有已挂载 + 未选用 |
| 13 | 问与某包相关的问题 | 摘要「已加载 …」；详情有已挂载 + 本轮已加载 |
| 14 | 含 read/run 的轮次 | 摘要含读取/运行计数；详情有文件/脚本列表 |
| 15 | `alwaysLoad` 包 + 无关问题 | 该包出现在「本轮已加载」 |
| 16 | 无助手会话（若可测） | **展示** C1b，摘要「未绑定助手…」 |
| 17 | 切换 UI 语言查看历史 Turn | 详情标题按当前 locale 本地化（legacy「已合并技能包」→「本轮已加载」） |

## 回归

| # | 步骤 | 期望 |
| --- | --- | --- |
| 18 | MCP / 知识库 Turn 子步骤 | 行为与 0.1.19 一致 |
| 19 | `npm run lint` / `tsc --noEmit` | 无错误 |

## 0.1.20 夹具（可选）

| # | 夹具 | 期望 |
| --- | --- | --- |
| 20 | multi-script-loop-test-skill，「循环脚本测试 3 轮」 | ran 5；exit 0 |
| 21 | script-error-test-skill，「脚本异常测试：非零退出」 | ran 1；exit 42 |
| 22 | ui-ux-pro-max，设计/风格类问题 | loaded + search.py exit 0 |

见 [../fixtures/README.md](../fixtures/README.md)。

---

## 结项

迭代结项清单见 [../COMPLETION.md](../COMPLETION.md)。
