# 迭代说明（version 0.1.13）

本迭代引入站点级 **i18n（next-intl）**，实现首页中英双语与顶栏语言选择；默认语言为 **英语**，其余页面保持中文硬编码，语言偏好通过 cookie + URL locale 前缀持久化。

## 文档索引

| 阶段 | 路径 |
| --- | --- |
| 产品 | `product/prd.md`、`product/user-stories-i18n.md`、`product/open-questions.md` |
| 设计 | `design/design-spec-i18n.md`、`design/copy-home-en-zh.md`、`design/spec-language-switcher.md` |
| 服务端 | `backend/implementation-plan.md`、`backend/api-spec.md`、`backend/data-models.md`、`backend/implementation-notes.md` |
| 前端 | `frontend/implementation-notes.md`、`frontend/test-checklist.md` |

## 本轮关键决策

1. **范围**：仅首页（`PunkLanding` + `PunkHomeHeader` + metadata + 页脚）完整双语；`/chat`、`/login` 等不在本期。
2. **默认语言**：cookie/URL → `Accept-Language` → 默认 **`en`**。
3. **路由**：`/en`、`/zh` locale 前缀；`/` 302 至解析后的 locale；非法 locale → `/en`。
4. **跨页**：进入未翻译页静默，偏好仍写入 cookie，无 banner。
5. **文案 key**：英文 key；`page` / `api` 两大分组；`page` 按页面独立 JSON；缺失回退 `en`。
6. **Hero 英文**：独立 slogan `CRACK THE STACK`；描述为单行 punch line + mono 弱化。

## 代码落点（摘要）

- `next-intl`、`src/i18n/*`、`src/middleware.ts`（i18n + auth 合并）
- `src/app/[locale]/`、`messages/{en,zh}/page/home.json`
- `LanguageSwitcher`、`PunkLanding` / `PunkHomeHeader` i18n 改造

## 当前状态

- **已完成**：需求 → 设计 → 服务端文档 → 实现 → 已 push `main`（commit `4c5f980`）
- **未做（非目标）**：登录/聊天/控制台全站 i18n、API 错误消息多语言、`hreflang`（可选增强）
- **后续迭代建议**：`0.1.14` 登录页双语；逐步迁移 `page/login`、`page/chat` message 文件

## 验收

见 `frontend/test-checklist.md`。
