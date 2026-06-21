# PRD：Skills 治理与体验优化（version 0.1.21）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.21` |
| 阶段 | 产品需求（阶段 1） |
| 状态 | **已验收**（2026-06-21；Q1/Q2/Q8/Q10/Q16 已确认，Q3–Q27 按默认实施） |
| 前置迭代 | `0.1.20` Skill Pack 增强（按需加载、run_skill_script、Turn 多态） |

---

## 1. 概述

0.1.20 交付了 Skill Pack **运行时**能力（意图路由、沙箱脚本、Turn 挂载/加载/读取/运行）。0.1.21 聚焦 **治理边界** 与 **管理体验**：

1. **Skills 管理迁至管理后台** — 仅管理员在 `/admin/skills` 配置系统技能库；用户控制台移除 `/console/skills`。
2. **导入为主、简化编辑** — 以 zip 导入为唯一内容变更路径；去掉多处独立「保存」与在线文件编辑。
3. **对话 Turn i18n 补齐** — 修复 chat/Turn 相关未国际化文案，满足历史消息语言切换。
4. **治理模型定稿** — 关闭 0.1.20 结项遗留的「用户级 vs 系统级」决策。

**挂载链（演进后）**：

```text
管理后台 系统 Skill Pack 库
  → 助手 AssistantSkillBinding（用户助手 / 系统助手均挂载系统 Pack id）
  → 会话 Conversation.assistantId
  → 每轮 Turn：意图路由 → 合并 SKILL.md → read/run tools（与 0.1.20 一致）
```

---

## 2. 问题陈述

| 现象 | 用户/运营理解 | 实际/产品问题 |
| --- | --- | --- |
| 普通用户在 `/console/skills` 自建 Pack | 人人可上传技能 | 技能包属 **平台资产**，应集中治理；与 admin assistants/models 模式不一致 |
| Pack 详情 Drawer 多个「保存」 | 改一处存一处 | 元数据保存、SKILL.md 保存、单文件保存、frontmatter 同步 — **操作负担重** |
| 英文 UI 下历史 Turn | 切换语言后应全本地化 | `ChatWorkspace` 硬编码中英 safeMessage 集合；intent skip **reason** 可能为中文；部分 detail line 未进 legacy 映射 |
| 0.1.20 结项 | 用户级 vs 系统级未定 | 迁 admin **强制** 产品定稿治理模型 |

---

## 3. 术语（沿用 0.1.20）

| 术语 | 定义 |
| --- | --- |
| **系统技能库** | 管理员维护的全局 Skill Pack 集合（本期目标形态） |
| **挂载 / 加载 / 未选用 / 读取 / 运行** | 见 0.1.20 PRD §3；运行时语义 **不变** |
| **导入覆盖** | 对已有 Pack 重新上传 zip，**替换** 全部 `skill_pack_files`，保留 Pack id 与绑定关系 |

---

## 4. 目标与非目标

### 4.1 目标（In Scope）

| ID | 目标 | 优先级 |
| --- | --- | --- |
| G1 | Skills 管理页迁至 `/admin/skills`，仅 **admin 角色** 可访问 | P0 |
| G2 | 控制台移除 Skills 菜单与页面；助手挂载改引 **系统库** | P0 |
| G3 | 管理页以 **zip 导入** 为创建/更新 Pack 内容的主路径；**只读** 文件预览 | P0 |
| G4 | 管理页 **零保存按钮** — 元数据仅导入时从 frontmatter 同步；详情只读展示 | P0 |
| G5 | 定稿 **系统级唯一** 治理模型 + 数据迁移方案（产品层） | P0 |
| G6 | 补齐 chat/Turn i18n 遗漏；历史 Turn 语言切换通过测试 #17 | P0 |
| G7 | Intent `failed_safe` 用户向详情（timeout/parse 简述） | P1 |
| G8 | 导入时 frontmatter description 回退策略（ui-ux-pro-max 类） | P1 |

### 4.2 非目标（Out of Scope）

| 项 | 说明 |
| --- | --- |
| 用户私有 Skill Pack | 本期 **不** 保留用户级 CRUD（见 open-questions Q1） |
| 在线 IDE 式编辑 | 不编辑 SKILL.md / 不新建空包 / 不重命名删除单文件 |
| Intent 专用 mini 模型 | 0.1.20 移交 P2，后续迭代 |
| 沙箱容器化 / 硬无网络加固 | 0.1.20 移交 P2 |
| `skill_script_runs` 审计 UI | 0.1.20 移交 P3 |
| 运行时行为变更 | 意图路由、run 配额、alwaysLoad 逻辑 **保持 0.1.20** |
| 会话级临时挂载 | 仍不支持 |

