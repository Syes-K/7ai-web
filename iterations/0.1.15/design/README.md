# 设计文档索引 — i18n Chat MVP（version 0.1.15）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.15` |
| 阶段 | 设计（阶段 2）— **已完成** |
| 上游需求 | `iterations/0.1.15/product/` |
| 前置设计 | `0.1.13/design/`、`0.1.14/design/` |

---

## 文档清单

| 文件 | 用途 | 主要读者 |
| --- | --- | --- |
| [design-spec-i18n-chat.md](./design-spec-i18n-chat.md) | Chat 页 i18n 总规格：路由、Provider、顶栏、组件范围、AC 对照 | frontend、backend |
| [copy-chat-en-zh.md](./copy-chat-en-zh.md) | `page.chat` 完整中英 key 终稿 + JSON 树 | frontend、QA |
| [spec-api-message-chat.md](./spec-api-message-chat.md) | Chat API ErrorCode ↔ `api.message` 映射 + 增量 JSON | backend |
| [spec-routing-locale-chat.md](./spec-routing-locale-chat.md) | `/chat` 迁入 `[locale]`、302、redirect、跨页链接 | frontend、backend |
| [spec-shared-infra-i18n.md](./spec-shared-infra-i18n.md) | antd/dayjs、Confirm、UserAvatarMenu、Forbidden、只读 API | frontend、backend |

---

## 本期范围（MVP）

**纳入：**

- `/[locale]/chat` 全量 UI 双语
- `/api/chat/conversations/**` 错误双语
- 共享 infra（antd/dayjs 模式、ConfirmProvider、UserAvatarMenu shell、ConsoleForbiddenNotice、withReadOnlyApi）
- 旧 `/chat` → 302
- Chat 顶栏 LanguageSwitcher
- 首页 → chat locale 感知链接

**不纳入（0.1.16+）：**

- `/console/*`、`/admin/*` 页面与对应 API
- `/knowledge/[id]`
- `page/console/*.json`

---

## 设计要点摘要

### 路由

- 对话页迁至 `src/app/[locale]/chat/`，删除 `src/app/chat/`
- `GET /chat` → 302 `/{locale}/chat`（cookie → Accept-Language → `en`）
- 未登录 redirect：`/{locale}/login?redirect=/{locale}/chat`（**含 locale 前缀**）
- Chat 内 console 链：`/{locale}/console/...`（Q12-A；console UI 可能仍中文）

### message 文件

| 路径 | 命名空间 | 约 key 数 |
| --- | --- | --- |
| `messages/{en,zh}/page/chat.json` | `page.chat` | ~95 leaf |
| `messages/{en,zh}/page/shell.json` | `page.shell` | ~12 leaf |
| `messages/{en,zh}/api/message.json` | `api.message` | +13 新增（chat 域） |

`src/i18n/request.ts` 增加 `page.chat`、`page.shell` import。

### 关键 copy 决策

- 用户/助手 fallback：**You / Assistant**（非 User/Bot）
- 只读 toast 略短于 API `readOnlyAccountBlocked`
- Turn 固定阶段标签 client 侧 `turn.stage.*`；SSE/API 错误 server 侧 `tApiMessage`
- 语言切换保留 query；**推荐** sessionStorage 保留选中会话 id

### LanguageSwitcher

- `namespace="page.chat"`，`variant="shell"`（顶栏 zinc/cyan 配色）
- 位置：BrandMark 右簇最左（在控制台 icon 之前）

---

## 下游交接

### → Backend（阶段 3A 文档 + 3B 代码）

1. 按 [spec-api-message-chat.md](./spec-api-message-chat.md) 改造 4 个 chat route + `post-message-pipeline.ts`
2. `withReadOnlyApi` → `readOnlyAccountBlocked` + `resolveRequestLocale`
3. SSE `error` / `MODEL_ERROR` 使用 `tApiMessage`
4. **可选同期：** messages route 内新发 turn `safeMessage` locale 化（Q6-A）
5. 在 `iterations/0.1.15/backend/api-spec.md` 维护 ErrorCode 对照表（含 auth 已有 key）

### → Frontend（阶段 4）

1. 路由迁移 + middleware（[spec-routing-locale-chat.md](./spec-routing-locale-chat.md)）
2. `ChatWorkspace` 全量 `useTranslations('page.chat')`
3. `LanguageSwitcher` 扩展 `page.chat` + `variant="shell"`
4. 首页 chat href；Chat 401 redirect locale 感知
5. `ConfirmProvider` / `modal-shell` / `UserAvatarMenu` shell / `ConsoleForbiddenNotice` → `page.shell`
6. `[locale]/layout` dayjs sync；`generateMetadata` for chat
7. 验收：`copy-chat-en-zh.md` + PRD MVP 检查项

### 验收冒烟（设计侧）

| # | 场景 |
| --- | --- |
| 1 | `/en/chat` 全 UI 英文 + metadata |
| 2 | `/chat` 302 |
| 3 | 删会话 / 清空确认英文 |
| 4 | 只读账号 toast + API 英文 |
| 5 | 创建会话助手不存在 → API 英文 |
| 6 | LanguageSwitcher `/en/chat` ↔ `/zh/chat` |
| 7 | 首页 Chat → `/en/chat` |

---

## 开放问题（设计侧已给推荐）

| ID | 推荐 | 文档 |
| --- | --- | --- |
| Q1 | A — chat + infra MVP | 全文 |
| Q5 | A — 保留 query | routing §7、design-spec §4.5 |
| Q6 | A — 流式/中断 i18n | design-spec §6、api §5 |
| Q9 | A — `[locale]/chat` | routing §1 |
| Q11 | A — 统一 parseApiError | api §6 |
| Q12 | A — locale console href | routing §5 |

---

## 变更记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-10 | 初版：0.1.15 Chat MVP 设计全套 |
| 2026-06-10 | 迭代收尾：Q12 实现为裸 `/console` 链（见 frontend/deviations D1） |
