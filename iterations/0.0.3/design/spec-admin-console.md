# 设计说明：管理后台 ProLayout 壳（0.0.3）

## 文档信息

| 项 | 内容 |
| --- | --- |
| 版本 | `0.0.3` |
| 对应 PRD | `iterations/0.0.3/product/prd-admin-console.md` |
| 范围 | 仅 **`/admin/**`** 管理后台壳；不含五模块业务功能 |

---

## 对齐假设（仓库只读扫描，2026-04-10）

以下用于**视觉与工程对齐**，实现时若与代码演进不一致，以 PRD + 本说明为准并更新本节。

| 项 | 现状摘要 | 对本迭代的影响 |
| --- | --- | --- |
| `src/app/globals.css` | 存在；`:root` 定义 `--foreground`、`--muted`、`--border`、`--card`，`body` 为**浅色**（白底、深字） | 管理后台壳走 **antd 深色主题 + ConfigProvider token**，不依赖当前浅色 `--foreground` 作为壳背景；可在 `admin` 段**扩展** `--admin-*` 变量与 token 对齐（见 §5）。 |
| 全站「科技黑」 | PRD 要求与全站赛博黑一致；当前 `console`、`PageShell`、`EmptyStateCard` 多为 **slate-50 / 白卡** 占位风 | **本迭代 admin 壳目标为深色**；与现有 console 页形成**刻意区分**（console 可仍为浅占位，admin 为深 ProLayout），后续若全站统一深色再收敛变量。 |
| `console` | `ConsoleView`：CSR、`/api/auth/me` 401 → `/login?redirect=/console`；标题「控制台」 | **文案心智**：控制台 = 普通用户；管理后台 = 系统管理。**不合并入口**；admin 侧会话校验与重定向策略对齐 PRD（见 §8 / US-ADM-004）。 |
| 根 `layout.tsx` | 仅 `html lang="zh-CN"` + `body` 基础类，无主题包裹 | admin 路由建议在 **`admin` layout** 内挂载 **Ant Design Registry + ConfigProvider（dark）**，避免与全站浅色假设冲突。 |

---

## 需求追溯矩阵（US / AC）

| 设计章节 | US-ADM | AC（设计侧可验收） |
| --- | --- | --- |
| §1 路由与 IA、§8 未授权 | 001、004 | 001-AC1/AC2；004-AC1（无会话时不呈现已登录管理界面） |
| §2 ProLayout、§4 占位页 | 001、002 | 002-AC1/AC2/AC3；侧栏与 Header 在子路由切换时保持 |
| §3 Header、§5 主题 | 001、003 | 003-AC1/AC2；Header 区域稳定、深色可读 |
| §6 响应式、§7 无障碍 | 001、002、003 | 窄屏可用；焦点与语义可扫验收 |

---

## 1. 路由与信息架构（对应 D1）

### 1.1 产品与心智区分（不合并入口）

| 维度 | 管理后台 `/admin` | 普通用户控制台 `/console` |
| --- | --- | --- |
| 受众 | 系统管理员、运营（系统级） | 登录用户（个人/业务侧） |
| 文案关键词 | **管理后台**、**系统**、模块名（配置/用户/日志等） | **控制台**、个人/业务向能力 |
| 入口 | 直达 `/admin`、书签、未来专入口；**本迭代不要求**在 console 内放「进入管理后台」 | 保持现有 `/console` 入口与 redirect 约定 |

**硬约束**：不在导航或标题中将二者称为同一产品；不在本迭代把两套路由合并到同一壳。

### 1.2 路由表与默认重定向

| 顺序 | 模块（菜单文案） | `path` 片段（建议） | 说明 |
| --- | --- | --- | --- |
| 1 | 配置管理 | `/admin/config` | 作为默认落地首模块 |
| 2 | 用户管理 | `/admin/users` | |
| 3 | 提示词管理 | `/admin/prompts` | |
| 4 | 日志查询 | `/admin/logs` | |
| 5 | 系统助手管理 | `/admin/assistants` | |

- **`/admin`**：**301/302 客户端重定向**至 **`/admin/config`**（与「配置管理」为列表第一项一致）。
- **菜单项与路由一一对应**，无额外隐藏路由（本迭代）。

### 1.3 与首页、对话的关系

- 首页、对话等 C 端路由**不**自动进入 admin；管理员通过明确 URL 或后续全局入口进入。
- **App Router**：`/admin` 段使用**独立 layout**（ProLayout），子路由 `children` 为内容区；与根 layout 仅共享 `html`/`body`，避免重复全站顶栏（若全站未来有统一顶栏，再协调层级）。

---

## 2. 页面与路由结构（对应 D2）

- **布局组件**：单例 **ProLayout** 挂在 `admin` layout；**内容区**仅渲染子路由（`Outlet` 语义）。
- **PageContainer（建议）**：各占位子页使用 **PageContainer**（或等价标题区），展示**模块标题 + 面包屑可选**；本迭代面包屑可简化为「管理后台 / 模块名」或仅模块标题，避免过度设计。
- **默认重定向**：见 §1.2；深链直达 `/admin/users` 等应直接命中对应页，**不再**经过无意义中间页。

