# 前端实现说明：公有/私有模型、标签、管理后台与偏好（0.0.10）

## 文档信息

| 项 | 内容 |
| --- | --- |
| 版本 | `0.0.10` |
| 依赖后端 | `ModelConfigListItem.visibility`、`tags`、`/api/admin/model-configs` |
| 关联服务端说明 | `../backend/implementation-notes.md` |
| 对应设计 | `../design/spec-model-visibility-and-admin.md` |

---

## 1. 共享 UI 与图标

| 项 | 说明 |
| --- | --- |
| **图标** | 对话/控制台相关 SVG 抽至 **`src/components/ui/icons.tsx`**（如 `IconEmptyState`、`IconConfig`）；**`AdminShell`**、**`ConsoleShell`** 顶栏「对话 / 控制台」与对话页入口图标一致（气泡 + 齿轮）。 |
| **Provider** | 控制台与管理后台模型表单共用 **`src/app/console/models/model-provider-ui.ts`**（`MODEL_PROVIDER_OPTIONS`、`providerTagProps`）。 |

---

## 2. 控制台 · 模型管理（`/console/models`）

**文件**：`src/app/console/models/page.tsx`

| 区域 | 行为 |
| --- | --- |
| **Alert** | 说明私有仅本人维护、公有由管理后台维护、全站可选用。 |
| **ProTable** | **类型**列：`public` → 金色 Tag「公有」；`private` → 「私有」。**标签**列：有 `tags` 时展示多个 `Tag`，无则「—」。 |
| **操作** | 公有行：**编辑 / 删除** 禁用，`title` 提示在管理后台操作。 |
| **横向滚动** | `scroll.x` 随列增加适当加宽（如 ~1040）。 |
| **新建/编辑 Modal** | Provider、模型名、API Key（编辑时空为不改密钥）；**标签**：`Select` **`mode="multiple"`**，选项来自常量 **`MODEL_CONFIG_TAG_OPTIONS`**（与后端白名单一致），**可选**；`allowClear`。 |
| **请求** | `GET /api/console/models`；`POST` / `PATCH` body 含 **`tags`** 数组（可为 `[]`）。 |
| **401** | 跳转登录并带 `redirect=/console/models`。 |

---

## 3. 管理后台 · 模型管理（`/admin/models`）

**文件**：`src/app/admin/models/page.tsx`

| 项 | 说明 |
| --- | --- |
| **API** | `GET/POST /api/admin/model-configs`；`GET/PATCH/DELETE /api/admin/model-configs/[id]`（`API_BASE` 常量）。 |
| **页头** | `PageContainer`：**模型管理（公有）**；工具栏「新建公有模型」「刷新」。 |
| **表格** | 类型列可固定展示「公有」；列结构与控制台类似（含标签列）。 |
| **表单** | 与控制台相同的 Provider、模型名、API Key、**多选标签**（预设项）。 |
| **401 / 403** | 未登录跳转登录（`redirect=/admin/models`）；无管理员权限 **`message.error`**。 |

---

## 4. 管理后台 · 菜单

**文件**：`src/app/admin/admin-menu.tsx`

- 新增菜单项：**模型管理** → **`/admin/models`**，图标 **`CloudServerOutlined`**（与实现一致即可）。

---

## 5. 控制台 · 账号与偏好（`/console/profile`）

**文件**：`src/app/console/profile/page.tsx`

| 项 | 说明 |
| --- | --- |
| **数据** | 模型列表：`GET /api/console/models?page=1&pageSize=CONSOLE_MODEL_LIST_MAX_PAGE_SIZE`（与偏好表单联动）。 |
| **下拉选项** | `ProFormSelect`：`options={ models.map(m => ({ value: m.id, label: modelOptionLabel(m) })) }`。 |
| **`modelOptionLabel`** | 格式：`[公有\|私有] [Provider 展示名] 模型名称`；若 **`m.tags.length > 0`**，在模型名后追加 **` · 标签1 · 标签2 · …`**。 |
| **搜索** | `prefEditing` 时 `filterOption` 对 **`option.label`** 字符串做包含匹配（含标签文案）。 |
| **对话模型 / 向量模型** | 两个下拉均使用上述 label 规则。 |

---

## 6. 与其它控制台页的交叉引用

- **`/console/settings`** 等若含跳转「账号与偏好」，与 **`next.config`** 中 redirect 保持一致（以仓库当前配置为准）。
- 聊天侧 **`ChatWorkspace`** 使用 `@/components/ui/icons` 中图标，与壳层导航视觉统一。

---

## 7. 自测建议（前端）

1. 控制台模型页：公有行按钮禁用；私有行可编辑；标签多选保存后列表与再次编辑回显一致。
2. 管理后台模型页：仅管理员可访问；新建公有后普通用户在控制台可见且不可删改。
3. 偏好页：下拉文案含 **[公有/私有]**、厂商、模型名及 **标签后缀**；搜索可搜标签关键字。
4. 管理后台与控制台顶栏：对话入口为气泡图标、控制台为齿轮图标，与 `/chat` 页一致。

---

## 8. 相关文件路径（速查）

| 说明 | 路径 |
| --- | --- |
| 共享图标 | `src/components/ui/icons.tsx` |
| 控制台模型页 | `src/app/console/models/page.tsx` |
| Provider UI | `src/app/console/models/model-provider-ui.ts` |
| 管理后台模型页 | `src/app/admin/models/page.tsx` |
| 管理菜单 | `src/app/admin/admin-menu.tsx` |
| 管理壳层 | `src/app/admin/AdminShell.tsx` |
| 控制台壳层 | `src/app/console/ConsoleShell.tsx` |
| 账号与偏好 | `src/app/console/profile/page.tsx` |
| 聊天工作台 | `src/components/chat/ChatWorkspace.tsx` |
