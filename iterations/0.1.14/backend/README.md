# 服务端文档索引 — i18n 认证域与路由（version 0.1.14）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.14` |
| 阶段 | **3A 文档**（禁止业务代码变更） |
| 上游 | `../product/prd.md`、`../design/design-spec-i18n-auth.md`、`../design/spec-api-message-auth.md`、`../design/design-spec-routing-locale.md` |
| 基线 | `../../0.1.13/backend/` |

---

## 文档清单

| 文件 | 用途 | 主要读者 |
| --- | --- | --- |
| [api-spec.md](./api-spec.md) | 认证 API 行为变更、错误响应双语约定、middleware HTTP 规格、JSON 示例 | Backend / Frontend |
| [data-models.md](./data-models.md) | 无 DB 变更声明；locale 解析模型；`api/message.json` 结构；ErrorCode ↔ key 映射表 | Backend |
| [implementation-plan.md](./implementation-plan.md) | 3B 分步实现：`resolveRequestLocale`、`tApiMessage`、route/middleware 改造、测试要点 | Backend（3B 主责） |
| [risks-and-open-items.md](./risks-and-open-items.md) | 风险、技术债、`map*ApiError` 限制、0.1.15 扩展点 | 全员 |

---

## 本期服务端职责摘要

| 职责 | 说明 |
| --- | --- |
| **API 错误双语** | 认证域 `/api/auth/*` + middleware 通用错误 + `server/auth/admin.ts` 门禁；**Q1-A** 服务端翻译 `error.message` |
| **locale 解析** | **Q5-A**：`NEXT_LOCALE` cookie → `Accept-Language` → 默认 `en` |
| **middleware 路由** | 旧 `/login`、`/register` **302** → `/{locale}/login\|register`；未登录跳转 locale 感知 |
| **message 填充** | `messages/{en,zh}/api/message.json` 本期 key（设计终稿见 `spec-api-message-auth.md` §6–7） |
| **不做** | REST schema 变更、User 表字段、非认证 API 双语、`readApiErrorPayload` 扩展（Q10） |

---

## 已确认决策（实现基线）

| 编号 | 决策 |
| --- | --- |
| Q1-A | 服务端翻译 `error.message`，客户端直接展示 |
| Q3-A | 旧路径 302，无过渡页 |
| Q4-B | 前端 `map*ApiError` **code 优先**；`VALIDATION_ERROR` 渐进 keyword |
| Q5-A | `resolveRequestLocale`：cookie → Accept-Language → `en` |
| Q7 | `authLoginLocked` 使用 ICU `{minutes}` + 英文 plural |
| Q9 | 注册校验使用独立 `validation.*` key |
| Q10 | 本期不改 `readApiErrorPayload` |

---

## 3B 门控

本文档集完成后须**用户确认**方可进入 **3B 代码实现**。3B 完成后补充 `implementation-notes.md`（实际差异与自测记录）。
