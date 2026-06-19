# 规格：控制台 — Skills 管理页（version 0.1.18）

**路由**：`/[locale]/console/skills`  
**API 基址**：`/api/console/skill-configs`（Q12 定稿）  
**参考实现**：`src/app/[locale]/console/mcp/McpClient.tsx`（ProTable、Modal、Popconfirm、409 删除拦截）  
**i18n 命名空间**：`page.console.skills`

---

## 1. 页面结构

```
PageContainer（title: page.console.skills.title）
├── 说明区（Alert type="info" 或一行 description，可折叠）
│   └── 区分「服务端 Skills」与 Cursor 编辑器 Skill 文件（见 copy §1.2）
└── ProTable
    ├── toolbar：名称搜索 Input + 搜索 | 刷新 | 新建
    ├── columns：名称、描述摘要、启用、更新时间、被助手引用数、操作
    └── row actions：编辑 | 删除
```

**与 MCP 页差异：** 无「测试连接」列/按钮；无 transport / 连接摘要 / 最近检测列。

---

## 2. 列表（ProTable）

### 2.1 列定义

| 列 key | 数据字段 | 宽度建议 | 展示 |
| --- | --- | --- | --- |
| `name` | `name` | 180 | 主文案，`ellipsis` + `Tooltip`（UGC 不翻译） |
| `description` | `description` | 200 | 摘要：trim 后截断 80 字；空则 `—` |
| `enabled` | `enabled` | 88 | `Tag` 绿「启用」/ 默认「停用」 |
| `contentPreview` | `content` | 220 | **可选列**：首非空行截断 60 字 + `Tooltip` 展示更多（**不**渲染 Markdown HTML） |
| `updatedAt` | `updatedAt` | 160 | `dayjs` 格式 `YYYY-MM-DD HH:mm` |
| `assistantRefs` | `referencedAssistantCount` | 110 | 数字；0 为灰色 |
| `actions` | — | 160 | 编辑、删除 |

**列 factory：** `getSkillColumns(t, ctx)`，模式对齐 `getMcpColumns`（0.1.16 Q8-B）。

### 2.2 工具栏与筛选

- **名称关键字**：`keyword` / `keywordDraft` 受控模式，点击「搜索」触发 `reload`（对齐 MCP）。
- **刷新**：`toolbarLoading` + `actionRef.reload`。
- **分页**：与 MCP 一致（服务端分页或 ProTable 默认，以实现为准）。

### 2.3 空态

- `locale.emptyText` 或自定义 Empty：文案 `empty.noSkills` + 按钮「新建 Skill」调用 `openCreate`。

### 2.4 列表 API 假设

`GET /api/console/skill-configs?keyword=&page=&pageSize=`

响应项字段（与 MCP 列表对称）：

```typescript
type SkillListItem = {
  id: string;
  name: string;
  description: string | null;
  content: string; // 列表可返回全文供 preview；或仅 preview 字段
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  referencedAssistantCount: number;
};
```

---

## 3. 新建 / 编辑 Modal

### 3.1 承载形态

- `Modal` 宽度 **`640px`**（正文区较高）
- `modalMode: "create" | "edit"`
- 编辑打开时 `GET /api/console/skill-configs/:id` 拉详情（对齐 MCP `openEdit`）

### 3.2 表单字段

| 字段 | 组件 | 规则 |
| --- | --- | --- |
| `name` | `Input` | 必填；`maxLength={64}`；`showCount` |
| `description` | `Input.TextArea` | 可选；`rows={2}`；`maxLength={500}`；`showCount` |
| `content` | `Input.TextArea` | 必填；`rows={12}`；`maxLength={16000}`；`showCount`；等宽字体可选 `className="font-mono text-sm"` |
| `enabled` | `Switch` | 默认 `true`；文案 `form.enabled.label` |

**字段布局顺序：** 名称 → 描述 → 正文 → 启用

**正文区说明（`form.content.extra`）：**

- Markdown 源文本，保存后 **原样** 用于对话合并（不渲染预览，Q9）
- 运行时服务端会在每段前加 `## Skill: {name}`（**不对用户展示**于编辑表单，仅在 extra 一句说明）
- 字符上限 16,000

