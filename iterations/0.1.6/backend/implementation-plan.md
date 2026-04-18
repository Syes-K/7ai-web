# 实现计划：知识库向量化、检索与分片测试（version 0.1.6 / 阶段 3A）

## 1. 范围与总体目标
本阶段 3A 仅产出服务端实现文档，不写代码。本文档约束后续 3B 的关键行为，尤其是：
- 知识库条目仅支持 `sourceType=text`（文件上传预留扩展点但不实现解析）
- 向量化使用独立的 embedding/vectorizer 模型 agent，把 chunk 与 embedding 写入新增向量表
- 聊天侧每轮先做 needSearch 意图识别，再在助手已配置的 knowledgeBaseIds 上进行 topK + 阈值过滤检索并注入上下文
- 分片测试接口复用相同检索与阈值口径，但不做意图识别
- 向量化失败不阻塞知识库保存；failed 状态跳过检索

---

## 2. 模块化建议（复用与契约）
建议在 3B 落地时拆分为以下服务端模块（以“内部函数契约”为主，不限定文件名）：
1. `kb/chunking`
   - `splitKnowledgeBaseContent({ content, contentFormat }) => chunks[{ chunkIndex, chunkContent, chunkMeta }]`
2. `kb/vectorization`
   - `vectorizeKnowledgeBase({ knowledgeBase, vectorConfig })`
3. `kb/search`
   - `retrieveKnowledgeBaseChunks({ knowledgeBaseIds, query, topK, threshold })`
   - `filterByThresholdAndSort({ scoredChunks, threshold, topK })`
4. `kb/intention`
   - `shouldNeedKnowledgeBaseSearch({ message, knowledgeBases })`
5. `kb/injection`
   - `injectKnowledgeContextToChat({ chatHistoryForModel, retrievedChunks, assistantContext })`
6. `kb/config`
   - `resolveKnowledgeBaseSearchConfig({ overrides, assistantId, userId })`
7. `kb/logging`
   - `logVectorizeTaskStart/End`
   - `logSearchRun`
   - `logChunkTestRun`

> 复用点：`chunk-test` 与聊天侧都调用同一个 `retrieveKnowledgeBaseChunks`，差异仅在于是否调用 `shouldNeedKnowledgeBaseSearch`、以及注入模型的模板不同。

### 2.1 配置解析与优先级（kb/config）
**目的**：在“聊天侧检索”发生前，解析并校验本轮需要使用的 `topK/threshold`，同时输出配置来源，用于日志排障与验收定位。

**默认值（代码默认）**
- `topK = 3`
- `threshold = 0.75`

**优先级（必须按顺序）**
1. 会话/助手级临时覆盖（`overrides` 或会话字段，若未来存在会话临时配置接口）
2. 用户偏好（若用户侧存在偏好存储/接口）
3. 管理端全局默认（若存在管理端配置存储/接口）
4. 代码默认（本期固定）

**本期落地说明**
- 由于本期暂无会话临时/用户偏好/管理端全局默认的对外写入接口，聊天侧配置解析结果固定回退为 `source="code_default"`。
- `POST /api/knowledge-bases/:id/chunk-tests` 的 `topK/threshold` 仅用于该“测试请求本身”，不参与聊天侧的配置解析链路。

**输入与输出（内部函数契约）**
- 输入：`assistantId?`、`userId`、`conversationId?`、`overrides?`
- 输出：`{ topK, threshold, source }`

**校验与失败策略**
- `topK` 必须为正整数（建议上限例如 20，超限按非法处理或回退到默认）
- `threshold` 必须在 `[0,1]`
- 若发现非法值：记录“配置非法”日志并回退到代码默认；聊天侧不因配置问题中断对话。

---

## 3. 向量化（Embedding / Vectorizer Agent）调用流程

### 3.1 触发与并发模型
触发点（来自 3A/API 契约）：
- `POST /api/knowledge-bases` 创建成功后触发
- `PATCH /api/knowledge-bases/:id` 编辑保存后触发
- `POST /api/knowledge-bases/:id/vectorization/retry` 手动重试触发

建议实现方式：
- Route Handler：只做“落库知识库 + 标记 pending + 启动后台任务”，不阻塞请求
- 后台任务：在 NodeJS runtime 下异步执行 vectorization；写入成功后更新 `knowledge_bases.vectorStatus/success`，失败则更新为 `failed`

