# 服务端实现计划（迭代 0.0.3 — 管理后台壳）

## 1. 阶段 3A 结论：服务端零改动（本文件交付范围）

**在仅交付 PRD/设计所述「ProLayout 壳 + 占位」且不强制新 API 的前提下，0.0.3 阶段 3A 不要求修改 `app/`、`src/` 等业务代码。**

以下内容为 **阶段 3B 或后续迭代** 的推荐步骤与分工说明，供父 agent 在用户确认后排期。

---

## 2. 现状摘要（与 US-ADM-004 相关）

| 能力 | `/console` | `/admin`（3B 后） |
| --- | --- | --- |
| `middleware` 无 Cookie → 重定向 `/login?redirect=...` | ✅ 已覆盖 matcher | ✅ 已纳入 matcher |
| CSR 内 `GET /api/auth/me`，401 → 登录页 | ✅ `ConsoleView` | 需前端 admin 侧**对等实现**（设计 §9） |
| 登录成功 `redirectUrl` 可回到受保护页 | ✅ `/console` 在白名单 | ✅ `/admin` 与 `/admin/**` 已纳入 `safeRedirectUrl` |

**风险：** 若 admin 仅依赖 middleware 而不扩展 matcher，匿名用户可能仍能请求到 **admin 路由的 HTML/壳**（取决于该段 RSC/SSR 与客户端边界）；即使前端再跳转，也可能出现短暂闪屏或与「不展示已授权界面」不完全一致。**建议至少采用设计中的 CSR 校验模式，并优先考虑扩展 middleware 与登录 redirect 白名单。**

---

## 3. 推荐实现步骤（3B 可选）

### 3.1 与 Next.js `middleware` 对齐（服务端，小改动）

1. 在 `middleware.ts` 的 `config.matcher` 中增加 `/admin`、`/admin/:path*`（与 `/console` 并列）。
2. 复用现有逻辑：无 `SESSION_COOKIE` 时构造 `login`，`redirect` query 为 `${pathname}${search}`。
3. **效果**：与 chat/console 一致的首道防线；减少未登录用户拿到完整页面结构的几率。

**风险：** matcher 过宽可能影响静态优化路径——仅匹配 `/admin` 前缀通常可接受。

### 3.2 登录/注册后跳回 admin（服务端，小改动）

1. 扩展 `src/common/utils/redirect.ts` 中 `ALLOWED_PATHS`，或改为前缀白名单（如允许 `/admin` 下路径），使 `safeRedirectUrl` 接受 `/admin/...`。
2. **须防开放重定向**：仅允许本站 origin + 明确路径规则（与现实现对 `/console` 的约束一致）。

**与前端分工：** 登录页已支持 `redirect` query；前端只需传 `redirect=/admin/config` 等合法路径。

### 3.3 admin 布局内会话校验（前端为主，服务端契约不变）

1. 与 `ConsoleView` 相同：`useEffect` 内 `fetch("/api/auth/me", { credentials: "include" })`（若全局已默认 include 则按项目惯例）。
2. **401** → `router.replace("/login?redirect=<编码后的当前 URL>")`。
3. 成功前仅全页加载态，**不挂载** ProLayout 主导航与 Header 的「已登录」语义区块。

**服务端职责：** 无变更；保证 `GET /api/auth/me` 行为与 0.0.2 一致即可。

### 3.4 可选加强（后续迭代）

- **管理员身份校验**：在 `me` 响应中增加 `role` 或在独立 `GET /api/admin/...` 中校验；未授权返回 **403** 与专用错误码——**超出 0.0.3 范围**，需独立需求与数据模型。

---

## 4. 与前端分工一览

| 事项 | 前端（admin） | 服务端 |
| --- | --- | --- |
| ProLayout、主题、占位页 | 主责 | — |
| 未登录不展示已授权壳 | 主责：`me` 成功前仅加载态 | 可选：`middleware` 扩展 |
| 登录后回到 admin | 传 `redirect` query | 可选：`safeRedirectUrl` 白名单含 `/admin` |
| 退出登录 | 调用 `POST /api/auth/logout` | 已有 |

---

## 5. 自测建议（3B 落地后）

1. 清除 Cookie 访问 `/admin` 与 `/admin/config`：应重定向登录（若已加 middleware）或短暂加载后跳转登录（纯 CSR）。
2. 登录时带 `redirect=/admin/config`：登录成功后应落在 admin（若已改白名单）。
3. 有效会话下 `GET /api/auth/me` 为 200，页面展示壳与占位。
4. 会话在服务端销毁后：下一次 `me` 为 401，行为符合设计 §9。

---

## 6. 修订记录

| 版本 | 日期 | 说明 |
| --- | --- | --- |
| 0.0.3 | 2026-04-10 | 3A：服务端零改动；补充与 middleware、`safeRedirectUrl`、前端的衔接与风险 |
| 0.0.3 | 2026-04-10 | 3B：`middleware` 增加 `/admin`、`/admin/:path*`；`redirect.ts` 扩展 `safeRedirectUrl` |