**无字段：** transport、endpoint、credentials、version、toolRefs、合并预览按钮

### 3.3 校验与提交

| 操作 | API | 成功 | 失败 |
| --- | --- | --- | --- |
| 新建 | `POST /api/console/skill-configs` | Toast `toast.created`、关 Modal、reload | 409 名称冲突；422 校验 |
| 编辑 | `PATCH /api/console/skill-configs/:id` | Toast `toast.saved` | 同上 |
| 401 | — | `redirectToLocaleLogin` | — |

- 提交中：`submitting` 锁主按钮
- 错误：`parseApiError(res, { t: tShell })` 或字段级 `details`

### 3.4 用户条数上限（Q4）

- 创建时若返回 `SKILL_CONFIG_LIMIT_REACHED`（或 validation key）：Toast + 禁用「新建」直至用户删除旧项
- 可选：工具栏旁展示 `{current}/{max}` 计数（非必须，与 MCP 首版一致可省略）

---

## 4. 删除（US-A4 / Q7）

### 4.1 流程

1. 行内「删除」→ `Popconfirm`（`okType: danger`），文案 `confirm.delete.title` / `description`
2. `DELETE /api/console/skill-configs/:id`
3. **204**：Toast `toast.deleted` + reload
4. **409** + `ErrorCode.SKILL_CONFIG_REFERENCED_BY_ASSISTANT`：
   - `modal.warning`（对齐 MCP）
   - 标题 `deleteBlocked.title`
   - 内容：服务端 `error.message`（含引用数）+ `deleteBlocked.body`（rich link 至助手管理）
   - **不提供** 级联解绑
5. 其他错误：`message.error`

### 4.2 Popconfirm 文案要点

- 标准「删除后无法恢复」
- **不**在 Popconfirm 内预查引用数（以 DELETE 409 为准，与 MCP 一致）

---

## 5. 页面顶栏说明区（混淆风险缓解）

在 `PageContainer` 的 `content` 顶部或 `subTitle` 下方：

**`alert.productScope`（info，可 `closable`）：**

- 说明：此处 Skills 为 **对话平台服务端技能包**，写入 system prompt
- **不是** Cursor IDE 的 `.cursor/skills` 本地 Skill 文件
- 详见 `copy-console-en-zh.md` §1.2

---

## 6. 状态矩阵

| 状态 | UI |
| --- | --- |
| 初始加载 | ProTable `loading` |
| `enabled = false` | Tag「停用」；仍可在助手侧被引用（运行时忽略） |
| 名称冲突 | 409；Modal 内 `name` 字段高亮（若 API 返回 field details） |
| 正文超长 | 前端 `maxLength` 拦截 + 后端 validation |
| 网络异常 | `tShell("errors.networkRetry")` |

---

## 7. 与助手页的跨页跳转

| 方向 | 行为 |
| --- | --- |
| Skills → 助手 | 删除 409 弹窗 CTA「前往助手管理」→ `/{locale}/console/assistants` |
| 助手 → Skills | 挂载区 Alert / `manageLink` → `/{locale}/console/skills` |

使用 `@/i18n/navigation` 的 `Link`，路径不含 locale 前缀。

---

## 8. 实现文件清单（供 frontend）

| 文件 | 说明 |
| --- | --- |
| `src/app/[locale]/console/skills/page.tsx` | Server component + metadata |
| `src/app/[locale]/console/skills/SkillsClient.tsx` | 主 UI（或内联于 page） |
| `src/app/[locale]/console/console-menu.tsx` | 菜单项 |
| `messages/{en,zh}/page/console/skills.json` | 文案 |
| `src/i18n/request.ts` | 注册 namespace |

---

## 9. 故事映射

| 故事/AC | 本节 |
| --- | --- |
| US-A1, AC-S1、S2 | 列表、鉴权 |
| US-A2, AC-S3 | 新建编辑、名称唯一、长度 |
| US-A3, AC-S6 | 启用 Switch |
| US-A4, AC-S5 | 删除与 409 |
| US-D1, AC-S10 | i18n 全覆盖 |
