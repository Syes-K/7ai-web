# 前端实现说明（version 0.1.9）

## 路由与入口

| 路径 | 说明 |
| --- | --- |
| `/console/mcp` | MCP 管理：列表、新建/编辑 Modal、删除、行内/编辑内测试连接 |
| `/console/knowledge` | 知识库：新建/编辑 Modal 增加 MCP 多选；详情 Drawer 只读展示挂载 |

侧栏菜单：`src/app/console/console-menu.tsx` 增加「MCP 管理」，`path: /console/mcp`。

## 关键组件

- **`src/app/console/mcp/page.tsx`**：`PageContainer` + `ProTable`；关键字搜索与知识库页相同的 `keyword` / `keywordDraft` 模式；`Modal` 表单字段与 API 对应关系见下表；`App.useApp()` 的 `message` / `modal`；401 跳转 `/login?redirect=...`。
- **`src/app/console/knowledge/page.tsx`**：`GET /api/console/mcp-configs` 拉取选项；`Form.useWatch('mcpConfigIds')` + 稳定空数组避免无意义重渲染；停用 MCP 的 `Select` 选项禁用策略与 `tagRender` 与设计一致；无 MCP 时 `Alert` + `Link` 到 `/console/mcp`。
- **`src/components/auth/map-api-errors.ts`**：新增 `readApiErrorPayload` / `ApiErrorPayload`，供控制台页统一解析 `error.code` + `message` + `details`（知识库页 `parseApiError` 已改为基于该方法）。

## API 字段对应（MCP 页）

| UI | 方法 | JSON 字段 |
| --- | --- | --- |
| 名称 | POST/PATCH | `name` |
| 描述 | POST/PATCH | `description`（可 null） |
| 传输方式 | POST/PATCH | `transport`：`http` / `sse` / `stdio` |
| 连接参数 | POST 必填；PATCH 留空不传 | `endpoint`：由 TextArea JSON 解析为对象 |
| metadata | 可选；PATCH 留空不传 | `metadata`：对象 |
| 凭证 | 创建可选；编辑留空不传 | `credentials`：非空字符串 |
| 启用 | POST/PATCH | `enabled` |

列表列使用响应字段：`endpointSummary`、`referencedKnowledgeBaseCount`、`lastCheckedAt`、`lastCheckStatus`、`lastErrorSummary`。

测试连接：`POST /api/console/mcp-configs/:id/test-connection`，`200` 下以 `ok` 与 `item.lastErrorSummary` 区分成功/失败文案；`429` + `RATE_LIMITED` 走统一 `message.error`。

删除：`DELETE` 成功为 **204** 无 body；`409` + `MCP_CONFIG_REFERENCED_BY_KNOWLEDGE_BASE` 使用 `modal.warning` 并链到知识库管理。

## 知识库与 MCP

- 列表/详情类型补充 `mcpConfigIds`、`mcpConfigCount`（与 `GET` 响应一致）。
- 新建 `POST`、编辑 `PATCH` 的 body 增加 `mcpConfigIds`（字符串数组，可为空数组表示不挂载）。

## 错误码（前端处理策略）

| `error.code` | 处理 |
| --- | --- |
| `MCP_CONFIG_NOT_FOUND` | Toast：`readApiErrorPayload` 返回的 `message` |
| `MCP_CONFIG_REFERENCED_BY_KNOWLEDGE_BASE` | MCP 删除：`modal.warning` + 前往知识库 |
| `MCP_CONFIG_NAME_CONFLICT` | Toast（后端已含字段说明） |
| `MCP_CREDENTIALS_ENCRYPTION_UNAVAILABLE` | Toast |
| `RATE_LIMITED` | Toast（测试连接） |

其余错误统一展示服务端 `message`。

## 已知限制

1. **编辑 MCP 时不回显 `endpoint` / `metadata` 原文**（列表 DTO 仅有 `endpointSummary` 等），连接参数 TextArea 在编辑模式下「留空表示不修改」；若需改连接须重新粘贴完整 JSON。
2. **「保存并测试」**在编辑 Modal 内先 `PATCH` 再调测试接口；若保存失败不会触发测试。
3. 知识库详情中 MCP 名称依赖同页已加载的 `mcpOptions`；若列表尚未拉取完成，可能短暂显示 id 前缀而非名称。

## 自测建议

1. 登录后打开 `/console/mcp`：新建 HTTP 配置（`endpoint` 含 `url`），保存后列表摘要与检测列正常；行内「测试连接」成功/失败均有反馈。
2. 删除仍被知识库引用的 MCP：应出现拦截说明并可跳转知识库。
3. `/console/knowledge`：新建/编辑中多选 MCP 保存；详情 Drawer 展示挂载；全部无 MCP 时出现引导 `Alert`。

## 本轮增量需求同步（聊天子流程展示）

### 1) 子流程展示规则（状态优先）

- 子节点不再等待“模型最终输出”才出现；按步骤自身状态实时显示（`pending/running/completed/failed/interrupted`）。
- “进行中”状态补充显式 loading：
  - Turn 顶部状态右侧显示旋转指示器
  - 子步骤标题中 `running` 同步显示旋转指示器

### 2) 可见性与去噪

- 未挂载场景隐藏对应子流程：
  - MCP 未绑定/未挂载时不展示 MCP 子节点
  - 知识库无有效上下文且未命中时按规则隐藏占位节点
- 摘要回调节点改为“按需出现”：只有摘要真实触发（`running/completed/failed/interrupted`）或已有内容时展示，不再默认“等待执行”占位。
- 推理节点收敛：
  - 无推理正文时不展示“已完成”空节点
  - 展示顺序调整到摘要之后，避免语义误导

### 3) 字段语义对齐后端

- 知识库节点不再展示“命中理由”（后端 C1 已移除 `reasonTag` 与对应 detail）。
- 保留命中状态、命中知识库、命中片段等有效信息。

### 4) 快照兼容策略

- 移除旧版快照兼容分支（不再补 C2、不再从 D1 回填 MCP 详情），前端仅按当前快照结构展示。
