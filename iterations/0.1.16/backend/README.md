# 服务端文档索引 — Console 域 i18n 与 middleware（version 0.1.16）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.16` |
| 阶段 | **3A 文档 + 3B 代码** ✅ |
| 上游 | `../product/prd.md`、`../product/user-stories-api-i18n.md`、`../product/user-stories-console.md`、`../design/spec-api-message-console.md`、`../design/spec-routing-locale-console.md`、`../design/spec-shared-infra-console.md` |
| 基线 | `../../0.1.15/backend/` |

---

## 文档清单

| 文件 | 用途 | 主要读者 |
| --- | --- | --- |
| [api-spec.md](./api-spec.md) | 12 route 逐 endpoint ErrorCode ↔ key 映射、locale/`tApiMessage` 约定、validation details key 化、MCP lastErrorSummary、middleware、`[locale]/console/layout` 鉴权规格、knowledge-bases 边界 | Backend / Frontend |
| [data-models.md](./data-models.md) | 无 DB 变更；`api/message.json` ~59 新增 key 清单；`page/console/*.json` 注册约定 | Backend / Frontend |
| [implementation-plan.md](./implementation-plan.md) | 3B 分步实现：按优先级排序的文件清单、改造顺序、风险、自测与 grep 验收 | Backend（3B 主责） |

---

## 本期服务端职责摘要

| 职责 | 说明 |
| --- | --- |
| **Console API 错误双语** | `/api/console/**`（**12** 个 route 文件）全部 `jsonError` → `resolveRequestLocale` + `tApiMessage` |
| **validation details 全 key 化** | Q9-A；共享 helper（mcp-config-validation 等）增加 `locale` |
| **MCP test-connection** | Q5-A：`lastErrorSummary` 写入前 `tApiMessage` |
| **message 填充** | `messages/{en,zh}/api/message.json` 新增约 **59** key |
| **middleware** | `/console` legacy 302；`KNOWN_APP_SEGMENTS` 移除 `console`；`isProtectedPath` 匹配 `/{locale}/console` |
| **withReadOnlyApi** | 0.1.15 已双语；console 写 API 回归验证 |
| **不做** | `/api/knowledge-bases/**`（0.1.18+）；Console 页面/UI、`page/console/*.json`（Frontend 4） |

---

## 已确认产品决策（实现基线）

| 编号 | 决策 |
| --- | --- |
| Q1-A | 不含 `/api/knowledge-bases/**`；knowledge 页 UI 双语但 KB API 错误可能仍中文 |
| Q2-A | 全量 console 子页（Frontend 4） |
| Q3-B | admin 跳链 locale 化留 **0.1.17**；legacy redirect 兜底裸 `/console` |
| Q5-A | `lastErrorSummary` 服务端 `tApiMessage` |
| Q9-A | validation `details[].message` 全部 key 化 |
| Q10-A | `[locale]/console/layout.tsx` 服务端鉴权（Frontend 4 实现，规格在 api-spec §9） |
| 方案 A | 服务端翻译 `error.message`，客户端直接展示 |

---

## 快速导航

| 我要… | 去看… |
| --- | --- |
| 查某个 route 的 ErrorCode 映射 | [api-spec.md §4](./api-spec.md#4-十二个-route-逐-endpoint-映射表) |
| 查要新增哪些 message key | [data-models.md §3](./data-models.md#3-apimessagejson-增量0116) |
| 查 3B 改哪些文件、什么顺序 | [implementation-plan.md §3–§4](./implementation-plan.md#3-3b-文件修改清单按优先级排序) |
| 查 middleware 怎么改 | [api-spec.md §7](./api-spec.md#7-middleware-变更console-相关) |
| 查 knowledge-bases 边界 | [api-spec.md §1.3](./api-spec.md#13-边界说明q1-a) |
| 自测 curl / middleware 用例 | [implementation-plan.md §6](./implementation-plan.md#6-自测步骤) |

---

## 3B 状态

**已完成**（2026-06-11）— 见 [implementation-notes.md](./implementation-notes.md)。12 console route、共享 helper、middleware、message 资源均已落地；`npm run build` 通过。

---

## 关联文档

- 需求：`../product/prd.md`、`../product/user-stories-api-i18n.md`
- 设计：`../design/spec-api-message-console.md`、`../design/spec-routing-locale-console.md`
- 前序迭代：`../../0.1.15/backend/README.md`
