# API 规范：知识库管理与检索（version 0.1.6 / 阶段 3A）

## 文档信息
| 项 | 内容 |
|---|---|
| 对齐 | `iterations/0.1.6/product/prd.md`、`iterations/0.1.6/product/acceptance-criteria.md`、`iterations/0.1.6/design/design-spec.md` |
| 目标 | 本期仅“直接文本输入”的知识库 CRUD、向量化状态/重试、分片测试、助手管理页知识库多选配置、以及聊天侧检索契约（内部函数） |
| 技术约定 | Route Handler 使用 `withApiWrapper`；错误统一 `jsonError({ code, message, details? })` |
| 鉴权约定 | 绝大多数接口需要登录，统一用 `getRequestUserContext()`；未登录返回 `401` 且 `ErrorCode.UNAUTHORIZED` |

---

## 0. 通用约定
### 0.1 错误响应格式（所有 API）
```json
{
  "error": {
    "code": "ErrorCode",
    "message": "人类可读说明",
    "details": [
      { "field": "字段名", "message": "字段级错误说明" }
    ]
  }
}
```

### 0.2 返回字段口径（知识库实体）
本期对齐 PRD 的字段需求，字段名在此文档中定稿如下：
- `contentFormat`: `"markdown"` | `"plain"`
- `sourceType`: `"text"`（本期固定值；文件上传仅预留扩展点）
- `vectorStatus`: `"pending"` | `"success"` | `"failed"`
- `vectorError`: 字符串；**脱敏**后的失败原因摘要（禁止暴露 provider/model/apiKey 等敏感信息）
- 另建议补充可观测字段：`vectorUpdatedAt`（最近成功向量化时间）、`vectorLastStartedAt`（最近一次开始向量化时间）

---

## 1. 知识库：CRUD（仅直接文本输入）
> 路由建议放在 `src/app/api/knowledge-bases/**/route.ts`（3B 实现按项目目录组织调整时，同步更新本文档）

### 1.1 `GET /api/knowledge-bases` — 列表
auth 假设：登录用户；仅返回当前登录用户（userId）拥有的知识库；不返回其它用户的数据。
幂等/重试建议：GET 可安全重试（不改变服务器状态）。
#### 请求查询参数
| 参数 | 类型 | 默认 | 说明 |
|---|---:|---:|---|
| `page` | integer | 1 | 页码（建议 ≥ 1） |
| `pageSize` | integer | 20 | 每页条数（建议 1-50） |
| `keyword` | string | `""` | 名称/描述搜索（可选） |
| `tags` | string[] | `[]` | tag 精确筛选（可选：`tags=a&tags=b`） |

#### 响应（200）
```json
{
  "items": [
    {
      "id": "string",
      "name": "string",
      "description": "string|null",
      "tags": "string[]|null",
      "contentFormat": "markdown|plain",
      "sourceType": "text",
      "vectorStatus": "pending|success|failed",
      "vectorUpdatedAt": "ISO8601|null",
      "updatedAt": "ISO8601"
    }
  ],
  "total": 0,
  "page": 1,
  "pageSize": 20
}
```
说明：列表项不建议返回 `content`，以避免大正文造成带宽/性能问题。

#### 错误码建议
- 未登录：`401` / `ErrorCode.UNAUTHORIZED`
- 参数非法：`400` 或 `422` / `ErrorCode.VALIDATION_ERROR`

---

### 1.2 `POST /api/knowledge-bases` — 新建（触发向量化）
auth 假设：登录用户；仅允许创建/向量化写入当前登录用户拥有的知识库。
#### 请求体（JSON）
| 字段 | 类型 | 规则 |
|---|---|---|
| `name` | string | 必填，trim 后 1-64 字符；建议同一用户范围唯一 |
| `description` | string | 可选，0-500 字符 |
| `tags` | string[] | 可选，最多 20 个；单 tag 1-20 字符 |
| `contentFormat` | `"markdown" \| "plain"` | 必填 |
| `content` | string | 必填；建议设置长度上限（例如 50k 字符） |
| `sourceType` | `"text"` | 本期固定传/回：`"text"`（文件上传仅预留扩展点） |
| `file` | unknown | 本期不实现；如前端携带应返回 `VALIDATION_ERROR`（扩展点 sourceType=file 预留） |

