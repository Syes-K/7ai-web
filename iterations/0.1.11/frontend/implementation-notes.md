# 前端实现说明（version 0.1.11）

## 本轮目标

围绕聊天页可用性与新建对话弹窗体验做增量优化，解决失败态下用户消息丢失/不可重试问题，并优化弹窗滚动与快捷入口。

## 变更范围

- `src/components/chat/ChatWorkspace.tsx`
- `src/components/ui/modal-shell.tsx`

## 聊天失败态修复

### 1) 修复失败后用户消息丢失

- 新增 `mergeServerMessagesWithPendingLocal(...)`，在拉取服务端消息后合并本地乐观用户消息，避免 `setMessages(items)` 直接覆盖导致消息消失。
- 在 `onTurnStarted` / `onTurnFailed` 中给本地乐观消息补写 `turnId`，确保失败轮次仍可绑定到对应 Turn 卡片。

### 2) 修复失败后无重试入口

- 去除 `onTurnCompleted` / `onTurnFailed` 中对本地乐观消息的提前删除，改为由 `onUserMessage` 统一收敛。
- `onRetry` 透传 `retryUserMessageId` 时，若为本地占位 id（`__local_user__*`）则改传 `null`，避免无效 id 触发后端校验失败。

### 3) 去重与错误回退

- `onUserMessage` 增加同内容本地占位去重逻辑，兼容重试场景的重复用户气泡。
- SSE `onError` 与外层 `catch` 分支改为优先回拉消息/turn 快照，失败时再退化为错误提示，减少界面抖动与误覆盖。

## 聊天卡片展示微调

- `Turn` 行布局由 `justify-between` 调整为弹性+间距布局，`Turn id` 与「进行中」状态之间增加可读间距，避免窄宽下贴靠。
- 移除「当前会话暂无步骤快照」横幅，保留普通消息阅读路径，减少非关键信息干扰。

## 新建对话弹窗优化

### 1) 仅助手列表滚动

- `ModalShell` 新增 `panelClassName`、`bodyClassName`，支持标题/底栏固定与中间内容区独立滚动。
- 新建对话弹窗启用纵向 `flex` 布局，说明与按钮区固定，仅助手列表容器滚动。

### 2) 可见区控制为约 6 个助手

- 助手列表容器改为 `max-h-[min(16.75rem,42vh)]`，在当前行高下可见约 6 项，超过后滚动。

### 3) 轻量「新建助手」入口

- 将「新建助手」入口移到弹窗标题同一行右侧，采用 link 风格（非重按钮）。
- 点击跳转 `/console/assistants` 前关闭弹窗，避免层叠感。

## 自测建议

1. 断网或接口异常时发送消息：用户气泡应保留，失败卡片可见，重试入口可用。
2. 重试同一问题：不应出现重复用户消息；本轮成功后旧失败轮次显示禁用提示。
3. 助手数量 > 6 时打开「新建对话」：标题与底部按钮固定，仅列表滚动。
4. 点击标题右侧「新建助手」：关闭弹窗并跳转助手管理页。
