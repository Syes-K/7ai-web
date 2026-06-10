# 用户故事与验收标准：知识库详情页 i18n（version 0.1.15 愿景 · 批次 4 交付）

本文档为 `prd.md` 子文档，覆盖独立预览页 `/knowledge/[id]`。**建议交付批次：0.1.18+**（console 内 knowledge **管理**见 `user-stories-console.md`，建议 0.1.16）。

---

## Epic A：知识库预览路由

### US-A1 预览页迁入 `[locale]`

**作为** 已登录用户  
**我想要** 通过 `/{locale}/knowledge/{id}` 预览知识库内容  
**以便** URL 与站点 locale 一致  

**验收标准：**

- [ ] **AC-A1**：`/en/knowledge/{id}`、`/zh/knowledge/{id}` 可访问且展示正确内容。
- [ ] **AC-A2**：裸 `/knowledge/{id}` → 302 至 locale 前缀路径。
- [ ] **AC-A3**：未登录 → `/{locale}/login?redirect=/{locale}/knowledge/{id}`（**修正**现网裸 `/login` redirect）。
- [ ] **AC-A4**：`knowledge` 从 `KNOWN_APP_SEGMENTS` 移除（迁移完成后）。

### US-A2 预览页 metadata

**作为** 用户  
**我想要** 预览页浏览器标题反映当前语言  
**以便** 识别页面类型  

**验收标准：**

- [ ] **AC-A5**：metadata title 使用 `page.knowledge` key（如「Knowledge preview | 7ai-web」/「知识库预览 | 7ai-web」）。
- [ ] **AC-A6**：title 可拼接 `kb.name`（用户数据，不翻译）。

---

## Epic B：预览页壳层文案

### US-B1 极简壳层双语

**作为** 用户  
**我想要** 除正文外若有导航/返回等壳层文案则双语  
**以便** 英文环境下可操作  

**验收标准：**

- [ ] **AC-B1**：若设计增加 breadcrumb、返回控制台等链接，文案双语且 href locale 感知。
- [ ] **AC-B2**：404/notFound 由 Next.js 默认或全局 i18n 处理（若需定制则纳入 `page.knowledge`）。

### US-B2 用户内容不翻译

**作为** 产品  
**我想要** 明确知识库 name、description、content 保持原文  
**以便** 不篡改用户数据  

**验收标准：**

- [ ] **AC-B3**：`kb.name`、`kb.description`、`kb.content` 直接渲染，不经 i18n。
- [ ] **AC-B4**：Markdown 渲染器不注入翻译逻辑。

---

## Epic C：关联 API（与 console knowledge 批次协调）

### US-C1 knowledge-bases API 错误双语

**作为** 用户  
**我想要** 预览或管理知识库时 API 错误与界面语言一致  
**以便** 理解失败原因  

**验收标准：**

- [ ] **AC-C1**：`KNOWLEDGE_BASE_NOT_FOUND`、`KNOWLEDGE_BASE_REFERENCED_BY_ASSISTANT` 等错误双语（详见 `user-stories-api-i18n.md`）。
- [ ] **AC-C2**：若 API 在 0.1.16 console 批次已改造，本 Epic 仅验收预览页场景。

---

## 范围说明

- 知识库**管理** UI（ProTable CRUD、向量化、分片测试）不在本文档，见 `user-stories-console.md` Epic E。
- 预览页当前源码几乎无硬编码中文（`src/app/knowledge/[id]/page.tsx`）；主要工作为**路由迁移**与**鉴权 redirect 修正**。
