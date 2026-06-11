# 设计说明 — 控制台 i18n（version 0.1.16）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.16` |
| 阶段 | 设计（阶段 2） |
| 上游 | `iterations/0.1.16/product/prd.md`、用户故事、`open-questions.md` |
| 风格基线 | `0.1.15/design/design-spec-i18n-chat.md`、`spec-shared-infra-i18n.md` |
| 文案终稿 | `copy-console-en-zh.md` |
| API 文案 | `spec-api-message-console.md` |
| 路由规格 | `spec-routing-locale-console.md` |
| 共享 infra | `spec-shared-infra-console.md` |

---

## 1. 已确认 / 设计定稿决策

| 编号 | 决策 | 设计落点 |
| --- | --- | --- |
| **Q1-A** | 不含 `/api/knowledge-bases/**`（延至 0.1.18+） | §6 knowledge API 过渡 UX |
| **Q2-A** | 全量 6 子页 + Shell | 本文档全范围 |
| **Q3-B** | admin 跳链 locale 化留 0.1.17 | console 端兼容裸链 + legacy redirect |
| **Q4-A** | 统一 `parseApiError` 工具 | §7、`shell.errors.*` |
| **Q5-A** | `lastErrorSummary` 服务端 `tApiMessage` | `spec-api-message-console.md` §5 |
| **Q6-B** | `page/console/{shell,profile,...}.json` 拆分 | §3 message 树 |
| **Q7-A** | `ConsoleForbiddenNotice` 继续 `page.shell` | `spec-shared-infra-console.md` §4 |
| **Q8-B** | `getXxxColumns(t)` factory | §5 列 factory 约定 |
| **Q9-A** | validation `details[].message` 全部 key 化 | `spec-api-message-console.md` §3 |
| **Q10-A** | 服务端 layout 鉴权 + 简化 Shell 加载态 | §2.2、§4 |

**继承 0.1.14/0.1.15：** 默认语言 `en`；`localeDetection: false`；API 方案 A；英文 camelCase key；`page` / `api` 分组；LanguageSwitcher `variant="shell"` 保留 query。

---

## 2. 信息架构与路由（摘要）

### 2.1 路由树（本期变更）

```
/en/console/profile、/zh/console/models  …  → 控制台各子页
/console、/console/*                         → 302 → /{resolvedLocale}/console/*
/api/console/**                              → 无 locale 前缀（cookie/header 解析）

/admin/*、/knowledge/[id]                    → 未接入 i18n（后续批次）
```

完整 middleware / redirect 见 **`spec-routing-locale-console.md`**。

### 2.2 Layout 与鉴权（Q10-A 定稿）

| 项 | 定稿 |
| --- | --- |
| 控制台 layout | **新建** `src/app/[locale]/console/layout.tsx` |
| 鉴权 | **服务端** `getRequestUserContext()`；未登录 `redirect(\`/${locale}/login?redirect=/${locale}/console/...\`)` |
| Provider | 继承 `[locale]/layout.tsx` 的 `NextIntlClientProvider` + antd `ConfigProvider` |
| Shell 内鉴权 | **移除** 客户端 `/api/auth/me` 轮询；`ready` 态仅保留极短 hydration（或删除） |
| 旧目录 | **删除** `src/app/console/` 树（middleware 302 优先；不保留 re-export） |
| metadata | 各子页 `generateMetadata` + `getTranslations('page.console.{module}')` |

**目标文件结构：**

```
src/app/
  [locale]/
    console/
      layout.tsx              # AntdRegistry + 服务端鉴权 + ConsoleShell
      page.tsx                # redirect → /{locale}/console/profile（保留 notice query）
      profile/page.tsx
      models/page.tsx
      models/model-provider-ui.ts   # 改为 getModelProviderOptions(t) 等
      assistants/page.tsx
      knowledge/page.tsx
      mcp/page.tsx
      settings/page.tsx       # redirect → profile
  console/                    # 删除
```

**Shell 加载态（Q10-A）：** 服务端 layout 已保证登录，Shell **不再**展示长时「验证会话…」全屏；可选保留 `Suspense` 边界或无文案 skeleton。若保留短加载，文案走 `page.console.shell.verifyingSession`（极少触发）。

