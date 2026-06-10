# 冒烟测试清单 — 认证页 i18n（version 0.1.14）

在 `npm run dev` 下逐项勾选。Cookie `NEXT_LOCALE` 可辅助验证 middleware 重定向。

**默认语言**：无 cookie 时 `/`、`/login` 应解析为 **`en`**（不随浏览器 `Accept-Language` 变 `zh`）。

---

## 默认 locale（无 cookie）

- [ ] 清除 `NEXT_LOCALE` 后访问 `/` → 302 `/en`
- [ ] 清除 cookie 后 `GET /login` → 302 `/en/login`
- [ ] `Accept-Language: zh-CN` 且无 cookie → 仍为 `/en`（非 `/zh`）

---

## 路由与重定向

- [ ] `GET /login` → 302 `/{resolvedLocale}/login`（保留 query）
- [ ] `GET /register` → 302 `/{resolvedLocale}/register`
- [ ] `/en/login`、`/zh/login` 正常渲染，无控制台报错
- [ ] `/en/register`、`/zh/register` 未登录时 redirect 至 `/{locale}/login?redirect=/register`

---

## 英文 `/en/login`

- [ ] 页面 title：`Sign in | 7ai-web`；h1：`Sign in`；副标题英文
- [ ] 顶栏：`English ▾`（≥640px）或 `EN ▾`（窄屏）+ `Back to home`
- [ ] 表单：Email / Password / Verification code / `Sign in`
- [ ] 测试账号说明英文；默认 email 来自 `testAccount.email`（en: `test2@7ai.club`）；管理员邮箱字面量不变
- [ ] 错误密码提交：API 英文 `error.message` 展示在密码字段下
- [ ] 网络断开（或 mock）：`Network error. Please try again.`

---

## 中文 `/zh/login`

- [ ] h1：`登录`；返回链接：`返回首页`
- [ ] 切换语言 → `/zh/login` 保留 `redirect` query
- [ ] 顶栏 LanguageSwitcher hover 变为青色 `#00E5FF`
- [ ] 点击「返回首页」→ `/zh` 中文首页

---

## 英文 `/en/register`（需管理员已登录）

- [ ] h1：`Create account`；字段标签英文
- [ ] 注册成功：`Account created. Redirecting…`（绿色 status）
- [ ] 「Sign in」链接 → `/en/login`
- [ ] 邮箱已占用：英文字段错误在 Email 下

---

## 中文 `/zh/register`（需管理员已登录）

- [ ] 全表单中文；验证码「刷新」「不区分大小写」
- [ ] 切换至英文 → `/en/register`，query 保留

---

## 首页联动

- [ ] `/en` 顶栏 Sign in → `/en/login?redirect=%2Fen`
- [ ] `/zh` 顶栏登录 → `/zh/login?redirect=%2Fzh`

---

## 语言切换器（认证页）

- [ ] `/en/login?redirect=/chat` 切中文 → `/zh/login?redirect=/chat`
- [ ] 下拉面板样式与首页一致（cyan 边框、zinc 背景）
- [ ] Tab / Esc / 点击外部关闭下拉（与 0.1.13 一致）

---

## 构建

- [ ] `npx tsc --noEmit` 通过
- [ ] `npm run build` 通过；路由表含 `/[locale]/login`、`/[locale]/register`
