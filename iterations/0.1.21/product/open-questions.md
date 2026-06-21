# 开放问题（version 0.1.21 — Skills 治理与体验优化）

定稿状态：**已关闭**（2026-06-20 用户确认 Q1/Q2/Q8/Q10/Q16；Q3–Q27 按建议默认实施；2026-06-21 结项同步）。

---

## A. Skills 治理模型（P0 — 迁 admin 前置）

| ID | 问题 | 建议默认 | 影响 |
| --- | --- | --- | --- |
| **Q1** | 迁 admin 后，普通用户是否还能拥有「自己的技能包」？ | ✅ **已关闭：否** — 仅 **系统级技能库** | 数据模型、权限、助手挂载数据源 |
| **Q2** | 系统技能包存储模型？ | ✅ **已关闭：删除 `userId` 字段** — 表演进为全局系统 Pack（name **全局唯一**）；现有 Pack **一次性迁移**（保留 id 以维持助手绑定） | 迁移脚本、实体/表命名（backend 3A 定） |
| **Q3** | 用户助手挂载来源？ | **系统技能库** — 用户 `/console/assistants` 多选下拉列出 **全部 enabled 系统 Pack**（与现 admin 助手挂载 UX 对齐） | API、列表权限 |
| **Q4** | Admin 助手 vs 用户助手挂载范围？ | **相同系统库** — 两类助手均从同一系统 Pack 列表挂载 | 绑定表是否区分 owner |
| **Q5** | 普通用户 run 权限？ | **继承助手挂载** — 用户无权管理 Pack，但对话中仍可对 **已挂载且本轮已加载** 的 Pack 执行 read/run（与 0.1.20 一致） | 无需新权限层 |
| **Q6** | 迁 admin 后旧 `/console/skills` URL？ | **302 → `/admin/skills`**（管理员）或 **404 + 控制台菜单移除**（普通用户） | 路由、书签 |
| **Q7** | Console API `/api/console/skill-configs`？ | **废弃** — 新建 `/api/admin/skill-configs`（对齐 `admin-api-guards`）；Console 助手页改调 **只读列表** 端点（如 `GET /api/console/skill-catalog` 或 admin 列表的公开子集） | API 拆分 |

---

## B. 导入为主 UX（P0）

| ID | 问题 | 建议默认 | 影响 |
| --- | --- | --- | --- |
| **Q8** | 是否禁止控制台内在线编辑 SKILL.md / 子文件？ | ✅ **已关闭：是** — 详情 **只读预览**；内容变更 **仅**「重新导入 zip 覆盖」 | PackDetailDrawer 大幅简化 |
| **Q9** | 是否保留「新建空 Pack」？ | **否** — 移除「新增」按钮与 create Modal；首包必须 **导入 zip** | 创建流 |
| **Q10** | 元数据（name / description / enabled / alwaysLoad）如何保存？ | ✅ **已关闭：导入时同步，详情只读展示** — **无** 元数据编辑区、**无** Switch、**无**「保存设置」；变更 name/desc/enabled/alwaysLoad 须 **改 zip 后重新导入**（frontmatter → 表字段，延续 0.1.20 Q3 导入同步策略） | 0 个保存按钮 |
| **Q11** | 重新导入时同名 Pack？ | **覆盖当前 Pack**（同 id 替换 `skill_pack_files`）；导入 Modal 内明确提示「将替换全部文件」 | 数据安全 |
| **Q12** | 只读预览是否展示文件树？ | **是** — 树 + 点击预览文本内容；脚本节点保留「可运行」Badge；**无** 编辑区 Save | 详情 Drawer |
| **Q13** | 删除 Pack？ | **保留** — 列表行操作「删除」+ 二次确认；删除后助手绑定 **自动解除** 或 **阻止删除若仍被挂载**（见 Q14） | 引用完整性 |
| **Q14** | 被助手挂载的 Pack 能否删除？ | **阻止删除** — 返回错误并列出引用助手名；管理员须先解绑 | 与 models 删除策略对齐 |

---

## C. 对话 Turn i18n（P0）

