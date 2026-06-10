# PRD：i18n 剩余页面与 API（version 0.1.14）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.14` |
| 范围 | 登录/注册页双语与路由迁入 `[locale]`；认证域 API 错误消息双语；跨页 locale 一致性（入口链路） |
| 状态 | **已完成**（2026-06-10） |
| 前置迭代 | `0.1.13`（next-intl 基础架构、首页双语、`page`/`api` 分组约定） |
| 默认语言 | `en`（延续 0.1.13） |
| 支持语言 | `zh`、`en` |
| 关联页面 | `/[locale]/login`、`/[locale]/register`；`AuthShell` 及认证表单组件 |

## 背景与目标

0.1.13 已建立站点级 i18n 基础设施（next-intl、`/[locale]/` 前缀、cookie `NEXT_LOCALE`、首页完整双语与 `LanguageSwitcher`）。当前除首页外，登录 `/login`、注册 `/register`、对话 `/chat`、控制台 `/console`、管理后台 `/admin`、知识库详情 `/knowledge/[id]` 等仍为硬编码中文；API 错误响应 `jsonError(code, message)` 的 `message` 亦以中文为主。

用户明确要求「**continue i18n remain pages and api**」。鉴于全站页面与 API 面广，本期须**分批交付**：优先打通**访客第二入口（登录/注册）**与**认证 API 双语**，并奠定后续 chat/console 迁移的路由与 API message 机制。

**业务动机：**

1. 英语访客从首页进入登录/注册时，不应突然回到全中文界面。
2. 登录/注册表单错误（验证码、凭据、频控）须与界面语言一致，降低理解成本。
3. 将 `login`/`register` 迁入 `[locale]` 路由，消除「首页有 locale、认证页无 locale」的双轨结构。
4. 为 chat/console 等大体量页面与全域 API 错误双语建立可复用模式（ErrorCode → message key）。

**本轮目标：**

1. **登录页、注册页**完整中英双语（含 metadata、壳层、表单 label/按钮/占位/客户端校验提示、加载态）。
2. 将 `/login`、`/register` **迁入** `src/app/[locale]/`；旧路径兼容重定向；middleware 与受保护路由跳转携带 locale。
3. **认证域 API**（`/api/auth/*`）及 middleware 中认证相关错误消息支持双语；定义 locale 传递与 ErrorCode 映射策略。
4. 认证页复用 `LanguageSwitcher`；从 `/en` 首页进入登录保持 `en`。
5. 新增 `page/login`、`page/register` message 文件；填充 `api/message.json` 中**本期范围内**的 key。

**成功指标（可验收）：**

| 指标 | 说明 |
| --- | --- |
| 认证页双语覆盖率 | 登录/注册用户可见 UI 文案（含 metadata）100% 具备中英 key |
| 入口 locale 一致 | 从 `/en` 首页点「Sign in」进入 `/en/login`；从 `/zh` 进入 `/zh/login` |
| 认证 API 双语 | 登录/注册流程中触发的错误（验证码、凭据、频控、账号禁用等）在 `en`/`zh` 下 message 与界面语言一致 |
| 旧链兼容 | 直接访问 `/login`、`/register` 按 cookie/检测策略 302 至带 locale 的等价路径，不 404 |
| 架构可扩展 | 新增 API 错误双语仅需在 `api/message.json` 增 key 并在服务端或前端映射，有文档说明 |
| 主流程不回归 | 登录、注册、登出、受保护页跳转冒烟通过 |

## 目标 / 非目标

### 目标（Goals）

- 登录、注册页面 UI 完整双语。
- `login`、`register` 路由迁入 `[locale]`；更新 `KNOWN_APP_SEGMENTS`、middleware 重定向、首页/壳层链接。
- 认证 API 错误消息双语（见下文「API i18n 范围」）。
- `api/message.json` 填充本期 ErrorCode 对应 key；建立 **ErrorCode ↔ message key** 映射约定。
- 认证页 `AuthShell` 顶栏提供 `LanguageSwitcher` 与 locale 感知的「返回首页」链接。
- `html lang`、页面 metadata 随认证页 locale 变化。
- 迭代文档说明「下一批页面（chat/console）」接入步骤。

### 非目标（Non-goals）

