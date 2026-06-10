# 开放问题与待确认项（version 0.1.14 · i18n 剩余页面与 API）

本文档列出需求阶段尚未定稿、需**产品/用户确认**或交由**设计/开发评审**的决策。确认结果应回写至 `prd.md` 或设计规格后再进入实现。

---

## 须用户确认（产品决策）

### Q1：API 错误响应形态 — 服务端翻译 vs 客户端 messageKey

| 选项 | 说明 |
| --- | --- |
| **A（推荐）** | 服务端按 `resolveRequestLocale` 解析后，在 `jsonError` 中填入已翻译的 `error.message`；客户端逻辑基本不变 |
| B | 响应增加 `error.messageKey`（+ 可选 `params`），客户端用 `useTranslations('api.message')` 渲染；`message` 作回退 |
| C | 混合：认证 API 用 A，其余未来 API 用 B |

**默认建议**：**A**。认证页表单已直接展示 `error.message`；服务端翻译可避免客户端 SSR/CSR 不一致，且本期范围仅限 auth 域，改动面可控。若后续控制台大量 antd 表格错误，可再评估 B。

---

### Q2：本期页面范围 — 是否包含注册页？

| 选项 | 说明 |
| --- | --- |
| **A（推荐）** | 登录 + 注册同步双语（同一 `AuthShell` 模式，工作量增量适中） |
| B | 仅登录页；注册页留 `0.1.15` |

**默认建议**：**A**。注册与登录共享组件与 API 模式；0.1.13 README 已建议登录页，用户原话为「剩余页面」复数，注册是天然相邻入口。

---

### Q3：旧路径 `/login`、`/register` 处理方式

| 选项 | 说明 |
| --- | --- |
| **A（推荐）** | middleware 或 page 级 **302** 至 `/{locale}/login`，locale 由 cookie/Accept-Language/默认 `en` 解析 |
| B | 保留原 page 组件，内部读 cookie 渲染双语但 URL 仍为 `/login`（无 locale 前缀） |
| C | 仅 301 永久重定向（可能影响开发调试） |

**默认建议**：**A**，与 0.1.13 locale 前缀策略一致，利于分享链接与 SEO。

---

### Q4：`VALIDATION_ERROR` 字段映射 — 本期是否重构 map*ApiError？

| 选项 | 说明 |
| --- | --- |
| A | 本期重构：后端对登录/注册校验返回 `details: [{ field, messageKey }]` 或细分 ErrorCode |
| **B（推荐）** | 本期保持 code 分支 + 展示 API message；**英文 message 下**对 `VALIDATION_ERROR` 增加 code 级或 field hint，减少对 `message.includes('邮箱')` 依赖 |
| C | 不改动映射逻辑，接受英文环境下部分校验错误落入 `general` |

**默认建议**：**B**。在不大改后端的前提下，优先保证高频错误（邮箱、密码、验证码）靠 code 映射；复杂注册校验可暂落 `general` 并记录技术债。

---

### Q5：middleware 未登录跳转 login URL 的 locale 来源

| 选项 | 说明 |
| --- | --- |
| **A（推荐）** | 读 `NEXT_LOCALE` cookie → 无则 `Accept-Language` → 默认 `en` |
| B | 始终 `/en/login`（简单但与中文偏好用户不一致） |
| C | 根据 `redirect` 目标路径推断（复杂，不推荐） |

**默认建议**：**A**，与全站 locale 检测链一致。

---

### Q6：登录页测试账号说明块是否双语？

| 选项 | 说明 |
| --- | --- |
| **A（推荐）** | 标签/说明文字翻译；`test@7ai.club` 等字面量不译 |
| B | 本期整段隐藏于 `en`（仅中文环境展示） |
| C | 保持中文不变（英文页出现中文说明块） |

**默认建议**：**A**。学习/演示场景需要；与合规邮箱不翻译原则一致。

---

## 交由设计/开发评审（需求层不限定）

### Q7：带参数 message 格式（登录锁定等）— **已定稿**

| 项 | 定稿 |
| --- | --- |
| 占位格式 | ICU `{minutes}`，next-intl 服务端格式化 |
| 英文单复数 | **本期处理**：`{minutes, plural, one {…# minute…} other {…# minutes…}}` |
| key | `authLoginLocked` |
| 约束 | 中英文语义等价；不泄露额外安全信息 |

