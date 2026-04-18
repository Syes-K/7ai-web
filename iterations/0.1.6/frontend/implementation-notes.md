# 前端实现说明：知识库管理（0.1.6）

## 1) 已实现页面

### 1.1 控制台 - 知识库管理
- **路径**：`/console/knowledge`
- **文件**：`src/app/console/knowledge/page.tsx`
- **能力**：
  - 列表：按名称/描述关键字搜索、查看/编辑入口
  - 新建/编辑：名称、描述、tags、内容格式（markdown/plain）、正文（仅文本输入），文件上传仅占位提示
  - 详情 Drawer：
    - 向量化状态展示（pending/success/failed）与失败原因
    - `pending` 时自动轮询刷新向量化状态（每 4 秒）
    - 支持“重试向量化”
    - 分片测试入口（仅 `success` 可用）
  - 分片测试 Drawer：
    - 输入 query + topK/threshold
    - 结果展示：rank、chunkIndex、score、chunkPreview
    - 支持复制 chunkContent

### 1.2 控制台 - 助手管理
- **路径**：`/console/assistants`
- **文件**：`src/app/console/assistants/page.tsx`
- **能力**：
  - 在“新建/编辑个人助手”表单中增加 **知识库多选**（`knowledgeBaseIds`）
  - 编辑时拉取当前绑定并回显
  - 保存助手后写回绑定关系

## 2) 依赖的后端接口

### 2.1 知识库
- `GET /api/knowledge-bases`
- `POST /api/knowledge-bases`
- `GET /api/knowledge-bases/:id`
- `PATCH /api/knowledge-bases/:id`
- `GET /api/knowledge-bases/:id/vectorization`
- `POST /api/knowledge-bases/:id/vectorization/retry`
- `POST /api/knowledge-bases/:id/chunk-tests`

### 2.2 助手-知识库绑定（控制台）
- `GET /api/console/assistants/:id/knowledge-bases`
- `PUT /api/console/assistants/:id/knowledge-bases`

## 3) 运行说明（本地）

### 3.1 向量化环境变量
- `KB_EMBEDDING_PROVIDER`（或回退 `CHAT_LLM_PROVIDER`）
- `KB_EMBEDDING_API_KEY`（或回退 `CHAT_LLM_API_KEY`）
- `KB_EMBEDDING_MODEL`（可选）

### 3.2 开发服务器启动提示
- 若遇到 `EMFILE: too many open files, watch`，建议使用 polling 模式启动（见 `package.json` 的 `dev:poll` 脚本）。

