# 对话工作台文案对照表 — 中英双语（version 0.1.15）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.15` |
| 命名空间 | `page.chat`（主）、`page.shell`（共享壳层，见 `spec-shared-infra-i18n.md`） |
| 语义源 locale | `en` |
| 上游 | `design-spec-i18n-chat.md`、现网 `ChatWorkspace.tsx`、`chat-api.ts` |

> 每个 string 对应唯一英文 key。UGC（会话标题、助手名、消息正文、LLM 输出）**不**列入本表。

---

## 1. Metadata

| Key | en | zh |
| --- | --- | --- |
| `meta.title` | Chat \| 7ai-web | 对话 \| 7ai-web |
| `meta.description` | Chat with your assistants and models. | 与助手和模型对话 |

---

## 2. 语言选择器（与 `page.home` 同值）

`page.chat.json` **须包含**完整块，供 `LanguageSwitcher namespace="page.chat"`：

| Key | en | zh |
| --- | --- | --- |
| `langSwitcher.ariaLabel` | Language | 语言 |
| `langSwitcher.label.en` | English | English |
| `langSwitcher.label.zh` | 中文 | 中文 |
| `langSwitcher.label.enShort` | EN | EN |
| `langSwitcher.label.zhShort` | 中文 | 中文 |

---

## 3. 顶栏（`header`）

| Key | en | zh | 备注 |
| --- | --- | --- | --- |
| `header.console.title` | Console | 控制台 | `title` attr |
| `header.console.ariaLabel` | Open console | 打开控制台 | |
| `header.clearMessages.title` | Clear messages in this conversation | 清空当前对话内容 | |
| `header.clearMessages.ariaLabel` | Clear messages in this conversation | 清空当前对话内容 | disabled 时仍可读 |

---

## 4. 侧栏（`sidebar`）

| Key | en | zh | 备注 |
| --- | --- | --- | --- |
| `sidebar.newChat.label` | New chat | 新建对话 | 按钮可见文案 |
| `sidebar.newChat.title` | New chat | 新建对话 | |
| `sidebar.newChat.ariaLabel` | New chat | 新建对话 | |
| `sidebar.empty` | No conversations yet | 暂无历史会话 | |
| `sidebar.assistantUnavailable` | Assistant unavailable | 助手不可用 | 列表行 |
| `sidebar.assistantUnavailableTitle` | Assistant unavailable | 助手不可用 | `title` attr |
| `sidebar.deleteConversation.title` | Delete conversation | 删除会话 | |
| `sidebar.deleteConversation.ariaLabel` | Delete conversation | 删除会话 | |
| `sidebar.drawer.title` | Chat history | 对话历史 | 移动端抽屉 |
| `sidebar.drawer.close` | Close | 关闭 | |
| `sidebar.drawer.openHistory.title` | Open chat history | 打开对话历史 | |
| `sidebar.drawer.openHistory.label` | History | 历史 | 短 label |

**日期格式：** 侧栏时间仍用 `formatLastCommunicationAt` → `YYYY-MM-DD HH:mm`（数字格式不译）。

---

## 5. 消息区（`messages`）

| Key | en | zh | 备注 |
| --- | --- | --- | --- |
| `messages.userFallback` | You | 用户 | 无昵称时 |
| `messages.assistantFallback` | Assistant | 助手 | 无绑定助手 |
| `messages.emptySelect` | Start a new chat or pick one from the sidebar | 请新建对话或从侧栏选择历史 | |
| `messages.emptyThread` | Send a message below to start chatting | 在下方输入框发送消息，即可开始对话 | |
| `messages.assistantUnavailableBanner` | This assistant is no longer available. You can keep chatting or start a new chat with another assistant. | 该助手已无法使用，你可以继续对话或新建对话选用其他助手。 | |

---

## 6. 输入区（`composer`）

