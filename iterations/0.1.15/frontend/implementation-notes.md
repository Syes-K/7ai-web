# 前端实现说明 — version 0.1.15

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.15` |
| 状态 | **已完成** |
| 范围 | Chat 路由迁移、对话页 i18n、共享 shell infra、验收期微调 |
| 上游 | `iterations/0.1.15/product/`、`design/`、`backend/` |

---

## 1. 路由与页面

- 对话页迁入 `src/app/[locale]/chat/`（`layout.tsx` 服务端鉴权 + `page.tsx` 薄壳 + `generateMetadata`）。
- 删除旧 `src/app/chat/`；`/chat` 由 `middleware.ts` 302 至 `/{locale}/chat`。
- 未登录访问 `/{locale}/chat` → `/{locale}/login?redirect=/{locale}/chat`。
- 首页顶栏 `Link href="/chat"` 使用 `@/i18n/navigation`，自动带上当前 locale。

## 2. Message 与 request 配置

- 新增 `messages/{en,zh}/page/chat.json`（约 95 leaf keys，对齐 `copy-chat-en-zh.md`）。
- 新增 `messages/{en,zh}/page/shell.json`（Confirm 默认、modal 遮罩、UserAvatarMenu、ConsoleForbiddenNotice）。
- `src/i18n/request.ts` 加载 `page.chat`、`page.shell`。

## 3. ChatWorkspace i18n

- 用户可见文案统一 `useTranslations('page.chat')`。
- 顶栏新增 `LanguageSwitcher`（`namespace="page.chat"`、`variant="shell"`）。
- Turn 步骤标签、确认框、toast、composer、新建对话弹层、侧栏、drawer 均已 i18n。
- Turn 步骤隐藏逻辑改为比对 `api.message.turnSafe` 中英文字符串集（兼容服务端 locale 响应）。
- 401 客户端跳转：`/${locale}/login?redirect=/${locale}/chat`。
- 流式无 body fallback 使用 `ChatNoResponseBodyError` 类型判断。

## 4. 共享 infra

| 组件 | 实现 |
| --- | --- |
| antd locale | `[locale]/layout.tsx` → `ConfigProvider` + `getAntdLocale()` |
| dayjs | `DayjsLocaleSync` 随 URL locale 切换 |
| ConfirmProvider | `useTranslations('page.shell')` 默认 OK/Cancel/标题 |
| ModalShell | 遮罩 `aria-label` 读 `page.shell.modal.closeOverlay` |
| UserAvatarMenu | `variant="shell"` 读 `getPageShellMessages(cookieLocale)` |
| ConsoleForbiddenNotice | 读 `page.shell.forbiddenNotice.*` |

## 5. 子组件

- `AssistantText.tsx`：流式等待提示读 `page.chat.assistantStreaming.waitTips`。
- `chat-api.ts`：SSE `error` 事件空 message 由 UI 层 fallback `errors.sseUnknown`。

## 6. 运行

```bash
npm run dev
# 或
npm run build && npm start
```

访问 `/en/chat`、`/zh/chat`；旧书签 `/chat` 应 302 到 locale 前缀路径。

## 7. 验收期微调（迭代收尾）

| 项 | 文件 | 说明 |
| --- | --- | --- |
| 首页登录链 | `PunkHomeHeader.tsx` | next-intl `Link` 使用 `/login?redirect=/`，避免 `/en/en/login` |
| AI 输出尾注 | `AssistantOutputRenderer.tsx`、`page/chat.json` | `page.chat.output.disclaimer` |
| LLM 语言 | `constants/index.ts`、`langchain-agent.ts` | 中立系统提示 + 随用户输入语言回复 |
