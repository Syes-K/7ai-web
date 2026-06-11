# 前端实现偏差 — version 0.1.16

| 项 | 设计/PRD | 实现 | 原因 |
| --- | --- | --- | --- |
| D1 | 模型列表「设为向量默认」快捷操作 | **已移除** | 与 Profile → Embedding model 重复；验收期产品决定仅保留 Profile 入口 |
| D2 | 英文区块标题 `Personal info` | **`Base info`** | 验收期文案调整 |
| D3 | MCP 空态含「新建」按钮 | **仅文案**，与 knowledge 一致 | 验收期 UI 统一 |
| D4 | `getConsoleMenuRoutes(locale, t)` | **`getConsoleMenuRoutes(t)`**，path 无 locale 前缀 | next-intl `Link` 自动加前缀；原方案导致 `/en/en/...` |

其余按 `design/` 与 `implementation-notes.md` 交付。
