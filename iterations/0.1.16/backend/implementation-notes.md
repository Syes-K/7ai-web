# 实现说明 — Console 域 API i18n（version 0.1.16 · Backend 3B）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.16` |
| 阶段 | **3B 代码实现** ✅ |
| 状态 | **已完成**（2026-06-11） |
| 范围 | Console API 双语、共享校验 helper locale 化、test-connection lastErrorSummary、middleware console 迁移 |
| 上游 | `api-spec.md`、`data-models.md`、`implementation-plan.md` |

---

## 1. 实现摘要

### 1.1 Message 资源（P0）

- `messages/en/api/message.json`、`messages/zh/api/message.json` 追加约 **59** 个 console 域 key：
  - 11 个 top-level（`modelConfigNotFound`、`loadFailed` 等）
  - 3 个 `mcpTest.*`
  - ~45 个 `validation.*`（含 ICU 参数 `{max}`、`{maxPageSize}`、`{allowed}` 等）

### 1.2 共享 helper（P1）

| 文件 | 改造 |
| --- | --- |
| `src/server/mcp/mcp-config-validation.ts` | 全部 validator 增加 `locale: AppLocale`；`details[].message` → `tApiMessage` |
| `src/server/mcp/parse-mcp-config-ids.ts` | 同上 |
| `src/server/model-config/parse-model-tags.ts` | 增加可选 `locale`（默认 `zh` 供 admin 路由）；错误文案经 `tApiMessage` |
| `src/server/assistant/parse-assistant-tags.ts` | 同上 |

### 1.3 Middleware（P1）

- `KNOWN_APP_SEGMENTS` 移除 `"console"`
- 新增 `handleLegacyConsoleRedirect`：`/console` → `302 /{locale}/console/...`（保留 query）
- `isProtectedPath` 增加 `/^\/(en|zh)\/console(\/|$)/`
- 执行顺序：legacy auth → legacy chat → **legacy console** → 受保护路径

### 1.4 Console routes（P2）

12 个 `src/app/api/console/**/route.ts` 全部改造：

- handler 首行 `const locale = resolveRequestLocale(request)`
- 所有 `jsonError` message → `tApiMessage(locale, key, params?)`
- `details[].message` 同步 key 化
- MCP 校验调用传入 `locale`
- `test-connection`：`lastErrorSummary` 写入前经 `tApiMessage`（解密失败 / 连接失败 / 超时分支）

---

## 2. 修改文件列表

| 类别 | 路径 |
| --- | --- |
| Message | `messages/en/api/message.json`、`messages/zh/api/message.json` |
| Helper | `src/server/mcp/mcp-config-validation.ts`、`parse-mcp-config-ids.ts`、`src/server/model-config/parse-model-tags.ts`、`src/server/assistant/parse-assistant-tags.ts` |
| Middleware | `src/middleware.ts` |
| Routes | `src/app/api/console/profile/route.ts`、`profile/personal/route.ts`、`profile/preference/route.ts`、`models/route.ts`、`models/[id]/route.ts`、`assistants/route.ts`、`assistants/[id]/route.ts`、`assistants/[id]/knowledge-bases/route.ts`、`assistants/[id]/mcp-configs/route.ts`、`mcp-configs/route.ts`、`mcp-configs/[id]/route.ts`、`mcp-configs/[id]/test-connection/route.ts` |

---

## 3. 自测结果

### 3.1 构建

```bash
npm run build
# ✓ Compiled successfully；exit code 0
```

### 3.2 grep 验收（§6.7）

```bash
# 12 route 无中文 jsonError message
rg 'jsonError\([^)]*"[\u4e00-\u9fff]' src/app/api/console/
# → 无匹配

# helper 无中文 validation message
rg 'message: "[\u4e00-\u9fff]' src/server/mcp/mcp-config-validation.ts \
  src/server/mcp/parse-mcp-config-ids.ts \
  src/server/model-config/parse-model-tags.ts \
  src/server/assistant/parse-assistant-tags.ts
# → 无匹配

# test-connection 无中文 lastErrorSummary 硬编码
rg 'lastErrorSummary = "[\u4e00-\u9fff]' src/app/api/console/
# → 无匹配
```

### 3.3 建议 curl 冒烟（需本地 dev + 登录 session）

| 场景 | Cookie | 期望 |
| --- | --- | --- |
| 未登录 GET `/api/console/profile` | `NEXT_LOCALE=en` | `"You are not signed in."` |
| 未登录 GET `/api/console/profile` | `NEXT_LOCALE=zh` | `"未登录"` |
| 无效 model id GET | `NEXT_LOCALE=en` + session | `"Invalid id."` |
| MCP 名称冲突 POST | `NEXT_LOCALE=zh` + session | `"名称已存在"` |
| test-connection 频控 | `NEXT_LOCALE=en` + session | `rateLimited` 英文 |
| Legacy GET `/console/profile` | `NEXT_LOCALE=en` | 302 `/en/console/profile` |
| 未登录 GET `/en/console/models` | 无 session | 302 `/en/login?redirect=/en/console/models` |

---

## 4. 已知限制

| # | 项 | 说明 |
| --- | --- | --- |
| 1 | `/api/knowledge-bases/**` | 仍中文（0.1.18+）；knowledge 页英文 UI 下 API 错误可能中文 |
| 2 | `/api/admin/**` | 未 i18n（0.1.17）；parse-*-tags 默认 `locale=zh` 保持 admin 中文 |
| 3 | `mcpTest.connectionFailed` 的 `{detail}` | 技术栈摘要仍可能含英文（Q5-A 接受） |
| 4 | Admin 裸链 `/console?notice=...` | legacy redirect 兜底至 `/{locale}/console?notice=...`；AdminShell locale 化在 0.1.17 |

---

## 5. 与 Frontend 4 对接要点

- Console API URL 不变（无 locale 前缀）；fetch 须 `credentials: 'include'`
- 错误展示：直接 `error.message`（已翻译）
- MCP 测试失败：`item.lastErrorSummary` 已为 locale 译文
- 401 跳转约定：`/{locale}/login?redirect=/{locale}/console/...`（middleware 已实现）
