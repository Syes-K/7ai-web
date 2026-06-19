# 实现计划：Skills 配置、助手挂载、System Prompt 合并与 Turn 步骤（version 0.1.18）

阶段 **3B** 执行顺序建议；本文档不写业务代码，仅列步骤、依赖与自测要点。

---

## 1. 目标对齐（验收锚点）

| 来源 | 要点 |
| --- | --- |
| PRD / 用户故事 | AC-S1~S10；Epic A~D |
| 设计定稿 | 仅用户自建；Markdown 原样合并；字典序；Turn `C1b`；409 删除；enabled 静默跳过 |
| 代码约束 | 合并须经 `getAssistantAgent` → `resolveSystemPromptWithSkills`；API 经 `withApiWrapper` + `getRequestUserContext`；枚举/常量在 `@/common/*` |

---

## 2. 数据层（3B 第一步）

### 2.1 实体与登记

1. 新增 `src/server/db/entities/UserSkillConfig.ts`、`AssistantSkillBinding.ts`（字段见 `data-models.md`）。
2. 在 `src/server/db/data-source.ts` 的 `entities` 注册；依赖 `synchronize: true` 自动建表。
3. **常量**：在 `src/common/constants/index.ts` 追加 §data-models 中 6 个 `SKILL_CONFIG_*`。
4. **ErrorCode**：在 `src/common/enums/http.ts` 追加 `SKILL_CONFIG_NOT_FOUND`、`SKILL_CONFIG_NAME_CONFLICT`、`SKILL_CONFIG_REFERENCED_BY_ASSISTANT`；经 `src/common/enums/index.ts` 导出。

### 2.2 领域模块（建议 `src/server/skill/`）

| 文件 | 职责 |
| --- | --- |
| `skill-config-dto.ts` | 列表/详情 JSON 映射 |
| `skill-config-validation.ts` | name / description / content 校验 + `tApiMessage` |
| `parse-skill-config-ids.ts` | PUT body 解析、去重、上限 10 |
| `assistant-skill-bindings.ts` | 列表 id、replace 事务、引用计数 |

**注释要求**：模块顶部的职责说明；事务替换与「无效 id 统一 422」的产品边界。

---

## 3. HTTP API（3B 第二步）

### 3.1 Skill CRUD

1. `src/app/api/console/skill-configs/route.ts` — GET（keyword 过滤 + referencedAssistantCount）、POST（上限 50 + 校验）。
2. `src/app/api/console/skill-configs/[id]/route.ts` — GET / PATCH / DELETE（409 引用检查）。
3. 全部 **`withApiWrapper`** + **`resolveRequestLocale`** + **`tApiMessage`**。

**参考拷贝改造**：以 `src/app/api/console/mcp-configs/route.ts`、`[id]/route.ts` 为模板，删 transport/endpoint/credentials/test，换 content 校验。

### 3.2 助手子资源

1. `src/app/api/console/assistants/[id]/skill-configs/route.ts` — GET / PUT。
2. 参考 `src/app/api/console/assistants/[id]/mcp-configs/route.ts`；调用 `replaceAssistantSkillBindings`。

### 3.3 i18n keys（与 API 同步落地）

在 `messages/en/api/message.json`、`messages/zh/api/message.json` 增加 `api-spec.md` §6 所列 key（top-level + validation + 建议对称 MCP 的 `skillConfigLimitPerUser`、`skillConfigNameUnique`、`skillConfigReferencedCount`、`skillConfigIdsStringArray`、`skillConfigMaxPerAssistant`）。

---

## 4. 对话运行时（3B 第三步）

**文件**：`src/server/chat/turn-capabilities.ts`

### 4.1 `loadSkillPackRefsForChatTurn`

```
1. if (!ctx.assistantId) return []
2. find AssistantSkillBinding where userId + assistantId
3. skillConfigIds 去重 → sort 字典序 ascending
4. slice(0, SKILL_CONFIG_MAX_BINDINGS_PER_CHAT_TURN)
5. find UserSkillConfig where id In(...) AND userId AND enabled=true
6. 按步骤 4 顺序 filter 存在且 enabled 的 id
7. return refs.map(id => ({ id }))
```

