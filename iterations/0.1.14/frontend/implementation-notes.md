# 前端实现说明 — 认证页 i18n（version 0.1.14）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.14` |
| 状态 | **已完成** |
| 阶段 | 前端（阶段 4） |
| 上游 | product / design / backend 0.1.14 产出 |

---

## 1. 变更摘要

将登录、注册页迁移至 `/{locale}/login`、`/{locale}/register`，全量接入 `next-intl` 页面文案；认证壳层嵌入 `LanguageSwitcher`；API 错误映射按 Q4-B 补强英文 keyword。

---

## 2. 路由与页面

| 路径 | 文件 | 说明 |
| --- | --- | --- |
| `/en/login`、`/zh/login` | `src/app/[locale]/login/page.tsx` | 新建；`generateMetadata` + `getTranslations('page.login')` |
| `/en/register`、`/zh/register` | `src/app/[locale]/register/page.tsx` | 新建；管理员 gate，locale 感知 redirect |
| `/login`、`/register` | 已删除 `src/app/login|register/page.tsx` | middleware 302 至 locale 路径 |

两页复用 `src/app/[locale]/layout.tsx`（`NextIntlClientProvider` + antd `ConfigProvider`）。

---

## 3. 组件改造

### 3.1 `AuthShell`

- 改为 client 组件（承载 `LanguageSwitcher`）。
- 新增 `namespace: 'page.login' | 'page.register'`。
- 顶栏右簇：`LanguageSwitcher variant="auth"` + 返回首页 `Link href="/"`（next-intl 自动加 locale）。
- `shell.backToHome` 从对应命名空间读取。

### 3.2 `LanguageSwitcher`

- 新增 `namespace`（默认 `page.home`）、`variant`（`home` | `auth`）。
- 认证页触发器色：`#9AA3B2` / hover `#00E5FF`；下拉面板与首页一致。
- 切换行为：`router.replace(pathname, { locale })`，保留 query。

### 3.3 表单

| 组件 | 命名空间 | 要点 |
| --- | --- | --- |
| `LoginForm` | `page.login` | 标签、按钮、测试账号块、网络/失败 fallback |
| `RegisterForm` | `page.register` | 全字段 + 成功态；登录链接 `Link href="/login"` |
| `CaptchaField` | 父级传入 `labels` | 避免组件内硬编码 locale |

### 3.4 `map-api-errors.ts`

- `code` 优先映射（CAPTCHA、AUTH_*、RATE_LIMITED、UNAUTHORIZED、FORBIDDEN）。
- `VALIDATION_ERROR`：登录增加 `email`/`password` 英文 keyword；注册在中文基础上补强 `mismatch`、`confirm`、`phone`、`tel`、`display name`、`nick` 等。
- 移除硬编码「登录失败/注册失败」；fallback 由表单传入 `page.*.errors.*`。
- 技术债：仍依赖 message 子串，待 `details[].field` 或细分 ErrorCode（见 design `spec-api-message-auth.md` §4.3）。

### 3.5 `PunkHomeHeader`

- 登录链接已为 `/${locale}/login?redirect=...`（与 0.1.13 首页 locale 一致）。

---

## 4. message 依赖（3B 已写入）

- `messages/{en,zh}/page/login.json`
- `messages/{en,zh}/page/register.json`
- `src/i18n/request.ts` 已加载上述命名空间

客户端**不**使用 `api.message`；直接展示服务端返回的已翻译 `error.message`。

---

## 5. 未改动范围

- `/chat`、`/console`、`/admin` 及其组件
- 服务端 i18n 模块（`resolveRequestLocale`、`tApiMessage`）
- `readApiErrorPayload` 签名与行为

---

## 7. 实现后微调

| 项 | 说明 |
| --- | --- |
| 默认 locale | `localeDetection: false`；无 `NEXT_LOCALE` cookie 时站点默认英文（不读 `Accept-Language`） |
| 测试账号默认 email | `LoginForm` 初始值 `useState(() => t("testAccount.email"))` |

---

## 8. 本地运行

```bash
npm run dev
# 访问 /en/login、/zh/login、/en/register（需管理员 session）
```

验证命令：

```bash
npx tsc --noEmit   # 已通过
npm run build      # 已通过
```