### 2.3 跨页 locale 链路

| 场景 | 行为 |
| --- | --- |
| `/en/chat` → 控制台 | `/en/console/profile` |
| `/en/console/models` 切中文 | `/zh/console/models`（query 保留） |
| 未登录 `GET /console/mcp` | 302 `/en/console/mcp` → 302 `/en/login?redirect=/en/console/mcp` |
| 旧书签 `/console/assistants` | 302 `/en/console/assistants`（cookie 链） |
| admin 裸链 `/console?notice=admin_forbidden` | legacy redirect → `/en/console?notice=...`；Forbidden 与 URL locale 一致 |
| knowledge 预览 | `/{locale}/knowledge/{id}`（壳层 0.1.18 再 i18n） |

---

## 3. message 组织与 key 树（Q6-B）

### 3.1 文件与命名空间

```
messages/{en,zh}/page/console/
  shell.json       → page.console.shell.*
  profile.json     → page.console.profile.*
  models.json      → page.console.models.*
  assistants.json  → page.console.assistants.*
  knowledge.json   → page.console.knowledge.*
  mcp.json         → page.console.mcp.*
  settings.json    → page.console.settings.*
```

**`src/i18n/request.ts` 扩展：**

```typescript
messages: {
  page: {
    // …home, login, register, chat, shell
    console: {
      shell: shell.default,
      profile: profile.default,
      models: models.default,
      assistants: assistants.default,
      knowledge: knowledge.default,
      mcp: mcp.default,
      settings: settings.default,
    },
  },
  api: { message: apiMessage.default },
}
```

**加载策略：** console 子树仅 console 路由加载；chat 页**不**加载 `page/console/*.json`。

### 3.2 key 树约定（`page.console.*`）

| 前缀 | 用途 | 示例 |
| --- | --- | --- |
| `meta.*` | `generateMetadata` | `meta.title`、`meta.description` |
| `langSwitcher.*` | LanguageSwitcher（**仅 shell.json**） | `langSwitcher.ariaLabel` |
| `menu.*` | 侧栏五项（**仅 shell.json**） | `menu.profile`、`menu.models` |
| `title` | PageContainer / 模块标题 | `title`（或 `pageTitle`） |
| `columns.*` | ProTable 列头与列内固定文案 | `columns.name`、`columns.actions.edit` |
| `form.*` | ProForm / Modal / Drawer 字段 | `form.nickName.label`、`form.nickName.rules.required` |
| `toolbar.*` | 新建、刷新、搜索 placeholder | `toolbar.create`、`toolbar.refresh` |
| `modal.*` | Modal 标题、按钮 | `modal.create.title`、`modal.ok.create` |
| `confirm.*` | Popconfirm（**内容**；按钮默认走 `page.shell.confirm`） | `confirm.deleteModel.title` |
| `toast.*` | `message.success/error/warning/info` | `toast.saved`、`toast.created` |
| `errors.*` | 客户端 fallback、网络、本地校验 | `errors.networkRetry` |
| `empty.*` | Empty 描述与 CTA | `empty.noModels`、`empty.goToModels` |
| `alert.*` | Alert 横幅 | `alert.publicModelNotice` |
| `tag.*` | 状态 Tag 固定文案 | `tag.public`、`tag.vectorPending` |
| `provider.*` | 模型 Provider 展示名（**models.json**） | `provider.aliyun`、`provider.glm` |
| `visibility.*` | 公有/私有（profile + models 共用语义） | `visibility.public`、`visibility.private` |
| `hint.*` | Tooltip / extra 长说明 | `hint.chatModel` |

**与 `page/shell.json` 分工：**

| 归属 | 内容 |
| --- | --- |
| `page.shell` | Confirm 默认按钮、`UserAvatarMenu`、`ConsoleForbiddenNotice`、`modal.closeOverlay` |
| `page.console.shell` | 控制台标题、菜单、顶栏「对话」、`langSwitcher`、**全控制台共用** `errors.requestFailed` / `errors.networkRetry`（供 `parseApiError`） |
| `page.console.{子页}` | 子页专属 UI |

