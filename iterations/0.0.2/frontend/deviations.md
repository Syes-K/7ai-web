# 设计与需求偏差说明 - version 0.0.2（前端）

## 1. 全局导航与首页视觉

- **设计**：认证双页为赛博 & 科技黑重点；站点其余区域可逐步对齐。
- **实现**：`/`、`/chat` 等仍沿用 **0.0.1 浅色 `PageShell`**，与 `/login`、`/register` 深色体系**暂不统一**。后续可做全局主题或仅统一顶栏令牌。

## 2. 登出（FR-AUTH-004）

- **需求**：应提供可触达的登出能力（位置由设计定）。
- **实现**：`POST /api/auth/logout` **已实现**；**全局导航未放置「登出」按钮**。验收可用开发者工具执行：
  `fetch('/api/auth/logout', { method: 'POST' }).then(() => location.href='/')`
- **建议后续**：在 `NavPlaceholder` 或独立 `UserMenu` 中，在已登录态下展示「登出」（需 `GET /api/auth/me` 或布局传参）。

## 3. 组件命名 vs spec-placeholder

- 设计文档中的建议组件名（如 `PageHeaderPlaceholder`）与实现中 `AuthShell`、`CaptchaField` 等**命名不一致**，语义对齐，无功能偏差。

## 4. 表单校验时机

- **需求**：前后端均需校验；后端为最终裁决。
- **实现**：登录/注册以 **服务端返回** 的 `error.message` 为主展示；**未**在客户端完整复刻全部密码策略（减少包体与重复逻辑）。若需失焦即验，可在后续迭代补充。

## 5. `metadata` 与浏览器标题

- 已为 `/login`、`/register` 配置 `metadata.title`；首页与其它占位页仍为默认或简略标题，与「每页独立 title」可后续对齐。

## 6. 控制台首屏「验证会话…」

- **原因**：`/console` 为 CSR，`ConsoleView` 在 `fetch /api/auth/me` 完成前展示加载文案。
- **与设计**：属于实现细节，不构成产品功能偏差。
