# Console i18n 验收清单（version 0.1.16）

| 状态 | **已完成**（2026-06-11，含验收期微调） |
| --- | --- |

运行：`npm run dev`，浏览器可配合清除/设置 `NEXT_LOCALE` cookie。

**验收期变更：** 侧栏链应为 `/en/console/...`（非 `/en/en/...`）；模型页无「设为向量默认」按钮；MCP/knowledge 空态均无内嵌新建按钮。

---

## P0 路由与鉴权

| # | 操作 | 期望 |
| --- | --- | --- |
| 1 | `GET /console/profile`（cookie=en） | 302 → `/en/console/profile` |
| 2 | `GET /console?notice=admin_forbidden` | 302 → `/en/console?notice=...` → redirect profile 且 notice 保留 |
| 3 | 无 cookie，`Accept-Language: zh-CN`，`GET /console/mcp` | 302 → `/zh/console/mcp` |
| 4 | 无 session `GET /en/console/models` | 302 → `/en/login?redirect=/en/console/models` |
| 5 | `GET /fr/console` | 302 → `/en` |
| 6 | 已登录访问 `/zh/console/profile` | 正常渲染，无长时间「验证会话」全屏 |

---

## P0 Shell

| # | 操作 | 期望 |
| --- | --- | --- |
| 7 | `/en/console` 侧栏五项 | 英文菜单文案 |
| 8 | 顶栏 LanguageSwitcher | 在「Chat/对话」左侧；样式同 chat shell |
| 9 | `/en/console/models` → 切中文 | `/zh/console/models`，query 保留 |
| 10 | 顶栏「对话/Chat」 | → `/{locale}/chat` |
| 11 | UserAvatarMenu 登出 | → `/{locale}/login` |
| 12 | `?notice=admin_forbidden` 英文 URL | Forbidden 横幅英文（`page.shell`） |
| 13 | dismiss Forbidden | 去掉 `notice` query |

---

## P1 子页 i18n

| # | 页面 | 检查点 |
| --- | --- | --- |
| 14 | profile | 个人信息/偏好表单 label、hint、toast、Empty、Alert 随 locale 切换 |
| 15 | profile | 无模型时「前往模型管理」→ `/{locale}/console/models` |
| 16 | models | ProTable 列头、分页 `showTotal`、Modal 表单、Popconfirm 双语 |
| 17 | models | 嵌入标签列展示：en「Embedding」/ zh「嵌入」 |
| 18 | assistants | 搜索/范围筛选、Drawer 表单、MCP 无配置引导链 |
| 19 | knowledge | 向量状态 Tag、详情 Drawer、分片测试 Drawer |
| 20 | knowledge | 预览链 → `/{locale}/knowledge/{id}` |
| 21 | mcp | 凭证 Tooltip、测试连接、删除阻断 Modal |
| 22 | settings | `/en/console/settings` → redirect `/en/console/profile`；metadata 双语 |

---

## P1 API 与错误

| # | 操作 | 期望 |
| --- | --- | --- |
| 23 | `/en/console/models` 触发校验错误（如空 API Key 新建） | toast 英文（`/api/console/**`） |
| 24 | 断网后刷新 models 列表 | `Network error...` / `网络异常...`（`shell.errors.networkRetry`） |
| 25 | knowledge CRUD 失败（若 API 仍中文） | **已知限制 #8**：原样展示中文 message |

---

## P2 跨页入口

| # | 操作 | 期望 |
| --- | --- | --- |
| 26 | `/en/chat` 点控制台图标 | `/en/console/profile` |
| 27 | `/en/chat` newChat 空态「前往助手管理」 | `/en/console/assistants` |
| 28 | `/en/chat` freeTierHint 链 | `/en/console/profile` |
| 29 | 首页 CTA「控制台」 | `/en/console/profile`（或当前 locale） |
| 30 | 登录 success `redirect=/en/console/mcp` | 进入 MCP 页 |

---

## 构建与静态检查

| # | 命令/检查 | 期望 |
| --- | --- | --- |
| 31 | `npm run build` | 通过 |
| 32 | `rg '[\u4e00-\u9fff]' src/app/[locale]/console/**/*Client.tsx` | 无用户可见硬编码中文（注释与数据常量 `嵌入` 除外） |

---

## CRUD 冒烟（可选回归）

| 模块 | 最小路径 |
| --- | --- |
| profile | 改昵称保存；选默认对话模型 |
| models | 新建私有模型 → 编辑 → 删除 |
| assistants | 新建个人助手 → 绑 KB → 保存 |
| knowledge | 新建文本库 → 等待/查看向量状态 → 检索测试 |
| mcp | 新建配置 → 测试连接 |
