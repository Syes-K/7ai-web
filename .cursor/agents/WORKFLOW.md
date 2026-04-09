# 需求 → 设计 → 服务端开发 → 前端开发 协作流程

本流程定义 product、design、backend、frontend 四个 subagent 的协作顺序与交接规范。父 agent 按此顺序派发任务并传递产出物。

---

## 流程总览

```
[需求] → product 产出 PRD/用户故事
           ↓ 人工确认 ✓
[设计] → design 产出设计说明/交互与状态
           ↓ 人工确认 ✓
[服务端-文档] → backend 产出 API/数据模型/实现计划（不写代码）
           ↓ 人工确认 ✓
[服务端-代码] → backend 基于已确认文档实现服务端代码
           ↓ 人工确认 ✓
[前端] → frontend 产出可运行前端
```

**原则**：上游产出通过结构化文档交付下游；下游有疑义时先列出待确认项再继续，或由父 agent 协调回溯到上游。

**人工确认（硬约束）**：每一阶段完成后，**必须经用户在新一条消息中的明确确认**后方可进入下一阶段。**禁止**在同一条助手回复里完成本阶段后立即调用下一阶段 subagent（含 Task 派发）。「全流程」「一口气」等**不**视为取消门控；除非用户明确声明本次会话免确认（见项目规则 [.cursor/rules/product-design-dev-workflow.mdc](../.cursor/rules/product-design-dev-workflow.mdc)）。

---

## 需求版本号与迭代目录（全流程）

每一轮「需求 → 设计 → 服务端 → 前端」**全流程**须绑定一个需求迭代版本号 `{version}`。

- **格式**：`MAJOR.MINOR.PATCH`（如 `0.0.1`），三段非负整数，点分隔。
- **确认方式**：由**用户确认**本次版本；父 agent 可先根据 `iterations/` 下已有子目录名给出**建议下一版本**（见下），用户可改号或跳号。
- **建议默认下一版本**：查看项目根下与 `docs` 同级的 **`iterations/`** 一级子目录，筛选名称符合 `^\d+\.\d+\.\d+$` 的项，按 `(major, minor, patch)` 数值比较取最大者，将其 **patch + 1** 作为建议（例：`0.0.2` → 建议 `0.0.3`）。若无可用目录则建议 `0.0.1`。

**迭代文档根路径**（与 `docs` 同级）：`iterations/{version}/`，其下按阶段分子目录：

| 子目录 | 用途 |
|--------|------|
| `iterations/{version}/product/` | 需求/PRD/用户故事等 |
| `iterations/{version}/design/` | 设计说明/流程与交互等 |
| `iterations/{version}/backend/` | API 文档、数据模型、服务端自测说明等 |
| `iterations/{version}/frontend/` | 前端自测、偏差说明等 |

**与 `docs/` 的关系**：各阶段**文档**须**双写**——先写入 `iterations/{version}/<阶段>/`，再**同步相同内容**至 `docs/product/`、`docs/design/`、`docs/backend/`、`docs/frontend/`（便于固定路径与全局查阅）。**业务代码**仍只写在项目既定源码目录（Next.js `app/`、`src/` 等），不放入 `iterations/`。

**读取约定**：下游优先读 **`iterations/{version}/`** 下对应阶段文档；缺失时再读 `docs/` 下对应子目录。

---

## 产物路径规范

文档类产出按 **`iterations/{version}/<阶段>/` + 同步 `docs/<阶段>/`** 双写；代码写在项目既定源码目录。全流程开始前须确定并贯穿传递 `{version}`。

| 阶段 | 文档产物目录（主） | 同步至 | 典型文件 | 说明 |
|------|-------------------|--------|----------|------|
| Product | `iterations/{version}/product/` | `docs/product/` | `prd-{功能名}.md`、`requirements.md`、`user-stories.md` | 需求摘要、功能范围、用户故事、待设计项 |
| Design | `iterations/{version}/design/` | `docs/design/` | `spec-{功能名}.md`、`design-spec.md`、`flows.md` | 流程与页面、状态与交互、设计说明、与需求对应 |
| Backend | 代码：Next.js 项目内（如 `app/api/`），TS<br>文档：`iterations/{version}/backend/` | `docs/backend/` | `api-spec.md`、`data-models.md`、`implementation-notes.md` | API 文档、数据模型、服务端实现与自测说明 |
| Frontend | 代码：项目前端目录（如 `src/`）<br>文档：`iterations/{version}/frontend/` | `docs/frontend/` | `implementation-notes.md`、`test-checklist.md`、`deviations.md` | 自测说明、偏差与假设 |

**约定**：
- 单功能时可用固定文件名（如 `requirements.md`、`design-spec.md`）；多功能时用带标识的文件名（如 `prd-登录.md`、`spec-订单流程.md`）。
- 父 agent 调用各 subagent 时须在 prompt 中写明 **`version={version}`** 及上述路径。

---

## 阶段 1：需求（Product）

**Subagent**：`/product`

**输入**
- 业务目标、用户/场景描述、或已有雏形需求
- 可选：现有 PRD/文档链接

