# 用户故事：对话 Turn i18n 补齐（chat-i18n）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.21` |
| 主题 | chat/Turn 未国际化文案审计与修复 |
| 关联 PRD | [prd.md §5.3](./prd.md) |
| 前置 | 0.1.20 [test-checklist #17](../0.1.20/frontend/test-checklist.md) |

---

## 背景

0.1.20 引入 Turn 多态（mounted/loaded/skipped/read/run）及 `turnSafe.*` i18n keys。测试清单要求：**切换 UI 语言查看历史 Turn，详情标题按当前 locale 本地化**。

联调仍发现：

1. `ChatWorkspace.tsx` 用 **硬编码中英字符串 Set** 匹配 safeMessage，非 i18n 驱动。
2. `localize-turn-detail.ts` legacy 映射 **缺 line 级** key（如 `skillsSkippedLine`）。
3. Intent agent 输出的 skip **reason** 为 LLM 自由中文，英文 UI 下详情块出现中文。
4. `failed_safe` 仅有摘要 key，**无** details 展开说明（0.1.20 移交 P2）。

---

## US-C1：Turn 摘要与详情全走 i18n

作为 **使用英文界面的用户**  
我想要 **查看历史对话 Turn 时，技能包相关摘要与详情均为英文**  
以便 **语言切换体验一致**

**验收标准：**

- [ ] AC-C1-1：C1b 步骤 `safeMessage` 在 en UI 下 **不含** 中文（含 persisted 历史消息经 `localize-turn-detail` 或等价逻辑）
- [ ] AC-C1-2：详情块 **标题**（Mounted / Loaded / Not selected / Files read / Scripts run）随 locale 切换
- [ ] AC-C1-3：详情块 **行**（`· {name}`、`· {packName}: {path}`）legacy 映射完整
- [ ] AC-C1-4：0.1.19 历史 Turn（仅 `merged[]`）仍通过 legacy 映射展示，不崩溃

---

## US-C2：消除 ChatWorkspace 硬编码 safeMessage 集合

作为 **开发者/用户**  
我想要 **Turn 步骤匹配不依赖硬编码中英字符串**  
以便 **新增 i18n key 时不必双写 Set**

**验收标准：**

- [ ] AC-C2-1：`TURN_SAFE_KB_MISS`、`TURN_SAFE_MCP_*`、`TURN_SAFE_SKILLS_*` 等 Set **移除或改为** semantic key / 结构化字段匹配
- [ ] AC-C2-2：`MCP_DISABLED_MARKERS` 硬编码 **移除**
- [ ] AC-C2-3：功能回归：Turn 卡片 stage 行、折叠详情 **行为不变**

---

## US-C3：messages en/zh key parity

作为 **本地化维护者**  
我想要 **chat 与 turn 相关 JSON 中英文 key 完全对齐**  
以便 **无 fallthrough 或 missing translation**

**验收标准：**

- [ ] AC-C3-1：扫描 `messages/en` vs `messages/zh`：`page/chat.json`、`api/message.json`（`turnSafe` 段）、新增 `page/admin/skills.json` — **key 集合一致**
- [ ] AC-C3-2：无 `defaultMessage` 或硬编码 fallback 替代缺失 key
- [ ] AC-C3-3：`page/chat.json` 与 `api/message.json` 间 duplicate detail key **保持同步**（0.1.20 既有模式）

---

## US-C4：Intent skip reason 本地化（P0 — Q16 已确认）

作为 **使用英文界面的用户**  
我想要 **「未选用」详情展示本地化的跳过原因**  
以便 **详情语言纯净且可理解**

**验收标准：**

- [ ] AC-C4-1：服务端持久化 **reasonCode** 枚举（如 `unrelated`、`low_confidence`），**不** 存 LLM 自由文本
- [ ] AC-C4-2：前端按 reasonCode 查 i18n（如 `turnSafe.detail.skillsSkipReason.unrelated`）展示
- [ ] AC-C4-3：英文 UI 下 skipped 块 **无** 未翻译中文（人工抽检 3 条历史 Turn）
- [ ] AC-C4-4：历史 Turn 若仅有旧版中文 reason 文本，经 legacy 映射或降级为仅包名

---

## US-C5：Intent 失败详情（failed_safe）（P1）

作为 **用户**  
我想要 **技能包选用失败时详情有一句可理解的说明**  
以便 **知悉是系统限制而非助手未配置**

**验收标准：**

- [ ] AC-C5-1：新增 i18n key（如 `turnSafe.detail.skillsIntentFailedBody`）：中「选用服务暂不可用（超时或解析失败），已跳过可选技能包」/ en 对应
- [ ] AC-C5-2：`intentSource=failed_safe` 时 details 展示该块（**不** 暴露 `timeout`、`intent_json_parse_failed` 等内部串）
- [ ] AC-C5-3：摘要仍用现有 `skillsSelectionFailed`

---

## US-C6：Turn 阶段与子步骤 label

作为 **双语用户**  
我想要 **Turn 时间线阶段名（知识库、技能包、MCP 等）在两种语言下正确**  
以便 **理解执行流程**

**验收标准：**

- [ ] AC-C6-1：`page.chat.json` 中 `turn.stage.*` 无硬编码中文漏网
- [ ] AC-C6-2：`turn.status.*`（pending/running/completed/failed/interrupted）en/zh 齐全
- [ ] AC-C6-3：`turn.card.noStructuredDetails` 等空态 copy 已 i18n

---

## 审计清单（实施前扫描，backend/frontend 共用）

| 文件/区域 | 检查项 |
| --- | --- |
| `ChatWorkspace.tsx` | 硬编码 Set、未走 `t()` 的用户可见串 |
| `localize-turn-detail.ts` | LEGACY 映射覆盖所有 `turnSafe.detail.*` |
| `messages/route.ts` | `skillsSafeMessage` / `skillsDetailsFromUi` 仅用 i18n |
| `turn-capabilities.ts` | 无用户可见英文字面量写入 Turn |
| `skill-pack-intent-agent.ts` | reason 不 persist 自由文本（若采用 AC-C4-1） |
| `messages/en/*` vs `zh/*` | diff key 列表为空（chat/turn/admin.skills） |

---

## 测试场景（建议）

| # | 步骤 | 期望 |
| --- | --- | --- |
| T-C1 | zh UI 对话 → 切 en → 看历史 Turn C1b | 全英文 |
| T-C2 | en UI 对话 → 切 zh → 看历史 Turn | 全中文 |
| T-C3 | mounted 未选用 Turn | skipped 块无中文 reason（en UI） |
| T-C4 | 模拟 failed_safe（超时） | 摘要 + details 各一句 i18n |
| T-C5 | 0.1.19 老 Turn（merged only） | 正常展示 |

---

## 非目标

- 日期格式本地化（`YYYY-MM-DD HH:mm`）— 见 open-questions Q19
- 模型输出内容翻译（仅 Turn **元数据/UI**）

---

## 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-20 | 初稿 |