- **本期不做** `/chat` 对话工作台全量文案迁移（列为 `0.1.15` 建议范围；本期仅保证登录后跳转链路不因 locale 改造而断裂）。
- **本期不做** `/console/*`、`/admin/*` 全量文案与 antd Pro 内置中文改造。
- **本期不做** `/knowledge/[id]` 知识库详情页双语。
- **本期不做** 控制台/管理端/聊天/知识库等业务域 API 错误全量双语（除 middleware 通用 `RATE_LIMITED`/`UNAUTHORIZED` 等跨域错误外）。
- **本期不做** API **成功**响应体、流式 SSE、LLM 生成内容的多语言。
- **本期不做** 账号级「界面语言」云端同步与用户配置中心字段。
- **本期不做** 第三语言、RTL、`hreflang`。
- **本期不翻译** 用户生成内容（昵称、对话、知识库正文）、备案号、测试账号邮箱等字面量。
- **本期不改造** `mapLoginApiError` / `mapRegisterApiError` 对中文字符串的字段推断逻辑为纯 code 驱动（可作为后续重构，本期在双语下须保持字段映射正确）。

## 用户与核心场景

### 用户角色

| 角色 | 描述 |
| --- | --- |
| 英语访客（未登录） | 从 `/en` 首页进入登录/注册，期望全英文界面与错误提示 |
| 中文访客（未登录） | 从 `/zh` 或默认策略进入，期望中文体验与 0.1.13 前一致 |
| 管理员 | 通过 `/register` 创建账号（须已登录管理员），期望管理流程不因 i18n 回归失败 |
| 开发者 | 按本期模式为 chat/console 增量接入 message 文件与 API key |

### 核心场景

1. **首页 → 登录（locale 保持）**：访客在 `/en` 点击 Sign in → `/en/login`；表单、验证码、错误均为英文。
2. **直接访问旧登录 URL**：书签 `/login` → 按 `NEXT_LOCALE` / Accept-Language / 默认 `en` → `/en/login` 或 `/zh/login`。
3. **登录失败反馈**：错误邮箱/密码 → API 返回 `AUTH_INVALID_CREDENTIALS` + 本地化 message → 密码字段下方展示对应语言文案。
4. **受保护页未登录跳转**：访问 `/chat` 无 session → 重定向 `/en/login?redirect=/chat`（locale 来自 cookie，非写死中文路径）。
5. **注册页双语**：管理员已登录前提下打开 `/zh/register`，表单与 API 错误为中文；英语管理员路径同理。
6. **认证页切换语言**：在 `/en/login` 切换为中文 → `/zh/login`，表单文案更新；已填字段不强制清空（除非技术实现要求整页导航）。
7. **登录成功跳转**：`redirect` 参数保留；若 redirect 为 `/en` 则回首页英文版；若为 `/chat` 则进入仍为中文的对话页（静默，延续 0.1.13 策略）。

## 功能范围

### 本期要做（In Scope）

#### A. 登录/注册页面国际化

须纳入 `page/login`、`page/register` 翻译 key 的范围（含但不限于）：

| 区域 | 示例（现网中文） |
| --- | --- |
| metadata | `登录 \| 7ai-web`、`使用邮箱登录`；注册页等价项 |
| AuthShell | `返回首页`；顶栏 `LanguageSwitcher` |
| 登录表单 | `邮箱`、`密码`、`图形验证码`、提交按钮、`加载中…` |
| 注册表单 | `邮箱`、`手机号（可选）`、`昵称`、`密码`、`确认密码`、验证码、提交 |
| 客户端错误 | `网络异常，请重试`、`登录失败`、`注册失败` 等 fallback |
| 链接文案 | 「去注册」「已有账号」类入口（若页面存在） |
| 测试账号说明 | 若登录页展示测试账号提示，标签可翻译，账号字面量不译 |

**组件范围：** `src/app/login/page.tsx`、`src/app/register/page.tsx`（迁入后位于 `[locale]`）、`AuthShell`、`LoginForm`、`RegisterForm`、`CaptchaField`、`FieldError` 及认证相关子组件中的用户可见字符串。

#### B. 路由迁移与 locale 一致性

| 项 | 期望 |
| --- | --- |
| 新路由 | `/[locale]/login`、`/[locale]/register`（`locale` ∈ `en` \| `zh`） |
| 旧路由 | `/login`、`/register` → 302 至解析后的 locale 前缀路径，保留 query（如 `redirect`） |
| `KNOWN_APP_SEGMENTS` | 移除 `login`、`register`（由 next-intl 处理） |
| middleware 未登录跳转 | `new URL(\`/${locale}/login\`, ...)`，`locale` 从 `NEXT_LOCALE` cookie 或检测链解析 |
| 首页链接 | `PunkHomeHeader` 登录链接受 `[locale]` 约束（0.1.13 已部分实现 `redirect=/{locale}`，须统一 href 为 `/{locale}/login`） |
| AuthShell 返回首页 | `href="/{locale}"` 而非 `/` |
| 注册页 gate | 未登录管理员的跳转目标须 locale 感知 |

