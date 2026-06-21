# 前端实现说明（version 0.1.21）

| 状态 | **已验收**（2026-06-21） |

阶段 4 交付：Admin Skills 迁移、控制台退场、Turn i18n、系统助手技能挂载。

---

## 1. 路由与页面

| 路由 | 组件 | 说明 |
| --- | --- | --- |
| `/[locale]/admin/skills` | `SkillsAdminClient` | 系统技能包：导入/列表/只读详情/删除 |
| `/[locale]/console/skills` | 薄 `page.tsx` | admin → 302 `/admin/skills`；普通用户 404 |

**Admin Skills API 基址：** `/api/admin/skill-configs`

**鉴权：** `handleAdminApiAuthStatus`（与 models 一致）

---

## 2. Admin Skills 要点

- **零保存按钮**：`PackDetailDrawer` 只读（`Descriptions` + 文件树 + `<pre>` 预览），无 Switch/保存/文件 CRUD
- **列**：含 `alwaysLoad`；无 `assistantRefs`、无 `edit`
- **行操作**：详情、重新导入（`PackImportModal` mode=overwrite）、删除
- **删除 409**：`modal.error` 展示 `referencedAssistants[].name`
- **i18n**：`page.admin.skills`；shell `menu.skills`

---

## 3. 控制台退场

- `console-menu.tsx` 移除 skills 项
- `AssistantsClient`：`SKILL_CATALOG_API = /api/console/skill-catalog`
- 空状态：`alert.noSkills.message/description`（无 console/skills 链接）
- admin 用户：`form.skills.manageLinkAdmin` → `/admin/skills`（`page.tsx` 传入 `isAdmin`）

---

## 4. Turn i18n

- `turn-safe-message-keys.ts`：KB/MCP/Skills marker 集合 + `localizeTurnSafeSummary`
- `ChatWorkspace`：隐藏逻辑用 marker 集合；C1b 摘要优先 `safeMessageKey`
- `localize-turn-detail.ts`：行级 legacy（skip reason、read/run 行、intent failed body）
- `page/chat.json` + `api/message.json`：`skillsSkipReason.*`、`skillsIntentFailedBody` parity

---

## 5. Admin 系统助手（P1）

- `AssistantsClient` 新增技能包多选（catalog + `PUT /api/console/assistants/:id/skill-configs`）
- 空 catalog：`alert.noSkillsAdmin.description` 链至 `/admin/skills`

**偏差：** 系统助手 scope 的 skill-configs 子资源尚无独立 admin API，绑定走 console 子资源（见 `deviations.md`）。

---

## 6. Provider / 组件库

- 沿用 `/admin` 既有 `AntdRegistry` + `App`（`AdminShell`）
- Pro：`PageContainer`、`ProTable`；表单区无 ProForm（列表+Modal/Drawer 模式与 models 一致）

---

## 6. 联调补丁（2026-06-21）

| 主题 | 文件 | 说明 |
| --- | --- | --- |
| **技能多选不可选** | `console/admin AssistantsClient.tsx` | catalog 无 `enabled` → `enabled ?? true` |
| **停用 Alert 移除** | `AssistantsClient.tsx`、`messages/*/page/console/assistants.json` | 删除 `skillsInactive*` |
| **发送失败无提示** | `ChatWorkspace.tsx`、`chat-api.ts` | `failSend`、Toast、`resolveChatSendErrorMessage`、恢复草稿 |

---

## 7. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-20 | 阶段 4 初稿 |
| 2026-06-21 | 结项：联调补丁与 test-checklist 补充 |
