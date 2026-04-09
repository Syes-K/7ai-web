# 前端实现说明 - version 0.0.2

## 1. 文档定位

- 对应全流程**阶段 4（前端）**，与 `iterations/0.0.2/product/`、`iterations/0.0.2/design/` 及后端 `api-spec` 对齐。
- 认证相关 UI 在 **3B** 已落地；本文件作为阶段 4 的正式汇总与追溯。

## 2. 技术栈与目录

| 项 | 说明 |
| --- | --- |
| 框架 | Next.js 15 App Router、React 19 |
| 样式 | Tailwind CSS；认证页使用赛博 & 科技黑令牌（见设计文档） |
| 数据交互 | `fetch` → `/api/auth/*`（JSON）；会话依赖 **HttpOnly Cookie**，前端不读 token 明文 |

| 路径 | 源码 |
| --- | --- |
| 登录 | `src/app/login/page.tsx`、`src/components/auth/LoginForm.tsx` |
| 注册 | `src/app/register/page.tsx`、`src/components/auth/RegisterForm.tsx` |
| 验证码 | `src/components/auth/CaptchaField.tsx`（`GET /api/auth/captcha`） |
| 认证壳 | `src/components/auth/AuthShell.tsx` |
| 站点导航 | `src/components/placeholders/NavPlaceholder.tsx`（含「注册」链） |

## 3. 路由与渲染

| 路由 | 渲染 | 说明 |
| --- | --- | --- |
| `/login`、`/register` | 默认 RSC 页面 + 内嵌客户端表单（`Suspense` 包裹 `useSearchParams`） | 赛博风全屏布局 |
| `/`、占位业务页 | 既有 RSC/CSR 策略保留 | 首页仍为浅色占位壳，与认证页视觉可不一致（设计允许逐步对齐） |
| `/chat`、`/console` | `/chat` 由 `layout` + middleware 保护；`/console` CSR + `fetch /api/auth/me` | 见后端 implementation-notes |

## 4. 与需求（FR）的对应

| 需求 | 前端实现要点 |
| --- | --- |
| FR-AUTH-001/002 | 登录含邮箱、密码、验证码；注册含邮箱必填、手机可选、昵称、双密码、验证码 |
| FR-AUTH-003 | 登录页链至 `/register`，注册页链至 `/login` |
| FR-AUTH-005 | 展示 API 返回的 `error.message`；登录失败为统一口径（后端保证） |
| FR-AUTH-006 | `LoginForm`/`RegisterForm` 读取 URL `redirect` 并随请求体提交 `redirect` |
| FR-AUTH-007 | 不登录无法完成受保护页的有效会话体验（由 middleware + API 保证） |
| FR-AUTH-009 | 验证码区含刷新；错误后用户可再次获取验证码 |

## 5. 与设计（design-spec / spec-auth-pages）的对应

- **色与氛围**：`AuthShell` 使用深底、青霓虹主色 `#00E5FF`、紫辅助光斑、细网格背景，贴近 `design-spec.md` 令牌。
- **卡片**：圆角约 `rounded-2xl`、边框低对比白、内边距与标题层级贴近设计中的「认证主卡片」。
- **表单控件**：高度约 44px、focus 环与霓虹描边一致方向。

## 6. 运行与构建

```bash
npm install
npm run dev
```

本地访问：`http://localhost:3000/login`、`/register`。数据库与 API 见 `iterations/0.0.2/backend/implementation-notes.md`。

## 7. 与阶段 4 自检

- 详细步骤见同目录 **`test-checklist.md`**。
- 与设计的差异见 **`deviations.md`**。
