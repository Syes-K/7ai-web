# 设计说明（总览）— MCP × 知识库 × 对话（version 0.1.9）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.9` |
| 阶段 | 设计（阶段 2） |
| 上游 | `iterations/0.1.9/product/prd.md`、`user-stories-mcp-knowledge-chat.md`、`README.md` |

---

## 1. 设计默认假设（对齐产品开放问题，未静默吞掉）

以下条目在 **`iterations/0.1.9/product/README.md`** 中仍为「待产品确认」；设计阶段采用下列**默认假设**以便交互与验收路径可落地。若产品定稿不同，仅需替换对应小节并同步子规格文档。

| # | 开放问题摘要 | 设计默认假设 |
| --- | --- | --- |
| 1 | MCP 挂载与 RAG 是否解耦（提案 A / B） | **采用提案 A**：只要助手绑定的知识库集合中存在 MCP 挂载，则每轮 Agent 构建均合并对应 MCP tools，**不依赖**本轮向量检索是否执行或是否命中片段。详见 `spec-chat-agent-mcp.md`。 |
| 2 | 每用户 / 每知识库 MCP 数量上限 | **首版不在 UI 预设固定上限文案**；若后端将来返回「超出配额」类错误，使用通用错误 Toast + 服务端 `error.message`；产品确认上限后，在列表/选择器旁补充计数与禁用逻辑。 |
| 3 | 删除仍被引用的 MCP | **禁止硬删**：删除前由服务端或前端根据依赖数据拦截；弹窗列出引用中的知识库名称（或数量 +「查看详情」），主 CTA 为「去解除挂载」跳转知识库管理，次按钮关闭。 |
| 4 | `enabled = false` 仍被知识库挂载 | **允许保存知识库**（不阻断保存）；选择器内禁用项不可新选，已选历史项保留在 chips 中但带「已停用」标签与警告色；详情/编辑区顶部展示 **Alert（warning）**：说明该 MCP 不会在对话中加载，建议启用或移除。 |
| 5 | 连接测试触发方式 | **仅手动**「测试连接」；不做定时探测 UI。 |
| 6 | 非助手会话 / 会话级知识库 | **本期明确不支持**会话级单独选知识库；对话页**不新增**「仅为本会话挂载 KB/MCP」的入口。 |
| 7 | MCP 失败对用户可见级别 | **控制台**：Toast + 列表/详情字段（`lastCheckStatus` 等）。**对话侧默认低调**：不默认在每条助手消息下加脚注；**同一用户消息轮次内**至多一次非阻塞 Toast（如「部分外部工具暂不可用」），全部失败时可不 Toast（与「等价无 MCP」一致）。详见 `copy-and-interaction.md`。 |

---

## 2. 信息架构（IA）

```
个人控制台 (/console)
├── 账号与偏好      (/console/profile)
├── 模型管理        (/console/models)
├── 助手管理        (/console/assistants)     ← 绑定知识库（已有）
├── 知识库管理      (/console/knowledge)      ← 本期：MCP 多选挂载
└── MCP 管理        (/console/mcp)            ← 本期：新增顶级模块

对话 (/chat)
└── 使用助手 + 已绑定知识库 → 运行时合并 MCP tools（用户侧弱感知）
```

- **MCP 配置**为「用户级资源」，与「知识库」「助手」并列的一级控制台模块，避免深埋在知识库内导致发现性不足（PRD 5.1）。
- **挂载关系**维护在知识库侧，与 PRD 多对多模型及「助手 → 知识库 → MCP 并集」解析链一致。

---

## 3. 与现有控制台壳体的衔接

### 3.1 侧栏与路由

| 实现位置 | 本期变更说明 |
| --- | --- |
| `src/app/console/console-menu.tsx` | 在 `consoleMenuRoutes` 中新增一项：`path: "/console/mcp"`，名称建议 **「MCP 管理」** 或 **「MCP 连接」**（与 PRD「展示名」一致即可）；`key: "mcp"`；图标建议 `@ant-design/icons` 的 `CloudServerOutlined` 或 `ApiOutlined`（避免与「模型管理」重复则用 `CloudServerOutlined`）。**插入位置**：建议紧挨「知识库管理」之上或之下，便于心智「先配 MCP、再在知识库里挂」。 |
| `src/app/console/ConsoleShell.tsx` | 无需改布局结构；`ProLayout` 的 `route.routes` 已引用 `consoleMenuRoutes`，新菜单项自动进侧栏。 |
| `src/app/console/mcp/page.tsx` | **新建**（由前端阶段实现）：MCP 列表页入口，与 `knowledge/page.tsx` 同级目录风格一致。 |

### 3.2 布局与组件基线

