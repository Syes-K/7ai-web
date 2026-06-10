# 设计与实现偏差 — 0.1.15 前端

| 编号 | 设计/需求 | 实际实现 | 原因 |
| --- | --- | --- | --- |
| D1 | Q12-A：控制台链至 `/{locale}/console` | Chat / 首页仍 `Link href="/console"`（裸路径） | Console 路由未迁入 `[locale]`（批次 2）；next-intl Link 对非 i18n 路由保持 `/console` |
| D2 | ConfirmProvider 挂载于 root layout | 挂载于 `[locale]/layout.tsx` | 根 layout 无 intl context；shell 默认文案在 locale 子树内可用 |
| D3 | MCP 步骤详情全文 i18n | `mcpDetailsFromUi` 部分 title/content 仍为中文硬编码（服务端） | 后端 route 未完全迁移；前端 hide 逻辑额外保留 `未启用 MCP` 子串匹配 |
| D4 | Chat 顶栏 UserAvatarMenu | 本期未加入（与设计 §4 一致） | MVP 范围；shell 变体已在 `UserAvatarMenu` 预留供 0.1.16 console |
| D5 | `assistantStreaming.waitTips` | 未列入 copy-chat-en-zh 终稿表 | 沿用原有三条中文提示并补英文对称 key |
| D6 | 首页 Sign in 链 | 初版 `href=/${locale}/login` + next-intl Link | 导致 `/en/en/login`；已改为 `href=/login?redirect=/` |
| D7 | AI 输出尾注 | copy 未单列 `output.disclaimer` | 验收期补 key + `AssistantOutputRenderer` i18n |
| D8 | LLM 回复语言 | PRD 非目标「不翻译 LLM 输出」 | 系统提示改为语言中立 + `CHAT_LANGUAGE_REPLY_SUFFIX`，模型随**用户输入**语言回复（非 UI locale） |

## 未完成 / 后续批次

- Console / Admin / Knowledge 路由 locale 化与 UI i18n（0.1.16+）
- `NavPlaceholder`、`AdminShell`、`ConsoleShell` 内 `/chat` 硬链未改（非 chat MVP 范围）
- 服务端 MCP 详情块、部分 turn 面板 title 仍中文（需 backend 跟进）