**产出物（交给设计）**
- **需求摘要**：背景、目标用户、核心场景、成功指标（1 页内）
- **功能范围**：做 / 不做列表，依赖与假设
- **用户故事**：按「作为…我想要…以便…」+ 验收标准（AC）列出
- **待设计项**：需要设计介入的页面/流程/组件清单（便于 design 按项拆解）

**完成标准**
- 故事均有可验证的 AC
- 边界与不做什么已标明
- 产出物可直接作为 design 的输入

**产物路径**
- 产出写入 **`iterations/{version}/product/`**，并**同步**至 `docs/product/`。单功能可用 `requirements.md` 或 `prd.md`；多功能用 `prd-{功能名}.md`、`user-stories-{功能名}.md`。
- 待设计项可合并在同一 PRD 内，或单独 `iterations/{version}/product/design-handoff.md`（同步到 `docs/product/design-handoff.md`）。

**交接**
- 产出物整理成文档并写入上述路径。
- **等待人工确认**：向用户说明阶段 1 已完成、产出路径与要点，请用户确认或提出修改意见；**仅在用户确认通过后**，父 agent 才将需求文档作为上下文调用 **design** subagent 进入阶段 2。

---

## 阶段 2：设计（Design）

**Subagent**：`/design`

**输入**
- 阶段 1 的「需求摘要 + 用户故事 + 待设计项」
- 可选：现有设计系统/组件库、品牌或视觉约束

**产出物（交给开发）**
- **流程与页面**：主流程说明、关键页面/视图列表、页面间跳转关系
- **状态与交互**：每个关键界面/组件的状态（默认、加载、空态、错误、边界）及交互说明（点击、输入、反馈）
- **设计说明**：布局与层级、断点与响应式、动效与过渡、可访问性要点
- **与需求对应**：标注「对应故事/AC」便于前端与验收

**完成标准**
- 所有故事涉及的界面与状态均有说明
- 前端可根据说明实现而无需再猜
- 与需求可追溯（故事 ID 或 AC 引用）

**产物路径**
- 产出写入 **`iterations/{version}/design/`**，并**同步**至 `docs/design/`。单功能可用 `design-spec.md` 或 `spec.md`；多功能用 `spec-{功能名}.md`、`flows-{功能名}.md`。
- 与需求对应关系写在同份设计说明内，或引用 `iterations/{version}/product/`（或已同步的 `docs/product/`）下文件。

**交接**
- 产出物整理成文档并写入上述路径。
- **等待人工确认**：向用户说明阶段 2 已完成、产出路径与要点，请用户确认或提出修改意见；**仅在用户确认通过后**，父 agent 才将需求 + 设计说明作为上下文调用 **backend** subagent 进入阶段 3。

---

## 阶段 3A：服务端文档先行（Backend）

**Subagent**：`/backend`

**技术栈**：**TypeScript** + **Next.js**（Route Handlers、Server Actions、服务端逻辑等，代码在 Next.js 项目内）。

**输入**
- 阶段 1 的「需求与故事」
- 阶段 2 的「设计说明」
- 可选：数据库、部署与接口规范

**产出物（供确认与后续编码）**
- **API 设计/接口文档**：路径、方法、请求/响应体、错误码
- **数据模型或 schema 说明**：若涉及存储（TS 类型等）
- **实现计划/风险说明**：模块拆分、边界条件、潜在风险

**完成标准**
- 接口契约清晰，且可直接指导后续编码
- 业务规则与需求/设计一致
- 文档中已覆盖关键边界、失败场景与实现风险
- **本阶段禁止改动业务代码**（仅允许文档变更）

**产物路径**
- **文档**：API 文档、数据模型说明、实现计划写入 **`iterations/{version}/backend/`**，并**同步**至 `docs/backend/`，如 `api-spec.md`、`data-models.md`、`implementation-plan.md`；可按功能拆分为 `api-spec-{功能名}.md`。

**交接**
- 产出物整理并写入上述路径。
- **等待人工确认**：向用户说明阶段 3A 已完成、产出路径与要点，请用户确认或提出修改意见。
- **仅在用户确认通过后**，父 agent 才可再次调用 **backend** subagent 进入阶段 3B（代码开发）。

---

## 阶段 3B：服务端代码开发（Backend）

**Subagent**：`/backend`

**输入**
- 阶段 1 的「需求与故事」
- 阶段 2 的「设计说明」
- 阶段 3A 已确认的 API/数据模型/实现计划文档

**产出物（交给前端）**
- **服务端代码**：TypeScript，Next.js API 实现（Route Handlers、Server Actions 等）、业务逻辑、持久化
- **文档更新**：根据实际实现回写/修订 API 文档、补充实现与自测说明

**完成标准**
- 接口契约与代码实现一致，可供前端稳定对接
- 业务规则与需求/设计一致
- 代码为 TypeScript，基于 Next.js，可构建、可启动，有基本自测说明
- **服务端代码含必要注释**（中文为主、说明非显而易见逻辑与边界；细则见 [.cursor/agents/backend.md](backend.md)「代码注释」）

