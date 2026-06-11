# Knowledge 预览文案对照表 — 中英双语（version 0.1.17）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.17` |
| 命名空间 | `page.knowledge.*` |
| 文件 | `messages/{en,zh}/page/knowledge.json` |
| 上游 | `design-spec-i18n-knowledge-preview.md` |

> UGC（`kb.name`、`kb.description`、`kb.content`）**不**列入本表。

---

## 1. Metadata

| Key | en | zh |
| --- | --- | --- |
| `meta.title` | {name} \| Knowledge preview | {name} \| 知识库预览 |
| `meta.titleFallback` | Knowledge preview | 知识库预览 |
| `meta.description` | Preview knowledge base content. | 预览知识库正文内容。 |

---

## 2. 壳层导航

| Key | en | zh |
| --- | --- | --- |
| `backToKnowledgeBases` | Back to knowledge bases | 返回知识库管理 |

`href`：`/console/knowledge`（next-intl `Link`，自动 locale 前缀）。
