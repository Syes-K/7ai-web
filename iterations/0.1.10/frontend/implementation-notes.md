# 前端实现说明（version 0.1.10）

## 本轮增量需求（公安备案整改）

### 1) AI 输出统一免责声明

- 文件：`src/components/chat/assistant-output/AssistantOutputRenderer.tsx`
- 调整：对 text/markdown 两类输出统一在末尾追加提示：
  - 「提示：以上内容由 AI 生成，仅供参考，请结合实际情况审慎使用。」

### 2) 输入框底部警示语

- 文件：`src/components/chat/ChatWorkspace.tsx`
- 调整：在输入区底部增加弱提示文案：
  - 「温馨提示：请勿输入涉密、违法或敏感个人信息；AI 生成内容仅供参考。」
- 视觉：`text-[11px]` + 淡色，满足“小字 + 低对比度”。

### 3) 注册入口收敛

- 文件：`src/components/auth/LoginForm.tsx`
  - 移除“注册”跳转入口；
  - 改为联系管理员提示，并提供 `mailto:kuangyssky@163.com`。
- 文件：`src/components/placeholders/NavPlaceholder.tsx`
  - 移除“注册”导航项，避免显式入口。

### 4) 注册页访问守卫（前端侧）

- 文件：`src/app/register/page.tsx`
- 调整：未登录跳转登录页；非管理员不可进入注册页。
