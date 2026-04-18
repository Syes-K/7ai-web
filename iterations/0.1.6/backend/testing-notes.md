# 测试与联调要点：知识库管理/向量化/检索（version 0.1.6 / 阶段 3A）

## 1. 测试准备
1. 使用项目现有登录态，确保 `getRequestUserContext()` 能返回有效用户
2. 准备至少一条控制台 assistant（用于配置 knowledgeBaseIds 并发起聊天）
3. 启用并准备向量化 embedding model 配置（至少确保成功时能向量化；失败场景可用“错误配置/不可用模型”构造）
4. 观察日志落盘：项目 logger 会写入 `.logs/YYYY-MM-DD-HH.log`（本地 Node 环境）

---

## 2. 端到端联调用例（按 acceptance-criteria）

### 2.1 知识库条目创建与校验（AC-A1~A5）
用例：
1. `POST /api/knowledge-bases` 缺少 `name` 或 `content`
2. `name` 超长（>64）或 `tags` 超量（>20）/单 tag 超长（>20）
3. `contentFormat` 传入非法值（除 `"markdown"|"plain"` 外）
断言：
- 返回 `ErrorCode.VALIDATION_ERROR`（或 400/422，具体以实现为准）
- 成功创建后能 `GET /api/knowledge-bases/:id` 查看：
  - 字段显示正确（内容格式与保存一致）
  - `vectorStatus` 展示为 `pending/success/failed`，且 `updatedAt` 正常

---

### 2.2 向量化：成功/失败不阻塞保存（AC-C1~C4）
用例：
1. 创建一个普通 `plain` 知识库，等待向量化完成（轮询 `GET /api/knowledge-bases/:id/vectorization`）
2. 构造向量化失败场景（例如 embedding model 配置不可用），创建/编辑同样流程
断言（成功）：
- `vectorStatus` 最终为 `success`
- `chunk 测试入口`可执行并返回至少 1 条结果（如果文本足够）
断言（失败）：
- `vectorStatus` 最终为 `failed`
- `vectorError` 存在且为脱敏摘要
- 即便失败，`GET /api/knowledge-bases/:id` 与 `PATCH` 仍可正常进行

---

### 2.3 分片策略：markdown/plain 等价约束（AC-C2~C3）
用例（markdown）：
1. 创建一条 `contentFormat=markdown` 的知识库，正文包含标题/列表/代码块
2. 等待 `vectorStatus=success`
3. 触发 `POST /api/knowledge-bases/:id/chunk-tests`，query 使用正文中的关键信息
断言：
- 分片结果中 `chunkIndex` 的序号连续递增（从 0）
- 命中结果对应的 chunk 内容片段与正文结构边界一致（至少不出现“整段合并成单一 chunk”的异常，除非正文极短）

用例（plain）：
1. `contentFormat=plain` 创建并测试 chunk 数与命中
断言：
- 分片 chunk 数合理（>1，除非正文很短）

---

### 2.4 编辑后向量更新生效（AC-B1/B2/H5）
用例：
1. 创建一条知识库并向量化成功
2. 编辑正文：加入一段“明显可定位”的新信息（如唯一短句）
3. 等待重新向量化成功
4. 执行分片测试：
   - query 直接依赖新信息
断言：
- 测试返回的命中 chunk 只应来源于新正文（通过日志与返回的 chunk 预览可观察）
- 旧正文对应的专有片段不应出现在命中结果中

---

### 2.5 助手管理：knowledgeBaseIds 多选与生效（AC-D1~D2）
用例：
1. 通过 `PUT /api/console/assistants/:assistantId/knowledge-bases` 设置：
   - 空数组（不选任何 KB）
2. 使用该 assistant 发起对话发送一条可能需要检索的消息
3. 再设置为多个 KB（2 个及以上），同样发起对话
断言：
- 空选择：检索链路不应发生（`kb.search.run` 日志应无检索/或 needSearch=false 且 shownCount=0）
- 多选：检索范围限定在所选知识库集合内；连续发送多轮后，assistant 配置仍持续生效

---

### 2.6 意图识别与检索注入（AC-E1~E6）
用例：
1. 选择有明确主题的知识库（success）
2. 给出“明显无关”的问题
3. 给出“明确依赖”的问题
4. 构造一个 `failed` 的知识库并一起配置到 assistant
断言：
- 无关问题：needSearch=false 或等价行为（不触发有效检索/注入；通过日志 shownCount=0 验证）
- 相关问题：needSearch=true 且 shownCount>0，注入发生（通过后端日志或 debug 注入记录）
- failed KB：不参与检索（shownCount 与日志中跳过原因可验证）

顶层默认值用例：
- 不传临时配置：topK 默认 3；threshold 默认 0.75（通过返回注入 chunk 数与分片测试响应的 config.used）

越界保护用例（AC-E5）：
- 对于 chunk-test 入口传入非法 `topK`/`threshold`：返回 `VALIDATION_ERROR`，且日志里不应出现检索执行

---

### 2.7 分片测试接口：排序/展示/阈值/失败跳过（AC-H1~H6）
用例（排序与展示）：
1. 选择一个向量化成功的知识库
2. 调用 `POST /api/knowledge-bases/:id/chunk-tests`：
   - 使用默认 topK=3、threshold=0.75
3. 断言结果列表：
   - rank 从 1 开始递增
   - 列表顺序与后端返回 score 降序一致
   - 每条包含 `chunkIndex`、score（同口径 0~1）、chunkPreview 与 chunkContent（用于复制）

用例（topK 与阈值）：
1. threshold 设为 1：应展示空或接近空（低于阈值不出现）
2. threshold 设为 0：应展示最多 topK 条

用例（failed 不可测）：
1. 对 failed KB 调 chunk-tests
2. 断言：
   - 返回空结果或不可用提示（以实现定稿为准）
   - `kb.chunk_test.run` 仍产生（便于排查）

---

## 3. 日志核对（AC-G1/G2）
在 `.logs/*.log` 中核对以下事件名与字段存在性：
1. 成功/失败向量化：
   - `kb.vectorize.start` 与 `kb.vectorize.end`
   - 必含：`knowledgeBaseId`、`contentFormat`、`contentLength`、`chunkCount`、`embeddingModel`、`vectorStatus`、`durationMs`
2. 检索：
   - `kb.search.run`
   - 必含：`assistantId`、`knowledgeBaseIds`、`needSearch`、`needSearchConfidence`（若有）、`topK/threshold`、`hitCount/shownCount`、`durationMs`
3. 分片测试：
   - `kb.chunk_test.run`
   - 必含：`knowledgeBaseId`、`queryLength`、`topK/threshold`、`hitCount/shownCount`、`topScore`、`durationMs`

脱敏校验：
- failed 的 `vectorError` 与日志字段不得包含明文 key/provider（仅允许短原因摘要）

---

## 4. 回归与边界（建议补充的手工用例）
1. 多 KB 且其中一个 failed：确认 shownCount 仍受阈值/topK 约束，且不会崩溃
2. markdown 内容极短：允许 chunk 数为 1，但 rank/输出仍正常
3. 并发编辑：在 pending 状态下重复点击 retry 或编辑后立即测试，确认 vectorContentHash 版本化不会出现“旧任务覆盖新任务”的数据错乱