| Key | en | zh | 备注 |
| --- | --- | --- | --- |
| `composer.placeholder.ready` | Type a message — Enter to send, Shift+Enter for a new line (Enter selects candidates while composing Chinese/Japanese) | 输入消息 — Enter 发送，Shift+Enter 换行（中文输入法组字时 Enter 用于选字） | |
| `composer.placeholder.noSession` | Create or select a conversation first | 请先新建或选择会话 | |
| `composer.inputAriaLabel` | Message input | 消息输入框 | |
| `composer.send.title` | Send | 发送 | |
| `composer.send.ariaLabel` | Send | 发送 | |
| `composer.send.sending` | Sending… | 传输中… | |
| `composer.disclaimer` | Reminder: Do not enter secrets, illegal content, or sensitive personal data. AI-generated content is for reference only. | 温馨提示：请勿输入涉密、违法或敏感个人信息；AI 生成内容仅供参考。 | |

---

## 7. 免费/共享模型 hint（`freeTierHint`）

| Key | en | zh |
| --- | --- | --- |
| `freeTierHint.beforeLink` | You are on a free or shared model endpoint; responses may be less stable. In | 当前为免费/共享接入，效果可能不稳定。可在 |
| `freeTierHint.link` | Profile & preferences | 个人偏好 |
| `freeTierHint.afterLink` | , connect your own API keys and models for more stable, higher-quality answers. | 绑定自有密钥与模型，获得更稳定、更高质量的回答。 |

渲染：三段拼接 + 中间 `Link` 至 `/{locale}/console/profile`。

---

## 8. 新建对话 Modal（`newChat`）

| Key | en | zh | 备注 |
| --- | --- | --- | --- |
| `newChat.title` | New chat | 新建对话 | Modal 标题 |
| `newChat.createAssistant` | New assistant | 新建助手 | 标题右侧 Link |
| `newChat.description` | Pick an assistant to start, or skip to a general chat. | 选择一个助手并开始对话，或跳过进入普通对话。 | |
| `newChat.skipGeneral` | Skip · General chat | 跳过 · 普通对话 | footer 左按钮 |
| `newChat.start` | Start chat | 开始对话 | footer 主按钮 |
| `newChat.retry` | Retry | 重试 | 加载失败 |
| `newChat.loadFailedInline` | Could not load assistants. Retry or skip to a general chat. | 无法加载助手列表，请重试或跳过进入普通对话。 | 列表区 |
| `newChat.emptyTitle` | No assistants available | 暂无可选助手 | |
| `newChat.emptyHint` | Use "Skip · General chat" below, or click "New assistant" above to create one in the console. | 你可使用下方「跳过 · 普通对话」继续；也可点击标题右侧「新建助手」前往控制台创建。 | |
| `newChat.goToAssistants` | Assistant settings | 去助手管理 | empty 态 Link |

**助手列表项 `name`：** 不翻译。

---

## 9. 确认弹窗（`confirm`）

| Key | en | zh |
| --- | --- | --- |
| `confirm.deleteConversation.title` | Delete conversation | 删除会话 |
| `confirm.deleteConversation.content` | Delete this conversation? All messages will be removed and cannot be recovered. | 确定删除该会话？下属消息将一并删除且不可恢复。 |
| `confirm.deleteConversation.ok` | Delete | 删除 |
| `confirm.deleteConversation.cancel` | Cancel | 取消 |
| `confirm.clearMessages.title` | Clear messages | 清空消息 |
| `confirm.clearMessages.content` | This removes all messages in the conversation. The conversation stays in your list. Deleted content cannot be recovered. Continue? | 将删除本会话中的全部消息，会话仍保留在列表中。清空后无法恢复已删内容，是否继续？ |
| `confirm.clearMessages.ok` | Clear | 清空 |
| `confirm.clearMessages.cancel` | Cancel | 取消 |

默认按钮 Cancel/OK 走 `page.shell.confirm.*`（见 shared infra）。

---

## 10. Toast / 操作错误（`toast` + `errors`）

### 10.1 Toast（API message 优先；以下为 fallback）

| Key | en | zh |
| --- | --- | --- |
| `toast.loadConversationsFailed` | Could not load conversations. | 加载会话列表失败 |
| `toast.loadMessagesFailed` | Could not load messages. | 加载消息失败 |
| `toast.loadAssistantsFailed` | Could not load assistants. | 加载助手列表失败 |
| `toast.createConversationFailed` | Could not create conversation. | 创建会话失败 |
| `toast.deleteFailed` | Could not delete. | 删除失败 |
| `toast.clearFailed` | Could not clear messages. | 清空失败 |
| `toast.sendFailed` | Could not send message. | 发送失败 |