失败不阻塞：
- 保存接口返回成功后，若向量化失败仅更新 `vectorStatus=failed` 与 `vectorError`（脱敏）

### 3.2 pending 状态与轮询
UI 轮询依据：
- `GET /api/knowledge-bases/:id/vectorization` 返回 `vectorStatus` 与最近时间戳

轮询策略（实现建议）：
- 启动时记录 `vectorLastStartedAt=now`
- 成功写入后设置 `vectorUpdatedAt=now`，并将 `vectorLastStartedAt` 可保留或更新为最后一次开始时间
- `pending` 超时处理：本期不要求服务端超时自动失败；超时仅由 UI 停止轮询（如 PRD 建议的 60s）并允许用户手动刷新/重试

### 3.3 清理旧 chunk / 防止混入旧内容（关键）
目标：编辑后检索不应出现旧正文片段（PRD AC-B2 / AC- H5）。

建议采用“版本化口径（vectorContentHash）”：
1. 编辑/重向量化触发时：
   - 计算 `vectorContentHash = sha256(content + contentFormat + sourceType)`
   - 更新 `knowledge_bases.vectorStatus=pending`
   - 将 `vectorContentHash` 写入 `knowledge_bases.vectorContentHash`
2. vectorizer 写入阶段：
   - 生成新的 chunks，并写入 `knowledge_base_vector_chunks`，所有记录带同一个 `vectorContentHash`
3. 检索阶段只读取：
   - `knowledge_bases.vectorStatus=success`
   - 并且只读取 `knowledge_base_vector_chunks.vectorContentHash = knowledge_bases.vectorContentHash`

可选的“旧 chunk 清理策略”（建议二选一并在实现里固定）：
- 方案 A（推荐，安全且简单）：在重向量化开始时删除旧 chunks（按 `knowledgeBaseId` 或旧 `vectorContentHash`），避免表膨胀
  - 风险：若删除后向量化失败，会导致检索结果为空（但检索跳过 failed KB，且 UI 会显示 failed）
- 方案 B（兼容失败回退）：不立即删除旧 chunks；只靠 `vectorContentHash` 过滤避免混入
  - 风险：表增长，需要后续离线清理

本期文档建议：实现可先采用方案 B（更不易破坏），但要注意空间增长风险；若需要严格控制空间再切换到方案 A。

### 3.4 向量化失败与重试
失败写入：
- `vectorStatus=failed`
- `vectorError` 写入脱敏摘要（建议格式：`"embedding_failed: <短原因>"`
- 不影响知识库内容保存与编辑

重试：
- retry 接口触发时重新计算 `vectorContentHash`（基于当前 content）
- 若当前 `vectorStatus=pending`，建议幂等处理：
  - 保持 pending，不重复启动；或启动但在写入时校验 hash 一致（防止旧任务覆盖新任务）

并发一致性（防竞态覆盖）：
- worker 写入前先检查当前 `knowledge_bases.vectorContentHash` 是否仍等于本次任务 hash；
- 若不一致，直接终止写入或仅写入不影响最新版本的内容（并写日志说明已跳过）

---

## 4. 分片（RecursiveCharacterTextSplitter + markdown 等价策略）

### 4.1 splitter 规则（建议参数）
- 基础 splitter：`RecursiveCharacterTextSplitter`
- markdown：使用等价 `fromLanguage("markdown")` 的分隔策略
  - 目标：保留标题/列表/代码块边界，避免把结构性段落切碎在无意义位置
- plain：使用默认递归策略（与 RecursiveCharacterTextSplitter 默认行为一致）

### 4.2 chunk 边界口径
- `chunkIndex`：从 0 开始递增，严格按 splitter 输出顺序赋值
- `chunkContent`：保留原始文本片段（建议不做额外清洗）
- markdown/content 展示在分片测试时仍应对应 splitter 的输出边界

### 4.3 性能保护（建议）
- 内容长度上限（来自 PRD 11 建议）：超限则保存失败或截断（本期建议先阻止保存）
- 最大 chunk 数（建议）：例如 200；超过则：
  - 记录日志与 vectorError
  - 将 vectorStatus 标记 failed（避免 O(N) 扫描过慢）

---

## 5. 检索（topK + 阈值 + 排序 + score 0~1 口径）