| ID | 问题 | 建议默认 | 影响 |
| --- | --- | --- | --- |
| **Q15** | i18n 审计范围？ | **P0 清单**：① `messages/en` vs `zh` key  parity；② `ChatWorkspace.tsx` 硬编码 safeMessage 集合；③ `localize-turn-detail.ts` legacy 映射缺口；④ Turn 阶段 label / 子步骤 copy | 扫描范围 |
| **Q16** | Intent skip `reason` 语言？ | ✅ **已关闭：reasonCode + i18n** — 持久化 **reasonCode** 枚举（如 `unrelated`、`low_confidence`）；展示走 i18n；**不** persist LLM 自由文本 | 英文 UI 体验 |
| **Q17** | `failed_safe` 详情是否展示 timeout / parse？ | **P1 纳入本期** — details 增加一行用户向说明（i18n key：`skillsIntentFailedDetail`），**不** 暴露 stack | 0.1.20 移交 P2 部分落地 |
| **Q18** | 历史 Turn 语言切换？ | **延续 0.1.20 Q20/Q22** — 结构化快照 + `localize-turn-detail`；补齐 **line 级** legacy（`skillsLoadedNameLine` 等） | 测试 #17 |
| **Q19** | `ChatWorkspace` 日期格式？ | **本期不改** — `YYYY-MM-DD HH:mm` 暂保留；非 P0 | 范围控制 |

---

## D. 0.1.20 移交项排期

| ID | 主题 | 本期？ | 建议 |
| --- | --- | --- | --- |
| **Q20** | Intent 快模型（mini） | **否（P2）** | 环境变量预留；不阻塞 0.1.21 |
| **Q21** | 沙箱加固（容器 / 硬无网络） | **否（P2）** | 维持子进程沙箱 |
| **Q22** | ui-ux-pro-max frontmatter description 为空 | **P1 可选** — 导入时若 frontmatter 无 description，**回退** 用 zip 文件夹名或 SKILL.md 首段摘要写入表字段 | 与导入流同迭代低成本 |
| **Q23** | 审计 UI（`skill_script_runs`） | **否（P3）** | admin logs 后续迭代 |
| **Q24** | Intent 超时 PRD 值 vs 联调 15s | **文档对齐** — `.env.example` 与 PRD 一致为 **15000**；不回调 1.5s | 文档债 |

---

## E. Admin 模块对齐

| ID | 问题 | 建议默认 | 影响 |
| --- | --- | --- | --- |
| **Q25** | Admin 菜单项名称（中/英）？ | **「技能包」/ "Skill Packs"**；icon 建议 `AppstoreOutlined` 或 `ThunderboltOutlined`；置于 **assistants 之前或之后** | i18n `page.admin.shell.menu.skills` |
| **Q26** | Admin Skills 列表字段？ | 对齐现 console 列表：**名称、描述、文件数、含脚本、始终加载、启用、更新时间**；操作：**详情、导入覆盖、删除** | ProTable columns |
| **Q27** | 迁移期双写？ | **否** — 一次性切换；维护窗口内跑迁移脚本 | 复杂度 |

---

## 已拍板（Closed）

| 项 | 决策 | 确认日期 |
| --- | --- | --- |
| Q1 用户级 Pack | **取消** — 仅系统库 | 2026-06-20 |
| Q2 数据模型 | **删除 `userId`**；全局系统 Pack | 2026-06-20 |
| Q8 在线编辑 | **禁止** — 只读 + 重新导入 | 2026-06-20 |
| Q10 元数据保存 | **导入同步 only** — 详情无编辑/无保存 | 2026-06-20 |
| Q16 skip reason | **reasonCode + i18n** | 2026-06-20 |
| Q3–Q27 | 按建议默认实施 | 2026-06-21 |
| 0.1.21 P0 范围 | Admin 迁移 + 导入为主 + Turn i18n + 治理模型 | — |
| 0.1.20 P2/P3 移交 | Intent 快模型、沙箱加固、审计 UI **本期不做** | — |

---

## 确认方式

1. **「按默认执行」** — Q1–Q27 全部按「建议默认」关闭。
2. **逐条回复** — 如「Q1 保留用户私有 Pack」。
3. **混合** — 指定 ID + 决策。

---

## 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-20 | 初稿 |
| 2026-06-20 | 用户确认 Q1/Q2/Q8/Q10/Q16 |
| 2026-06-21 | 结项关闭 Q3–Q27 |
