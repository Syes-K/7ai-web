# 迭代 0.1.21 — Skills 治理与体验优化

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.21` |
| 前置 | `0.1.20` Skill Pack 增强 |
| 状态 | **已验收**（2026-06-21，见 [COMPLETION.md](./COMPLETION.md)） |

---

## 本期目标（摘要）

1. **Skills 迁 `/admin/skills`** — 系统级技能库；删除 `userId`；仅管理员导入/删除
2. **导入为主、零保存** — 只读详情；元数据仅 import 同步
3. **控制台退场** — 移除 `/console/skills`；助手挂载改 `skill-catalog`
4. **Turn i18n** — `reasonCode`、`safeMessageKey`、legacy 映射扩展
5. **联调修复** — catalog 多选、DB 并发初始化、对话网络失败提示

---

## 文档索引

| 阶段 | 路径 |
| --- | --- |
| 产品 | [product/](./product/) |
| 设计 | [design/](./design/) |
| 服务端 | [backend/](./backend/) |
| 前端 | [frontend/](./frontend/) |
| 结项 | [COMPLETION.md](./COMPLETION.md) |
| 偏差汇总 | [deviations.md](./deviations.md) |

---

## 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-20 | 全流程 product → design → backend 3A/3B → frontend |
| 2026-06-21 | 结项文档与联调修复同步 |
| 2026-06-21 | 用户验收通过，迭代关闭 |
