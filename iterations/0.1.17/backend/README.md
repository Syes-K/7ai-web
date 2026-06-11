# Backend 文档 — Admin + knowledge-bases i18n（version 0.1.17）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.17` |
| 阶段 | **3A 文档 + 3B 代码**（均已完成） |
| 范围 | `/api/admin/**`（9 routes）+ `/api/knowledge-bases/**`（5 routes）错误双语；middleware admin/knowledge legacy redirect |

---

## 文档索引

| 文件 | 内容 |
| --- | --- |
| [api-spec.md](./api-spec.md) | 逐 endpoint ErrorCode → `tApiMessage` key；middleware；admin layout / knowledge 预览鉴权规格 |
| [data-models.md](./data-models.md) | 新增 `api/message` key 清单；`page/admin/*.json`、`page/knowledge.json` 注册约定 |
| [implementation-plan.md](./implementation-plan.md) | 3B 步骤、P0→P2 文件清单、风险、自测、与 Frontend 4 分工 |

---

## 产品决策（本期已采纳）

| ID | 结论 |
| --- | --- |
| Q1 | **A** — 全量 admin 子页 + API + knowledge 预览 + knowledge-bases API |
| Q2 | **B** — GET 坏 JSON：服务端仅 `fileState`；前端 `page.admin.*` 映射 Alert |
| Q3 | **A** — admin→console 跨页链全面 locale 化（Frontend 4） |
| Q4 | **B** — `tmpl.message` → `validation.promptConfig.template.*` 枚举 |
| Q7 | **B** — 用户 id 校验复用 `validation.invalidId` |
| Q11 | **A** — Knowledge 预览 + knowledge-bases API 纳入本期 |

---

## 阶段边界

### 3A（本阶段 · 已完成）

- 仅产出 `iterations/0.1.17/backend/*.md`
- **禁止**修改业务代码

### 3B（已完成 · 2026-06-11）

- 填充 `messages/{en,zh}/api/message.json`（~38 新增 key）
- 改造 14 个 API route + `middleware.ts` + 共享 helper
- 详见 `implementation-notes.md`

### Frontend 4（已完成 · 2026-06-11）

- `src/app/[locale]/admin/**`、`src/app/[locale]/knowledge/[id]`
- `messages/page/admin/*.json`、`page/knowledge.json`
- 详见 `../frontend/implementation-notes.md`

---

## 上游 / 下游

| 方向 | 路径 |
| --- | --- |
| 需求 | `../product/prd.md`、`user-stories-*.md` |
| 设计 | `../design/spec-api-message-*.md`、`spec-routing-locale-admin-knowledge.md` |
| 参考实现 | `../../0.1.16/backend/`、`src/app/api/console/**` |
| 下游 | Frontend 4 读取本目录 API 契约与 layout 规格 |

---

## 快速验收（3B 完成后）

1. `rg 'jsonError\([^)]*"[\u4e00-\u9fff]' src/app/api/admin/ src/app/api/knowledge-bases/` → 零匹配
2. `/en/console/knowledge` 触发 API 错误 → `error.message` 英文（消除 0.1.16 L1）
3. `GET /admin/users` → 302 `/en/admin/users`
4. `GET /knowledge/{id}` → 302 locale 前缀路径

---

**迭代 0.1.17 全流程已完成。** 验收见 `../frontend/test-checklist.md`。
