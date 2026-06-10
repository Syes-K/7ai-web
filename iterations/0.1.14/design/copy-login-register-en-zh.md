# 登录/注册文案对照表 — 中英双语（version 0.1.14）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.14` |
| 命名空间 | `page/login`、`page/register` |
| 语义源 locale | `en` |
| 上游 | `design-spec-i18n-auth.md` §4、现网 `LoginForm` / `RegisterForm` / `CaptchaField` / `AuthShell` |

> 每个 string 对应唯一英文 key。合规数据（测试邮箱、管理员联系邮箱）**各 locale 值相同、不翻译**。

---

## 1. Metadata

### 1.1 登录（`page.login`）

| Key | en | zh |
| --- | --- | --- |
| `meta.title` | Sign in \| 7ai-web | 登录 \| 7ai-web |
| `meta.description` | Sign in with your email and password. | 使用邮箱登录 |

### 1.2 注册（`page.register`）

| Key | en | zh |
| --- | --- | --- |
| `meta.title` | Create account \| 7ai-web | 注册 \| 7ai-web |
| `meta.description` | Create a new user account (admin only). | 注册账号 |

---

## 2. AuthShell 壳层

### 2.1 登录

| Key | en | zh |
| --- | --- | --- |
| `shell.title` | Sign in | 登录 |
| `shell.subtitle` | Use your email and password to sign in. | 使用邮箱与密码登录 |
| `shell.backToHome` | Back to home | 返回首页 |
| `shell.loading` | Loading… | 加载中… |

### 2.2 注册

| Key | en | zh |
| --- | --- | --- |
| `shell.title` | Create account | 注册账号 |
| `shell.backToHome` | Back to home | 返回首页 |
| `shell.loading` | Loading… | 加载中… |

---

## 3. 语言选择器（与 `page.home` 同值）

登录与注册 JSON **均包含**以下块，供 `LanguageSwitcher` 按页命名空间加载：

| Key | en | zh |
| --- | --- | --- |
| `langSwitcher.ariaLabel` | Language | 语言 |
| `langSwitcher.label.en` | English | English |
| `langSwitcher.label.zh` | 中文 | 中文 |
| `langSwitcher.label.enShort` | EN | EN |
| `langSwitcher.label.zhShort` | 中文 | 中文 |

---

## 4. 登录表单（`page.login`）

| Key | en | zh | 备注 |
| --- | --- | --- | --- |
| `form.email.label` | Email | 邮箱 | |
| `form.password.label` | Password | 密码 | |
| `form.submit` | Sign in | 登录 | |
| `form.submitting` | Signing in… | 登录中… | loading 态 |
| `errors.networkRetry` | Network error. Please try again. | 网络异常，请重试 | catch fallback |
| `errors.loginFailed` | Sign-in failed. | 登录失败 | API 无 message 回退 |

---

## 5. 注册表单（`page.register`）

| Key | en | zh | 备注 |
| --- | --- | --- | --- |
| `form.email.label` | Email | 邮箱 | 含必填 `*` 由组件渲染 |
| `form.telNo.label` | Phone (optional) | 手机号（可选） | |
| `form.telNo.placeholder` | 11 digits, optional | 11 位数字，可留空 | |
| `form.nickName.label` | Display name | 昵称 | |
| `form.password.label` | Password | 密码 | |
| `form.passwordConfirm.label` | Confirm password | 确认密码 | |
| `form.submit` | Create account | 注册 | |
| `form.submitting` | Submitting… | 提交中… | |
| `form.redirecting` | Redirecting… | 即将跳转… | success 后按钮 |
| `form.success` | Account created. Redirecting… | 注册成功，正在跳转… | `role="status"` |
| `form.hasAccount` | Already have an account? | 已有账号？ | |
| `form.signInLink` | Sign in | 登录 | Link 文案 |
| `errors.networkRetry` | Network error. Please try again. | 网络异常，请重试 | |
| `errors.registerFailed` | Registration failed. | 注册失败 | |

**必填星号**：沿用现网 `<span className="text-[#FF5C7A]">*</span>`，不纳入 message。

---

## 6. 验证码（`captcha` 子树，login/register 结构相同）