#### C. API 错误消息国际化（认证域 + 通用跨域）

**locale 解析（产品期望，技术定稿见 open-questions）：**

| 优先级 | 来源 |
| --- | --- |
| 1 | Cookie `NEXT_LOCALE`（与 next-intl 一致） |
| 2 | 请求头 `Accept-Language`（`zh*` → `zh`，否则 `en`） |
| 3 | 默认 `en` |

**本期须本地化的 API 与场景：**

| 域 | 端点/位置 | 典型 ErrorCode |
| --- | --- | --- |
| 认证 | `POST /api/auth/login` | `RATE_LIMITED`, `VALIDATION_ERROR`, `CAPTCHA_*`, `AUTH_INVALID_CREDENTIALS`, `AUTH_ACCOUNT_DISABLED` |
| 认证 | `POST /api/auth/register` | 同上 + `AUTH_EMAIL_TAKEN`, `AUTH_TEL_TAKEN`, `UNAUTHORIZED`, `FORBIDDEN`（管理员门禁） |
| 认证 | `GET /api/auth/me` | `UNAUTHORIZED` |
| 认证 | `GET /api/auth/captcha` | 若有用户可见错误 |
| 中间件 | `middleware.ts` `handleProtectedRoute` | `RATE_LIMITED`（站点/路径频控）、`UNAUTHORIZED`（API 未登录） |
| 共享 | `server/auth/admin.ts` | `UNAUTHORIZED` |

**ErrorCode 与 message key 映射策略（产品约定）：**

- `api/message.json` 内 key 使用 **camelCase**，与 ErrorCode 对应，例如：
  - `rateLimited` ← `RATE_LIMITED`
  - `unauthorized` ← `UNAUTHORIZED`
  - `authInvalidCredentials` ← `AUTH_INVALID_CREDENTIALS`
  - `captchaRequired` / `captchaInvalid`
  - `validationError`（通用）；字段级校验可用 `validation.invalidEmail`、`validation.passwordRequired` 等子 key
- **带参数 message**（如登录锁定「请 N 分钟后再试」）：使用 ICU 占位或分 key + 插值，由设计/开发定稿；须中英两套。
- **响应形态（二选一，见 open-questions Q1）**：
  - **方案 A（推荐）**：服务端按 locale 解析后返回已翻译的 `error.message`（客户端继续直接展示）。
  - **方案 B**：响应增加 `error.messageKey`（及可选 `params`），客户端用 `useTranslations('api.message')` 渲染；`message` 保留作回退。

本期至少保证：**登录/注册表单展示的 API 错误**与当前 UI locale 一致。

**前端展示约定：**

- 表单字段错误：继续 `FieldError` 就近展示；文案来自 API `message` 或客户端 `api.message` 映射。
- 通用错误：`errors.general` 展示频控、账号禁用、网络异常等。
- antd `message`/`notification`：认证页若使用，须走 i18n；本期认证表单以字段错误为主。

#### D. 语言选择器扩展（认证页）

- 在 `AuthShell` 顶栏（`BrandMark` 与「返回首页」之间或相邻）嵌入既有 `LanguageSwitcher`。
- 交互与样式延续 0.1.13 首页规范（下拉、键盘可操作、当前语言选中态）。
- 切换后 URL 更新为 `/[locale]/login` 或 `/[locale]/register`，保留 query string。

#### E. 文档与扩展说明

- 在 `iterations/0.1.14/product/` 与迭代 README 中记录：下一批建议页面（chat 壳层 → console）、API 全量迁移顺序。
- `src/i18n/request.ts` 扩展加载 `page.login`、`page.register`（实现阶段）。

### 本期不做（Out of Scope）

见「非目标」；分期建议如下：

| 批次 | 建议版本 | 内容 |
| --- | --- | --- |
| **本期 0.1.14** | — | 登录/注册 UI + 认证 API + 路由迁移 |
| 下一批 | `0.1.15` | `/chat` 壳层与核心 UI；`ConsoleForbiddenNotice`；只读提示；antd locale 动态注入雏形 |
| 再下一批 | `0.1.16+` | `/console/*` 各子页文案；控制台 API 错误双语 |
| 低优先级 | TBD | `/admin/*`（内部工具）；`/knowledge/[id]` |

## i18n 方案约束（延续 0.1.13）

