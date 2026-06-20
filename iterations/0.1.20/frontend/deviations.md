# 与设计偏差 — version 0.1.20 前端

跨阶段汇总见 [../deviations.md](../deviations.md)。以下为前端专项。

| 项 | 设计 | 实现 | 原因 |
| --- | --- | --- | --- |
| 列表 Tag `tag.scriptsSandbox` | 可选 secondary「沙箱」Tag | 未加 secondary Tag，仅保留「含脚本」+ Tooltip | 设计标注 optional；避免名称列 Tag 过多 |
| `help.scripts.body` 加粗 | 文案含 **阅读**/**运行** 等强调 | 纯文本条目列表 | `next-intl` JSON 未用 rich text；语义完整 |
| `enabled` Switch | — | 仍为草稿 +「保存」写入，与 `alwaysLoad` 即时 PATCH 不一致 | 沿用 0.1.19 元数据保存流程；`alwaysLoad` 按设计单独 PATCH |

无其他已知功能偏差。
