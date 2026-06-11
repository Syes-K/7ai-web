# API 错误消息规格 — knowledge-bases 域（version 0.1.17）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.17` |
| 命名空间 | `api.message` |
| 策略 | **方案 A**：服务端 `tApiMessage` |
| 范围 | `/api/knowledge-bases/**`（5 route 文件） |
| 收益 | 消除 0.1.16 console knowledge 英文 UI 下 API 中文错误（L1） |

---

## 1. 范围与调用点

| 文件 | 方法 |
| --- | --- |
| `knowledge-bases/route.ts` | GET, POST |
| `knowledge-bases/[id]/route.ts` | GET, PATCH, DELETE |
| `knowledge-bases/[id]/vectorization/route.ts` | POST |
| `knowledge-bases/[id]/vectorization/retry/route.ts` | POST |
| `knowledge-bases/[id]/chunk-tests/route.ts` | POST |

**注：** 鉴权走 `getRequestUserContext` 或等价；`UNAUTHORIZED` 复用 `unauthorized`（替换硬编码「未登录」）。

---

## 2. 新增 top-level key

| ErrorCode | key | en | zh |
| --- | --- | --- | --- |
| `KNOWLEDGE_BASE_NOT_FOUND` | `knowledgeBaseNotFound` | Knowledge base not found. | 知识库不存在 |
| `KNOWLEDGE_BASE_REFERENCED_BY_ASSISTANT` | `knowledgeBaseReferencedByAssistant` | Cannot delete: this knowledge base is still linked to one or more assistants. Remove it from Assistant management first. | 该知识库仍被助手引用，请先在「助手管理」中解除知识库绑定后再删除。 |
| `KNOWLEDGE_BASE_CHUNK_TEST_UNAVAILABLE` | `knowledgeBaseChunkTestUnavailable` | Vectorization is not complete; chunk test is unavailable. | 向量化未完成，暂不可测试 |

---

## 3. 复用 validation key

| 现网中文 | key |
| --- | --- |
| 未登录 | `unauthorized` |
| id 无效 | `validation.invalidId` |
| 请求体须为 JSON | `validation.invalidJson` |
| 请求参数不合法 | `validation.invalidParams` |
| 不能为空 | `validation.required` |
| 须为字符串或 null | `validation.stringOrNull` |
| 长度不能超过 N | `validation.maxLength`（`{max}`） |
| 保存失败 | `saveFailedRetry` |

---

## 4. knowledge-bases 专用 validation key（新增或复用）

| 现网中文 | key | en | zh |
| --- | --- | --- | --- |
| 须为字符串数组 | `validation.knowledgeBase.tagsArrayRequired` | tags must be an array of strings. | 须为字符串数组 |
| 最多 N 个标签 | `validation.knowledgeBase.tagsMaxCount` | At most {max} tags allowed. | 最多 {max} 个 |
| 单个标签最长 N 字 | `validation.knowledgeBase.tagMaxLength` | Each tag must be at most {max} characters. | 单个标签最长 {max} 字 |
| contentFormat 枚举 | `validation.knowledgeBase.contentFormatEnum` | contentFormat must be markdown or plain. | 须为 markdown 或 plain |
| sourceType 仅 text | `validation.knowledgeBase.sourceTypeTextOnly` | Only sourceType \"text\" is supported in this release. | 本期仅支持 text |
| PATCH 无字段 | `validation.atLeastOneUpdateField` | （复用 admin 同名 key） | |
| 名称已存在 | `validation.knowledgeBase.nameConflict` | A knowledge base with this name already exists. | 名称已存在，请更换名称 |
| query 不能为空 | `validation.required` | field: query | |
| topK 范围 | `validation.knowledgeBase.topKRange` | topK must be an integer from 1 to 20. | 须为 1–20 的整数 |
| threshold 范围 | `validation.knowledgeBase.thresholdRange` | threshold must be a number from 0 to 1. | 须为 0–1 的数字 |

**标签 helper 改造：** `validateTags(raw, locale)` 返回 `tApiMessage` key 而非中文字符串；或在 route 层映射 `{ ok: false, key, params }`。

---

## 5. 按 Route 覆盖

### 5.1 `route.ts`

| 场景 | key |
| --- | --- |
| GET UNAUTHORIZED | `unauthorized` |
| POST UNAUTHORIZED | `unauthorized` |
| POST invalidJson | `validation.invalidJson` |
| POST field details | `validation.required`, `maxLength`, `stringOrNull`, `knowledgeBase.*` |
| POST 名称冲突 | `validation.knowledgeBase.nameConflict` |
| POST INTERNAL | `saveFailedRetry` |

### 5.2 `[id]/route.ts`

| 场景 | key |
| --- | --- |
| GET/PATCH/DELETE UNAUTHORIZED | `unauthorized` |
| invalidId | `validation.invalidId` |
| NOT_FOUND | `knowledgeBaseNotFound` |
| PATCH invalidJson / details | validation 子 key |
| PATCH 空 body | `validation.atLeastOneUpdateField` |
| DELETE referenced | `knowledgeBaseReferencedByAssistant` |

### 5.3 `vectorization/route.ts` & `retry/route.ts`

| 场景 | key |
| --- | --- |
| UNAUTHORIZED | `unauthorized` |
| NOT_FOUND | `knowledgeBaseNotFound` |

### 5.4 `chunk-tests/route.ts`

| 场景 | key |
| --- | --- |
| UNAUTHORIZED | `unauthorized` |
| invalidId / invalidJson | `validation.invalidId`, `invalidJson` |
| query/topK/threshold details | `validation.required`, `knowledgeBase.topKRange`, `knowledgeBase.thresholdRange` |
| NOT_FOUND | `knowledgeBaseNotFound` |
| CHUNK_TEST_UNAVAILABLE | `knowledgeBaseChunkTestUnavailable` |

---

## 6. details 全 key 化

```typescript
details.push({
  field: "name",
  message: tApiMessage(locale, "validation.maxLength", { max: KNOWLEDGE_BASE_NAME_MAX_LENGTH }),
});
```

---

## 7. 与 console knowledge UI

0.1.16 已 i18n 的 `KnowledgeClient` 使用 `parseApiError` + `page.console.shell.errors.*`。API 双语后：

- toast / Alert 直接展示 `error.message`（已本地化）
- **无需**新增前端 api messageKey 渲染

---

## 8. 冒烟测试

| 场景 | locale | 预期 |
| --- | --- | --- |
| 未登录 GET | en | `unauthorized` 英文 |
| 不存在 id GET | en | `knowledgeBaseNotFound` 英文 |
| 删除仍被助手引用 | zh | `knowledgeBaseReferencedByAssistant` 中文 |
| 分片测试向量化未完成 | en | `knowledgeBaseChunkTestUnavailable` 英文 |
| POST 重名 | zh | `validation.knowledgeBase.nameConflict` 中文 |
| invalid topK | en | `validation.knowledgeBase.topKRange` 英文 |