**产物路径**
- **代码**：Next.js 项目内服务端约定位置（如 `app/api/`、Server Actions 等），使用 TypeScript。
- **文档**：实现后的 API 文档、数据模型说明、自测说明写入 **`iterations/{version}/backend/`**，并**同步**至 `docs/backend/`，如 `api-spec.md`、`data-models.md`、`implementation-notes.md`。

**交接**
- 产出物整理并写入上述路径。
- **等待人工确认**：向用户说明阶段 3B 已完成、产出路径与要点，请用户确认或提出修改意见；**仅在用户确认通过后**，父 agent 才将需求 + 设计说明 + 阶段 3B 最终 API 文档作为上下文调用 **frontend** subagent 进入阶段 4。

---

## 阶段 4：前端开发（Frontend）

**Subagent**：`/frontend`

**输入**
- 阶段 1 的「需求与故事」
- 阶段 2 的「设计说明」
- 阶段 3 的「API/接口文档」及数据约定
- 可选：项目技术栈、仓库结构、组件库与规范

**产出物**
- **可运行代码**：页面/组件、路由、状态与交互实现，与后端 API 对接
- **自测说明**：如何运行、如何验证主要 AC
- **偏差与假设**：与设计/需求不一致处的列表及原因（若有）

**完成标准**
- 实现覆盖设计说明中的主要状态与交互
- 与后端接口按文档对接
- 主要用户故事的 AC 可被验证
- 代码可构建、无阻塞性报错

**产物路径**
- **代码**：写在项目既定源码目录（如 `src/`、`app/` 等），不另行规定；遵循项目现有结构。
- **文档**：自测说明、偏差与假设写入 **`iterations/{version}/frontend/`**，并**同步**至 `docs/frontend/`，如 `implementation-notes.md`、`test-checklist.md`、`deviations.md`；可按功能拆分为 `implementation-notes-{功能名}.md`。

**交接**
- 开发完成后由父 agent 向用户汇报阶段 4 完成、代码与文档路径及自测要点；可安排验收（如 verifier subagent 或人工走查）。
- **人工确认**：本阶段完成后同样以用户确认为准；若用户提出修改，回到对应阶段（需求变更 → product；体验/交互变更 → design；接口/逻辑变更 → backend；实现 bug → frontend）。

---

## 父 Agent 流程控制建议

0. **版本与目录**：全流程开始前与用户确认 **`{version}`**（格式 `0.0.1`）；可按 `iterations/` 下已有版本给出默认建议下一 PATCH。创建并使用 `iterations/{version}/product|design|backend|frontend/`；各阶段文档**双写**至 `docs/<阶段>/`。
1. **人工确认门控**：每一阶段结束后**本条回复即停**：汇报产出路径 + 要点，并写明「请确认是否进入下一阶段」；**下一用户消息**明确许可（如「通过，进入设计」）后，才调用下一阶段 subagent。模糊词如仅说「继续」且未点名阶段时，先说明门控并请用户明确。若用户要求修改，则在本阶段或回溯上游后再确认。细则与例外见 **product-design-dev-workflow.mdc**。
2. **串行执行**：按 需求 → 设计 → 服务端开发 → 前端开发 顺序调用 subagent，避免跳过上游。
3. **服务端二次调用约束**：第一次调用 backend 仅允许文档产出（3A），不得写代码；用户确认 3A 后，第二次调用 backend 才进入代码实现（3B）。
4. **传递上下文**：每次调用下一阶段时，将上一阶段的产出物完整传入 prompt（或附文件引用）。
5. **回溯**：若下游发现上游不完整，可先让当前 subagent 输出「待确认项」，再决定是回溯到 product/design 还是由人工补充后继续。
6. **并行**：仅当任务无依赖时可并行（例如多个独立功能的需求可并行 product，但设计依赖需求、backend 依赖设计、frontend 依赖 backend 与设计，故各开发阶段通常串行）。

---

## 产出物速查

| 阶段 | 产出物 | 产物路径 | 下一阶段使用方式 |
|------|--------|----------|------------------|
| Product | 需求摘要、功能范围、用户故事、待设计项 | `iterations/{version}/product/` + 同步 `docs/product/` | Design 优先读迭代目录下文档 |
| Design | 流程/页面/状态/交互说明、与需求对应关系 | `iterations/{version}/design/` + 同步 `docs/design/` | Backend 读设计 + 需求目录做 API 与实现 |
| Backend(3A) | API 文档、数据模型、实现计划（不含代码） | `iterations/{version}/backend/` + 同步 `docs/backend/` | 待用户确认后进入 Backend(3B) |
| Backend(3B) | 服务端代码、API 回写、自测说明 | 代码：项目服务端目录；文档：`iterations/{version}/backend/` + 同步 `docs/backend/` | Frontend 按 3B 最终 API 文档对接实现 |
| Frontend | 代码、自测说明、偏差与假设 | 代码：项目源码目录；文档：`iterations/{version}/frontend/` + 同步 `docs/frontend/` | 验收与迭代 |
