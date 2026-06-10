# 风险与待确认项 — Chat 域 API i18n（version 0.1.15）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.15` |
| 阶段 | 3A 文档 |

---

## 1. 风险

| ID | 风险 | 影响 | 缓解 |
| --- | --- | --- | --- |
| R1 | **`messages/route.ts` 体量大**（~740 行），SSE + safeMessage 改造易漏 | 英文 UI 仍见中文 turn 步骤 | 按 `implementation-plan.md` Phase 2 子步骤；自测流式主路径 |
| R2 | **`validatePostMessageBody` 签名变更** | 若遗漏调用处编译失败 | 全仓 grep 调用点；TypeScript 编译 gate |
| R3 | **历史 turn 快照中文 safeMessage** | 英文 UI 加载旧会话仍见中文步骤 | PRD/设计已接受；仅新发 turn locale 感知 |
| R4 | **middleware `/en/chat` 鉴权新增** | 与 `[locale]/chat/layout.tsx` 双保险可能重复 redirect | 行为等价即可；layout  rarely 触发 |
| R5 | **`withReadOnlyApi` 全站生效** | console/admin 写 API 英文错误但 UI 仍中文 | PRD 过渡期预期；0.1.16+ 补 UI |
| R6 | **`turnSafe.*` key 增量**（12）未写入 message.json | 运行时 `tApiMessage` 回退 key 字符串 | Phase 0 与 REST key 同批写入；build 前人工检查 JSON |
| R7 | **middleware redirect 升级**（含 locale 前缀） | 旧书签 `redirect=/chat` 登录后可能仍落裸路径 | Frontend `safeRedirectUrl` 可选规范化（非阻塞） |
| R8 | **`details` 面板中文 title**（kb/mcp details） | 英文 UI 调试信息仍中文 | 本期不译；非主流程 toast |

---

## 2. 技术债（ knowingly 保留）

| 项 | 说明 | 建议批次 |
| --- | --- | --- |
| `kbDetailsFromInjection` / `mcpDetailsFromUi` 中文 title | turn 详情抽屉偏调试 | 0.1.16+ 或 Frontend key 化 |
| `injectKbSystemIntoHistoryForHistory` 系统 prompt 中文 | 模型输入，非 UI | 不译（非目标） |
| `CHAT_DEFAULT_CONVERSATION_TITLE` 等常量 | 会话 title 默认中文 | 可后续按 locale 创建；非 API message |
| exception 内部 message 写 turn snapshot `error.message` | 3B 改为 `modelError` | 3B 必须修 |
| `parseApiError` 客户端 fallback 中文 | 多处硬编码 | Frontend Q11-A |

---

## 3. 待确认项

| ID | 项 | 默认建议 | 状态 |
| --- | --- | --- | --- |
| O1 | **Q1 MVP 范围** | 仅 chat + 共享 infra | 设计已按 A 撰写；产品表仍「待确认」 |
| O2 | **`turnSafe.*` 放 `api.message` vs `page.chat`** | **`api.message.turnSafe.*`**（服务端 emit，与 UI turn 标签分离） | 3B 按此实现 |
| O3 | **middleware locale 来源**：`/en/chat` 未登录时 login 前缀用 URL segment 还是 cookie | **URL segment 优先**（与 redirect 一致） | 3B 实现时采用 |
| O4 | **旧 `redirect=/chat` 登录回跳** | Frontend `safeRedirectUrl` 规范化为 `/{locale}/chat` | 可选增强；不阻塞 3B |
| O5 | **SSE `turn_failed.interruptionReason` 是否翻译** | 保持机器码；UI 用 `page.chat.turn.interruption.*` | 已对齐设计 Q6-A |
| O6 | **非 chat API 只读错误提前英文化** | 接受（withReadOnlyApi 横切） | 已纳入 MVP |

---

## 4. 0.1.14 继承项（不变）

| 项 | 结论 |
| --- | --- |
| API 错误形态 | 方案 A：服务端 `error.message` |
| 不加 `error.messageKey` | Q10 |
| `readApiErrorPayload` | 不改 |
| 默认语言 | `en` |

---

## 5. 验收阻塞条件

以下任一未满足则 **3B 不得标为完成**：

1. 4 个 chat route **零**中文硬编码 `jsonError` message（grep 验证）。
2. SSE `event: error` **不**含 provider 内部 exception 字符串。
3. `with-readonly-api.ts` 无 `READ_ONLY_BLOCK_MESSAGE` 常量。
4. `messages/{en,zh}/api/message.json` 含 spec 定义的 **13** REST key。
5. middleware `/chat` → 302、`/en/chat` 未登录 → locale 感知 login。
6. `npm run build` 通过。

**非阻塞**：`turnSafe.*` 全部替换（可分期，但 Q6-A 建议 3B 同批完成）。

---

## 6. 关联文档

- 完整 ErrorCode 表：`api-spec.md` §3
- 自测：`implementation-plan.md` §6
- 产品 open questions：`../product/open-questions.md`