**不采用：** 单文件 `page/console.json`（体量过大，不利并行编辑）。

### 3.3 Provider 展示名（D4）

| 枚举 key | message key | en 展示 | zh 展示 |
| --- | --- | --- | --- |
| `ALYUN` | `provider.aliyun` | Alibaba Cloud Bailian | 阿里云百炼 |
| `GLM` | `provider.glm` | Zhipu GLM | 智谱 |
| `DEEPSEEK` | `provider.deepseek` | DeepSeek | 深度求索 |
| `KIMI` | `provider.kimi` | Moonshot Kimi | 月之暗面 |
| `SILICONFLOW` | `provider.siliconflow` | SiliconFlow | 硅基流动 |

`model-provider-ui.ts` 改为 `getModelProviderOptions(t)`、`getProviderTagProps(t, key)`；**枚举 value 不变**。

---

## 4. Console Shell 与顶栏（D2）

### 4.1 渲染树（定稿）

```
RootLayout
└── ConfirmProvider                    # page.shell
    └── [locale]/layout.tsx
        └── NextIntlClientProvider + ConfigProvider + DayjsLocaleSync
            └── [locale]/console/layout.tsx   # 服务端鉴权
                └── AntdRegistry
                    └── ConsoleShell (client)
                        └── ProLayout
                            ├── 侧栏 menu（locale 感知 path）
                            ├── actionsRender: LanguageSwitcher → Chat Link → UserAvatarMenu
                            └── main: ConsoleForbiddenNotice + children
```

### 4.2 顶栏 actionsRender 顺序（对齐 chat shell）

```
┌──────────────────────────────────────────────────────────────────────┐
│  [Brand] 控制台          [ English ▾ ]  💬 对话   [Avatar ▾]          │
├──────────┬───────────────────────────────────────────────────────────┤
│ 侧栏菜单 │  子页内容（PageContainer + ProTable / ProForm）            │
└──────────┴───────────────────────────────────────────────────────────┘
```

| 顺序 | 元素 | 说明 |
| --- | --- | --- |
| 左 | `BrandMark` + `page.console.shell.title` | ProLayout title |
| 右 1 | `LanguageSwitcher` | `namespace="page.console.shell"`、`variant="shell"` |
| 右 2 | 对话 Link | `href` → `/{locale}/chat`；文案 `page.console.shell.chatLink` |
| 右 3 | `UserAvatarMenu` | `variant="shell"`；文案源 `page.shell.userMenu`（0.1.15 已 i18n） |

### 4.3 LanguageSwitcher 扩展

```typescript
type SwitcherNamespace =
  | "page.home"
  | "page.login"
  | "page.register"
  | "page.chat"
  | "page.console.shell";   // 新增

// variant 仍为 "home" | "auth" | "shell"
// console 使用 variant="shell"，视觉与 chat 顶栏一致（zinc-400/90 → cyan hover）
```

`page.console.shell.json` **须包含**完整 `langSwitcher.*` 块（与 `page.chat` 同结构，值可相同）。

### 4.4 侧栏菜单

`console-menu.tsx` 改为 `getConsoleMenuRoutes(locale, t)`：

| key | path 模式 |
| --- | --- |
| `menu.profile` | `/${locale}/console/profile` |
| `menu.models` | `/${locale}/console/models` |
| … | … |

ProLayout `route.path` = `/${locale}/console`；`location.pathname` 来自 `usePathname()`（next-intl 或原生，须与高亮一致）。

---

## 5. 子页组件改造要点

### 5.1 ProTable 列 factory 命名（Q8-B）

| 子页 | 工厂函数 | 文件位置 |
| --- | --- | --- |
| models | `getModelColumns(t, ctx)` | `models/page.tsx` 或 `models/model-columns.tsx` |
| assistants | `getAssistantColumns(t, ctx)` | `assistants/page.tsx` 或 `assistants/assistant-columns.tsx` |
| knowledge | `getKnowledgeColumns(t, ctx)` | `knowledge/page.tsx` |
| mcp | `getMcpColumns(t, ctx)` | `mcp/page.tsx` |

