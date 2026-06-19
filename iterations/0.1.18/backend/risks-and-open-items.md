# 风险、测试要点与前端交接项（version 0.1.18 — Skills）

供阶段 3B、前端与产品对齐；开放问题已在 design 定稿，此处从**服务端**视角补充风险与交接。

---

## 1. 风险


| 风险                    | 说明                                                      | 缓解方向                                           |
| --------------------- | ------------------------------------------------------- | ---------------------------------------------- |
| **System prompt 膨胀**  | 多 Skill × 16000 字 + 助手 prompt → token 成本与模型上下文溢出        | 常量上限 50/10/10/16000；运行时 slice；产品文案提示用户控制正文长度   |
| **指令冲突**              | 助手 `prompt` 与多 Skill 语义矛盾                               | 非本期自动检测；UI extra 说明用户自行协调                      |
| **混淆 Cursor Skill**   | 用户误以为 `.cursor/skills` 可上传                              | 前端说明区 + API 命名 `skill-configs`；文档区分            |
| **静默 skip 不可见**       | 删除/禁用 Skill 后会话仍成功，用户不知指令失效                             | Q5 定稿：仅 log；Turn 汇总「已合并 N 项」不含 skip 原因         |
| **双次 DB 查询**          | `loadSkillPackRefs` 与 `skillRefsToExtraSystemText` 各查一次 | 3B 可合并为单次批量查询；首版可接受                            |
| **enabled=false 仍挂载** | 助手保存允许，对话不生效                                            | 对齐 MCP；前端 warning Alert                        |
| **列表返回全文 content**    | 50 × 16k 列表 payload 较大                                  | 与 MCP 全量列表策略一致；后续可加 `contentPreview` 字段        |
| **synchronize 生产**    | 自动 schema 变更不可控                                         | 与项目现状一致；上线前评估 migration（见 `data-models.md` §7） |


---

## 2. 安全与内容


| 项           | 说明                                                                    |
| ----------- | --------------------------------------------------------------------- |
| **UGC 进模型** | Skill 正文进入 LLM 上下文；控制台展示须防 XSS（前端责任）；API 不做 HTML 消毒（原样存储）             |
| **隔离**      | 所有读写带 `userId`；无效 id 统一 422，防枚举                                       |
| **日志**      | structured log 可含 skillConfigId、reason；**禁止** log 完整 content（隐私 + 体积） |


---

## 3. 测试要点（QA / 3B 自测）

### 3.1 API 矩阵


| 用例                              | 期望                                    |
| ------------------------------- | ------------------------------------- |
| AC-S1 匿名 GET/POST skill-configs | 401                                   |
| AC-S2 跨用户 id                    | 404（自有资源）或 422（PUT 无效 id）             |
| AC-S3 名称冲突                      | 409，en/zh message                     |
| AC-S4 助手挂 10 个                  | 200；第 11 个 422                        |
| AC-S5 删除被引用                     | 409 + count detail                    |
| AC-S6 enabled=false             | GET 列表仍可见；运行时不在 prompt                |
| AC-S10 API 错误语言                 | `Accept-Language` / locale 切换 message |


### 3.2 运行时矩阵


| 用例               | 期望                            |
| ---------------- | ----------------------------- |
| AC-S7 双 Skill 合并 | prompt 含两块 `## Skill:`，顺序按 id |
| AC-S8 无助手        | refs=[]，prompt=默认+后缀          |
| AC-S9 部分缺失       | 仅有效块；无用户 Toast                |
| AC-S4 MCP 并行     | tools 数量不受 Skills 影响          |


### 3.3 Turn UI


| 用例       | 期望                                    |
| -------- | ------------------------------------- |
| 有 merged | C1b completed，`skillsMerged`          |
| 无挂载      | completed + 可隐藏（与 MCP not mounted 一致） |
| 整类失败     | `skillsLoadSkipped`；D1 仍运行            |


---

## 4. 与前端交接项

### 4.1 API 契约（阶段 4 输入）


| 文档               | 内容                            |
| ---------------- | ----------------------------- |
| `api-spec.md`    | 路径、方法、body、响应、错误码             |
| `data-models.md` | 字段语义、referencedAssistantCount |


**前端须实现**（设计已规格，后端 3B 完成后对接）：


| 页面                | API                                                                             |
| ----------------- | ------------------------------------------------------------------------------- |
| `/console/skills` | `GET/POST/PATCH/DELETE /api/console/skill-configs`                              |
| 助手 Modal          | `GET /api/console/skill-configs`（选项）、`GET/PUT .../assistants/:id/skill-configs` |


### 4.2 错误处理约定

- 使用 `parseApiError(res, { t: tShell })`；409 删除弹 `Modal.warning`，读 `error.code === SKILL_CONFIG_REFERENCED_BY_ASSISTANT`。
- 409 名称冲突：Modal 内 `name` 字段高亮（details.field）。
- PUT 失败 toast：`toast.skillsBindFailedOnCreate` / `OnSave`（UI 文案，非 API）。

### 4.3 Turn 面板

- 识别 `stepKey === "C1b"` 或 `subStage === "skills_resolution"`。
- 实现 `shouldHideUnboundSkillsStep`（`copy-chat-en-zh.md` §3）。
- `buildTurnStageItems` 中 skills order **12**（knowledge 10，mcp 15）。

### 4.4 i18n 分工


| 范围                 | 文件                                           |
| ------------------ | -------------------------------------------- |
| Skills 页           | `messages/{locale}/page/console/skills.json` |
| 助手 Modal 增量        | `page/console/assistants.json`               |
| API 错误 + Turn safe | `messages/{locale}/api/message.json`         |
| 后端                 | 仅 `tApiMessage`；**不**翻译 UGC                  |


### 4.5 类型建议（前端可选）

```typescript
type SkillConfigListItem = {
  id: string;
  name: string;
  description: string | null;
  content: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  referencedAssistantCount: number;
};

type AssistantSkillConfigsResponse = {
  assistantId: string;
  skillConfigIds: string[];
};
```

---

## 5. 已知产品/设计 Closed 项（3B 无需分支）

- 仅用户自建；无系统预置。
- 合并格式 `## Skill: {name}` + 原样 content；`\n\n---\n\n`。
- 排序 skillConfigId 字典序。
- 删除禁止 + 409；无级联解绑。
- 无合并预览；无 test-connection。
- Turn C1b MVP 纳入。

---

## 6. 仍须运维/产品知晓（非阻塞）


| 项                 | 说明                                                             |
| ----------------- | -------------------------------------------------------------- |
| MCP vs Skill 助手上限 | MCP `MAX_PER_ASSISTANT=20`，Skill **=10**（PRD 定稿）；文档与 UI 须分别提示  |
| 历史消息              | 删除 Skill 不 retroactive 修改已存消息；仅影响后续 Agent 构建                   |
| 集成测试              | 建议 3B 增加 `turn-capabilities` Skills 单测或轻量 integration（mock DB） |


---

## 7. 修订记录


| 日期         | 说明    |
| ---------- | ----- |
| 2026-06-18 | 3A 初稿 |


