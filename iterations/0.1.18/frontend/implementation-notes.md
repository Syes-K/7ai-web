# 前端实现说明（version 0.1.18）

## 已实现

| 模块 | 路径 |
| --- | --- |
| Skills 管理页 | `src/app/[locale]/console/skills/page.tsx`、`SkillsClient.tsx` |
| 侧栏菜单 | `src/app/[locale]/console/console-menu.tsx`（MCP 之后，`BulbOutlined`） |
| 助手挂载 | `AssistantsClient.tsx` — Skills 多选区块 |
| 对话 Turn UI | `ChatWorkspace.tsx` — `C1b` 步骤展示与无挂载隐藏 |
| i18n | `messages/{en,zh}/page/console/skills.json`；`assistants.json`、`shell.json` 增量 |
| 注册 | `src/i18n/request.ts` |

## 手动验证建议

1. `/console/skills` — CRUD、搜索、409 删除拦截弹窗
2. 助手 Modal — 挂载 Skills、停用警告、保存回显
3. 绑定助手的对话 — Turn 面板出现 Skills 合并步骤（有挂载时）

## 与后端契约

- API：`/api/console/skill-configs`、`/api/console/assistants/:id/skill-configs`
- Turn stepKey：`C1b` / `skills_resolution`
