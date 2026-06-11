# 实现说明 — Admin + knowledge-bases API i18n 与 middleware（version 0.1.17 · Backend 3B）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.17` |
| 阶段 | **3B 代码实现** ✅ |
| 状态 | **已完成**（2026-06-11） |
| 范围 | Admin 9 + knowledge-bases 5 API 双语、共享 helper、middleware admin/knowledge 迁移 |
| 上游 | `api-spec.md`、`data-models.md`、`implementation-plan.md` |

---

## 1. 实现摘要

### 1.1 Message 资源（P0）

- `messages/en/api/message.json`、`messages/zh/api/message.json` 追加约 **38** 个 key：
  - 7 个 `admin.*` top-level
  - 3 个 knowledge-bases top-level（`knowledgeBaseNotFound` 等）
  - 3 个 admin 用户域 `validation.*`
  - 12 个 `validation.promptConfig.*`（含 `template.*`）
  - 5 个 `validation.conversationSummary.*`
  - 8 个 `validation.knowledgeBase.*`

### 1.2 共享 helper + middleware（P1）

| 文件 | 改造 |
| --- | --- |
| `src/common/prompt/validatePromptTemplate.ts` | 返回 `{ code: 'invalidBrace' \| 'undeclaredParam', param? }`（Q4-B） |
| `src/server/prompt-config/map-template-error.ts` | **新建**：code → `tApiMessage` |
| `src/server/knowledge-base/validate-tags.ts` | **新建**：标签校验 locale 化 |
| `src/common/utils/console-forbidden-url.ts` | **新建**：`getConsoleForbiddenUrl(locale)` |
| `src/middleware.ts` | legacy admin/knowledge 302；`KNOWN_APP_SEGMENTS` 移除 admin/knowledge；`isProtectedPath` 扩展；移除 `x-admin-login-redirect` |
| `src/server/model-config/parse-model-tags.ts` | admin 路由传入 `locale`（已有签名，现启用） |
| `src/server/assistant/parse-assistant-tags.ts` | 同上 |

### 1.3 Admin routes（P2 · 9 files）

全部 `jsonError` / `details[].message` → `resolveRequestLocale` + `tApiMessage`：

- `users/route.ts`、`users/[id]/route.ts`、`users/[id]/reset-password/route.ts`
- `model-configs/route.ts`、`model-configs/[id]/route.ts`
- `assistants/route.ts`、`assistants/[id]/route.ts`
- `prompt-config/route.ts`（GET 移除 `fileHint`；PUT tmpl 经 `mapPromptTemplateError`）
- `config/conversation-summary/route.ts`（GET 移除 `fileHint`；`validateConfig(locale, …)`）

### 1.4 knowledge-bases routes（P2 · 5 files）

全部改造为 `tApiMessage`；标签校验改用 `validateKnowledgeBaseTags(raw, locale)`：

- `route.ts`、`[id]/route.ts`
- `[id]/vectorization/route.ts`、`[id]/vectorization/retry/route.ts`
- `[id]/chunk-tests/route.ts`

### 1.5 构建兼容（非 Frontend 4 范围）

- `src/app/admin/prompts/page.tsx`：`validatePromptTemplate` 返回类型变更的最小适配（旧 admin 页仍为中文表单校验）

---

## 2. 修改文件列表

| 类别 | 路径 |
| --- | --- |
| Message | `messages/en/api/message.json`、`messages/zh/api/message.json` |
| Helper | `src/common/prompt/validatePromptTemplate.ts`、`src/server/prompt-config/map-template-error.ts`、`src/server/knowledge-base/validate-tags.ts`、`src/common/utils/console-forbidden-url.ts`、`src/common/utils/index.ts` |
| Middleware | `src/middleware.ts` |
| Admin routes | `src/app/api/admin/users/route.ts`、`users/[id]/route.ts`、`users/[id]/reset-password/route.ts`、`model-configs/route.ts`、`model-configs/[id]/route.ts`、`assistants/route.ts`、`assistants/[id]/route.ts`、`prompt-config/route.ts`、`config/conversation-summary/route.ts` |
| KB routes | `src/app/api/knowledge-bases/route.ts`、`[id]/route.ts`、`[id]/vectorization/route.ts`、`[id]/vectorization/retry/route.ts`、`[id]/chunk-tests/route.ts` |
| 构建兼容 | `src/app/admin/prompts/page.tsx` |

---

## 3. 自测结果

### 3.1 构建

```bash
npm run build
# ✓ Compiled successfully；exit code 0
```

### 3.2 grep 验收

```bash
# admin + knowledge-bases 无中文 jsonError message
rg 'jsonError\([^)]*"[\u4e00-\u9fff]' src/app/api/admin/ src/app/api/knowledge-bases/
# → 无匹配

# route 内无中文硬编码字符串（含 details）
rg '"[\u4e00-\u9fff]' src/app/api/admin/ src/app/api/knowledge-bases/
# → 无匹配

# validatePromptTemplate 无中文 message 返回
rg 'message:.*[\u4e00-\u9fff]' src/common/prompt/validatePromptTemplate.ts
# → 无匹配
```

### 3.3 建议 curl 冒烟（需本地 dev + session）

| 场景 | Cookie | 期望 |
| --- | --- | --- |
| 非管理员 GET `/api/admin/users` | `NEXT_LOCALE=en` | `forbidden` 英文 |
| 无效分页 GET `/api/admin/users?page=0` | `NEXT_LOCALE=en` + admin session | pagination 英文 |
| 重置自己密码 POST | `NEXT_LOCALE=zh` + admin session | `admin.cannotResetOwnPassword` 中文 |
| prompt-config 缺 key PUT | `NEXT_LOCALE=zh` + admin session | `validation.promptConfig.missingKey` 中文 |
| 未登录 GET `/api/knowledge-bases` | `NEXT_LOCALE=en` | `unauthorized` 英文 |
| 删除仍被引用 DELETE | `NEXT_LOCALE=zh` + session | `knowledgeBaseReferencedByAssistant` 中文 |
| Legacy GET `/admin/config` | `NEXT_LOCALE=en` | 302 `/en/admin/config` |
| Legacy GET `/knowledge/uuid` | `Accept-Language: zh` | 302 `/zh/knowledge/uuid` |
| prompt-config GET invalid_json | `NEXT_LOCALE=en` | 200，`fileState: "invalid_json"`，**无** `fileHint` |

---

## 4. 与 Frontend 4 对接要点

- API URL 不变；fetch 须 `credentials: 'include'`
- 错误展示：直接 `error.message`（已本地化）
- `getConsoleForbiddenUrl(locale)` 已导出，403 跳转使用 `/${locale}/console?notice=admin_forbidden`
- prompt-config / conversation-summary GET：`fileState === 'invalid_json'` 时展示 `page.admin.prompts.invalidJsonAlert` / `page.admin.config.invalidJsonAlert`（Frontend 4 注册文案）
- middleware 已实现 locale 感知 login redirect：`/{locale}/login?redirect=/{locale}/admin/...`

---

## 5. 已知限制

| # | 项 | 说明 |
| --- | --- | --- |
| 1 | 旧 `src/app/admin/**` 页面 | 仍为裸 `/admin` 链；middleware 302 兜底；完整 locale 迁移在 Frontend 4 |
| 2 | admin prompts 表单校验 | 旧页仍硬编码中文 tmpl 错误（共享 helper 已 code 化；Frontend 4 改 next-intl） |
| 3 | `parseModelConfigTags` 默认 locale | 仍为 `zh`；admin 路由现已显式传入 `resolveRequestLocale` |