1. **库与路由**：继续使用 next-intl；locale 前缀 `always`；非法 locale → `/en`。
2. **分组与 key**：`page` / `api` 两大分组；英文 key；`en` 为语义源；缺失回退 `en`。
3. **页面 message 文件**：新增 `messages/{en,zh}/page/login.json`、`page/register.json`。
4. **API message 文件**：填充 `messages/{en,zh}/api/message.json` 本期 key；结构与 ErrorCode 映射表同步维护。
5. **双端消费**：Server Component（metadata）+ Client Component（表单）共用 message 源。
6. **不破坏 SSR/RSC**：认证页迁入 `[locale]` 后须沿用 `[locale]/layout.tsx` 的 `NextIntlClientProvider`。

## 非功能需求

| 类别 | 要求 |
| --- | --- |
| **安全** | 登录失败通用文案不泄露账号是否存在（延续 `AUTH_INVALID_CREDENTIALS` 统一提示）；双语须保持语义等价 |
| **可访问性** | 认证页 `html lang` 正确；表单 `aria-invalid` 与错误文案语言一致 |
| **性能** | 按 locale 增量加载 `page/login`、`page/register`；不加载全站 message |
| **兼容** | 旧 `/login?redirect=...` 链接在重定向后仍保留 `redirect`；外部文档中的裸 `/login` 可用 |
| **视觉** | `LanguageSwitcher` 融入 AuthShell 顶栏，不破坏赛博黑风格 |
| **测试** | 中英各走一遍登录失败、验证码错误、频控（可 mock）；注册管理员门禁冒烟 |

## 待设计项清单（交给 design 阶段）

| # | 项 | 说明 |
| --- | --- | --- |
| D1 | 认证页英文文案 | 登录/注册标题、字段 label、按钮、错误提示措辞 |
| D2 | AuthShell 顶栏布局 | `LanguageSwitcher` 与返回首页、BrandMark 的排布与窄屏折行 |
| D3 | 带参数 API 文案 | 登录锁定分钟数、注册校验细则的英文表述与 ICU 格式 |
| D4 | 旧 URL 重定向 | `/login` → `/en/login` 是否需短暂过渡页（建议直接 302） |
| D5 | 测试账号说明 | 是否双语展示测试账号提示块 |
| D6 | 注册页管理员门禁错误 | `请先登录管理员账号` / `仅管理员可创建账号` 英文稿 |

## 风险与依赖

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 路由迁移破坏 redirect | 登录后回错页或丢 query | 专项测试 `redirect`；middleware 与 `safeRedirectUrl` 回归 |
| `map*ApiError` 依赖中文子串 | 英文字段映射失效 | 本期优先用 ErrorCode 分支；VALIDATION_ERROR 逐步改为 `details[].field` 或独立 code |
| 双语字段校验语义不一致 | 英文用户看到错误字段 | 设计提供等价 validation key；减少仅靠 `message.includes('邮箱')` |
| API locale 与 UI locale 不同步 | 英文页显示中文 API 错误 | 登录/注册 fetch 携带 cookie；服务端读 `NEXT_LOCALE` |
| 全量 API 范围膨胀 | 本期无法交付 | PRD 明确仅认证域；其余列非目标 |
| chat/console 仍中文 | 登录后语言切换 | 延续 0.1.13 静默策略；0.1.15 跟进 chat |

**依赖与假设：**

- 依赖 0.1.13 已上线的 next-intl、middleware、`LanguageSwitcher`、`LOCALE_COOKIE`。
- 假设英语认证文案由设计/产品在本迭代提供（无需外包）。
- 假设 `/api/*` 路径不加 locale 前缀（延续 0.1.13）。
- 假设注册页仍为管理员门禁，非公开自助注册。

## 验收要点（汇总）

1. `/en/login`、`/zh/login`、`/en/register`、`/zh/register` 可访问，metadata 与 UI 文案语言正确。
2. `/login`、`/register` 重定向至带 locale 路径，query 保留。
3. 从 `/en` 首页进入登录，全程英文（含 API 错误）。
4. 未登录访问 `/chat` 跳转 `/en/login?redirect=...`（locale 随 cookie）。
5. `messages/{en,zh}/page/login.json`、`page/register.json`、`api/message.json`（本期 key）已填充且无漏 key。
6. 登录、注册、登出主流程冒烟通过；非法 locale 仍回 `/en`。
7. 迭代 README 与实现说明记载 API/页面扩展步骤及 0.1.15 建议范围。

## 关联文档

- 用户故事：`user-stories-auth-pages.md`、`user-stories-api-i18n.md`、`user-stories-routing-locale.md`
- 待确认项：`open-questions.md`
- 上游：`iterations/0.1.13/product/prd.md`