**`ctx` 可选字段：** `preferredVectorModelConfigId`、`onEdit`、`onDelete`、`deletingId` 等回调与状态；**列头与固定 cell 文案**仅通过 `t` 解析。

**profile：** 无 ProTable；`modelOptionLabel(row, t)` 独立 helper。

**调用模式：**

```typescript
const t = useTranslations("page.console.models");
const columns = useMemo(
  () => getModelColumns(t, { /* ctx */ }),
  [t, /* deps */],
);
```

### 5.2 各子页改造摘要

| 子页 | 主要改造 |
| --- | --- |
| **profile** | ProForm label/hint/placeholder；Alert/Empty；401 → locale 感知 login；Link → `/{locale}/console/models` |
| **models** | `getModelColumns`；Modal 表单；`getModelProviderOptions`；分页 `showTotal` ICU |
| **assistants** | `getAssistantColumns`；Drawer 表单；KB/MCP 关联区；筛选器 options |
| **knowledge** | `getKnowledgeColumns`；向量状态 Tag；详情 Drawer；分片测试 Drawer；预览链 locale 前缀 |
| **mcp** | `getMcpColumns`；凭证 Tooltip（富文本用 `t.rich` 或拆分 key）；测试连接 Modal |
| **settings** | server `redirect(\`/${locale}/console/profile\`)`；metadata 双语 |

### 5.3 不翻译（PRD 非目标）

- 用户昵称、邮箱、手机号值、模型名、助手名、知识库 name/description/content
- MCP 配置名、连接 JSON、metadata JSON
- `vectorError` 字段原文
- Provider 枚举 key（`ALYUN` 等）
- `ADMIN_USER` 字面量
- 模型 tag 用户自定义值（`嵌入` 等系统 tag 若来自常量须 key 化）

### 5.4 antd / ProComponents 内置文案

依赖 `[locale]/layout.tsx` + `ConsoleShell` 内 `ConfigProvider locale={getAntdLocale(locale)}`：

- ProTable 分页「条/页」、Empty 默认（若未覆盖）
- Popconfirm 默认按钮若未传 `okText`/`cancelText` → 随 antd locale
- DatePicker / 数字输入（本批次 console 无 DatePicker）

`dayjs.locale(getDayjsLocaleName(locale))` 在 layout `DayjsLocaleSync` 已设置；**移除** `ConsoleShell` 模块级 `dayjs.locale("zh-cn")`。

---

## 6. knowledge 页 API 过渡 UX（Q1-A / D6）

### 6.1 已知限制

| 层 | 本期状态 |
| --- | --- |
| 页面 UI | **全量双语**（`page.console.knowledge.*`） |
| `/api/console/**` | **双语**（0.1.16） |
| `/api/knowledge-bases/**` | **仍为中文** error.message（0.1.18+） |

### 6.2 前端行为（定稿）

| 场景 | 行为 |
| --- | --- |
| knowledge CRUD / 向量化 / 分片测试失败 | **原样展示** `error.message`（可能为中文） |
| 网络 / 无 body fallback | `page.console.shell.errors.*`（双语） |
| 英文 UI + 中文 API 错误 | **不**做客户端二次翻译；**不**显示额外 disclaimer 横幅（避免噪音） |
| QA / 验收 | 用例标注为 **已知限制 #8**；0.1.18 补齐 API 后关闭 |

### 6.3 可选后续（非本期）

- 0.1.18 前若产品要求：knowledge 页英文环境下 API 错误旁注「部分服务端消息尚未本地化」——**本期不做**。

---

## 7. 错误与 Toast 展示

### 7.1 `parseApiError` 统一（Q4-A）

**新建** `src/common/utils/parse-api-error.ts`：

```typescript
type ParseApiErrorOptions = {
  /** next-intl t，命名空间 page.console.shell */
  t: (key: string, values?: Record<string, string | number>) => string;
};

export async function parseApiError(
  res: Response,
  { t }: ParseApiErrorOptions,
): Promise<string> {
  const j = (await res.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  const msg = j?.error?.message?.trim();
  if (msg) return msg;
  return t("errors.requestFailed", { status: res.status });
}
```