### 10.2 客户端校验 / 特殊（`errors`）

| Key | en | zh |
| --- | --- | --- |
| `errors.emptyInput` | Enter a message. | 请输入内容 |
| `errors.noSession` | Create or select a conversation first. | 请先新建或选择一个会话 |
| `errors.readOnlyBlocked` | This test account is read-only. Sending messages is not allowed. | 测试账户仅支持浏览，不支持发送消息 |
| `errors.networkRetry` | Network error. Please try again. | 网络异常，请重试 |
| `errors.sseUnknown` | Something went wrong. | 未知错误 |
| `errors.noResponseBody` | Empty response from server. | 响应无 body |
| `errors.requestFailed` | Request failed ({status}). | 请求失败（{status}） |

---

## 11. Turn 流式 UI（`turn`）

### 11.1 步骤状态（`turn.status`）

| Key | en | zh |
| --- | --- | --- |
| `turn.status.pending` | Pending | 等待执行 / 等待中 |
| `turn.status.running` | Running | 执行中 / 进行中 |
| `turn.status.completed` | Completed | 已完成 |
| `turn.status.failed` | Failed | 执行失败 / 失败 |
| `turn.status.skipped` | Skipped | 已跳过 |
| `turn.status.interrupted` | Interrupted | 已中断 |

**说明：** `STATUS_TEXT` 与 `buildTurnProcessRows` 的 `statusTone` 可共用同一 key 集；英文统一用较短标签（Table 左列）。

### 11.2 推理状态（`turn.reasoningStatus`）

| Key | en | zh |
| --- | --- | --- |
| `turn.reasoningStatus.not_triggered` | Not triggered | 未触发 |
| `turn.reasoningStatus.running` | Running | 进行中 |
| `turn.reasoningStatus.completed` | Completed | 已完成 |
| `turn.reasoningStatus.failed` | Failed | 失败 |
| `turn.reasoningStatus.interrupted` | Interrupted | 已中断 |

### 11.3 中断原因（`turn.interruption` — Q6-A）

| Key | en | zh |
| --- | --- | --- |
| `turn.interruption.user_cancelled` | You stopped this response. | 你已停止本轮生成 |
| `turn.interruption.network_disconnected` | Network disconnected before the response finished. | 网络中断，本轮未完整返回 |
| `turn.interruption.server_timeout` | The server timed out; this response was interrupted. | 服务响应超时，本轮已中断 |
| `turn.interruption.unknown` | This response ended unexpectedly. You can retry. | 本轮意外中断，可重试 |

### 11.4 阶段标签（`turn.stage`）

| Key | en | zh |
| --- | --- | --- |
| `turn.stage.knowledge` | Knowledge retrieval | 知识库增强 |
| `turn.stage.mcp` | MCP tools | MCP 工具 |
| `turn.stage.skill` | Skills | Skills 调用 |
| `turn.stage.summary` | Summary callback | 摘要回调 |
| `turn.stage.reasoning` | Reasoning | 推理过程 |
| `turn.stage.details` | Details | 详情 |
| `turn.stage.reasoningSummary` | Reasoning summary | 推理摘要 |

**行内模板（实现用 ICU 或拼接）：**

| Key | en | zh |
| --- | --- | --- |
| `turn.stageLine` | {stage} {status}{message, select, empty {} other { · {message}}} | {stage} {status}{message, select, empty {} other { · {message}}} |

`message` 为截断后的 `safeMessage`（服务端 locale 化后传入；可能为空）。

### 11.5 助手卡片 / 重试（`turn.card`）

