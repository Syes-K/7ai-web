# 规格：控制台 — MCP 管理页（version 0.1.9）

**路由**：`/console/mcp`  
**菜单**：`src/app/console/console-menu.tsx` 新增项（与 `design-spec.md` 一致）  
**参考实现风格**：`src/app/console/knowledge/page.tsx`（`PageContainer`、`ProTable`、`Modal`、`Drawer`、401 处理）

---

## 1. 页面结构

```
PageContainer（title: 「MCP 管理」或「MCP 连接」）
├── 说明区（可选，折叠或一行小字）：用途说明 + 链到文档（若有）
└── ProTable
    ├── toolbar：名称搜索 Input + 搜索按钮 | 刷新 | 新建
    ├── columns：名称、启用、传输方式、最近检测、操作
    └── row actions：编辑 | 测试连接 | 删除
```

---

## 2. 列表（ProTable）

### 2.1 列定义（建议）

| 列名 | 数据字段 | 展示 |
| --- | --- | --- |
| 名称 | `name` | 主文案，可 `ellipsis` + `Tooltip` |
| 启用 | `enabled` | `Tag`：绿色「启用」/ 默认「停用」 |
| 传输方式 | `transport` | 枚举映射中文标签 |
| 连接摘要 | `endpoint` 或摘要字段 | **脱敏展示**（截断、隐藏 query 中的密钥形片段）；完整值不在列表展开 |
| 最近检测 | `lastCheckedAt` + `lastCheckStatus` | 时间相对/绝对（与知识库 `dayjs` 用法一致）+ 状态图标或 Tag（成功/失败/未检测） |
| 操作 | — | 按钮组 |

### 2.2 工具栏与筛选

- **名称关键字**：受控输入 +「搜索」触发 `reload`（与知识库 `keyword` / `keywordDraft` 模式对齐，满足 US-A1）。
- **刷新**：触发 `actionRef.reload`，按钮 loading 与知识库 `toolbarLoading` 同类。

### 2.3 空态

- 无数据且非加载中：表格 `locale.emptyText` 自定义为简短说明 + 「新建 MCP」按钮（同 `openCreate`）。

---

## 3. 新建 / 编辑

### 3.1 承载形态

- **默认**：`Modal` + `Form`（`modalOpen` / `modalMode: "create" | "edit"`），与知识库新建一致。
- **备选**：字段过多时改用 `Drawer` `placement="right"`，表单分区（基础信息 / 连接 / 凭证）用 `Divider` 或 `Collapse`「连接参数」单面板折叠。

### 3.2 表单字段（与 PRD 5.1 语义对齐）

| 字段 | 组件建议 | 说明 |
| --- | --- | --- |
| 名称 | `Input` | 必填，`showCount` 若长度有限 |
| 描述 | `Input.TextArea` | 可选，`rows={2}` |
| 传输方式 | `Select` | 必填；选项由后端枚举驱动 |
| 连接参数 | `Input` 或结构化控件 | 按 `transport` 动态表单项（`Form.Item` `shouldUpdate`） |
| 启用 | `Switch` | 文案「启用该 MCP」 |
| 凭证 / Token | `Input.Password` 或专用「密钥」区 | 见下节 |

### 3.3 凭证类字段交互（AC-M3）

- **创建**：按产品要求必填或可选；若必填则 rules 标红。
- **编辑打开时**：不回显明文；展示占位 **「已配置 · 点击更新」** 或 `Password` 置空且 `placeholder="留空表示不修改"`。
- **更新密钥**：单独「更新密钥」次要按钮或折叠面板内二次展开，避免与常规保存混淆；提交时若用户未填新密钥则 payload **省略**该字段（置空不修改）。

### 3.4 校验与提交

- 前端：`Form` rules 与 transport 条件联动。
- 提交中：`submitting` 锁主按钮；成功后 `message.success`、关 Modal、`reload`；失败：`parseApiError` 同类工具展示 `message.error`。

---

## 4. 测试连接（US-A3 / AC-M4）

### 4.1 触发位置

- **行内**：列表每行「测试连接」`Button`。
- **编辑 Modal 内**：底部次要按钮「测试连接」（编辑未保存时行为见下）。

### 4.2 未保存编辑时的策略（设计默认）

- **设计默认假设**：若当前 Modal 内有**未保存**修改，点击「测试连接」先触发 `Modal.confirm`：「是否先保存再测试？」选项 **「保存并测试」** / **「放弃修改并测试当前已存配置」** / 取消。避免用户误以为测到的是草稿。（若研发实现为「草稿仅内存测试」API，则需产品改文案，本假设以「已落库配置为准」优先。）

### 4.3 反馈

- 请求进行中：按钮 `loading`，列表行可选 `loading` 态禁用重复点击。
- 成功：`message.success`（简短）+ 列表 `reload` 以刷新 `lastCheckedAt` / `lastCheckStatus`。
- 失败：`message.error` 展示 **服务端返回的已脱敏摘要**；列表同样刷新以持久状态为准。
- **禁止**在 UI 展示完整堆栈或密钥片段。

---

## 5. 删除（US-A4）

### 5.1 流程

1. 用户点击「删除」→ **二次确认** `Modal.confirm`（`okType: "danger"`），文案含「删除后无法恢复」类标准表述。
2. 若服务端返回 **「仍被知识库引用」**（HTTP 与错误码由 backend 定义，如 409）：
   - **不关闭**确认框或关闭后立刻打开 **`Modal.warning`**（推荐）：
     - 标题：「无法删除」
     - 内容：说明被 N 个知识库引用；若 API 返回名称列表则展示 `List`（最多显示 5 条 +「等共 N 个」）；若无列表则仅展示数量。
     - 主操作：**「前往知识库管理」** → `Link` / `router.push("/console/knowledge")`
     - 次要：关闭
3. **设计默认假设**（开放问题 #3）：**禁止硬删**，不提供「一键级联删除并解除挂载」按钮；若产品改为级联策略，本块改为成功 Toast + 列出被解除的知识库。

### 5.2 删除成功

- Toast + `reload`；若用户从知识库页返回，知识库侧挂载应已不包含该 id（依赖后端数据一致）。

---

## 6. 状态矩阵

| 状态 | UI |
| --- | --- |
| 初始加载 | `ProTable` loading |
| 启用 = false | 列表 Tag「停用」；行内「测试连接」仍可点（便于用户修复后再启用） |
| 最近检测失败 | 状态列红色 Tag + Tooltip 展示 `lastErrorSummary`（若有） |
| 网络异常 | `message.error` 统一文案 |

---

## 7. 与知识库的跨页跳转

- 从本页到知识库：删除拦截弹窗 CTA（上文）。
- 未来可在列表「被引用数」列显示 `refCount`（若 API 提供），非本期必须。

---

## 8. 故事映射

| 故事/AC | 本节 |
| --- | --- |
| US-A1, AC-M1, M2 | 列表、鉴权跳转、用户隔离（以后端为准） |
| US-A2, AC-M3 | 新建编辑表单、凭证展示 |
| US-A3, AC-M4 | 测试连接 |
| US-A4 | 删除与引用拦截 |