| key | en | zh |
| --- | --- | --- |
| `page.console.shell.errors.requestFailed` | Request failed ({status}). | 请求失败（{status}） |
| `page.console.shell.errors.networkRetry` | Network error. Please try again later. | 网络异常，请稍后重试 |

**调用：** 各 console 子页 `parseApiError(res, { t: tShell })`，`tShell = useTranslations('page.console.shell')`；或传入子页 `t` 若 errors 迁至子模块（**推荐统一 shell.errors**）。

**401 跳转：** 抽 `buildLoginRedirectUrl(locale, pathname, search)` → `/${locale}/login?redirect=${encodeURIComponent(fullPath)}`；替换所有 `window.location.href = "/login?redirect=..."`。

### 7.2 Toast 优先级

| 来源 | 处理 |
| --- | --- |
| API `error.message` | 直接展示（console API 已翻译；knowledge-bases API 可能中文） |
| 操作成功 | `page.console.{module}.toast.*` |
| 网络 catch | `shell.errors.networkRetry` |
| 本地表单 rules | `form.*.rules.*` |
| MCP `lastErrorSummary` | API 返回已翻译字符串（Q5-A） |

---

## 8. 视觉与交互

| 元素 | 规格 |
| --- | --- |
| Shell 主题 | 延续 `shellDarkTheme` + ProLayout mix |
| LanguageSwitcher | `variant="shell"`，与 chat 顶栏同色阶 |
| 侧栏 | 五项图标不变；文案随 locale |
| 语言切换 | `router.replace(pathname, { locale })`；保留 query（含 `notice=admin_forbidden`） |
| Forbidden dismiss | strip `notice` query（现网行为） |
| 动效 | 无额外要求；与 0.1.15 一致 |

---

## 9. 与需求 AC 对照

| 用户故事 | 设计落点 |
| --- | --- |
| US-A1–A6 路由 | `spec-routing-locale-console.md` |
| US-A7–A17 Shell / 菜单 / 切换 | §4、`copy-console-en-zh.md` §1 |
| US-A18–A20 Forbidden | `spec-shared-infra-console.md` §4 |
| US-B1–B6 profile | `copy-console-en-zh.md` §2 |
| US-C1–C5 models | §3.3、§5.1、`copy-console-en-zh.md` §3 |
| US-D1–D4 assistants | `copy-console-en-zh.md` §4 |
| US-E1–E6 knowledge | §6、`copy-console-en-zh.md` §5 |
| US-F1–F3 mcp | `spec-api-message-console.md` §5、`copy-console-en-zh.md` §6 |
| US-G1–G2 settings | `copy-console-en-zh.md` §7 |
| US-H1–H3 跨页入口 | `spec-routing-locale-console.md` §5 |
| API Epic A–F | `spec-api-message-console.md` |

---

## 10. 开放问题回写（设计阶段定稿）

| 编号 | 结论 |
| --- | --- |
| Q4 | **A** — `@/common/utils/parse-api-error` + `page.console.shell.errors.*` |
| Q5 | **A** — `lastErrorSummary` 写入前 `tApiMessage`；已知串枚举 key |
| Q7 | **A** — `ConsoleForbiddenNotice` → `useTranslations('page.shell')` + URL locale |
| Q8 | **B** — 子目录拆分 json |
| Q9 | **A** — validation details 全 key 化（backend 3A 清单） |
| Q10 | **A** — `[locale]/console/layout.tsx` 服务端鉴权；Shell 去掉客户端 session 轮询 |

---

## 11. 非本期

- `/admin/*` 页面与 API 全量 i18n（0.1.17）
- `/api/knowledge-bases/**` 错误双语（0.1.18+）
- `/knowledge/[id]` 壳层 i18n（0.1.18+）
- AdminShell / admin users 控制台跳链 locale 化（Q3-B）
- API 成功体 `message` 字段
- 账号级语言云端同步
