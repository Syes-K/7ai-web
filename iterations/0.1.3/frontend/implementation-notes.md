# 前端实现说明 · 0.1.3

**范围**：本会话内完成的聊天 Markdown、首页落地、顶栏与用户头像、控制台壳体导航等相关改动（代码路径以仓库为准）。

**版本说明**：在既有迭代目录中 `0.1.2` 基础上递增 PATCH 得 `0.1.3`。

---

## 1. 助手 Markdown 输出（`AssistantMarkdown`）

- 使用 **`react-markdown` + `remark-gfm`** 渲染助手侧 Markdown；流式首包为空时仍走 `AssistantText` 等待态。
- **代码高亮**：**`rehype-highlight`**（lowlight / highlight.js 常用语言包）+ **`highlight.js/styles/github-dark.min.css`**；`detect: true` 以便无语言标记的围栏仍尝试识别。根容器增加 class **`assistant-markdown`**，并用 `assistant-markdown-hljs.css` 让 `code.hljs` 背景透明，与气泡内 `pre` 底色协调；`pre` 增加 **`font-mono`**。
- **样式**：标题、列表、引用、表格、链接、行内/围栏代码等通过 `components` 映射维护，避免单文件超长 `className`。
- **围栏代码块**：
  - 行内 `code` 与 `pre > code` 区分：`pre` 内 `code` 不再叠加行内 `px`，避免「首行像多空格」。
  - `pre` 使用 `min-w-0`、`w-full`、`overflow-x-auto` 等，避免长行撑破气泡。
- **数据说明**：未对整段内容做外层 `` ``` `` 剥离（曾实现后按产品要求撤销）；模型若用围栏包整段，粗体等会按代码块显示，属预期。

**主要文件**：`src/components/chat/assistant-output/variants/AssistantMarkdown.tsx`、`assistant-markdown-hljs.css`

**依赖**：`rehype-highlight`、`lowlight`、`highlight.js`（主题 CSS）

---

## 2. 聊天气泡与输入区

- 助手气泡容器增加 **`min-w-0`**，减轻 flex 下长文不换行问题（`ChatWorkspace` 内 `MessageBubble`）。
- 输入框：**约 3 行**：`rows={3}`，`min-h` 从原约 104px 下调，并保留底部发送区留白。

**主要文件**：`src/components/chat/ChatWorkspace.tsx`

---

## 3. 站点首页（Punk 落地）

- 参考外部项目中的 **`PunkLanding` + `punk-home.css`** 接入根路由 `/`。
- **`PunkHomeHeader`（客户端）**：
  - 左侧 **`BrandMark`**。
  - **对话 / 控制台**：与控制台顶栏一致的 **`headerActionLink` 风格**（无边框），图标与 `ConsoleShell` / `AdminShell` 对齐（`IconEmptyState`、`IconConfig`）。
  - **会话**：`GET /api/auth/me`；已登录展示用户菜单；未登录展示 **登录**（`IconLogin`）链至 `/login?redirect=/`。
  - 顶栏 **高度 56px**、**水平 padding 16px**（`h-14`、`px-4`），与 ProLayout 顶栏习惯一致；**背景**为 **`bg-black/30` + `backdrop-blur-md`**，与落地页主背景 `#030208` 协调（未使用控制台 `headerBg` 实色）。
- 主区高度：`min-h-[calc(100dvh-56px)]` 与 56px 顶栏对齐。

**主要文件**：

- `src/components/home/PunkLanding.tsx`
- `src/components/home/PunkHomeHeader.tsx`
- `src/components/home/punk-home.css`
- `src/app/page.tsx`

---

## 4. 用户头像与顶栏菜单（`UserAvatar` / `UserAvatarMenu`）

- **`UserAvatar`**：首字母 + 渐变与描边，**不使用** antd `Avatar`。
- **`UserAvatarMenu`**：统一下拉「退出登录」、`POST /api/auth/logout` 与触发器样式。
  - **`variant`（默认 `shell`）**：登出后 `router.replace("/login")`，供 **控制台 / 管理后台** 使用。
  - **`variant="home"`**：登出后 `router.refresh()`，并派发 **`USER_SESSION_ENDED_EVENT`**，由 **`PunkHomeHeader`** 监听以将本地 `user` 置空（避免再向首页传 `onLogout`）。
- 触发区仅保留头像，昵称通过 **`aria-label`** 体现可访问性。

**主要文件**：

- `src/components/user/UserAvatar.tsx`
- `src/components/user/UserAvatarMenu.tsx`
- `src/components/user/index.ts`（导出含 `USER_SESSION_ENDED_EVENT` 与类型）

**替换处**：`src/app/console/ConsoleShell.tsx`、`src/app/admin/AdminShell.tsx` 中原 antd `Avatar` + 下拉逻辑。

---

## 5. 控制台 / 管理后台壳体（`ProLayout`）

- **移除 `onMenuHeaderClick`**：避免与 **`BrandMark`** 内 **`Link href="/"`** 双重导航；顶栏词标仅依赖 `BrandMark` 默认行为。

**主要文件**：`src/app/console/ConsoleShell.tsx`、`src/app/admin/AdminShell.tsx`

---

## 6. 依赖

- `package.json` 增加 **`react-markdown`**、**`remark-gfm`**、**`rehype-highlight`**、**`lowlight`**、**`highlight.js`**（若锁文件一并更新属正常）。

---

## 7. 未纳入 / 后续可选项

- 更多语言：可在 `rehype-highlight` 的 `languages` 中注册 `lowlight` 的 `all` 或按需扩展（体积更大）。
- 首页顶栏与控制台 **视觉色值** 刻意区分（半透明黑 vs 实色 header）；若需完全统一再单独迭代。