#### 响应（201）
```json
{
  "item": {
    "id": "string",
    "name": "string",
    "description": "string|null",
    "tags": "string[]|null",
    "contentFormat": "markdown|plain",
    "content": "string",
    "sourceType": "text",
    "vectorStatus": "pending",
    "vectorError": "string|null",
    "vectorUpdatedAt": "ISO8601|null",
    "updatedAt": "ISO8601"
  }
}
```
说明：创建成功后立即触发向量化异步流程；返回 `vectorStatus=pending`（或在极小内容场景下可直接 success，但本文档不强制）。

#### 幂等/重试建议
- 服务端按“知识库 id”非幂等；前端重试需避免重复点击提交（UI loading 防抖）。
- 若后端支持去重，可基于 `(userId,name,contentHash)` 设计幂等，但本期不要求。

#### 错误码建议
- 未登录：`401` / `ErrorCode.UNAUTHORIZED`
- 校验失败：`400` 或 `422` / `ErrorCode.VALIDATION_ERROR`（可带 `details`）
- 服务端异常：`500` / `ErrorCode.INTERNAL_ERROR`

---

### 1.3 `GET /api/knowledge-bases/:id` — 详情
auth 假设：登录用户；仅返回当前登录用户拥有的知识库。
幂等/重试建议：GET 可安全重试（不改变服务器状态）。
#### 响应（200）
```json
{
  "item": {
    "id": "string",
    "name": "string",
    "description": "string|null",
    "tags": "string[]|null",
    "contentFormat": "markdown|plain",
    "content": "string",
    "sourceType": "text",
    "vectorStatus": "pending|success|failed",
    "vectorError": "string|null",
    "vectorUpdatedAt": "ISO8601|null",
    "vectorLastStartedAt": "ISO8601|null",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

#### 错误码建议
- 未登录：`401` / `ErrorCode.UNAUTHORIZED`
- `id` 不存在或不属于当前用户：`404` /（建议新增 `ErrorCode.KNOWLEDGE_BASE_NOT_FOUND`，3B 若不新增可复用 `ErrorCode.INTERNAL_ERROR` 但语义需在日志中说明）
- 服务端异常：`500` / `ErrorCode.INTERNAL_ERROR`

---

### 1.4 `PATCH /api/knowledge-bases/:id` — 编辑（触发向量化）
auth 假设：登录用户；仅允许编辑当前登录用户拥有的知识库。
#### 请求体（JSON）
字段同 `POST`，但支持部分更新：
- `name/description/tags/contentFormat/content`：若出现则进行校验并覆盖
- `sourceType`：不允许变更（本期固定 `text`）；若前端传入非 `text` 返回校验错误

#### 响应（200）
```json
{
  "item": {
    "...": "同 GET 200 的 item 结构",
    "vectorStatus": "pending"
  }
}
```

#### 错误码建议
- 未登录：`401` / `ErrorCode.UNAUTHORIZED`
- 校验失败：`400` 或 `422` / `ErrorCode.VALIDATION_ERROR`

#### 幂等/重试建议
- 与新增一致，按 `id` 非幂等；前端通过按钮 loading 防抖。

---

## 2. 向量化状态与重试
> 路由建议：`src/app/api/knowledge-bases/[id]/vectorization*/route.ts`

### 2.1 `GET /api/knowledge-bases/:id/vectorization` — 轮询向量化状态
auth 假设：登录用户；仅返回当前登录用户拥有的知识库向量化状态。
幂等/重试建议：GET 可安全重试（不改变服务器状态）。
#### 响应（200）
```json
{
  "status": {
    "vectorStatus": "pending|success|failed",
    "vectorError": "string|null",
    "vectorUpdatedAt": "ISO8601|null",
    "vectorLastStartedAt": "ISO8601|null"
  }
}
```

#### 错误码建议
- 未登录：`401` / `ErrorCode.UNAUTHORIZED`
- 不存在/越权：`404` /（同上知识库 not found 建议映射）

---

### 2.2 `POST /api/knowledge-bases/:id/vectorization/retry` — 重试向量化
auth 假设：登录用户；仅允许触发当前登录用户拥有的知识库向量化重试。
#### 请求体
- 无 body 或 `{}`（允许无参）

#### 响应（200/202）
```json
{
  "status": {
    "vectorStatus": "pending"
  }
}
```

#### 重试与并发建议
- 若当前已 `pending`：建议返回 `200` 并保持 `pending`（幂等行为），或返回 `429/409` 阻止重复触发（本期建议优先“保持 pending”以减少前端复杂度）。
- 若并发触发两次 retry：以“最后一次触发”为准，最终以 `vectorUpdatedAt` 与 vectorContentHash 匹配结果为准（详见 `data-models.md` 的版本口径建议）。

#### 错误码建议
- 未登录：`401`
- 越权：`404`
- 服务端异常：`500` / `ErrorCode.INTERNAL_ERROR`

---

## 3. 分片测试（Chunk Test）
> 用于知识库详情页“测试分片/检索”，不做意图识别、不生成回答。

### 3.1 `POST /api/knowledge-bases/:id/chunk-tests`
auth 假设：登录用户；仅允许在当前登录用户拥有的知识库上执行分片测试。
#### 请求体（JSON）
| 字段 | 类型 | 默认 | 说明 |
|---|---:|---:|---|
| `query` | string | N/A | 必填；建议 trim 后非空 |
| `topK` | integer | 3 | 1-20（越界返回校验错误） |
| `threshold` | number | 0.75 | 0-1；非法返回校验错误 |

#### 行为契约
- 仅在该知识库 `vectorStatus=success` 时返回结果；若 `pending`/`failed`：
  - `pending`：建议返回 `200` + `results:[]` 并提示“向量化中”（但 UI 可能已禁用入口）
  - `failed`：建议返回 `422` 或 `400` 的校验类错误，或返回空结果并带 `unavailableReason` 字段（需与前端联调定稿）

#### 幂等/重试建议
- 在同一 `knowledgeBaseId/query/topK/threshold` 下，结果期望一致；可按相同参数重试（但 embedding 模型版本/实现差异可能导致分数微小变化）。

#### 响应（200）
```json
{
  "config": { "topK": 3, "threshold": 0.75 },
  "summary": {
    "hitCount": 10,
    "shownCount": 3
  },
  "results": [
    {
      "rank": 1,
      "chunkIndex": 12,
      "score": 0.812,
      "chunkPreview": "string（截断预览）",
      "chunkContent": "string（用于复制）"
    }
  ],
  "durationMs": 120
}
```

#### 排序/阈值口径（必须）
- `results` 必须按 `score` 降序返回
- `rank` 从 1 开始，按最终展示列表顺序递增（已过滤低于 `threshold` 的项不参与 rank）
- 列表最多展示 `topK` 条

#### 错误码建议
- 未登录：`401`
- 参数非法：`400/422` / `ErrorCode.VALIDATION_ERROR`
- 不存在/越权：`404`
- 服务端异常：`500` / `ErrorCode.INTERNAL_ERROR`

---

## 4. 控制台：助手管理页知识库多选配置
> 目标：把“某助手可用知识库集合”绑定到 assistant；对话时系统以该集合作为检索范围。

### 4.1 `GET /api/console/assistants/:assistantId/knowledge-bases`
auth 假设：控制台用户已登录；assistantId 需为当前用户可读（通常为其个人 assistant，具体按现有控制台鉴权规则扩展）。
幂等/重试建议：GET 可安全重试（不改变服务器状态）。
#### 响应（200）
```json
{
  "assistantId": "string",
  "knowledgeBaseIds": ["kb1","kb2"]
}
```

#### 错误码建议
- 未登录：`401`
- 未找到/越权：`404` 或 `403`（建议对未授权资源统一返回 404，避免枚举）

---

### 4.2 `PUT /api/console/assistants/:assistantId/knowledge-bases`
auth 假设：控制台用户已登录；仅允许在当前用户可管理的 assistant 上绑定知识库（否则返回 404/403，具体按现有鉴权风格保持一致）。
#### 请求体（JSON）
| 字段 | 类型 | 规则 |
|---|---|---|
| `knowledgeBaseIds` | string[] | 必填；允许为空数组（等价“取消选择全部”） |

#### 响应（200）
```json
{
  "knowledgeBaseIds": ["...最终落库的列表"]
}
```

#### 生效规则（必须对齐 PRD）
- 该配置属于“助手级”，不是会话临时选择
- 使用该助手创建的对话在后续消息中，检索范围以当前助手配置的 `knowledgeBaseIds` 为准（直到助手配置更新）

#### 权限假设
- 控制台 `assistants` 路由现状：`PATCH` 仅允许“本人个人助手”。本接口建议同样约束：
  - assistant scope = `Personal` 且 userId 匹配：允许
  - assistant scope = `System` 或不属于当前用户：返回 `404`（或 `403`，但建议统一 404）

#### 幂等/重试建议
- PUT 语义按集合覆盖：请求顺序不影响结果
- 建议服务端实现为“事务内：删除不在集合中的关系 + 插入新关系”

---

## 5. 聊天侧：知识库意图识别与检索注入（内部函数契约）
> 不新增 HTTP 路由；需要在现有 `invokeAssistantReply` / `streamAssistantReply` 链路中调用本模块。

### 5.1 `resolveAssistantKnowledgeBaseScope`
**输入**
- `assistantId: string | null`
- `userId: string`

**输出**
- `knowledgeBases: Array<{ id; name; description; vectorStatus }>`（从 assistant-knowledge-bases 关系表取，按用户可见/权限过滤）
- `knowledgeBaseIds: string[]`（仅保留已选择集合，后续检索会再跳过 vectorStatus!=success）

**失败策略**
- assistantId 为空或未配置：`knowledgeBases=[]`（对话不做检索；needSearch=false）

---

### 5.2 `resolveKnowledgeBaseSearchConfig`
**目的**：解析本轮聊天检索使用的 `topK/threshold`，并标记配置来源（会话临时/用户偏好/全局默认/代码默认），确保配置口径可解释、可排障。

**输入**
- `assistantId: string | null`（用于未来按助手级配置扩展；本期可不使用）
- `userId: string`
- `conversationId?: string`（用于未来会话临时配置扩展；本期可不使用）
- `overrides?: { topK?: number; threshold?: number }`（若未来存在“会话临时配置接口”，调用方在此提供覆盖值；本期可能为 `undefined`）

**输出**
```json
{
  "topK": 3,
  "threshold": 0.75,
  "source": "session" | "user_preference" | "global_default" | "code_default"
}
```

**优先级（必须按顺序）**
1. 会话/助手级临时覆盖（`overrides` 或已落库会话字段）
2. 用户偏好（若用户侧存在偏好存储/接口）
3. 管理端全局默认（若存在管理端配置存储/接口）
4. 代码默认（本期固定）

**本期落地说明（无外部配置写入接口时）**
- 本期未提供会话临时/用户偏好/管理端全局默认的对外写入接口，因此聊天侧解析结果固定为 `source="code_default"`。
- `POST /api/knowledge-bases/:id/chunk-tests` 的 `topK/threshold` 仅用于“测试请求本身”，不参与聊天侧配置解析。
- 未来落地（会话临时优先级）：在聊天发送接口的请求体新增可选字段（例如 `knowledgeBaseSearchConfig: { topK, threshold }`），并把该字段映射为 `resolveKnowledgeBaseSearchConfig(..., overrides)` 的入参即可启用该优先级；用户偏好/全局默认同理通过后续配置接口落库后被读取。

**校验与失败策略**
- 若优先级来源提供了非法值（`topK` 非正整数、`threshold` 不在 `[0,1]`），记录检索配置非法日志并回退到代码默认。
- 聊天侧不因配置问题中断对话：即使 needSearch=true，也只会使用回退后的安全配置。

---
### 5.3 `shouldNeedKnowledgeBaseSearch`
**目的**：基于知识库 `name + description` 做 needSearch 意图识别。

**输入**
- `message: string`（用户当轮消息）
- `knowledgeBases: Array<{ id; name; description }>`

**输出**
```json
{
  "needSearch": true,
  "confidence": 0.0,
  "reason": "string（用于检索日志排障）"
}
```

**保守策略（默认建议）**
- 当模型返回不确定或置信度较低：**倾向 needSearch=true**（由后续 `threshold` 过滤兜底），降低漏召回风险。

---

### 5.4 `retrieveKnowledgeBaseChunks`
**输入**
- `knowledgeBaseIds: string[]`
- `query: string`
- `topK: number`（来自 `resolveKnowledgeBaseSearchConfig` 的已校验结果）
- `threshold: number`（来自 `resolveKnowledgeBaseSearchConfig` 的已校验结果，0~1）
- （可选）`maxChunkCandidatesPerKB?: number`（用于性能保护）

**输出**
- `chunks: Array<{ knowledgeBaseId; chunkIndex; score; chunkContent }>`，已完成阈值过滤、按 score desc 排序，并最多 topK 个
- `hitCount`（命中数：不含阈值过滤或含口径待定，建议与展示一致用于 UI 展示）

**score 口径（必须）**
- `score` 必须落在 `[0,1]`，并且满足“越大越相似”的排序单调性（详见 `implementation-plan.md`）。

**vectorStatus 过滤（必须）**
- 对所有候选知识库：仅使用 `vectorStatus=success` 的知识库向量空间；
- `pending`/`failed` 的知识库跳过并写检索日志原因。

---

### 5.5 `injectKnowledgeContextToChat`
**输入**
- `assistantContext: { needSearchResult, retrievedChunks }`
- `chatHistoryForModel: BaseMessage[]`（调用处已准备）

**输出**
- `historyWithInjectedKnowledge: BaseMessage[]`（仅用于模型本轮输入，不写库）

**注入模板建议（需 3B 与设计/前端联调）**
- 以 System message 方式注入，例如：
  - `【知识库检索结果】`
  - `知识库：${name}`
  - `片段（chunkIndex=${chunkIndex}，score=${score}）`
  - `...chunkContent...`

---

## 6. 幂等/重试建议（汇总）
- 写操作（KB 新建/编辑/向量化重试/助手知识库配置）默认非幂等：前端用 loading 防抖。
- 轮询类 GET 与分片测试 POST 建议可重试：
  - 分片测试 POST：按同一 query/topK/threshold 结果应稳定（受 embedding 模型/版本影响时允许差异）。

---

## 7. 需要新增/确认的内容（3A 输出中的“待定项”）
- 错误码：本期知识库 `not found`、`向量化任务不存在` 等业务码是否要新增到 `ErrorCode` 枚举（当前 `src/common/enums/http.ts` 未包含这些项）。
- score 口径：embedding 相似度到 0~1 的映射函数（cosine 归一化 / 距离转相似度）需要在 3B 落到具体实现并在本文档补齐“最终版公式”。
- needSearch 意图识别：采用 LLM 还是基于 embedding/heuristic；本期文档给出默认建议并在风险里标注。

