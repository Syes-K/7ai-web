# 规格：知识库 — 多 MCP 挂载（version 0.1.9）

**宿主**：`src/app/console/knowledge/page.tsx`（新建/编辑 `Modal`、详情 `Drawer` 内增加区块）  
**参考交互**：`src/app/console/assistants/page.tsx` 中 `knowledgeBaseIds` 多选（`Form` + `Select` `mode="multiple"`）

---

## 1. 入口与信息架构

- **主入口**：知识库 **新建 / 编辑 Modal** 内增加独立分组 **「MCP 挂载」**（`Divider` 标题），与「基础信息」「内容」等分区并列，保证保存知识库时一并提交挂载关系（满足 US-B1 一次保存体验）。
- **补充入口（可选增强）**：知识库 **详情 Drawer** 中增加只读区块「已挂载 MCP」，展示 chips +「编辑」跳转打开对应行的编辑 Modal（或仅高亮列表行）。若工期紧可仅做 Modal 内编辑。

---

## 2. 多选挂载控件

### 2.1 组件形态

- **`Select` `mode="multiple"`** + `maxTagCount="responsive"`，与助手页知识库多选一致，降低学习成本。
- **选项来源**：`GET` 用户 MCP 列表（具体 API 由 backend；设计假设返回 `id`, `name`, `enabled`, `transport` 等展示字段）。
- **已选回显**：表单项 `mcpConfigIds: string[]`（命名以 API 为准）；打开编辑时随知识库详情一并填充。

### 2.2 Chips（Tag 渲染）

- `tagRender` 或 `optionLabelProp`：选中项在输入框内显示为 **简称**（`name`），过长 `ellipsis`。
- **停用 MCP**（`enabled === false`）：
  - **设计默认假设**（开放问题 #4）：若已在挂载列表中，**保留 chip**，样式为 `Tag` 橙色/默认 warning 色 + 文案后缀「（已停用）」。
  - **不可新选**：`options` 中对 `enabled === false` 的项 `disabled: true`，`Option` 内说明「已停用，无法在对话中使用」。

### 2.3 空可选与加载

- 选项加载中：`Select` `loading` + `placeholder="加载 MCP 列表…"`.
- 用户无任何 MCP：`Select` 可禁用，上方 **`Alert` `type="info"`**：「您还没有可用的 MCP，请先到 MCP 管理添加。」+ **`<Link href="/console/mcp">前往 MCP 管理</Link>`**（同 tab 即可）。

---

## 3. 校验与保存

### 3.1 前端

- 挂载字段本身 **无强制最小数量**（0~N）。
- 若存在 **已停用仍挂载**（设计默认允许保存）：在 Modal 内 **`Alert` `type="warning"`**（可 `showIcon`）：「部分已挂载的 MCP 已停用，保存后对话中不会加载这些 MCP，建议启用或移除。」——出现在用户点击「确定」前常驻可见（或仅在检测到停用依赖时显示）。

### 3.2 服务端拒绝（AC-K2）

- 伪造他人 `mcpConfigId` 等：提交失败 → `message.error` 使用统一错误信息（不猜测资源是否存在）；表单可 `reload` 选项列表。

---

## 4. 与 MCP 管理页的跳转关系

| 方向 | 行为 |
| --- | --- |
| 知识库 → MCP 管理 | `Alert` 内链、`Select` 旁次要链「管理 MCP…」；`href="/console/mcp"` |
| MCP 管理 → 知识库 | 删除拦截弹窗主 CTA（见 `spec-mcp-console.md`） |

**设计说明**：不在新 tab 强制打开，保持控制台内单任务流；用户可用浏览器新开。

---

## 5. 详情 Drawer 只读展示（若实现）

- 区块标题：「MCP 挂载」
- 内容：若为空则文案「未挂载 MCP」；若有则 `Space`/`Tag` 列表展示名称 + 停用标记
- 「编辑知识库」：关闭 Drawer 并打开该条编辑 Modal（或表格行内编辑按钮已足够则省略）

---

## 6. 删除/禁用 MCP 后的知识库侧（AC-K3）

- **用户删除 MCP 被拦截**：知识库挂载列表不变。
- **用户停用 MCP**：列表与编辑回显仍显示该 id，带「已停用」标记（设计默认）；对话行为见 `spec-chat-agent-mcp.md`。
- **若产品改为「禁止保存含停用挂载」**：需撤回本规格 3.1 的 warning-only 策略，改为提交前 `rules` 或自定义校验拦截——**以产品定稿为准**。

---

## 7. 故事映射

| 故事/AC | 本节 |
| --- | --- |
| US-B1, AC-K1 | 多选、保存回显 |
| US-B2, AC-K2 | 错误处理 |
| US-B3, AC-K3 | 停用/删除联动展示 |
| US-A4 | 删除 MCP 时从知识库解除依赖的路径配合 |
