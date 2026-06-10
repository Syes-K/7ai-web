# 设计说明 — 认证页 i18n（version 0.1.14）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.14` |
| 阶段 | 设计（阶段 2） |
| 上游 | `iterations/0.1.14/product/prd.md`、用户故事三份、`open-questions.md` |
| 风格基线 | `iterations/0.1.13/design/design-spec-i18n.md` |
| 文案终稿 | `copy-login-register-en-zh.md` |
| API 文案 | `spec-api-message-auth.md` |
| 顶栏规格 | `spec-auth-shell-language-switcher.md` |
| 路由规格 | `design-spec-routing-locale.md` |

---

## 1. 已确认产品决策（设计基线）

| 编号 | 决策 | 设计落点 |
| --- | --- | --- |
| Q1-A | 服务端按 locale 翻译 `error.message` | `spec-api-message-auth.md` §1 |
| Q2-A | 登录 + 注册同步双语 | `copy-login-register-en-zh.md` |
| Q3-A | 旧路径 **直接 302** → `/{locale}/login\|register`，无过渡页 | `design-spec-routing-locale.md` §2 |
| Q4-B | ErrorCode 优先映射字段；`VALIDATION_ERROR` 渐进补强 | `spec-api-message-auth.md` §4 |
| Q5-A | middleware locale：cookie → Accept-Language → `en` | `design-spec-routing-locale.md` §3 |
| Q6-A | 测试账号说明双语；邮箱字面量不译 | `copy-login-register-en-zh.md` §8 |
| Q7 | ICU `{minutes}` + 英文 plural | `spec-api-message-auth.md` §3 |
| Q8 | 复用 `[locale]/layout.tsx` | §2 |
| Q9 | 注册校验独立 validation key | `spec-api-message-auth.md` §2 |
| Q10 | 本期不改 `readApiErrorPayload` | `spec-api-message-auth.md` §5 |
| Q11 | 认证表单为原生控件；layout 已有 antd ConfigProvider | §4 |

---

## 2. 信息架构与路由（摘要）

### 2.1 路由树（本期变更）

```
/en/login、/zh/login          → 登录页（AuthShell + LoginForm）
/en/register、/zh/register    → 注册页（AuthShell + RegisterForm，管理员 gate）

/login、/register             → 302 → /{resolvedLocale}/login|register（保留 query）
/chat、/console、/admin/*      → 未接入 i18n（保持现网路径）
/api/*                        → 无 locale 前缀
```

完整 middleware 流程见 **`design-spec-routing-locale.md`**。

### 2.2 Layout 继承（Q8 定稿）

| 项 | 定稿 |
| --- | --- |
| 认证页 layout | **复用** `src/app/[locale]/layout.tsx` |
| Provider | `NextIntlClientProvider` + `ConfigProvider`（antd locale 随 URL segment） |
| 独立 `(auth)` route group | **不需要**；AuthShell 自包含全屏壳层，无首页 footer |
| `html lang` | 由 `LocaleHtmlLang` 随 `[locale]` 更新（AC-C2） |
| metadata | 各 page 使用 `generateMetadata` + `getTranslations('page.login'|'page.register')` |

**页面文件目标结构：**

```
src/app/
  [locale]/
    layout.tsx              # 已有：intl + antd ConfigProvider
    page.tsx                # 首页（0.1.13）
    login/
      page.tsx              # 新增：迁移自 app/login/page.tsx
    register/
      page.tsx              # 新增：迁移自 app/register/page.tsx
  login/page.tsx            # 改为 redirect 或删除（middleware 302 优先）
  register/page.tsx         # 同上
```

### 2.3 跨页 locale 链路

| 场景 | 行为 |
| --- | --- |
| `/en` 首页 → Sign in | `href="/{locale}/login?redirect=/{locale}"` → `/en/login?redirect=%2Fen` |
| `/en/login` 切换中文 | → `/zh/login?redirect=...`（query 保留） |
| 未登录访问 `/chat` | → `/{locale}/login?redirect=/chat`（locale 来自 cookie 链） |
| 登录成功 `redirect=/chat` | 进入仍为中文的 `/chat`（静默，延续 0.1.13） |
| 登录成功 `redirect=/en` | 进入英文首页 |

