# 实现计划：多轮对话摘要（迭代 0.1.4，阶段 3A）

## 文档信息

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.4` |
| 阶段 | **3A 文档**（本文件仅描述 3B 编码计划，不做代码变更） |
| 关联文档 | `api-spec-conversation-summary.md`、`data-models.md`、设计文档第 6 节 Mermaid |

---

## 1. 目标与边界

### 1.1 目标

- 会话层持久化摘要（`contextSummary` / `contextSummaryUpdatedAt`）。
- 管理端在 `/admin/config` 以单独 Card 管理摘要参数（JSON 落盘到 `data/`）。
- 使用 LangChain `summarizationMiddleware` 触发摘要；摘要子调用与用户主对话复用同一运行时模型解析（`getChatRuntimeModel`，PRD 7.1）。
- 通过 callback 捕获摘要输出并写回会话表，供后续加载读取。
- 聊天接口对外契约不变（7.3：不暴露摘要字段）。

### 1.2 非目标

- 不做前端聊天界面摘要展示。
- 不引入异步队列；首期走同步刷新（触发策略扩展位仅预留）。

---

## 2. 3B 建议任务拆分

1. **配置层（admin + io + constants）**
   - 新增默认常量与类型；
   - 新增 `conversation-summary-config` 读取/合并/写入模块（对齐 prompt-config 代码风格）；
   - 新增管理端 GET/PUT 路由。

2. **数据层（会话实体）**
   - 扩展 `Conversation` 两列；
   - 处理历史数据兼容（null 即未生成摘要）。

3. **LangChain 摘要中间件**
   - 在 `src/server/llm/assistant.ts` 的 `createAgent` 上挂载 `summarizationMiddleware`；
   - `summaryPrompt` 使用 `PromptTemplate` 注入 `maxChars`；
   - `trigger/keep` 与 `mode` 对齐（messages vs tokens）。

4. **摘要落库 callback**
   - 实现 `SummarizationLlmCallbackHandler`（识别 `metadata.lc_source === "summarization"`）；
   - 在 `invokeAssistantReply` 与 `streamAssistantReply` 传入 callbacks；
   - 在消息路由 `onSummary` 中更新 `contextSummary` / `contextSummaryUpdatedAt`。

5. **管理端页面层**
   - `src/app/admin/config/page.tsx`：对话摘要 Card + 保存/恢复默认。

6. **回归与文档收口**
   - 更新 `iterations/0.1.4/backend/implementation-notes.md`；
   - 若字段/错误码有偏差，回写 API 文档。

---

## 3. 关键算法与实现要点

### 3.1 摘要触发与上下文裁剪

- 由 `summarizationMiddleware` 根据 `trigger` / `keep` 与消息内容决定何时摘要、保留多少窗口。
- `mode` 决定主要生效的一组阈值（实现上通过另一侧阈值“极大化”避免双规则同时触发）。

### 3.2 摘要文本落库

1. middleware 触发摘要子 LLM 调用；
2. callback 在 `handleChatModelEnd` / `handleLLMEnd` 提取摘要文本；
3. 路由层 `onSummary` 写回 `Conversation`；
4. 若提取失败/空文本：不写库（保留旧摘要）。

### 3.3 主对话

- 主对话仍通过同一 `createAgent` 执行；对外 API 契约不变。

---

## 4. 风险与缓解

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 摘要调用耗时上升 | 用户首 token 变慢 | 设置摘要调用超时；失败降级继续主对话 |
| 空摘要覆盖旧值 | 上下文丢失 | 非空才写库；失败保留旧摘要 |
| 配置误填导致异常 | 后台保存后运行报错 | 前后端双重校验 + 范围限制 |
| 与 prompt-config 责任重叠 | 维护成本上升 | 文档固定分工：文案在 prompts，数值在 config card |

---

## 5. 测试清单（3B 需覆盖）

- 配置接口：
  - 文件缺失、坏 JSON、合法保存、非法保存。
- 聊天链路：
  - `enabled=false` 时不更新摘要；
  - `enabled=true` 且超过触发阈值时，middleware 触发摘要子调用；
  - callback 将非空摘要写入 `contextSummary`；
  - 摘要子调用失败时主对话仍可返回。
- 数据一致性：
  - 会话删除后摘要列随会话删除；
  - 清空消息时摘要字段清空；
  - 并发消息下不写入空摘要。

---

## 6. 开放项

1. 摘要子调用超时与重试策略（若需硬 SLA）。
2. token 估算是否与生产 tokenizer 对齐（当前为启发式估算 + middleware 内置策略）。

---

## 7. 变更记录

| 日期 | 说明 |
| --- | --- |
| 2026-04-14 | 初稿：任务拆分、伪流程、风险与测试清单。 |
| 2026-04-14 | 同步实现：摘要中间件 + callback 落库；更新测试与开放项。 |