- 绑定存在但 config 缺失 / disabled：**不**进入 refs（与 MCP enabled 过滤一致；disabled 在步骤 5 排除）。
- **整段 try/catch**：异常 → log `skills_load_error` → return `[]`（AC-S9）。

### 4.2 `skillRefsToExtraSystemText`

```
1. if refs.length === 0 return ""
2. 批量 load UserSkillConfig by ids + userId
3. 按 refs 顺序遍历：
   - 缺失 → structured log { event: skill_skip, reason: not_found } → continue
   - enabled=false（防御）→ log reason: disabled → continue
   - 块 = "## Skill: {trim(name)}\n{content原样}"
4. join blocks with "\n\n---\n\n"
5. return trim(joined) 或 ""
```

**禁止**：HTML 渲染、strip Markdown、在路由层重复拼接。

### 4.3 `resolveSystemPromptWithSkills`

保持现有实现：base + `\n\n` + extra（extra 空则不加）。

### 4.4 `SkillsTurnUiSnapshot` 构建（供 Turn）

建议新增 **`resolveSkillsTurnUiSnapshot(ctx)`**（同文件或 `skill-turn-ui.ts`）：

- `assistantMissing`：`!ctx.assistantId`
- `merged`：成功纳入 extra 的 `{ id, name }[]`（与 refs 顺序一致）
- `skippedCount`：绑定数 − merged 数（可选，仅 log）

### 4.5 `getAssistantAgent` 返回值扩展

当前 `GetAssistantAgentResult` 含 `mcpTurnUi`。3B 建议：

```typescript
export type GetAssistantAgentResult = {
  agent: ...;
  mcpTurnUi: McpTurnUiSnapshot;
  skillsTurnUi: SkillsTurnUiSnapshot;  // 新增
  disposeMcp: () => Promise<void>;
};
```

在 `getAssistantAgent` 内：`Promise.all` 或顺序调用 `resolveSkillsTurnUiSnapshot`（可与 `resolveSystemPromptWithSkills` 共享 DB 查询以优化，非必须首版）。

同步扩展 `src/server/chat/assistant.ts` 的 `onAgentPrepared`：

```typescript
onAgentPrepared?: (payload: {
  mcpTurnUi: McpTurnUiSnapshot;
  skillsTurnUi: SkillsTurnUiSnapshot;
}) => Promise<void> | void;
```

---

## 5. Turn 管道（3B 第四步）

### 5.1 `turn-runtime.ts`

在 `ORDERED_STEPS` 中 **C1 与 C2 之间**插入：

```typescript
{ stepKey: "C1b", mainStage: "C", subStage: "skills_resolution" },
```

原 `C2` `mcp_tools_resolution` 顺序后移；主阶段 C 仍包含 knowledge → skills → mcp。

### 5.2 `messages/route.ts`

在 Agent 构建路径（与 C2 MCP 同级）增加 C1b 更新：

1. **`C1b` → `running`**（可选，或直接与 completed 合并）。
2. 调用 `getAssistantAgent` / `invokeAssistantReply` 后取得 `skillsTurnUi`。
3. **`C1b` → `completed`**，`safeMessage: skillsSafeMessage(locale, snapshot)`，`details: skillsDetailsFromUi(...)`。
4. 新增本地函数（对称 `mcpSafeMessage` / `mcpDetailsFromUi`）：

| 场景 | safeMessage key |
| --- | --- |
| 无助手 | `turnSafe.skillsNoAssistant` |
| 无 merged | `turnSafe.skillsNotMounted` |
| 有 merged | `turnSafe.skillsMerged` `{ count: merged.length }` |
| 整类 DB 失败 | `turnSafe.skillsLoadSkipped` |

5. **时序**：C1 knowledge → **C1b skills** → C2 mcp → D1 generation（设计定稿）。

6. 无助手 / 无挂载分支：与 MCP 一样在 fallback 路径补 `C1b completed`（避免步骤卡在 pending）。

### 5.3 Turn i18n