---

## 3. 页面结构与组件

### 3.1 AuthShell 结构

```
AuthShell
├── header（顶栏，见 spec-auth-shell-language-switcher.md）
│   ├── BrandMark（左）
│   └── 右侧簇：LanguageSwitcher + 返回首页 Link
├── main（居中卡片）
│   ├── h1 title（来自 page.*.shell.title）
│   ├── p subtitle（可选，登录页）
│   └── children（LoginForm / RegisterForm）
└── 背景层（网格、光晕 — 无文案，不改动）
```

### 3.2 表单错误展示（与现网一致）

| 类型 | 位置 | 组件 |
| --- | --- | --- |
| 字段级错误 | 对应 `<input>` 正下方 | `FieldError` |
| 验证码服务端错误 | 验证码输入框下方（CaptchaField 内） | `<p role="alert">` |
| 验证码加载失败 | 验证码区域底部 | 同上 |
| 通用错误（频控、账号禁用、门禁等） | 提交按钮**上方** | `FieldError`（`errors.general`） |
| 注册成功 | 提交按钮上方 | `<p role="status">` 绿色 |

**原则**：API 返回的已翻译 `error.message` 经 `map*ApiError` 映射后原样传入 `FieldError`；客户端 fallback 使用 `page.*.errors.*` key。

### 3.3 组件 i18n 改造范围

| 组件 | 改造要点 |
| --- | --- |
| `AuthShell` | 接收已翻译 `title`/`subtitle`/`backToHome` 或由内部 `useTranslations`；嵌入 `LanguageSwitcher` |
| `LoginForm` | 全部 label、button、fallback、测试账号块走 `page.login` |
| `RegisterForm` | 全部 label、placeholder、button、链接、success 走 `page.register`；登录链接 `href="/{locale}/login"` |
| `CaptchaField` | label、placeholder、刷新、加载态、客户端 loadError 走父级传入的 `t` 或共享 `page.*.captcha` |
| `FieldError` | 无固定文案，仅展示 message |
| `LanguageSwitcher` | 增加 `namespace` prop（默认 `page.home`）；认证页传 `page.login` / `page.register` |
| `map-api-errors.ts` | code 优先；英文 `VALIDATION_ERROR` keyword 补强（见 spec-api-message-auth §4） |

---

## 4. 视觉与交互（Punk / 赛博黑）

### 4.1 延续 0.1.13 + 现网 AuthShell

| 元素 | 规格 |
| --- | --- |
| 页面背景 | `linear-gradient(180deg,#050608,#0B0F14)` + 青色网格 + 光晕（现网 AuthShell） |
| 卡片 | `rounded-2xl border-white/[0.08] bg-[#12161F]/95` |
| 主色 CTA | `#00E5FF` 按钮，与首页 accent 一致 |
| 标签文字 | `text-[#9AA3B2]` |
| 错误色 | `#FF5C7A`（FieldError、input error border） |
| 成功色 | `#3EE08F`（注册成功） |

### 4.2 英文文案原则（D1）

- 自然、简洁，避免生硬直译（如用 "Sign in" 而非 "Log in account"）。
- 安全相关错误保持语义等价且不泄露账号存在性（`authInvalidCredentials` 中英文统一为泛化提示）。
- 按钮加载态用进行时：`Signing in…` / `Creating account…`。

### 4.3 antd 与认证页（Q11 定稿）

| 项 | 定稿 |
| --- | --- |
| 认证表单控件 | **原生** `<input>`、`<button>`（现网） |
| CaptchaField | 原生 `<img>` + `<button>` |
| antd 使用 | 认证页**无** antd 表单/输入组件 |
| ConfigProvider | `[locale]/layout` 已注入 `enUS`/`zhCN`；本期认证页不额外包裹 |
| 若未来引入 antd | 自动继承 layout ConfigProvider，无需单独处理 |

