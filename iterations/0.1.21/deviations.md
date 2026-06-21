# 跨阶段偏差汇总（version 0.1.21）

汇总 [frontend/deviations.md](./frontend/deviations.md) 与联调阶段变更。

---

## 1. 设计内偏差

| 项 | 设计 | 实现 | 原因 |
| --- | --- | --- | --- |
| i18n `meta.*` | 详情只读 hint 用 `meta.readOnlyHint` | 使用 `packMeta.*` | 避免与页面 `meta.title` 冲突 |
| Admin 系统助手 binding | 与 console 同源 API | 仍走 `PUT /api/console/assistants/:id/skill-configs` | admin 子资源未实现；见 COMPLETION 移交 |
| `console/skills` 源码 | 移除 | 路由退场；`SkillsClient` 等文件暂留 | 降低删文件风险；无运行时引用 |

---

## 2. 联调阶段变更（非原 PRD，已落地）

| 项 | 说明 | 代码 |
| --- | --- | --- |
| **技能多选不可选** | catalog 无 `enabled` 字段，`!undefined` 导致 Select 全 disabled | `AssistantsClient`：`enabled ?? true`；`enabled === false` 判断 |
| **DB `prepare` 崩溃** | 并发 `getDataSource()` 重复 initialize | `data-source.ts`：`initPromise` 单例锁 |
| **发送失败无提示** | 仅 refresh 失败才 Toast；乐观消息残留 | `ChatWorkspace.failSend` + `resolveChatSendErrorMessage` |
| **停用技能 Alert** | 用户要求移除「部分已挂载的技能包已停用」 | 删除 `alert.skillsInactive*` 与相关 UI |

---

## 3. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-21 | 初稿 |
