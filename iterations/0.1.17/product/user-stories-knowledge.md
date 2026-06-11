# 用户故事与验收标准：Knowledge 预览页 + knowledge-bases API i18n（version 0.1.17）

本文档为 `prd.md` 子文档，覆盖 **独立预览页** `/knowledge/[id]` 与 **`/api/knowledge-bases/**`（5 routes）**。Console 内 knowledge **管理** UI 已在 0.1.16 完成；本期补齐预览路由与 API 错误双语。

---

## Epic A：知识库预览路由

### US-A1 预览页迁入 `[locale]`

**作为** 已登录用户  
**我想要** 通过 `/{locale}/knowledge/{id}` 预览知识库内容  
**以便** URL 与站点 locale 一致  

**验收标准：**

- [ ] **AC-A1**：`/en/knowledge/{id}`、`/zh/knowledge/{id}` 可访问且展示正确内容。
- [ ] **AC-A2**：裸 `/knowledge/{id}` → 302 至 locale 前缀路径。
- [ ] **AC-A3**：未登录 → `/{locale}/login?redirect=/{locale}/knowledge/{id}`（修正现网裸 `/login` redirect）。
- [ ] **AC-A4**：`knowledge` 从 `KNOWN_APP_SEGMENTS` 移除（迁移完成后）。

### US-A2 预览页 metadata

**作为** 用户  
**我想要** 预览页浏览器标题反映当前语言  
**以便** 识别页面类型  

**验收标准：**

- [ ] **AC-A5**：metadata 使用 `page.knowledge.meta.*` key。
- [ ] **AC-A6**：title 可拼接 `kb.name`（用户数据，不翻译）。

---

## Epic B：预览页壳层文案

### US-B1 极简壳层双语

**作为** 用户  
**我想要** 除正文外若有导航/返回等壳层文案则双语  
**以便** 英文环境下可操作  

**验收标准：**

- [ ] **AC-B1**：若设计增加 breadcrumb、返回控制台等链接，文案双语且 href locale 感知（`@/i18n/navigation`）。
- [ ] **AC-B2**：404/notFound 由 Next.js 默认或全局 i18n 处理（若需定制则纳入 `page.knowledge`）。

### US-B2 用户内容不翻译

**验收标准：**

- [ ] **AC-B3**：`kb.name`、`kb.description`、`kb.content` 直接渲染，不经 i18n。
- [ ] **AC-B4**：Markdown 渲染器不注入翻译逻辑。

---

## Epic C：Console knowledge 预览链

### US-C1 管理页预览链 locale 感知

**作为** 用户  
**我想要** 从 `/en/console/knowledge` 点预览进入带 locale 的预览页  
**以便** 语言不中断  

**验收标准：**

- [ ] **AC-C1**：`KnowledgeClient` 预览链指向 `/knowledge/{id}`（next-intl Link 自动加 locale 前缀）。
- [ ] **AC-C2**：从 `/zh/console/knowledge` 预览 → `/zh/knowledge/{id}`。

---

## Epic D：knowledge-bases API 错误双语

详见 `user-stories-api-i18n.md` Epic D。Console knowledge 管理页调用同一 API，本期 API 双语后 **0.1.16 已知限制 L1 消除**。

---

## 范围说明

- 知识库**管理** UI（ProTable CRUD、向量化、分片测试）已在 **0.1.16** `page.console.knowledge` 完成；本期不重复改 UI，除非预览链/middleware 连带调整。
- 预览页源码几乎无硬编码中文；主要工作为**路由迁移**、**鉴权 redirect 修正**、**metadata**、**API 双语**。