### 4.4 动效

| 项 | 定稿 |
| --- | --- |
| 语言切换 | 整页导航（`router.replace`），**无**确认框、**无** toast |
| 表单字段 | 切换语言后已填内容**保留**（整页导航重渲染，state 丢失属已知限制；若实现层需保留可用 sessionStorage，**非本期必须**） |
| 主内容区 | 可选 150ms fade（与 0.1.13 §7 一致）；默认可即时替换 |

---

## 5. message 文件与加载

### 5.1 新增文件

| 路径 | 命名空间 |
| --- | --- |
| `messages/{en,zh}/page/login.json` | `page.login` |
| `messages/{en,zh}/page/register.json` | `page.register` |
| `messages/{en,zh}/api/message.json` | `api.message`（填充本期 key） |

### 5.2 `src/i18n/request.ts` 扩展

```typescript
// 设计示意 — 实现时并行 import
messages: {
  page: {
    home: pageHome.default,
    login: pageLogin.default,    // 新增
    register: pageRegister.default, // 新增
  },
  api: {
    message: apiMessage.default, // 已有占位，本期填充
  },
}
```

### 5.3 key 规范（延续 0.1.13）

- 英文 camelCase / 点分嵌套。
- `en` 为语义源；`zh` 结构对称；缺失回退 `en`。
- 合规字面量（测试邮箱、管理员邮箱）各 locale **值相同**。

### 5.4 共享 langSwitcher key

`page.login` 与 `page.register` 均包含与 `page.home` **同值** 的 `langSwitcher.*` 块（便于 `LanguageSwitcher` 按页命名空间加载，避免跨页依赖 `page.home`）。

---

## 6. 与需求 AC 对照

| 用户故事 | 设计落点 |
| --- | --- |
| US-A1–A3 登录双语 + 切换 | `copy-login-register-en-zh.md`、`spec-auth-shell-language-switcher.md` |
| US-B1–B3 注册双语 + gate | `copy-login-register-en-zh.md`、`design-spec-routing-locale.md` §4 |
| US-C1–C2 AuthShell / Captcha | §3、`spec-auth-shell-language-switcher.md` |
| US-D1 page message 文件 | §5、`copy-login-register-en-zh.md` JSON 树 |
| API i18n Epic A–D | `spec-api-message-auth.md` |
| 路由 Epic A–E | `design-spec-routing-locale.md` |

---

## 7. 开放问题回写（Q7–Q11）

| 编号 | 定稿 | 说明 |
| --- | --- | --- |
| **Q7** | ICU `{minutes}` + 英文 `plural` | `authLoginLocked`：`{minutes, plural, one {Try again in # minute.} other {Try again in # minutes.}}`；中文：`登录失败次数过多，请 {minutes} 分钟后再试` |
| **Q8** | 复用 `[locale]/layout.tsx` | 不建 `(auth)` group；认证页为 layout 子路由 |
| **Q9** | 注册校验**独立 validation key** | 服务端按场景选 key（见 `spec-api-message-auth.md` §2）；`validationError` 仅作未知校验回退 |
| **Q10** | 本期**不扩展** `readApiErrorPayload` | Q1-A 下客户端继续读 `error.message`；backend 文档记录未来 `messageKey` 扩展点 |
| **Q11** | 认证页无 antd 表单 | layout 层 ConfigProvider 已足够；CaptchaField 保持原生 |

---

## 8. 非本期 / 0.1.15 预留

- `/chat` 壳层双语、`ConsoleForbiddenNotice`
- 控制台/聊天 API 错误全量 `api/message.json`
- `map*ApiError` 纯 `details[].field` 驱动（去掉 message 子串匹配）
- 共享 `common.langSwitcher` 命名空间（减少三处重复 key）
