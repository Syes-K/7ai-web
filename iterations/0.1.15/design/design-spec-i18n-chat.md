# 设计说明 — 对话页 i18n（version 0.1.15）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.15` |
| 阶段 | 设计（阶段 2） |
| 上游 | `iterations/0.1.15/product/prd.md`、用户故事、`open-questions.md` |
| 风格基线 | `0.1.13/design/design-spec-i18n.md`、`0.1.14/design/design-spec-i18n-auth.md` |
| 文案终稿 | `copy-chat-en-zh.md` |
| API 文案 | `spec-api-message-chat.md` |
| 路由规格 | `spec-routing-locale-chat.md` |
| 共享 infra | `spec-shared-infra-i18n.md` |

---

## 1. 已确认 / 设计推荐决策（基线）

| 编号 | 决策 | 设计落点 |
| --- | --- | --- |
| **Q1-A**（用户已确认 MVP） | 本期仅 chat UI + chat API + 共享 infra | 本文档范围；console/admin 列 0.1.16+ |
| **Q5-A**（设计推荐） | 切换语言**保留** query | `LanguageSwitcher` 沿用 `router.replace(pathname, { locale })` |
| **Q6-A**（设计推荐） | 用户可见流式/中断文案纳入 i18n | `page.chat.turn.*` + 服务端 SSE `error` 事件 `tApiMessage` |
| **Q9-A**（设计推荐） | chat 迁入 `[locale]`，删除旧 `app/chat/` | `spec-routing-locale-chat.md` |
| **Q12-A**（设计推荐） | 0.1.15 即链至 `/{locale}/console` | `header.console` href；过渡期 console UI 仍可能中文 |
| **Q11-A**（设计推荐） | 统一 `parseApiError` fallback | frontend 实现说明；本设计定义 key |

**继承 0.1.14：** 默认语言 `en`；`localeDetection: false`；API 方案 A（服务端翻译 `error.message`）；英文 camelCase key；`page` / `api` 分组。

---

## 2. 信息架构与路由（摘要）

### 2.1 路由树（本期变更）

```
/en/chat、/zh/chat     → 对话工作台（Server 薄壳 + Client ChatWorkspace）
/chat                  → 302 → /{resolvedLocale}/chat（保留 query）

/console、/admin/*     → 未接入 i18n 页面（保持裸路径至后续批次）
/api/*                 → 无 locale 前缀
```

完整 middleware / redirect 见 **`spec-routing-locale-chat.md`**。

### 2.2 Layout 继承（Q9 定稿）

| 项 | 定稿 |
| --- | --- |
| 对话页 layout | **复用** `src/app/[locale]/layout.tsx` |
| 鉴权 | 可选 `[locale]/chat/layout.tsx`：未登录 `redirect(\`/${locale}/login?redirect=/${locale}/chat\`)` |
| Provider | `NextIntlClientProvider` + antd `ConfigProvider`（随 URL locale） |
| `html lang` | `LocaleHtmlLang`（layout 已有） |
| metadata | `generateMetadata` + `getTranslations('page.chat')` → `meta.title` / `meta.description` |
| 旧目录 | **删除** `src/app/chat/`（middleware 302 优先；不保留 re-export） |

**目标文件结构：**

```
src/app/
  [locale]/
    layout.tsx              # intl + antd ConfigProvider + dayjs（见 shared infra）
    chat/
      layout.tsx            # 可选：服务端鉴权 redirect
      page.tsx              # getRequestUserContext → ChatWorkspace props
  chat/                     # 删除
```

### 2.3 跨页 locale 链路

| 场景 | 行为 |
| --- | --- |
| `/en` 首页 → Chat | `href="/en/chat"`（next-intl `Link` 或 `/${locale}/chat`） |
| `/en/login?redirect=/en/chat` 成功 | → `/en/chat` |
| 未登录 `GET /en/chat` | → `/en/login?redirect=/en/chat` |
| `/en/chat` 切换中文 | → `/zh/chat`（pathname 不变，query 保留） |
| Chat 顶栏 → 控制台 | `href="/en/console"`（或默认子页 `/en/console/profile`，与 console Shell 对齐） |
| 旧书签 `/chat` | 302 `/en/chat` 或 `/zh/chat`（cookie 链） |

---

## 3. Provider 树与 antd/dayjs

### 3.1 渲染树（定稿）

```
RootLayout (app/layout.tsx)
└── ConfirmProvider          ← 根级；默认按钮文案走 page.shell（见 shared infra）
    └── [locale]/layout.tsx
        └── NextIntlClientProvider
            └── ConfigProvider locale={en_US|zh_CN}
                └── LocaleHtmlLang
                    └── chat/layout.tsx（鉴权）
                        └── chat/page.tsx
                            └── ChatWorkspace (client)
```

