# 设计说明 — Knowledge 预览页 i18n（version 0.1.17）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.17` |
| 阶段 | 设计（阶段 2） |
| 上游 | `prd.md` 模块 G、`user-stories-knowledge.md` |
| 文案 | `copy-knowledge-en-zh.md` |
| 路由 | `spec-routing-locale-admin-knowledge.md` §3 |
| API | `spec-api-message-knowledge-bases.md`（console 管理页受益） |

---

## 1. 范围与定位

| 在范围 | 不在范围 |
| --- | --- |
| `/[locale]/knowledge/[id]` 路由迁移 | console knowledge **管理** UI（0.1.16 已完成） |
| metadata 双语 | 知识库正文翻译（UGC） |
| 鉴权 redirect locale 感知 | 预览页完整 ProLayout Shell |
| 可选极简壳层（返回链） | LanguageSwitcher（本期不加，保持轻量） |
| console 预览链 locale 感知 | |

**设计原则：** 预览页为**只读内容页**，非控制台子模块；沿用现网深色单栏布局，仅补齐 i18n 壳层与路由。

---

## 2. 路由与文件结构

```
src/app/
  [locale]/
    knowledge/
      [id]/
        page.tsx          # Server Component（迁移自 src/app/knowledge/[id]/page.tsx）
  knowledge/              # 删除
```

| 旧 URL | 新 URL |
| --- | --- |
| `/knowledge/{id}` | 302 `/{resolvedLocale}/knowledge/{id}` |
| `/en/knowledge/{id}` | 直接渲染 |

---

## 3. 页面结构与壳层（D 预览 breadcrumb 定稿）

### 3.1 布局线框

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to knowledge bases          （可选壳层，locale 链）   │
├─────────────────────────────────────────────────────────────┤
│  {kb.name}                              ← 用户数据，不译      │
│  {kb.description}                       ← 用户数据，不译      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Markdown / plain 正文渲染                           │   │
│  │  {kb.content}                                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 壳层组件（定稿：纳入本期）

| 元素 | 说明 |
| --- | --- |
| 返回链 | `Link href="/console/knowledge"` + `t('backToKnowledgeBases')` |
| 位置 | 内容区顶部、`max-w-5xl` 容器内、标题上方 |
| 样式 | `text-sm text-white/60 hover:text-cyan-300`；左箭头图标可选 |

**理由：** 用户主入口为 console knowledge 管理页「预览」；无返回链时英文环境下无法识别导航。体量小，纳入 0.1.17。

**不纳入：** 顶栏 ProLayout、LanguageSwitcher（用户可从 console 切换语言后再点预览）。

### 3.3 鉴权（Server Component）

```typescript
const reqCtx = await getRequestUserContext();
if (!reqCtx) {
  redirect(`/${locale}/login?redirect=/${locale}/knowledge/${id}`);
}
```

- 知识库归属：`userId === reqCtx.user.id`（与现网一致）。
- 不存在：`notFound()`（全局 i18n 404 或默认）。

### 3.4 metadata

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'page.knowledge' });
  // 可选：预读 kb.name 拼接 title
  return { title: t('meta.title', { name: kbName }) };
}
```

| key | en 模式 | zh 模式 |
| --- | --- | --- |
| `meta.title` | `{name} \| Knowledge preview` | `{name} \| 知识库预览` |
| `meta.titleFallback` | `Knowledge preview` | `知识库预览` |
| `meta.description` | Preview knowledge base content. | 预览知识库正文内容。 |

`kb.name` **不翻译**，原样拼接。

---

## 4. 用户内容渲染

| 字段 | 处理 |
| --- | --- |
| `kb.name` | 直接渲染 |
| `kb.description` | 直接渲染 |
| `kb.content` | `MarkdownRenderer` 或 plain；**无** i18n 注入 |
| `contentFormat` | 逻辑不变 |

---

## 5. Console 预览链（US-C1）

**现网：** `KnowledgeClient.tsx`：

```tsx
<Link href={`/knowledge/${detail.id}`}>
```

**定稿：** 保持 path **不含 locale**；使用 `@/i18n/navigation` 的 `Link`，自动解析为 `/{locale}/knowledge/{id}`。

**验收：**

- `/en/console/knowledge` 点预览 → `/en/knowledge/{id}`
- `/zh/console/knowledge` 点预览 → `/zh/knowledge/{id}`

无需改 href 字符串，仅需确认 import 来自 `@/i18n/navigation`（若仍为 `next/link` 则替换）。

---

## 6. 状态说明

| 状态 | 表现 |
| --- | --- |
| 未登录 | layout 级 redirect login（预览页 Server Component 内 redirect） |
| 加载 | Server Component 无客户端 loading；整页 SSR |
| 404 | `notFound()` |
| 有内容 | 标题 + 描述 + 正文区 |
| 无 description | 省略描述段落 |

---

## 7. message 组织

单文件 `messages/{en,zh}/page/knowledge.json` → `page.knowledge.*`。

**与 `page.console.knowledge` 分离：** console 为管理 CRUD；预览为独立命名空间，避免 key 耦合。

---

## 8. 与 knowledge-bases API 关系

本期 **不改** 预览页 UI 的 API 调用（预览页不调 API）。  
`/api/knowledge-bases/**` 双语消除 console knowledge 管理页在英文 UI 下的中文错误（0.1.16 L1）。见 `spec-api-message-knowledge-bases.md`。

---

## 9. 验收用例

| # | 操作 | 期望 |
| --- | --- | --- |
| 1 | `GET /knowledge/abc`（cookie=en） | 302 `/en/knowledge/abc` |
| 2 | 未登录 `GET /en/knowledge/abc` | redirect `/en/login?redirect=/en/knowledge/abc` |
| 3 | 已登录，他人 kb id | 404 |
| 4 | `/en/knowledge/abc` metadata | 英文 title 模板 + kb.name |
| 5 | 返回链 | 英文「Back to knowledge bases」→ `/en/console/knowledge` |
| 6 | console 预览链 | locale 保持 |
| 7 | 正文中文知识库 | `/en/...` 下正文仍为中文原文 |