---

## 3. ProLayout / 侧栏导航（对应 D3）

### 3.1 尺寸与折叠

| 项 | 建议值 | 说明 |
| --- | --- | --- |
| 侧栏展开宽度 | **256px**（与 antd Pro 默认一致，可 token `layout.siderWidth`） | |
| 侧栏折叠宽度 | **80px**（仅图标） | 折叠时显示菜单图标，tooltip 展示全称 |
| 默认状态 | **展开**（桌面） | 记住用户折叠偏好可用 `localStorage`（实现可选，设计不强制） |

- **顶栏高度**：建议 **48px**（与 ProLayout 默认协调）；若与设计系统冲突，以 **44–56px** 为允许区间。

### 3.2 菜单顺序、`key`、路由映射

顺序固定如下（与 PRD 一致）；`key` 建议与 `path` 对齐，便于选中态计算。

| 顺序 | `key` | 路径 | 菜单文案 |
| --- | --- | --- | --- |
| 1 | `config` | `/admin/config` | 配置管理 |
| 2 | `users` | `/admin/users` | 用户管理 |
| 3 | `prompts` | `/admin/prompts` | 提示词管理 |
| 4 | `logs` | `/admin/logs` | 日志查询 |
| 5 | `assistants` | `/admin/assistants` | 系统助手管理 |

### 3.3 图标（可占位）

使用 `@ant-design/icons` 线性/面性一致即可，建议：

| `key` | 建议图标 | 备注 |
| --- | --- | --- |
| `config` | `SettingOutlined` | |
| `users` | `TeamOutlined` 或 `UserOutlined` | |
| `prompts` | `FileTextOutlined` 或 `CommentOutlined` | |
| `logs` | `FileSearchOutlined` | |
| `assistants` | `RobotOutlined` 或 `ApiOutlined` | |

未最终定稿前允许统一用 `AppstoreOutlined` 占位，但**上线前**建议替换为上表。

### 3.4 选中态与悬停

- **选中**：侧栏项左侧 **3–4px 高亮条**（品牌强调色，见 §5）+ 背景相对一级底 **略亮/略浅**（深色模式下为略提高亮度），文字 **primary 强调色或白字加粗**二选一，保持对比度 **≥ 4.5:1**（正文相对背景）。
- **悬停**：背景轻微变亮（`colorFillTertiary` 量级），**不改变**当前选中项逻辑；键盘焦点与悬停视觉一致（见 §7）。

### 3.5 PageContainer

- **推荐**：各子页使用 **PageContainer**，`title` = 模块中文名，`content` = 占位区（§4）。
- **本迭代可省略** `subTitle`；若加，可用固定一句「系统管理 · 占位」强化心智。

---

## 4. Header（对应 D4）

### 4.1 区域划分

| 区域 | 内容 | 说明 |
| --- | --- | --- |
| **左** | **折叠/展开**触发器（`MenuFoldOutlined` / `MenuUnfoldOutlined`） | 仅控制侧栏；与菜单选中无关 |
| **中** | **后台标题**：建议主标题 **「7ai 管理后台」**；可选副标题或小字 **「系统管理」** | 与 `/console`「控制台」文案严格区分 |
| **右** | **用户区**：头像或用户名缩写 + **下拉菜单**（**退出登录**等） | 与 **0.0.2** 登出能力衔接：`Dropdown` 内触发既有登出流程（调用登出 API / 跳转），本迭代不新增业务菜单项 |

### 4.2 环境标签（staging / dev）

- **本迭代默认不展示**；若后续需要，建议放在 **顶栏右侧用户区左侧** 为小 **Tag**（如 `staging` 橙色、`dev` 紫色），避免遮挡标题。

### 4.3 品牌

- 若有站点 SVG Logo，可放在标题左侧 **24×24 ~ 32×32**；无则 **文字标题**即可。

---

## 5. 主题与 Token（对应 D5）

### 5.1 方向

- 使用 antd **深色算法**（`theme.algorithm` 含 `darkAlgorithm`）；管理后台 **独立 ConfigProvider**，不强制改变全站 `globals.css` 的浅色 `body`（admin 段容器铺满深色即可）。

### 5.2 建议 `ConfigProvider` / `theme.token` 映射

以下数值为**起点**，实现时可按 antd 5 token 名微调；目标为**科技黑 + 青色/电蓝强调**（可按现有品牌色替换 `colorPrimary`）。