| Key | en | zh |
| --- | --- | --- |
| `turn.card.status.running` | In progress | 进行中 |
| `turn.card.status.completed` | Completed | 已完成 |
| `turn.card.status.failed` | Failed | 失败 |
| `turn.card.status.interrupted` | Interrupted | 已中断 |
| `turn.card.failurePrefix` | This response failed: | 本轮回复失败： |
| `turn.card.modelFallback` | The model failed. Try again later. | 模型调用失败，请稍后重试。 |
| `turn.card.retryHintFailed` | This attempt failed. You can retry. | 本轮调用失败，可重试。 |
| `turn.card.retryHintInterrupted` | This response was interrupted. You can retry. | 本轮中断，可重试。 |
| `turn.card.retry` | Retry | 重试 |
| `turn.card.retrying` | Retrying… | 重试中... |
| `turn.card.retrySucceeded` | This question was answered successfully after a retry. | 该问题已重试成功，无需继续重试。 |
| `turn.card.noStructuredDetails` | No structured details yet | 暂无结构化分段详情 |

### 11.6 屏幕阅读器轮次状态（`turn.a11y`）

| Key | en | zh |
| --- | --- | --- |
| `turn.a11y.currentStep` | Current step {stepKey} {status} | 当前步骤 {stepKey} {status} |
| `turn.a11y.currentTurnRunning` | Current turn {status} | 当前轮次 {status} |
| `turn.a11y.currentTurnCompleted` | Current turn completed | 当前轮次 已完成 |
| `turn.a11y.currentTurnFailed` | Current turn failed | 当前轮次 执行失败 |

`{stepKey}`、`Turn abc12345` 为技术标识，不译。

---

## 12. 客户端 vs API 分工

| 来源 | message 位置 |
| --- | --- |
| REST / SSE `error.message` | 服务端 `api.message` |
| 只读 API | `readOnlyAccountBlocked` |
| 网络 / 空 body | `errors.*` |
| Turn 固定标签 | `turn.*` |
| 确认 destructive | `confirm.*` + `page.shell.confirm.*` 默认按钮 |

---

## 13. 完整 JSON 终稿 — `messages/en/page/chat.json`