`messages/{en,zh}/api/message.json` 增加 `turnSafe.skills*` 与 `turnSafe.detail.skills*`（见 `copy-chat-en-zh.md`）。

---

## 6. 前端协作（3B 不实现，但 API 须就绪）

| 前端任务 | 依赖后端 |
| --- | --- |
| `/console/skills` 页 | CRUD API + 错误 key |
| 助手 Modal Skills 多选 | GET/PUT skill-configs + GET 列表 |
| ChatWorkspace C1b 行 | Turn delta 含 `stepKey: C1b` |
| i18n | 全部 `tApiMessage` key 已写入 json |

详见 `risks-and-open-items.md` §4。

---

## 7. 建议 3B 文件修改清单与顺序

| 顺序 | 文件 | 动作 |
| --- | --- | --- |
| 1 | `src/server/db/entities/UserSkillConfig.ts` | 新建 |
| 2 | `src/server/db/entities/AssistantSkillBinding.ts` | 新建 |
| 3 | `src/server/db/data-source.ts` | 注册实体 |
| 4 | `src/common/constants/index.ts` | SKILL_* 常量 |
| 5 | `src/common/enums/http.ts` | ErrorCode |
| 6 | `src/server/skill/*` | DTO / validation / bindings |
| 7 | `src/app/api/console/skill-configs/**` | CRUD 路由 |
| 8 | `src/app/api/console/assistants/[id]/skill-configs/route.ts` | 子资源 |
| 9 | `messages/*/api/message.json` | API + turnSafe keys |
| 10 | `src/server/chat/turn-capabilities.ts` | 运行时三函数 + SkillsTurnUiSnapshot |
| 11 | `src/server/chat/langchain-agent.ts` | 返回 skillsTurnUi |
| 12 | `src/server/chat/assistant.ts` | onAgentPrepared 扩展 |
| 13 | `src/server/chat/turn-runtime.ts` | C1b 步骤 |
| 14 | `src/app/api/chat/conversations/[id]/messages/route.ts` | C1b 状态机 + safeMessage |
| 15 | `iterations/0.1.18/backend/implementation-notes.md` | 3B 完成后补充自测记录（可选） |

---

## 8. 自测清单（3B 完成后）

### 8.1 API / 数据

- [ ] 未登录 → 401（Skills API 与助手子资源）。
- [ ] 用户 A 无法读写 B 的 Skill；伪造 id PUT → 422 + `invalidSkillConfigIds`。
- [ ] POST 创建；PATCH 部分更新；GET 列表含 `referencedAssistantCount`。
- [ ] 同名 → 409 + `SKILL_CONFIG_NAME_CONFLICT`。
- [ ] 第 51 条 → 422 limit。
- [ ] 助手 PUT 11 个 id → 422 mount limit。
- [ ] 删除被引用 → 409 + count；解绑后 DELETE → 204。
- [ ] GET/PUT skill-configs 回显 id 字典序。

### 8.2 运行时 / Agent

- [ ] 助手挂 2 个 enabled Skill：集成测试断言 `resolveSystemPromptWithSkills` 含 `## Skill:` 与 content 子串。
- [ ] 合并顺序与 skillConfigId 字典序一致。
- [ ] 无 assistantId → extra 为空。
- [ ] 一 config 删除、一正常 → 仅正常块；对话仍成功。
- [ ] enabled=false 仍挂载 → 不合并；助手 PUT 允许。
- [ ] DB 异常 mock → 整类 skip，基础 prompt 仍生效。
- [ ] `CHAT_LANGUAGE_REPLY_SUFFIX` 仍在 langchain-agent 追加。

### 8.3 Turn

- [ ] SSE 含 C1b completed；merged N 项时 safeMessage 正确 en/zh。
- [ ] 无助手 / 无挂载：步骤 completed 且前端可隐藏（文案命中 turnSafe 集合）。

### 8.4 回归

- [ ] MCP tools 路径不变；Skills 与 MCP 同助手并行。
- [ ] 现有 mcp-configs API 无回归。

---

## 9. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-18 | 3A 初稿 |