### 5.1 score 计算与 0~1 映射（必须落地）
由于阈值与展示必须可解释（0~1），建议实现以下归一化：
- 首先选择相似度指标：cosine similarity（推荐）
- cosine similarity 原始范围 `[-1, 1]`
- 映射到 `[0, 1]`：
  - `score = (cosineSim + 1) / 2`

这样保证：
- 阈值 `0.75` 在口径上有明确含义（越大越相似）
- `score` 越大排序越靠前，满足 PRD 对排序一致性的验收

### 5.2 threshold 与 topK 规则
输入：
- `topK` 默认 3
- `threshold` 默认 0.75

规则（统一用于聊天与 chunk-test）：
1. 过滤阶段：只保留 `score >= threshold` 的 chunks
2. 排序阶段：按 `score` 降序排序；score 相同则按 `chunkIndex` 升序（可选但建议，利于稳定性）
3. 截断阶段：取过滤后前 `topK` 个
4. 返回：为展示列表分配 `rank`（从 1 开始、按最终展示顺序递增）

异常保护：
- `topK` 必须为正整数且在合理区间（建议 1~20）；否则返回 `VALIDATION_ERROR`
- `threshold` 必须在 `[0, 1]`；否则返回 `VALIDATION_ERROR`
- 输入非法时不可触发检索（避免把默认值悄悄带错口径）

### 5.3 多知识库检索合并策略（按 PRD）
PRD 未强制“去重/跨库重排序”，建议实现“全候选合并排序”：
- 在 `knowledgeBaseIds` 范围内收集所有 `vectorStatus=success` 的知识库 chunk
- 对所有 chunk 计算 `score` 并放入同一列表
- 统一按 score 降序取 topK

结果中携带 `knowledgeBaseId` 与 `chunkIndex`，便于后续注入模板或测试 UI 展示。

---

## 6. needSearch 意图识别（保守策略与日志）

### 6.1 输入与输出
输入：
- 当前轮 `message`
- selected knowledgeBases 的 `{ name, description }`

输出：
- `needSearch: boolean`
- `confidence: number`（建议 0~1；若实现无法给出可返回一个固定值如 `0.5`，但需在日志里注明）

### 6.2 默认保守策略（建议）
当意图识别结果不确定：
- 推荐默认：**倾向 needSearch=true**
- 依赖后续 `threshold` 过滤兜底（AC-E1/E2 的验收能通过低命中数体现）

### 6.3 实现建议（不限定手段）
可选实现方式（3B 决策）：
- 方式 A（LLM 分类）：用较小提示词让模型输出结构化 `needSearch/confidence`
  - 优点：对话意图识别更稳
  - 风险：需要额外模型调用成本
- 方式 B（embedding/规则）：对 message 与 KB 名称+描述做相似度阈值判断
  - 优点：速度快、实现轻
  - 风险：缺少“显式意图”可能误判

本阶段文档建议：先落方式 A 或混合方式（A 为主，B 为兜底），并在日志中记录 `needSearch` 与 `confidence`。

---

## 7. 聊天检索注入（复用检索模块）
在现有 `src/server/chat/assistant.ts` / `/api/chat/...` 链路中（3B 实现落点由你们决定），注入时遵循：
1. 每轮先得到 assistant 对应的 knowledgeBaseIds（来自 relation 表）
2. 若未配置任何 KB：直接跳过意图识别与检索（needSearch=false）
3. 若配置非空：执行 `shouldNeedKnowledgeBaseSearch`
4. needSearch=true 时执行 `retrieveKnowledgeBaseChunks`：
   - 跳过 `vectorStatus!=success` 的 KB
   - 用统一的 threshold/topK 规则过滤排序
5. 将检索结果以模板注入本轮模型输入：
   - 只作为上下文，不写库
   - 注入模板需与后续前端/设计共同确定（本期只给约束，不给最终文案）

注入失败处理：
- 若检索返回为空：仍允许模型正常生成回答（避免对话中断）

---

## 8. 分片测试接口与聊天检索复用
分片测试流程：
1. 输入 query/topK/threshold
2. 校验参数合法
3. 要求 `vectorStatus=success`，否则返回空结果或不可用错误并写测试日志
4. 调用同一个 `retrieveKnowledgeBaseChunks`（仅传入该 KB id）
5. 返回结果列表（rank/chunkIndex/score/chunkPreview/chunkContent）