```json
{
  "meta": {
    "title": "Chat | 7ai-web",
    "description": "Chat with your assistants and models."
  },
  "langSwitcher": {
    "ariaLabel": "Language",
    "label": {
      "en": "English",
      "zh": "中文",
      "enShort": "EN",
      "zhShort": "中文"
    }
  },
  "header": {
    "console": {
      "title": "Console",
      "ariaLabel": "Open console"
    },
    "clearMessages": {
      "title": "Clear messages in this conversation",
      "ariaLabel": "Clear messages in this conversation"
    }
  },
  "sidebar": {
    "newChat": {
      "label": "New chat",
      "title": "New chat",
      "ariaLabel": "New chat"
    },
    "empty": "No conversations yet",
    "assistantUnavailable": "Assistant unavailable",
    "assistantUnavailableTitle": "Assistant unavailable",
    "deleteConversation": {
      "title": "Delete conversation",
      "ariaLabel": "Delete conversation"
    },
    "drawer": {
      "title": "Chat history",
      "close": "Close",
      "openHistory": {
        "title": "Open chat history",
        "label": "History"
      }
    }
  },
  "messages": {
    "userFallback": "You",
    "assistantFallback": "Assistant",
    "emptySelect": "Start a new chat or pick one from the sidebar",
    "emptyThread": "Send a message below to start chatting",
    "assistantUnavailableBanner": "This assistant is no longer available. You can keep chatting or start a new chat with another assistant."
  },
  "composer": {
    "placeholder": {
      "ready": "Type a message — Enter to send, Shift+Enter for a new line (Enter selects candidates while composing Chinese/Japanese)",
      "noSession": "Create or select a conversation first"
    },
    "inputAriaLabel": "Message input",
    "send": {
      "title": "Send",
      "ariaLabel": "Send",
      "sending": "Sending…"
    },
    "disclaimer": "Reminder: Do not enter secrets, illegal content, or sensitive personal data. AI-generated content is for reference only."
  },
  "freeTierHint": {
    "beforeLink": "You are on a free or shared model endpoint; responses may be less stable. In ",
    "link": "Profile & preferences",
    "afterLink": ", connect your own API keys and models for more stable, higher-quality answers."
  },
  "newChat": {
    "title": "New chat",
    "createAssistant": "New assistant",
    "description": "Pick an assistant to start, or skip to a general chat.",
    "skipGeneral": "Skip · General chat",
    "start": "Start chat",
    "retry": "Retry",
    "loadFailedInline": "Could not load assistants. Retry or skip to a general chat.",
    "emptyTitle": "No assistants available",
    "emptyHint": "Use \"Skip · General chat\" below, or click \"New assistant\" above to create one in the console.",
    "goToAssistants": "Assistant settings"
  },
  "confirm": {
    "deleteConversation": {
      "title": "Delete conversation",
      "content": "Delete this conversation? All messages will be removed and cannot be recovered.",
      "ok": "Delete",
      "cancel": "Cancel"
    },
    "clearMessages": {
      "title": "Clear messages",
      "content": "This removes all messages in the conversation. The conversation stays in your list. Deleted content cannot be recovered. Continue?",
      "ok": "Clear",
      "cancel": "Cancel"
    }
  },
  "toast": {
    "loadConversationsFailed": "Could not load conversations.",
    "loadMessagesFailed": "Could not load messages.",
    "loadAssistantsFailed": "Could not load assistants.",
    "createConversationFailed": "Could not create conversation.",
    "deleteFailed": "Could not delete.",
    "clearFailed": "Could not clear messages.",
    "sendFailed": "Could not send message."
  },
  "errors": {
    "emptyInput": "Enter a message.",
    "noSession": "Create or select a conversation first.",
    "readOnlyBlocked": "This test account is read-only. Sending messages is not allowed.",
    "networkRetry": "Network error. Please try again.",
    "sseUnknown": "Something went wrong.",
    "noResponseBody": "Empty response from server.",
    "requestFailed": "Request failed ({status})."
  },
  "turn": {
    "status": {
      "pending": "Pending",
      "running": "Running",
      "completed": "Completed",
      "failed": "Failed",
      "skipped": "Skipped",
      "interrupted": "Interrupted"
    },
    "reasoningStatus": {
      "not_triggered": "Not triggered",
      "running": "Running",
      "completed": "Completed",
      "failed": "Failed",
      "interrupted": "Interrupted"
    },
    "interruption": {
      "user_cancelled": "You stopped this response.",
      "network_disconnected": "Network disconnected before the response finished.",
      "server_timeout": "The server timed out; this response was interrupted.",
      "unknown": "This response ended unexpectedly. You can retry."
    },
    "stage": {
      "knowledge": "Knowledge retrieval",
      "mcp": "MCP tools",
      "skill": "Skills",
      "summary": "Summary callback",
      "reasoning": "Reasoning",
      "details": "Details",
      "reasoningSummary": "Reasoning summary"
    },
    "card": {
      "status": {
        "running": "In progress",
        "completed": "Completed",
        "failed": "Failed",
        "interrupted": "Interrupted"
      },
      "failurePrefix": "This response failed:",
      "modelFallback": "The model failed. Try again later.",
      "retryHintFailed": "This attempt failed. You can retry.",
      "retryHintInterrupted": "This response was interrupted. You can retry.",
      "retry": "Retry",
      "retrying": "Retrying…",
      "retrySucceeded": "This question was answered successfully after a retry.",
      "noStructuredDetails": "No structured details yet"
    },
    "a11y": {
      "currentStep": "Current step {stepKey} {status}",
      "currentTurnRunning": "Current turn {status}",
      "currentTurnCompleted": "Current turn completed",
      "currentTurnFailed": "Current turn failed"
    }
  }
}
```

---

## 14. 完整 JSON 终稿 — `messages/zh/page/chat.json`

结构与 §13 对称；表 §1–§11 右列「zh」为权威译文。`langSwitcher.label.en` / `enShort` 在 zh 文件中值仍为 `English` / `EN`。

**Key 数量（`page.chat`）：** 约 **95** 个 leaf string（含嵌套对象内条目；不含 shell）。

---

## 15. 英文措辞原则（D1）

- 对话场景用 **chat / conversation / message**，避免过度 formal。
- 危险操作用 **Delete / Clear**，与按钮语义一致。
- 「Assistant」作为无绑定时的 fallback，不用 "Bot"。
- 加载/发送进行中用 **…**（`Sending…` / `Retrying…`）。
- IME 提示英文略长但保留技术准确性（Chinese/Japanese composing）。