### 3.2 antd / dayjs 接入点

| 层级 | 职责 |
| --- | --- |
| `[locale]/layout.tsx` | `ConfigProvider locale`（已有 en_US / zh_CN） |
| **新增** `LocaleDayjsProvider` 或 layout 内 `useEffect` | `dayjs.locale('en' \| 'zh-cn')` 随 segment 切换 |
| `ChatWorkspace` | 使用 antd `Dropdown`（`UserAvatarMenu` 若后续加入顶栏）；**不**额外包裹 ConfigProvider |
| `ConfirmProvider` / `ModalShell` | 原生 `<button>`；默认 OK/Cancel 来自 i18n |

**Chat 页 antd 组件清单（本期）：** 无 ProTable；潜在 `UserAvatarMenu` Dropdown。Confirm/Modal 为自定义。

### 3.3 message 加载（`src/i18n/request.ts` 扩展）

```typescript
// 设计示意
messages: {
  page: {
    home: ...,
    login: ...,
    register: ...,
    chat: pageChat.default,    // 新增
    shell: pageShell.default,  // 新增（共享壳层）
  },
  api: { message: apiMessage.default },
}
```

Chat 页**不**加载 console/admin message 文件。

---

## 4. Chat 顶栏布局（D2）

### 4.1 DOM 结构（改造后）

```
<header className="chat-header ...">
  <BrandMark />                           <!-- 左 -->
  <div className="flex items-center gap-0.5 shrink-0">  <!-- 右簇 -->
    <LanguageSwitcher namespace="page.chat" variant="shell" />
    <Link href="/{locale}/console" ... />  <!-- IconConfig -->
    <button clear messages ... />          <!-- IconTrash -->
  </div>
</header>
```

**本期不强制**在 chat 顶栏加入 `UserAvatarMenu`（现网无）；共享 infra 文档定义 shell 变体供 console/admin 0.1.16+ 使用。若产品后续要求在 chat 展示头像菜单，顺序为：`LanguageSwitcher` → `UserAvatarMenu` → Console → Clear。

### 4.2 桌面线框（≥1024px）