| Key | en | zh | 备注 |
| --- | --- | --- | --- |
| `captcha.label` | Verification code | 验证码 | |
| `captcha.placeholder` | Not case-sensitive | 不区分大小写 | |
| `captcha.refresh` | Refresh | 刷新 | |
| `captcha.loading` | Loading… | 加载中… | 图片占位 |
| `captcha.empty` | — | — | 无图占位 |
| `captcha.imageAlt` | Verification code image | 图形验证码 | `<img alt>` |
| `captcha.loadFailed` | Could not load verification code. | 验证码加载失败 | 客户端 fallback |

> API 返回的验证码错误走 `api.message`（`captchaRequired`、`captchaInvalid`），非此 key。

---

## 7. 客户端错误 vs API 错误分工

| 来源 | message 位置 | 示例 |
| --- | --- | --- |
| `fetch` 网络异常 | `page.*.errors.networkRetry` | 断网 |
| API 无 body message | `page.*.errors.loginFailed` / `registerFailed` | 空 message 回退 |
| API 业务错误 | 服务端已翻译 `error.message` → `FieldError` | 凭据错误、频控 |
| 验证码图片加载失败 | `page.*.captcha.loadFailed` | GET captcha 失败 |

---

## 8. 登录页测试账号说明（Q6-A）

**结构**：一段说明 + mailto 链接；标签可译，**账号与管理员邮箱字面量不译**。

| Key | en | zh |
| --- | --- | --- |
| `testAccount.intro` | Self-service registration is not available. You can sign in with the default test account below. For special requests, contact the site admin at | 站点暂时不直接提供注册功能，可以使用默认的测试账户登录。如果有特殊需求请联系站点管理员 |
| `testAccount.email` | test@7ai.club | test@7ai.club |
| `testAccount.adminEmail` | kuangyssky@163.com | kuangyssky@163.com |

**渲染建议**（伪结构）：

```
<p className="text-center text-xs text-[#7E8796]">
  {t('testAccount.intro')}{' '}
  <a href="mailto:{adminEmail}">{t('testAccount.adminEmail')}</a>
</p>
```

测试账号 `test@7ai.club` / `test1234` 为 input 默认值（开发便利），**不展示密码**；邮箱字面量 key 保留供未来显式展示。现网仅预填 input，不单独渲染 `testAccount.email` 文案块——key 仍纳入 JSON 以备扩展。

---

## 9. 完整 JSON 终稿 — `messages/en/page/login.json`

```json
{
  "meta": {
    "title": "Sign in | 7ai-web",
    "description": "Sign in with your email and password."
  },
  "shell": {
    "title": "Sign in",
    "subtitle": "Use your email and password to sign in.",
    "backToHome": "Back to home",
    "loading": "Loading…"
  },
  "langSwitcher": {
    "ariaLabel": "Language",
    "label": {
      "en": "English",
      "zh": "中文",
      "enShort": "EN",
      "zhShort": "中文"
    }
  },
  "form": {
    "email": { "label": "Email" },
    "password": { "label": "Password" },
    "submit": "Sign in",
    "submitting": "Signing in…"
  },
  "captcha": {
    "label": "Verification code",
    "placeholder": "Not case-sensitive",
    "refresh": "Refresh",
    "loading": "Loading…",
    "empty": "—",
    "imageAlt": "Verification code image",
    "loadFailed": "Could not load verification code."
  },
  "errors": {
    "networkRetry": "Network error. Please try again.",
    "loginFailed": "Sign-in failed."
  },
  "testAccount": {
    "intro": "Self-service registration is not available. You can sign in with the default test account below. For special requests, contact the site admin at",
    "email": "test@7ai.club",
    "adminEmail": "kuangyssky@163.com"
  }
}
```

---

## 10. 完整 JSON 终稿 — `messages/zh/page/login.json`

