# 冒烟测试清单 — 0.1.15 Chat i18n

## 构建

- [x] `npm run build` 通过（Compiled successfully；trace 阶段 `.env` EPERM 为沙箱/权限问题，非代码缺陷）

## 路由与鉴权

- [ ] `GET /chat` → 302 `/{resolvedLocale}/chat`（保留 query）
- [ ] 未登录 `GET /en/chat` → 302 `/en/login?redirect=/en/chat`
- [ ] 登录后 redirect 回到 `/en/chat` 或 `/zh/chat`
- [ ] 旧 `src/app/chat/` 不存在；构建产物含 `/en/chat`、`/zh/chat`，不含裸 `/chat` 页面

## 语言切换

- [ ] `/en/chat` 顶栏 LanguageSwitcher 显示 English；切换后 URL 为 `/zh/chat`（query 保留）
- [ ] `/zh/chat` 切换回 `/en/chat` 后 UI 文案为英文
- [ ] Chat 页 `<title>` / description 随 locale（查看页面 source 或 devtools）

## Chat UI 文案（抽样）

- [ ] 侧栏「新建对话」、空态「暂无历史会话 / No conversations yet」
- [ ] 新建对话弹层：标题、跳过、开始、助手列表空态
- [ ] 删除会话 / 清空消息 confirm 文案与按钮
- [ ] Composer placeholder、发送按钮 title、底部 disclaimer
- [ ] 助手不可用 banner、免费 tier hint（若账号触发）
- [ ] Turn 卡片状态、重试按钮、流式等待轮换提示（英文/中文各测一次）

## 共享 infra

- [ ] Confirm 默认标题/按钮（不传 options 的调用方）为当前 shell locale
- [ ] Console 非白名单跳转 `?notice=admin_forbidden` 提示中英各测（改 cookie `NEXT_LOCALE` 或从 `/en` 首页进 console）

## API 错误

- [ ] 401 在 chat 内触发列表加载 → 跳转 locale 感知 login
- [ ] SSE error 事件 message 为空时 toast/气泡 fallback 非硬编码中文（英文页）

## 跨页链接

- [ ] 首页 `/en` → Chat 链至 `/en/chat`
- [ ] 首页 `/en` 未登录 → Sign in 链至 `/en/login`（**非** `/en/en/login`）
- [ ] Chat 顶栏控制台链至 `/console`（console 尚未 locale 化，见 deviations）

## AI 回复与尾注（验收期）

- [ ] 新建对话发 `hello` → AI 倾向英文回复（系统提示随用户输入语言）
- [ ] 新建对话发 `你好` → AI 倾向中文回复
- [ ] `/en/chat` 下 AI 气泡底部 disclaimer 为英文（`page.chat.output.disclaimer`）
