# Backend 实现说明（3B）- version 0.0.2

## 1. 范围

- 认证域：**图形验证码**、**注册**、**登录**、**会话 Cookie**、**登出**、**当前用户**。
- 持久化：**TypeORM + SQLite**（默认文件 `./data/app.db`，可用环境变量 `SQLITE_PATH` 覆盖）。
- 密码：**bcryptjs**（10 rounds）。
- 图形验证码：自生成 **SVG**（无外部字体依赖，避免打包路径问题）+ `CaptchaChallenge` 表存答案 sha256；校验成功标记 `consumedAt`；比对**不区分大小写**。

## 2. API 实现路径

| 接口 | 文件 |
| --- | --- |
| `GET /api/auth/captcha` | `src/app/api/auth/captcha/route.ts` |
| `POST /api/auth/register` | `src/app/api/auth/register/route.ts` |
| `POST /api/auth/login` | `src/app/api/auth/login/route.ts` |
| `POST /api/auth/logout` | `src/app/api/auth/logout/route.ts` |
| `GET /api/auth/me` | `src/app/api/auth/me/route.ts` |

## 3. 会话与安全

- Cookie 名：`7ai_session`（`src/server/auth/constants.ts`）。
- 会话表：`sessions`（`src/server/db/entities/Session.ts`）。
- `redirect` 白名单：`/`、`/chat`、`/console`（`src/server/auth/redirect.ts`）。
- 登录失败：**统一**「邮箱或密码错误…」，不区分邮箱是否存在。

## 4. 路由保护

- `src/middleware.ts`：无 `7ai_session` Cookie 时重定向 `/login?redirect=...`（匹配 `/chat`、`/console`）。
- `src/app/chat/layout.tsx`：服务端再次 `getCurrentUser()`，避免过期 Cookie。
- `src/app/console/ConsoleView.tsx`：`fetch /api/auth/me`，401 则跳转登录。

## 5. 本地运行

```bash
cp .env.example .env   # 可选
npm install
npm run dev
```

首次启动会在 `data/app.db` 创建库表（`synchronize: true`，仅适合开发/小项目）。

## 6. 与前端

- 登录页：`src/app/login/page.tsx`（赛博风 `AuthShell` + `LoginForm`）。
- 注册页：`src/app/register/page.tsx`（`RegisterForm`）。

## 7. 已知限制

- 频控为**进程内内存**；多实例需外置存储。
- TypeORM `synchronize` 生产环境应改为迁移脚本。
