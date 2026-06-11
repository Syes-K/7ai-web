# 前端实现说明 — version 0.1.17

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.17` |
| 阶段 | 前端（阶段 4） |
| 范围 | Admin 全量 i18n + Knowledge 预览页 + 路由迁入 `[locale]` |

---

## 1. 路由与目录

| 变更 | 路径 |
| --- | --- |
| 管理后台 | `src/app/[locale]/admin/**`（删除 `src/app/admin/`） |
| 知识库预览 | `src/app/[locale]/knowledge/[id]/page.tsx`（删除 `src/app/knowledge/`） |
| 旧 URL | middleware 已 302 → `/{locale}/admin/**`、`/{locale}/knowledge/**`（Backend 3B） |

**Admin 子树文件：**

```
src/app/[locale]/admin/
  layout.tsx              # gateAdminPageAccess + AdminSessionProvider + AdminShell
  page.tsx                # redirect → /admin/config（next-intl）
  AdminShell.tsx
  admin-menu.tsx
  AdminSessionContext.tsx
  admin-api-guards.ts
  config/  users/  models/  prompts/  logs/  assistants/
    page.tsx + *Client.tsx（models/users/assistants 含 *-columns.tsx）
```

---

## 2. i18n

### 2.1 Message 文件

```
messages/{en,zh}/page/admin/
  shell.json  config.json  users.json  models.json
  prompts.json  logs.json  assistants.json
messages/{en,zh}/page/knowledge.json
```

### 2.2 注册

`src/i18n/request.ts` 扩展 `page.admin.*`、`page.knowledge`。

### 2.3 共享能力

| 能力 | 落点 |
| --- | --- |
| LanguageSwitcher | `namespace="page.admin.shell"` |
| parseApiError | `useTranslations('page.admin.shell')` |
| 401 | `redirectToLocaleLogin(locale, \`/${locale}/admin/...\`)` |
| 403 | `getConsoleForbiddenUrl(locale)` via `admin-api-guards.ts` |
| ProTable 列 | `getAdminUserColumns` / `getAdminModelColumns` / `getAdminAssistantColumns` |
| Provider / 模型 tag | `getModelProviderOptions(t)` / `formatModelConfigTag(t)` |
| 顶栏 / 操作列 | `header-action-link.ts`、`table-row-actions.tsx` |

---

## 3. Admin Shell（Q5-A）

- **鉴权**：`layout.tsx` 服务端 `gateAdminPageAccess()`；未登录 → `/{locale}/login?redirect=...`；非管理员 → `getConsoleForbiddenUrl(locale)`。
- **移除**：客户端 `/api/auth/me` 轮询与「验证会话…」全屏。
- **Props**：`displayName` 由 layout 传入；`userId` 经 `AdminSessionProvider` 供 users 页自操作禁用。
- **顶栏**：LanguageSwitcher → 对话 `/chat` → 控制台 `/console/profile` → UserAvatarMenu `variant="shell"`。
- **antd**：`getAntdLocale(locale)`，继承根 layout `DayjsLocaleSync`。

---

## 4. 子页要点

| 子页 | 实现 |
| --- | --- |
| config | `fileState: invalid_json` → `fileState.invalidJson.*` Alert；页脚 `t.rich` 链至 `/admin/prompts` |
| prompts | 同上 Alert；模版校验文案走 `form.template.rules.*`；**内置项**展示走 `localizePromptConfigItems` + `items.*` |
| users | `formatLockRemain` ICU；重置密码 Modal；`generateMetadata` |
| models / assistants | ProTable + Modal CRUD；403 统一 replace forbidden |
| logs | `ProModulePlaceholder` + `page.admin.logs` |
| knowledge 预览 | SSR；返回链 `Link href="/console/knowledge"`；metadata 含 `kb.name` |

---

## 5. 运行

```bash
npm run dev
# 配置 ADMIN_USER 后访问 /en/admin/config
```

`npm run build` 已通过（2026-06-11，收尾复验通过）。

---

## 6. 偏差与假设

| 项 | 说明 |
| --- | --- |
| layout login redirect | 无 middleware `x-pathname` 时 fallback `/${locale}/admin/config`（与 Backend 文档 R7 一致） |
| admin layout metadata | 仅各子页 `generateMetadata`；Shell 级 `page.admin.shell.meta` 未单独挂 layout（子页 title 已覆盖） |

---

## 7. 验收期微调（2026-06-11）

| 模块 | 落点 |
| --- | --- |
| 模型 tags 英文 key | `src/common/model-config/`、`parse-model-tags.ts` LEGACY 映射、`tag.model.*` |
| LanguageSwitcher | 全语言列表、`top-full`、与 ProLayout hover 解耦（`globals.css`） |
| 顶栏操作 | `src/components/layout/header-action-link.ts` |
| ProTable Actions | `src/components/ui/table-row-actions.tsx`；Users `twoRows` + `tableLayout="fixed"` |
| Knowledge 测试图标 | `ThunderboltOutlined`（与 MCP 一致） |
| Prompts 内置 i18n | `src/common/prompt/localize-prompt-config-item.ts`、`messages/.../prompts.json` `items.*` |

详见 `deviations.md` D3–D6、`../README.md` 验收期微调表。
