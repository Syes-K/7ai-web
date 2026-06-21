# 偏差记录（version 0.1.21 前端）

---

## 1. `packMeta` 命名空间

设计文案表使用 `meta.readOnlyHint` 等；实现为避免与页面 `meta.title` 冲突，i18n 使用 `packMeta.*`。

---

## 2. 系统助手技能绑定 API

**设计：** US-M5 与 console 助手同源 catalog + binding。

**实现：** Admin `AssistantsClient` 使用 `PUT /api/console/assistants/:id/skill-configs`。

**偏差原因：** 该 console 子资源当前仅校验 `AssistantScope.Personal`；系统助手绑定需后续 `GET/PUT /api/admin/assistants/:id/skill-configs`（api-spec §5「若已有」尚未实现）。UI 已就绪，绑定可能返回 404 直至后端补齐。

---

## 3. Skill catalog 仅 enabled

`GET /api/console/skill-catalog` 只返回 `enabled=true`。catalog 项**不含** `enabled` 字段；前端映射时默认 `enabled: true`（2026-06-21 修复多选 disabled）。

---

## 4. 停用技能 Alert（已移除）

原设计含 `alert.skillsInactive` 警告条；**2026-06-21 按产品要求删除**。Tag 上「（已停用）」后缀仍保留。

---

## 5. `console/skills` 遗留文件

`SkillsClient.tsx` 等仍保留于仓库（`page.console.skills` i18n 仍注册），但路由已退场；无运行时引用。后续可删或标 deprecated。

---

## 6. 对话网络失败 UX

**设计未单列**；联调补充：`failSend` 立即 Toast、移除乐观用户消息、恢复输入草稿。见 [../deviations.md](../deviations.md)。

---

## 7. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-20 | 初稿 |
| 2026-06-21 | catalog enabled 修复、skillsInactive 移除、chat 网络提示 |
