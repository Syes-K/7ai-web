# 实现计划：对话页服务端（0.0.6 — 阶段 3B 预览）

> 本文档供 **阶段 3B** 开发使用；**阶段 3A 禁止改代码**。实施前需用户**再次确认**进入 3B。

## 1. 现状对齐（仓库）

| 项 | 现状 |
| --- | --- |
| DataSource | `src/server/db/data-source.ts`：`synchronize: **true**`，实体当前为 `User`、`Session`、`CaptchaChallenge` |
| 鉴权 | `getCurrentUser()`（`src/server/auth/session-user.ts`），Route Handler 中未登录返回 `jsonError` + **401** |
| LLM | `src/server/llm/model.ts` 已使用 **`@langchain/openai`** 的 `ChatOpenAI`；`src/server/llm/index.ts` 仍为占位导出 |
| HTTP 错误 | `@/server/http/json-response`、`@/common/enums` 中 `ErrorCode` / `HttpStatus` |

**迁移策略**：与现状一致时，新实体加入 `entities` 数组后依赖 **`synchronize: true`** 自动建表。若后续改为迁移驱动，需关闭同步并补 TypeORM Migration（独立任务）。

---

## 2. 建议实现顺序（3B）

1. **公共枚举与常量**（`@/common/enums`、`@/common/constants`、`@/common/types`）  
   - `MessageRole`、分页默认值、错误码扩展（如 `CONVERSATION_NOT_FOUND`）。

2. **实体**  
   - `Conversation`、`Message`（`src/server/db/entities/`），更新 `data-source.ts` 注册实体。

3. **领域辅助函数**（可选，`src/server/chat/` 或 `src/server/llm/` 旁）  
   - 标题生成（首条用户消息截断 24～32 字符）、校验 `userId`。

4. **LangChain 编排**（`src/server/llm/`）  
   - 封装 **`buildChatHistory(conversationId)`** → 拉取消息 → 构造 `ChatPromptTemplate` / `MessagesPlaceholder` 或等价链。  
   - 流式：`model.stream()` 或链的 `streamEvents`，与 API SSE 对接。  
   - **禁止**并行引入除 LangChain 外的编排框架（与项目约束一致）。

5. **Route Handlers**（`src/app/api/chat/...`）  
   - 按 [api-spec-chat.md](./api-spec-chat.md) 实现各端点；统一先 `getCurrentUser()`，再查库校验 `userId`。

6. **自测**  
   - 创建会话 → 发消息 → 列表排序 → 切换 → 清空 → 再发消息；越权访问他人 `conversationId` 返回 404。

---

## 3. 与 `src/server/llm` 的对接点

| 对接点 | 说明 |
| --- | --- |
| 入口 | 由 **`POST .../messages`**（及流式分支）调用，而非页面直接调模型。 |
| 输入 | `conversationId`、`userId`、用户新输入 `content`；从 DB 读取该会话 **未清空前** 的历史消息组装上下文。 |
| 模型实例 | 复用 `getModel(model, provider, temperature)` 或封装一层 **`getChatModel()`** 读取环境变量（API Key、模型名）。 |
| 链 | 使用 LangChain 构造 **可注入历史** 的 Chat 链；系统提示词可放常量或后续配置。 |
| 流式 | LangChain 异步迭代 → 转换为 SSE `assistant_delta` / `assistant_done`。 |
| 失败 | 模型异常时尽量不写半条 assistant 消息，或标记失败状态（3B 定稿一种策略）。 |

---

## 4. 风险与缓解

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| **O3 清空与上下文** | 若仅有 DB 消息，清空后即无上下文；若未来有向量/摘要，会不一致 | 3B 仅 DB 则保证请求只读库中消息；扩展存储时 **清空 API 同事务删除派生数据** |
| **长会话 token** | 消息极多时超出模型窗口 | 截断策略（保留最近 N 轮）、或摘要链（后续迭代） |
| **`synchronize: true`** | 生产/schema 漂移风险 | 与现网策略一致；长期建议迁移 |
| **SSE 与 Serverless** | Next Route Handler 长时间连接可能受平台限制 | 监控超时；必要时非流式降级 |
| **并发发送** | 同会话双请求 | 可选会话级互斥或「最后写入优先」；3B 可简化为乐观策略 |

---

## 5. 验收对照（研发自测清单）

- [ ] 未登录访问任一 `/api/chat/*` → **401**  
- [ ] 会话列表仅本人；`updatedAt` **降序**  
- [ ] 清空后会话仍在、`messageCount` 为 0、`title` 回退规则符合设计  
- [ ] 越权 `conversationId` → **404**  
- [ ] 发送消息后列表 **`updatedAt`** 更新，首条用户消息后 **标题** 更新  
- [ ] LangChain 调用路径唯一，无并行编排框架  

---

## 6. 阶段 3B 门禁

实现代码前需：**用户明确确认**阶段 3A 文档（本目录 `api-spec-chat.md`、`data-models.md`、本文）无歧义或已修订定稿；**父 agent** 再派发 3B 编码任务。