| Token（antd 5） | 建议值 | 用途 |
| --- | --- | --- |
| `colorBgLayout` | `#0a0a0f` ~ `#0f1117` | ProLayout 外背景 |
| `colorBgContainer` | `#14141c` | 内容区、卡片底 |
| `colorBgElevated` | `#1a1a24` | 顶栏、浮层 |
| `colorBorder` | `#2a2a36` | 分割线、表边框 |
| `colorBorderSecondary` | `#22222e` | 弱分割 |
| `colorText` | `rgba(255,255,255,0.88)` | 主文案 |
| `colorTextSecondary` | `rgba(255,255,255,0.65)` | 次要文案 |
| `colorTextTertiary` | `rgba(255,255,255,0.45)` | 占位、hint |
| `colorPrimary` | `#22d3ee`（cyan-400 参考）或品牌主色 | 链接、主按钮、菜单选中条 |
| `colorSuccess` / `colorWarning` / `colorError` | 沿用 antd dark 默认或略调饱和 | 状态反馈 |

### 5.3 与 CSS 变量衔接（可选）

若需在非 antd 区域复用，可在 `admin` layout 根节点或 `:root` 扩展：

```text
--admin-bg-base: #0a0a0f;
--admin-bg-container: #14141c;
--admin-border: #2a2a36;
--admin-text: rgba(255, 255, 255, 0.88);
--admin-text-secondary: rgba(255, 255, 255, 0.65);
--admin-primary: #22d3ee;
```

实现时保持 **token 与变量同源**（构建时注入或运行时同步），避免两套色值漂移。

### 5.4 对比度

- 正文相对其背景 **≥ 4.5:1**；**主按钮与链接**（`colorPrimary`）相对背景 **≥ 4.5:1**（大字号可适当放宽至 3:1，但菜单与按钮仍建议 4.5:1）。

---

## 6. 模块占位页与空状态（对应 D6）

### 6.1 统一占位组件建议

建议抽象 **`AdminModulePlaceholder`**（名称实现自定），结构：

1. **模块标题**：与侧栏文案一致（h1 或 PageContainer `title`）。
2. **副文案**：一句说明，例如：**「本模块开发中，后续将提供系统管理能力。」**
3. **可选**：中央 **Empty**（antd `Empty`）**不强制插画**；若需图标，用 `Icon` + 弱色即可，避免与浅色站 `EmptyStateCard` 混用样式。

**与现有 `EmptyStateCard` 关系**：当前 `EmptyStateCard` 为**浅底虚线边框**（`src/components/placeholders/EmptyStateCard.tsx`），**不适合**直接套在深色 admin 内容区；admin 占位应使用 **深色容器** 或 **antd Empty + 自定义 className**。

### 6.2 各页标题与副文案（可与 PageContainer 合并）

| 路径 | 标题 | 副文案示例 |
| --- | --- | --- |
| `/admin/config` | 配置管理 | 系统级配置能力开发中。 |
| `/admin/users` | 用户管理 | 用户与权限管理开发中。 |
| `/admin/prompts` | 提示词管理 | 提示词与模板管理开发中。 |
| `/admin/logs` | 日志查询 | 日志检索与审计开发中。 |
| `/admin/assistants` | 系统助手管理 | 系统助手配置开发中。 |

---

## 7. 响应式（对应 D7）

| 断点 | 行为 |
| --- | --- |
| **≥ 992px（lg）** | 侧栏常显；可折叠为图标栏 |
| **768px–991px（md）** | 建议默认**折叠侧栏**为图标栏；或保持展开由产品取舍 |
| **< 768px** | 侧栏改为 **Drawer（抽屉）** 或 **overlay sider**：点击汉堡菜单打开，**遮罩**关闭；内容区全宽 |

- **最窄支持宽度**：**320px**；再窄仅保证不横向溢出（允许滚动），不保证 ProLayout 桌面级体验。

---

## 8. 无障碍与键盘（对应 D8）

### 8.1 最低要求

- **语义**：页面级 **`main`** 包裹内容区；侧栏 **`nav`** 或带 `aria-label="管理后台主导航"` 的容器。
- **焦点**：折叠按钮、菜单项、用户下拉、退出均可 **Tab** 聚焦；**可见焦点环**（与 `colorPrimary` 协调，避免与深色底融在一起）。
- **当前页**：菜单当前项使用 **`aria-current="page"`**（若组件支持）或等价。
- **跳过链接（建议）**：在 admin layout 顶部提供 **「跳到主要内容」** 隐藏至聚焦可见，锚点到 `main#admin-main`（id 实现约定）。

### 8.2 与全站对齐

- `html lang="zh-CN"` 已由根 layout 提供；管理后台内文案保持中文。
- 动效：**尊重 `prefers-reduced-motion`**，侧栏展开/抽屉过渡可减弱或关闭。

---

## 9. 未授权访问（产品 + 设计，US-ADM-004）

- **无有效会话**访问任意 `/admin/**`：**不展示**完整 ProLayout 内「已登录」管理界面（含占位业务文案）；应 **redirect 至 `/login?redirect=/admin/...`**（与 console 模式一致，路径改为 admin）。
- **加载中**：可展示全页轻量加载（与 `ConsoleView`「验证会话…」类似），**不**使用深色假顶栏冒充已登录。

---

## 10. 修订记录

| 版本 | 日期 | 说明 |
| --- | --- | --- |
| 0.0.3 | 2026-04-10 | 初稿：D1–D8、US-ADM 追溯、仓库对齐假设 |