---

## 5. 方案概要

### 5.1 Admin Skills 迁移（P0-A）

**路由与权限**

| 项 | 说明 |
| --- | --- |
| 页面 | `/[locale]/admin/skills` — `SkillsAdminClient`（自 console 迁移并改造） |
| 菜单 | `admin-menu.tsx` 新增项；i18n `page.admin.shell.menu.skills` |
| 权限 | 复用 `admin-api-guards.ts`；非 admin → 403 |
| API | `GET/POST/PATCH/DELETE /api/admin/skill-configs` + 文件只读 `GET .../files`；导入 `POST .../import` |

**控制台退场**

| 项 | 说明 |
| --- | --- |
| 移除 | `console-menu.tsx` skills 项；`/console/skills` 页面 |
| 助手页 | `/console/assistants` 技能包多选 → 调 **系统库只读列表** |
| 链接 | 助手页「管理技能包」链至 `/admin/skills`（**仅 admin 可见**）或移除 |

**数据模型（产品层，细节交 backend 3A）**

| 变更 | 说明 |
| --- | --- |
| 系统 Pack | **删除 `userId` 列**；表/实体演进为全局系统 Pack（name **全局唯一**） |
| 迁移 | 现有 Pack 保留 id；删除 userId 后即为系统库 |
| 绑定 | `AssistantSkillBinding` 仍存 packId；迁移后 id 不变则绑定有效 |

**对齐参考**：`/admin/assistants`、`/admin/models` 的 PageContainer + ProTable + Modal 模式。

### 5.2 导入为主 UX（P0-B）

**列表页操作**

| 操作 | 保留/新增 | 移除 |
| --- | --- | --- |
| 导入 zip（新建） | ✅ 主按钮 | |
| 导入 zip（覆盖已有） | ✅ 详情/行操作 | |
| 查看详情（只读） | ✅ | |
| 删除 | ✅ | |
| 刷新 | ✅ | |
| 新增空 Pack | | ❌ |
| 行内「编辑」打开可写 Drawer | | ❌ |

**详情 Drawer（改造后）**

| 区域 | 行为 |
| --- | --- |
| 元数据 | name、description、enabled、alwaysLoad — **只读展示**（来自表字段，导入时由 frontmatter 同步） |
| 文件树 | 只读；点击预览内容；脚本 Badge 保留 |
| 内容/元数据变更 | **仅**「重新导入」→ ImportModal 覆盖模式 |
| 保存按钮 | **0 个**（无文件保存、无元数据保存、无 Switch PATCH） |

**用户价值**：「本地改 zip → 导入 → 完成」；admin 页不做任何在线编辑。

### 5.3 对话 Turn i18n（P0-C）

**已知遗漏（产品审计清单）**

| # | 位置 | 问题 |
| --- | --- | --- |
| i1 | `ChatWorkspace.tsx` | `TURN_SAFE_*`、`MCP_DISABLED_MARKERS` 硬编码中英字符串 Set |
| i2 | `localize-turn-detail.ts` | 缺 `skillsLoadedNameLine`、`skillsSkippedLine`、`skillsScriptRunLine` 等 line 级 legacy |
| i3 | `skill-pack-intent-agent` | skip `reason` 为 LLM 自由文本（中文），英文 UI 不友好 |
| i4 | `messages/en` vs `zh` | key parity 扫描；`page.admin.skills` 新 namespace |
| i5 | Turn 详情 | `failed_safe` 无 details 展开说明（0.1.20 移交） |

**策略**

- 持久化：**结构化** 快照（延续 0.1.20）；不存 locale 字符串。
- 展示：SSE/前端按 **当前 UI locale** 组装；legacy 映射扩展。
- skip reason：**reasonCode 枚举 + i18n**（Q16 已确认）；不 persist LLM 自由文本。

### 5.4 0.1.20 移交项在本期的处置

| 主题 | 0.1.20 建议 | 0.1.21 决策 |
| --- | --- | --- |
| Skills 治理模型 | 产品定 | **P0 定稿**：系统级唯一（Q1–Q7） |
| Intent 失败 UX | P2 | **P1 部分**：failed_safe details 一行 i18n |
| Intent 快模型 | P2 | **Out** |
| 沙箱加固 | P2 | **Out** |
| frontmatter description | P3 | **P1 可选**：导入回退 |
| 审计 UI | P3 | **Out** |

---

## 6. 用户场景