- **页面容器**：与现有控制台一致，使用 `@ant-design/pro-components` 的 `PageContainer` 包裹主内容（参见 `src/app/console/knowledge/page.tsx`）。
- **列表**：`ProTable` + `actionRef` 刷新模式；工具栏含「新建」、「刷新」、名称关键字筛选（与知识库列表复杂度对齐，满足 US-A1）。
- **表单承载**：与知识库页一致，**优先 `Modal` + `Form`** 承载新建/编辑；若连接参数表单过长，可改为 `Drawer`（宽度 `520`~`640px`），交互状态机相同。子规格见 `spec-mcp-console.md`。
- **主题**：沿用 `ConsoleShell` 内 `ConfigProvider` + `shellDarkTheme`，不在本期引入第二套控制台主题。

### 3.3 断点与布局

- `ProLayout` 已设 `breakpoint="lg"`、`siderWidth={256}`（`ConsoleShell.tsx`）。内容区在 `md` 以下以单列堆叠为主；表格在窄屏允许横向滚动，操作列 `fixed: "right"`（与知识库页模式对齐）。

### 3.4 可访问性（a11y）

- 新建/编辑/删除确认：**焦点陷阱**交给 Ant Design `Modal`；主按钮与危险操作分离，删除需二次确认且说明后果。
- 「测试连接」：`Button` 在 loading 时 `aria-busy` 由组件库处理；旁以文案「检测中…」辅助。
- 跳转链接：使用语义清晰的文案（如「去 MCP 管理」），避免仅用图标。

---

## 4. 关键页面与区块矩阵

| 页面/区块 | 路由或宿主 | 核心目标 | 子规格 |
| --- | --- | --- | --- |
| MCP 列表 + 新建/编辑 + 测试 + 删除 | `/console/mcp` | 用户级 MCP CRUD 与连接验证 | `spec-mcp-console.md` |
| 知识库编辑/详情中的 MCP 挂载 | `/console/knowledge`（`knowledge/page.tsx`） | 0~N 多选、已选展示、跳转管理页 | `spec-knowledge-base-mcp-bindings.md` |
| 对话运行时 MCP 感知边界 | `/chat`（`ChatWorkspace` 等） | 默认弱提示、失败降级边界 | `spec-chat-agent-mcp.md` |

---

## 5. 表单字段与校验（跨页摘要）

具体字段布局见 `spec-mcp-console.md`；此处列**语义级**校验规则供前后端对齐。

| 字段/组 | 必填 | 校验 |
| --- | --- | --- |
| 名称 `name` | 是 | 非空、trim、最大长度与产品常量对齐时可复用 `KNOWLEDGE_BASE_NAME_MAX_LENGTH` 同级策略或单独常量 |
| 描述 `description` | 否 | 最大长度若有常量则对齐 |
| 传输方式 `transport` | 是 | 枚举占位；选项随研发协议选型更新 |
| 连接 `endpoint` / 结构化连接参数 | 是（或按 transport 条件必填） | URL/主机格式按 transport 分支校验（设计交付为「分支必填矩阵」，实现细节 backend） |
| 凭证 `credentials` | 创建时按产品要求；编辑时可选 | **不明文回显**；置空表示不修改（交互见子规格） |
| 启用 `enabled` | — | Switch；与知识库挂载、对话加载策略联动见默认假设表 |

---

## 6. 空态 / 错误态 / 边界（全局）

| 场景 | 表现 |
| --- | --- |
| MCP 列表为空 | `ProTable` 空态插画 + 文案「尚未添加 MCP」+ 主按钮「新建 MCP」 |
| 列表加载失败 | `message.error` + 工具栏「重试」 |
| 401 / 未登录 | 与现有一致：跳转登录并带 `redirect`（各页自行拼接） |
| 无权限（若存在角色扩展） | `ConsoleForbiddenNotice` 行为保持 |
| 知识库挂载选择器无可用 MCP | 内联 `Alert` type="info"：「请先在 MCP 管理中添加」+ Link 至 `/console/mcp` |
| 删除 MCP 被依赖拦截 | `Modal.error` 或 `Modal.warning` + 列表见 `spec-mcp-console.md` |

---

## 7. 用户故事 / AC 与设计产出映射

| 编号 | 设计落点 |
| --- | --- |
| AC-M1~M4 | `spec-mcp-console.md` + `copy-and-interaction.md` |
| AC-K1~K3 | `spec-knowledge-base-mcp-bindings.md` + `spec-mcp-console.md`（删除分支） |
| AC-C1~C3 | `spec-chat-agent-mcp.md` |

---

## 8. 文档索引

| 文件 | 说明 |
| --- | --- |
| `design-spec.md` | 本文件：总览、IA、控制台衔接、全局状态 |
| `spec-mcp-console.md` | MCP 管理页专规 |
| `spec-knowledge-base-mcp-bindings.md` | 知识库侧挂载专规 |
| `spec-chat-agent-mcp.md` | 对话侧专规与 RAG 解耦设计默认 |
| `copy-and-interaction.md` | 关键文案与 Toast/Modal 级别 |

---

## 9. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-04-21 | 初稿，承接 product 0.1.9 |