```
┌─────────────────────────────────────────────────────────────────┐
│  7AI·CLUB                    [ English ▾ ]  ⚙  🗑               │
├─────────────────────────────────────────────────────────────────┤
│  sidebar │              messages + composer                     │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 元素顺序（定稿）

| 顺序 | 元素 | 说明 |
| --- | --- | --- |
| 左 | `BrandMark` | 不翻译 |
| 右 1 | `LanguageSwitcher` | **新增**；在控制台入口之前 |
| 右 2 | 控制台 Link | locale 感知 href |
| 右 3 | 清空消息 button | icon-only；`title`/`aria-label` 双语 |

### 4.4 LanguageSwitcher — `shell` variant（相对 auth）

| 属性 | auth variant | **chat shell variant** |
| --- | --- | --- |
| 触发器文字色 | `text-[#9AA3B2]` | `text-zinc-400/90`（与 chat 顶栏 icon 一致） |
| hover | `hover:text-[#00E5FF]` | `hover:text-cyan-200/90` |
| 下拉面板 | cyan/zinc 半透明 | **同 auth / 首页** |
| 字体 | `font-mono` | `font-mono` |
| namespace | `page.login` 等 | **`page.chat`**（含 `langSwitcher.*` 块） |

扩展 `LanguageSwitcherProps`：

```typescript
type SwitcherNamespace = "page.home" | "page.login" | "page.register" | "page.chat";
type SwitcherVariant = "home" | "auth" | "shell";
```

`variant="shell"` 用于 Chat 顶栏（及未来 ConsoleShell / AdminShell）。

### 4.5 切换行为

| 当前 URL | 切换至 |
| --- | --- |
| `/en/chat` | `/zh/chat` |
| `/en/chat?foo=1` | `/zh/chat?foo=1`（Q5-A） |

- 切换后**不**重置 `selectedId`（会话 id 在 client state，非 URL）；整页导航会重挂载组件 — **实现须**在切换前将会话选择持久化（sessionStorage key `7ai:chat:selectedId`）或在 mount 时恢复默认策略（选中列表首项）。**设计推荐**：sessionStorage 恢复选中会话，避免语言切换丢上下文。

---

## 5. 页面区域与组件 i18n 范围

### 5.1 区域映射

| 区域 | 源码 | message 前缀 |
| --- | --- | --- |
| metadata | `[locale]/chat/page.tsx` | `meta.*` |
| 顶栏 | `ChatWorkspace` header | `header.*` |
| 侧栏 / 抽屉 | `sidebarInner`、mobile drawer | `sidebar.*` |
| 消息空态 / banner | messages area | `messages.*` |
| 输入区 / hint | composer | `composer.*`、`freeTierHint.*` |
| 新建对话 Modal | `ModalShell` + picker | `newChat.*` |
| 确认弹窗内容 | `confirm()` 调用处 | `confirm.*` |
| Toast 错误 | `showToast` | `toast.*` / `errors.*` |
| Turn 流式 UI | `AssistantFlowCard`、`buildTurnStageItems` 等 | `turn.*` |
| 角色 fallback | `MessageBubble` | `messages.userFallback` / `assistantFallback` |

### 5.2 不翻译（PRD 非目标）

- 用户昵称、邮箱前缀（`userLabel`）
- 助手名称、icon emoji、会话 `title`（UGC/系统生成）
- LLM 输出、用户输入内容
- Turn id 截断显示（`Turn abc12345`）
- 服务端 `safeMessage` / `safeSummary` **若仍为历史中文快照**：原样展示（技术债；新发 turn 由 backend 按 locale _emit，见 Q6）
- 备案号

### 5.3 组件改造要点

| 组件 | 改造 |
| --- | --- |
| `ChatWorkspace` | `useTranslations('page.chat')`；所有用户可见字面量 → `t()`；401 redirect 改为 locale 感知 |
| `MessageBubble` / `AssistantFlowCard` | 接收 `t` 或内部 `useTranslations`；状态枚举映射表改读 `turn.status.*` |
| `chat-api.ts` | SSE fallback `未知错误` → 保留 API message；客户端 fallback key `errors.sseUnknown`；`响应无 body` → `errors.noResponseBody` |
| `LanguageSwitcher` | 扩展 `namespace` + `variant="shell"` |
| `PunkHomeHeader` / `PunkLanding` | chat href → `/{locale}/chat`（routing 文档） |

---

## 6. 错误与 Toast 展示（与 0.1.14 一致）

| 来源 | 文案位置 |
| --- | --- |
| API 返回 `error.message` | 服务端已翻译 → toast / inline 原样展示 |
| API 无 message | `toast.*` 或 `errors.*` fallback |
| 网络 / parse 失败 | `errors.networkRetry` 或操作级 `toast.loadConversationsFailed` 等 |
| 只读账号 UI 拦截 | `errors.readOnlyBlocked`（与 API `readOnlyAccountBlocked` 语义一致） |
| 空输入 | `errors.emptyInput` |

**流式 SSE（Q6-A）：**

| 事件 | 处理方式 |
| --- | --- |
| `error` event | `message` 由服务端 `tApiMessage`；客户端 fallback `errors.sseUnknown` |
| `turn_failed` + interruption | 客户端 `turn.interruption.*` 映射 `interruptionReason` |
| 助手失败气泡 | `turn.failure.*` 模板 + API/model message |

---

## 7. 视觉与交互（Punk / 赛博）

| 元素 | 规格 |
| --- | --- |
| 页面背景 | 现网网格 + radial 光晕（无文案） |
| 顶栏 | `border-zinc-800/80`；icon `text-zinc-400` → hover cyan |
| LanguageSwitcher | §4.4 shell variant；与 auth 同属站点控件，下拉面板一致 |
| Toast | emerald / rose 边框（无文案改动） |
| 语言切换 | 整页 `router.replace`；**无**确认框、**无** toast |
| 动效 | 可选 150ms fade（非必须） |

---

## 8. 与需求 AC 对照

| 用户故事 | 设计落点 |
| --- | --- |
| US-A1–A2 路由 + metadata | `spec-routing-locale-chat.md`、`copy-chat-en-zh.md` §1 |
| US-B1–B5 工作台 UI | `copy-chat-en-zh.md` §2–§8 |
| US-C1–C2 顶栏 + 跨页 | §4、`spec-routing-locale-chat.md` §5 |
| US-D1–D2 API / fallback | `spec-api-message-chat.md`、`copy-chat-en-zh.md` §9 |
| Shared infra Epic A–D | `spec-shared-infra-i18n.md` |

---

## 9. 开放问题回写

| 编号 | 设计推荐 | 说明 |
| --- | --- | --- |
| **Q1** | **A** | 与用户确认 MVP 一致 |
| **Q6** | **A** | REST + SSE error + 客户端 turn/interruption 标签 key 化；历史 turn 快照 safeMessage 不 retro-translate |
| **Q12** | **A** | Chat → `/{locale}/console`；英文 URL + 中文 console 为已知过渡期 |
| **Q5** | **A** | LanguageSwitcher 保留 query |
| **Q9** | **A** | 单树 `[locale]/chat` |

---

## 10. 非本期

- `/console/*`、`/admin/*` 页面与 API 全量
- `/knowledge/[id]`
- `page/console/*.json` 拆分（见 Q8-B，0.1.16）
- ProTable 列 factory（Q10-B）
- 账号级语言云端同步