1. **管理员导入 ui-ux-pro-max**：Admin → Skills → 导入 zip → 列表出现包（name/desc/alwaysLoad 由 frontmatter 同步）→ 用户助手挂载 → 对话可 loaded + run。
2. **管理员更新 Pack**：打开只读详情 →「重新导入」覆盖 zip → 文件树与元数据（若 frontmatter 变更）一并更新。
3. **普通用户配置助手**：Console → 助手 → 技能包下拉见 **系统库** 列表 → 多选挂载 → **无** Skills 侧栏菜单。
4. **英文 UI 看中文会话历史**：切换 en → Turn C1b 摘要与详情块标题/行 **均为英文**。
5. **意图路由失败**：Turn 摘要「Skill Pack selection unavailable…」+ 详情可选一行「选用服务超时，已跳过可选包」（i18n）。

---

## 7. 用户故事索引

| 文档 | 主题 |
| --- | --- |
| [user-stories-admin-skills-migration.md](./user-stories-admin-skills-migration.md) | Admin 迁移、权限、治理、助手挂载 |
| [user-stories-skills-import-only.md](./user-stories-skills-import-only.md) | 导入为主、只读详情、保存简化 |
| [user-stories-chat-i18n.md](./user-stories-chat-i18n.md) | Turn/Chat i18n 审计与 AC |

---

## 8. 验收标准（总览）

| # | 标准 |
| --- | --- |
| AC-1 | 非 admin 访问 `/admin/skills` 与 admin API → 403 |
| AC-2 | 普通用户控制台 **无** Skills 菜单；`/console/skills` 不可达 |
| AC-3 | 系统 Pack 仅 admin 可导入/删除；元数据 **仅导入时** 写入；用户助手可挂载系统 Pack |
| AC-4 | Pack 详情 **无** 任何保存按钮；内容/元数据变更 **仅** 导入覆盖 |
| AC-5 | 详情 **无** 元数据编辑区与 Switch；列表/详情只读展示 enabled、alwaysLoad 等 |
| AC-6 | 英文 UI 下查看含 skills Turn 的历史消息，摘要与详情 **全英文**（测试 #17） |
| AC-7 | `messages/en` 与 `zh` 在 chat/turn/admin.skills 命名空间 **key 对齐** |
| AC-8 | 被助手挂载的 Pack **不可删除**（或明确解绑流程） |
| AC-9 | 0.1.20 核心场景回归：按需加载 + run 仍可用 |

---

## 9. 成功指标

| 指标 | 标准 |
| --- | --- |
| 治理 | 100% Pack 为系统级；零用户级新建入口 |
| UX | Pack 详情 **零保存按钮**；变更路径：改 zip → 重新导入 |
| i18n | 测试清单 #17 通过；ChatWorkspace 无新增硬编码用户可见串 |
| 兼容 | 迁移后既有助手绑定 **不断裂** |
| 回归 | 0.1.20 联调场景 A/B 仍通过 |

---

## 10. 实施优先级

| 优先级 | 范围 | 依赖 |
| --- | --- | --- |
| **P0-1** | 治理模型 + 数据迁移方案 + Admin API/页 | 无 |
| **P0-2** | 控制台退场 + 助手挂载改系统库 | P0-1 |
| **P0-3** | 导入为主 UX 改造 | P0-1 |
| **P0-4** | Turn/Chat i18n 扫描与补齐 | 可与 P0-1 并行 |
| **P1** | failed_safe details、description 导入回退 | P0-1 |

建议顺序：**治理/迁移 → Admin 页 → 控制台改挂载 → i18n**；UX 简化与 Admin 页同步。

---

## 11. 待设计项清单（交接 design）

| 项 | 说明 |
| --- | --- |
| Admin Skills 列表/详情 | 对齐 models/assistants 视觉；只读预览布局 |
| 导入覆盖 Modal | 警告文案、进度、冲突提示 |
| 保存交互 | Switch 自动保存 vs 单按钮 — 统一反馈 Toast |
| 控制台助手页 | 系统库下拉空状态、admin 管理链接 |
| Turn failed_safe | details 一行折叠样式 |
| 迁移公告 | 是否需 admin 一次性通知（可选） |

---

## 12. 依赖与风险

| 风险 | 缓解 |
| --- | --- |
| 用户 Pack 迁移丢数据 | 迁移脚本 + 回滚方案；结项前备份 |
| 助手绑定断裂 | 保留 pack id；迁移不新建 id |
| 去掉在线编辑引发 admin 抱怨 | 明确「本地编辑 zip 再导入」工作流；Help 文案 |
| i18n legacy 不全 | 扩展 `localize-turn-detail` + 集成测试 |

---

## 13. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-20 | 初稿 |