```json
{
  "meta": {
    "title": "登录 | 7ai-web",
    "description": "使用邮箱登录"
  },
  "shell": {
    "title": "登录",
    "subtitle": "使用邮箱与密码登录",
    "backToHome": "返回首页",
    "loading": "加载中…"
  },
  "langSwitcher": {
    "ariaLabel": "语言",
    "label": {
      "en": "English",
      "zh": "中文",
      "enShort": "EN",
      "zhShort": "中文"
    }
  },
  "form": {
    "email": { "label": "邮箱" },
    "password": { "label": "密码" },
    "submit": "登录",
    "submitting": "登录中…"
  },
  "captcha": {
    "label": "验证码",
    "placeholder": "不区分大小写",
    "refresh": "刷新",
    "loading": "加载中…",
    "empty": "—",
    "imageAlt": "图形验证码",
    "loadFailed": "验证码加载失败"
  },
  "errors": {
    "networkRetry": "网络异常，请重试",
    "loginFailed": "登录失败"
  },
  "testAccount": {
    "intro": "站点暂时不直接提供注册功能，可以使用默认的测试账户登录。如果有特殊需求请联系站点管理员",
    "email": "test@7ai.club",
    "adminEmail": "kuangyssky@163.com"
  }
}
```

---

## 11. 完整 JSON 终稿 — `messages/en/page/register.json`

```json
{
  "meta": {
    "title": "Create account | 7ai-web",
    "description": "Create a new user account (admin only)."
  },
  "shell": {
    "title": "Create account",
    "backToHome": "Back to home",
    "loading": "Loading…"
  },
  "langSwitcher": {
    "ariaLabel": "Language",
    "label": {
      "en": "English",
      "zh": "中文",
      "enShort": "EN",
      "zhShort": "中文"
    }
  },
  "form": {
    "email": { "label": "Email" },
    "telNo": {
      "label": "Phone (optional)",
      "placeholder": "11 digits, optional"
    },
    "nickName": { "label": "Display name" },
    "password": { "label": "Password" },
    "passwordConfirm": { "label": "Confirm password" },
    "submit": "Create account",
    "submitting": "Submitting…",
    "redirecting": "Redirecting…",
    "success": "Account created. Redirecting…",
    "hasAccount": "Already have an account?",
    "signInLink": "Sign in"
  },
  "captcha": {
    "label": "Verification code",
    "placeholder": "Not case-sensitive",
    "refresh": "Refresh",
    "loading": "Loading…",
    "empty": "—",
    "imageAlt": "Verification code image",
    "loadFailed": "Could not load verification code."
  },
  "errors": {
    "networkRetry": "Network error. Please try again.",
    "registerFailed": "Registration failed."
  }
}
```

---

## 12. 完整 JSON 终稿 — `messages/zh/page/register.json`

```json
{
  "meta": {
    "title": "注册 | 7ai-web",
    "description": "注册账号"
  },
  "shell": {
    "title": "注册账号",
    "backToHome": "返回首页",
    "loading": "加载中…"
  },
  "langSwitcher": {
    "ariaLabel": "语言",
    "label": {
      "en": "English",
      "zh": "中文",
      "enShort": "EN",
      "zhShort": "中文"
    }
  },
  "form": {
    "email": { "label": "邮箱" },
    "telNo": {
      "label": "手机号（可选）",
      "placeholder": "11 位数字，可留空"
    },
    "nickName": { "label": "昵称" },
    "password": { "label": "密码" },
    "passwordConfirm": { "label": "确认密码" },
    "submit": "注册",
    "submitting": "提交中…",
    "redirecting": "即将跳转…",
    "success": "注册成功，正在跳转…",
    "hasAccount": "已有账号？",
    "signInLink": "登录"
  },
  "captcha": {
    "label": "验证码",
    "placeholder": "不区分大小写",
    "refresh": "刷新",
    "loading": "加载中…",
    "empty": "—",
    "imageAlt": "图形验证码",
    "loadFailed": "验证码加载失败"
  },
  "errors": {
    "networkRetry": "网络异常，请重试",
    "registerFailed": "注册失败"
  }
}
```

---

## 13. Key 树（实现对照）

```
page.login | page.register
├── meta.title, meta.description
├── shell.title, shell.subtitle?(login), shell.backToHome, shell.loading
├── langSwitcher.ariaLabel, langSwitcher.label.{en,zh,enShort,zhShort}
├── form.*
│   ├── login: email.label, password.label, submit, submitting
│   └── register: email, telNo, nickName, password, passwordConfirm,
│                  submit, submitting, redirecting, success, hasAccount, signInLink
├── captcha.{label,placeholder,refresh,loading,empty,imageAlt,loadFailed}
├── errors.{networkRetry, loginFailed|registerFailed}
└── testAccount.* (login only)
```
