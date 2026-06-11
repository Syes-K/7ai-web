# 前端实现偏差 — version 0.1.17

| 项 | 设计/PRD | 实现 | 原因 |
| --- | --- | --- | --- |
| D1 | Admin layout 级 metadata | 仅各子页 `generateMetadata` | Shell 级 `page.admin.shell.meta` 未单独挂 layout；子页 title 已覆盖 |
| D2 | layout login redirect 含完整 pathname | 无 middleware `x-pathname` 时 fallback `/${locale}/admin/config` | 与 Backend 文档 R7 一致 |
| D3 | prompts `name`/`desc`/`value` 不译（UGC） | **内置项** name/desc/params 与出厂 defaultValue 走 `page.admin.prompts.items.*` | 验收期：英文 Admin 需可读内置模版；已保存自定义正文仍不译 |
| D4 | 模型 tag 存中文常量 | **英文 key 存库**，`tag.model.*` 展示 | 验收期：与 API/i18n 一致；读库兼容旧中文 |
| D5 | LanguageSwitcher 仅显示另一语言 | 下拉**列出全部**语言并高亮当前项 | 验收期 UX |
| D6 | Users Actions 单行 | 固定列宽 + **两行**操作布局 | 英文长文案避免单行换行不一致 |

其余按 `design/` 与 `implementation-notes.md` 交付。