详见 `iterations/0.1.14/design/spec-api-message-auth.md` §3。

### Q8：`/[locale]/login` 的 layout 继承 — **已定稿**

| 项 | 定稿 |
| --- | --- |
| layout | **复用** `src/app/[locale]/layout.tsx`（`NextIntlClientProvider` + antd `ConfigProvider`） |
| route group | **不建** `(auth)`；AuthShell 自包含全屏，无首页 footer |
| 页面路径 | `src/app/[locale]/login/page.tsx`、`register/page.tsx` |

详见 `iterations/0.1.14/design/design-spec-i18n-auth.md` §2.2。

### Q9：注册 API 字段级 validation message 拆分粒度 — **已定稿**

| 项 | 定稿 |
| --- | --- |
| 策略 | 各校验场景使用独立 `validation.*` key（见 `spec-api-message-auth.md` §2.2） |
| 回退 | `validationError` 仅用于未知校验 |
| 字段映射 | 前端 Q4-B：code + 中英文 keyword；复杂 case 可落 `general` |

### Q10：`readApiErrorPayload` 与控制台未来的 API i18n — **已定稿**

| 项 | 定稿 |
| --- | --- |
| 本期 | **不扩展** `messageKey` / `params` |
| 客户端 | 继续展示服务端已翻译 `error.message`（Q1-A） |
| 文档 | backend 3A 记录未来扩展点 |

### Q11：antd locale 在认证页 — **已定稿**

| 项 | 定稿 |
| --- | --- |
| 认证表单 | 原生 input/button；CaptchaField 无 antd |
| ConfigProvider | `[locale]/layout` 已按 locale 注入 `enUS`/`zhCN` |
| 本期 | 认证页**无需**额外 antd 包裹 |

### Q12：0.1.15 范围预确认（非阻塞）

- 下一迭代是否默认以 **`/chat` 壳层 + `ConsoleForbiddenNotice` + antd 动态 locale** 为优先？
- 供 roadmap 对齐，**不阻塞** 0.1.14 进入设计。

---

## 已继承自 0.1.13（本期继续有效）

| 决策 | 内容 |
| --- | --- |
| 默认语言 | cookie/URL → **`en`**（不读 `Accept-Language`；见实现后微调） |
| 跨未翻译页 | **静默**保存偏好，无 banner |
| key 规范 | 英文 key；`page`/`api` 分组；page 按页文件；缺失回退 `en` |
| Hero/首页 | 本期不改动 0.1.13 首页实现 |

---

## 确认记录

| 编号 | 决策 | 确认人 | 日期 |
| --- | --- | --- | --- |
| Q1 | **A** — 服务端翻译 `error.message` | 用户（next） | 2026-06-10 |
| Q2 | **A** — 登录 + 注册同步双语 | 用户（next） | 2026-06-10 |
| Q3 | **A** — 旧路径 302 至 `/{locale}/login\|register` | 用户（next） | 2026-06-10 |
| Q4 | **B** — code 优先 + 渐进改进 `map*ApiError` | 用户（next） | 2026-06-10 |
| Q5 | **A**（实现后修订）— cookie → **`en`**；关闭 Accept-Language 推断 | 用户 | 2026-06-10 |
| Q6 | **A** — 测试账号说明双语，字面量不译 | 用户（next） | 2026-06-10 |
| Q7 | **ICU `{minutes}`**；英文 `plural`（`one {# minute} other {# minutes}`）；中文 `{minutes}` 无 plural | 设计 | 2026-06-10 |
| Q8 | **复用** `[locale]/layout.tsx`；不建 `(auth)` route group | 设计 | 2026-06-10 |
| Q9 | 注册校验使用 **`validation.*` 独立 key**（9 场景）；服务端返回已翻译 message | 设计 | 2026-06-10 |
| Q10 | 本期 **不改** `readApiErrorPayload`；backend 文档记 `messageKey` 扩展点 | 设计 | 2026-06-10 |
| Q11 | 认证页 **原生 HTML 表单**；无需单独 antd locale；layout `ConfigProvider` 已覆盖 | 设计 | 2026-06-10 |
| Q12 | 待定（非阻塞） | — | — |

**设计落点**：Q7–Q11 详见 `iterations/0.1.14/design/design-spec-i18n-auth.md` §11、`spec-api-message-auth.md`。

**迭代状态**：**已完成**（2026-06-10）。见 `../README.md`。
