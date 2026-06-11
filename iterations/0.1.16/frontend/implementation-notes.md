# 前端实现说明 — Console i18n + 路由迁入 `[locale]`（version 0.1.16）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.16` |
| 阶段 | 前端开发（阶段 4）✅ |
| 状态 | **已完成**（2026-06-11，含验收期微调） |
| 上游 | `iterations/0.1.16/design/*`、`backend/implementation-notes.md` |

---

## 1. 路由迁移

| 之前 | 之后 |
| --- | --- |
| `src/app/console/**` → `/console/**` | `src/app/[locale]/console/**` → `/{locale}/console/**` |
| 旧树 | **已删除**；裸 `/console/*` 由 middleware 302 |

**新增/迁移文件：**

```
src/app/[locale]/console/
  layout.tsx              # 服务端鉴权 + AntdRegistry + ConsoleShell
  page.tsx                # redirect → /{locale}/console/profile（保留 notice）
  ConsoleShell.tsx
  ConsoleForbiddenNotice.tsx
  console-menu.tsx
  profile/page.tsx + ProfileClient.tsx
  models/page.tsx + ModelsClient.tsx + model-provider-ui.ts
  assistants/page.tsx + AssistantsClient.tsx
  knowledge/page.tsx + KnowledgeClient.tsx
  mcp/page.tsx + McpClient.tsx
  settings/page.tsx       # redirect → profile + metadata
```

**鉴权（Q10-A）：** `layout.tsx` 调用 `getRequestUserContext()`；未登录 `redirect(/${locale}/login?redirect=/${locale}/console/profile)`。Shell **不再** 客户端轮询 `/api/auth/me`。

---

## 2. i18n 文案

**Message 文件（`messages/{en,zh}/page/console/`）：**

- `shell.json` → `page.console.shell.*`
- `profile.json`、`models.json`、`assistants.json`、`knowledge.json`、`mcp.json`、`settings.json`

**注册：** `src/i18n/request.ts` 追加 `page.console` 子树。

**共享工具：**

| 文件 | 用途 |
| --- | --- |
| `src/common/utils/parse-api-error.ts` | 统一 API 错误解析（Q4-A） |
| `src/common/utils/locale-login-redirect.ts` | 401 跳转 `/${locale}/login?redirect=...` |

---

## 3. Shell 改造

| 项 | 实现 |
| --- | --- |
| 标题/菜单/跳过链接 | `useTranslations('page.console.shell')` |
| LanguageSwitcher | `namespace="page.console.shell"`、`variant="shell"` |
| antd locale | `getAntdLocale(locale)`；移除硬编码 `zh_CN` / `dayjs.locale('zh-cn')` |
| 对话链 | `@/i18n/navigation` `Link` → `/chat` |
| 侧栏 | `getConsoleMenuRoutes(t)`；path 为 `/console/...`（next-intl Link 自动加 locale） |
| UserAvatarMenu | `variant="shell"`；`displayName` 由 layout 服务端传入 |
| Forbidden | `useTranslations('page.shell')`（Q7-A） |

---

## 4. 子页改造

| 子页 | 模式 |
| --- | --- |
| profile | ProForm 全量 i18n；`modelOptionLabel` + `getProviderTagProps` |
| models | `getModelColumns(t, ctx)`；**无**「设为向量默认」列（见 `deviations.md` D1） |
| assistants | `getAssistantColumns(t, ctx)`；`t.rich` 用于 MCP 引导链 |
| knowledge | `getKnowledgeColumns(t, ctx)`；预览链 `Link` → `/knowledge/{id}` |
| mcp | `getMcpColumns(t, ctx)`；凭证 Tooltip 多 key |

各子页 `page.tsx` 为 Server Component：`generateMetadata` + `setRequestLocale` + 渲染 `*Client`。

---

## 5. 跨页链接（P2）

| 位置 | 变更 |
| --- | --- |
| `ChatWorkspace` | 控制台入口 `/console/profile`（`@/i18n/navigation` Link） |
| `PunkLanding` / `PunkHomeHeader` | `/console/profile` |
| console 内链 | `@/i18n/navigation` |
| `admin/models` | `model-provider-ui` 导入路径更新 |

**未改（0.1.17）：** AdminShell / admin 页裸 `/console?notice=...`（middleware legacy 302 兜底）。

---

## 6. 已知限制 / 偏差

| # | 说明 |
| --- | --- |
| L1 | `/api/knowledge-bases/**` 错误 message 可能仍为中文；英文 UI 下原样展示（Q1-A） |
| L2 | `model-provider-ui.ts` 保留 `providerTagProps` / `MODEL_PROVIDER_OPTIONS` 中文回退供 **admin** 未 i18n 页使用 |
| L3 | 系统标签数据值 `嵌入` 不变；UI 展示经 `tag.embedding` 翻译 |
| L4 | `next.config.ts` 仍保留 `/console/settings` → `/console/profile` 重定向（legacy 裸路径） |

---

## 9. 验收期微调（迭代收尾）

| 项 | 文件 | 说明 |
| --- | --- | --- |
| 侧栏双 locale | `console-menu.tsx`、`ConsoleShell.tsx` | 菜单 path 不含 `/${locale}`，修复 `/en/en/console/...` |
| Profile label 布局 | `ProfileClient.tsx`、`profile.json` | `formLayout.labelWidth` i18n；右对齐 + 冒号 |
| Profile 文案/按钮 | `profile.json`、`ProfileClient.tsx` | en `Base info`；编辑按钮 primary ghost |
| MCP 空态 | `McpClient.tsx` | 与 knowledge 一致，无内嵌新建按钮 |
| 向量默认快捷设 | `ModelsClient.tsx`、`models.json` | 移除表格列/按钮；保留 Profile Embedding model |

---

## 10. 构建

```bash
npm run build   # 已通过（2026-06-11）
```

---

## 11. Provider 树（Console）

```
[locale]/layout → NextIntlClientProvider + ConfigProvider + DayjsLocaleSync
  └── [locale]/console/layout → AntdRegistry + ConsoleShell (内层 ConfigProvider + shellDarkTheme)
        └── 子页 *Client
```