复用原则：
- 无 needSearch：测试入口直接检索
- 相同 `score 口径` 与 `threshold` 过滤逻辑
- 相同排序规则（score desc；score 相同按 chunkIndex）

---

## 9. 日志与可观测性（必须字段）
建议使用现有 `logger.info/error` 埋点体系，事件命名以 `kb.*` 前缀：
1. 向量化任务日志
   - `kb.vectorize.start`
   - `kb.vectorize.end`
   - 必含字段：`knowledgeBaseId`、`contentFormat`、`contentLength`、`chunkCount`、`embeddingModel`、`vectorStatus`、`durationMs`、`vectorError`（脱敏）
2. 检索日志（聊天侧）
   - `kb.search.run`
   - 必含字段：`conversationId/messageId（若可用）`、`assistantId`、`knowledgeBaseIds`、`needSearch`、`needSearchConfidence`、`configSource`、`topK/threshold`、`hitCount`、`shownCount`、`durationMs`
3. 分片测试日志
   - `kb.chunk_test.run`
   - 必含字段：`knowledgeBaseId`、`queryLength`、`topK/threshold`、`hitCount`、`shownCount`、`topScore`、`durationMs`

---

## 10. 风险与回滚/兼容性注意点

### 10.1 分数口径（0~1）不一致
风险：embedding 相似度可能原生范围与阈值口径不一致导致误过滤或阈值无效
对策：固定并在文档中写死映射公式（本节 5.1），并在分片测试接口返回 `score` 以便人工校验。

### 10.2 向量化失败后“旧 chunk 混入”
风险：编辑后旧 chunks 仍参与检索
对策：强制使用 `vectorContentHash` 版本化过滤（本节 3.3）。

### 10.3 阈值非法导致崩溃/错误注入
风险：前端传入非法 topK/threshold
对策：在 chunk-test 与所有可接收 topK/threshold 的入口进行严格校验；聊天侧使用代码默认并不可由用户直接传参（本期）。

### 10.4 向量化任务在运行时中断
风险：若部署为 serverless，in-process 后台任务可能被中断，导致向量化长期 pending
对策：
- 3B 优先使用 nodejs runtime 并避免 serverless 截断（本期 route runtime 可设为 nodejs）
- 作为更稳方案：引入持久化 job/worker 队列（需要新增表或引入现有任务基础设施；本期只在风险里记录，不强制实现）

### 10.5 性能问题（向量检索 O(N) 扫描）
风险：SQLite 无原生向量索引，可能全量扫描导致慢
对策：
- 控制 chunk 数上限
- 以 KB 级范围检索：只扫描 selected knowledgeBaseIds 内的向量
- 后续迭代可引入向量库索引（本期不做）

---

## 11. 验收映射（与 acceptance-criteria 对齐）
| PRD/AC 条目 | 验收点 | 依赖本文档的章节 |
|---|---|---|
| AC-A1~A5 | 必填校验、长度/格式、tags 约束、详情可见 | `api-spec.md` 与实现校验逻辑（1.2/1.4/附带数据模型字段） |
| AC-C1~C4 | 创建后触发向量化、markdown/plain 分片等价、失败不阻塞 | `implementation-plan.md` 的 3/4/3.4 |
| AC-D1~D2 | 助手可多选、0~N 生效、配置更新后对话持续生效 | `api-spec.md` 的 4 节关系表与 5 节 scope |
| AC-E1~E6 | needSearch=不检索/需要检索、topK 默认 3、阈值默认 0.75、配置越界保护、failed KB 跳过 | `implementation-plan.md` 5~7 |
| AC-H1~H6 | 分片测试入口、rank 顺序、chunkIndex/score 展示、topK/阈值生效、编辑后生效、failed 跳过 | `implementation-plan.md` 5~8 |
| AC-G1~G2 | 向量化日志、检索日志齐全；分片测试日志最小要求 | `implementation-plan.md` 9 |

---

## 12. 兼容性与可回滚约束
- 任何对 score 映射或 chunking 参数的调整，必须在日志中记录 `embeddingModel` 与 `chunkingConfigHash`（建议实现），并确保阈值解释仍有效。
- 修改 chunking 参数属于“向量空间语义变化”：应触发全量重向量化并刷新 `vectorContentHash`。

