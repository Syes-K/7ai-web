# 前端实现说明：对话页助手绑定（0.1.2）

## 范围与验证

- **对照**：PRD `iterations/0.1.2/product/prd-assistant-in-chat.md`、设计 `iterations/0.1.2/design/spec-assistant-in-chat.md` §2～§3、API `iterations/0.1.2/backend/api-spec-chat-assistant.md`、后端说明 `iterations/0.1.2/backend/implementation-notes.md`。
- **已核对文件**：
  - `src/components/chat/ChatWorkspace.tsx` — 新建会话弹层与删除确认共用 `ModalShell`（`src/components/ui/modal-shell.tsx`）：顶偏移、遮罩、边框/阴影与底部按钮样式一致；助手列表区 `min-h-[12rem]`、`max-h-[min(18rem,45vh)]`。
  - `src/components/chat/chat-api.ts` — 会话列表/创建类型与 `fetchAssistantsForPicker`（无本次逻辑变更，与设计/API 一致）。

## 新建对话弹层（选助手）

1. **入口**：侧栏「新建对话」、移动端顶栏「+」均调用 `openNewChatModal()`。
2. **数据**：`loadPickerAssistants()` → `GET /api/console/assistants?page=1&pageSize=100`（与控制台可见性一致）。
3. **设计 §3.1 加载中**：列表区域展示与侧栏一致的 **Tailwind `animate-spin` 圆环**；**仅「开始对话」** 在 `pickerLoading` 时 `disabled`；**「跳过 · 普通对话」** 始终可点，可不等列表返回即创建无绑定会话。
4. **设计 §3.2 空列表**：文案 + **「去助手管理创建」** 链至 `/console/assistants`；「开始对话」依赖选中项，空列表时保持禁用；「跳过」样式略加强以体现次要主路径出口。
5. **设计 §3.3 加载失败**：`pickerError` + 列表区上方 **内联提示条**（含 **重试**，调用 `loadPickerAssistants`）；**不再** 对同一错误额外 `toast`，避免与内联重复。
6. **创建**：`finishCreateConversation()` → `POST /api/chat/conversations`，可带 `assistantId` 或省略（普通对话）。

## 侧栏与消息区

- **侧栏列表三行结构**：① **标题**（独占一行）；② **有助手** 时下一行展示 **icon + 名称**（`assistantUnavailable` 时为「🤖 助手不可用」）；③ 再一行 **最后沟通时间** `YY-MM-DD HH:mm`（`lastActivityAt`，回退 `updatedAt`）。
- **`assistantUnavailable`**（后端在 assistants 表无对应行时为 `true`，仍返回会话侧快照）：
  - **列表**：灰色「🤖 助手不可用」占位，**不**再展示助手名称行，避免误读为仍有效。
  - **消息区顶部**：琥珀色 **Inline 提示条**（设计 §3.4 文案）。
  - **助手消息气泡元信息**：降级为泛化 **「助手」**（与设计「泛化标签」分支一致）。

## 与清空/开场白

- 清空行为以后端为准（实现说明：**方案 A**，清空后不再次注入开场白）；前端仅 `clearMessages` + 刷新列表，无额外注入逻辑。
