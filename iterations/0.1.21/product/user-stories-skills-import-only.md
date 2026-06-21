# 用户故事：Skills 导入为主（skills-import-only）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.21` |
| 主题 | zip 导入为主；只读预览；减少保存操作 |
| 关联 PRD | [prd.md §5.2](./prd.md) |

---

## 背景

0.1.19–0.1.20 的 `PackDetailDrawer` 支持：

- 新建空 Pack + 在线编辑 SKILL.md / 任意文件
- **独立保存**：元数据保存、当前文件保存、SKILL.md frontmatter 同步 alwaysLoad
- 新建 / 重命名 / 删除文件

用户反馈：**「保存按钮太多了」**。Skill Pack 本质是 **zip 目录包**（Cursor skills 同构），产品方向改为：**本地编辑 → 导入**，admin 页 **不做 IDE**。

---

## US-I1：通过导入 zip 创建技能包

作为 **平台管理员**  
我想要 **仅通过上传 zip 创建新技能包**  
以便 **流程简单、与 Cursor skills 工作流一致**

**验收标准：**

- [ ] AC-I1-1：列表页 **无**「新增 / Create」空包按钮
- [ ] AC-I1-2：主 CTA 为「导入」→ `PackImportModal`（复用或迁移）
- [ ] AC-I1-3：导入校验保留 0.1.20 规则（SKILL.md 必需、大小/文件数上限、路径安全）
- [ ] AC-I1-4：导入成功 → 列表刷新 → 可打开只读详情
- [ ] AC-I1-5：frontmatter `name` / `description` / `alwaysLoad` 同步至表字段（与 0.1.20 Q3 一致）

---

## US-I2：通过重新导入覆盖更新内容

作为 **平台管理员**  
我想要 **对已有 Pack 重新上传 zip 以更新全部文件**  
以便 **在本地用 Cursor/编辑器改完后一次导入，无需在网页逐文件保存**

**验收标准：**

- [ ] AC-I2-1：详情页或行操作有「重新导入 / Re-import」入口
- [ ] AC-I2-2：Modal 明确警告：「将替换该技能包内全部文件，Pack id 与助手绑定不变」
- [ ] AC-I2-3：覆盖后文件树与预览更新；name/description/enabled/alwaysLoad **由 zip frontmatter 重新同步**（与 0.1.20 Q3 一致）
- [ ] AC-I2-4：**无** 单文件 PATCH 入口（API 可保留但 UI 不暴露，或 admin 禁用写文件 API）

---

## US-I3：只读详情预览

作为 **平台管理员**  
我想要 **在详情 Drawer 浏览 Pack 文件树与内容但不可编辑**  
以便 **确认导入结果而不误改**

**验收标准：**

- [ ] AC-I3-1：文件树只读；点击节点展示文件内容（文本预览，超大文件截断提示）
- [ ] AC-I3-2：**无** 编辑器 Save、新建文件、重命名、删除文件按钮
- [ ] AC-I3-3：含 `scripts/` 时保留黄色 Alert + 树节点「可运行」Badge（文案走 admin i18n）
- [ ] AC-I3-4：SKILL.md 以预览模式展示（非 textarea 编辑态）

---

## US-I4：元数据只读展示（导入同步）

作为 **平台管理员**  
我想要 **在详情页查看 Pack 元数据但不在网页修改**  
以便 **所有变更统一走「改 zip → 重新导入」，无保存按钮**

**验收标准：**

- [ ] AC-I4-1：详情展示 name、description、enabled、alwaysLoad — **只读**（Tag/文本，非 Input/Switch）
- [ ] AC-I4-2：**无**「保存设置」「保存元数据」等任何 primary 保存按钮
- [ ] AC-I4-3：需改 alwaysLoad/enabled/name/desc 时，管理员 **修改 zip 内 SKILL.md frontmatter 后重新导入**
- [ ] AC-I4-4：`enabled=false` 的 Pack 不出现在用户助手挂载下拉（与现行为一致）

---

## US-I5：列表信息密度保持

作为 **平台管理员**  
我想要 **在列表页一眼看到 Pack 关键属性**  
以便 **无需进详情即可管理**

**验收标准：**

- [ ] AC-I5-1：列：名称、描述、文件数、含脚本 Tag、始终加载 Tag、启用状态、更新时间
- [ ] AC-I5-2：行操作：详情（只读）、重新导入、删除
- [ ] AC-I5-3：产品说明 Alert 更新为「导入 zip 管理；对话按需加载与沙箱运行」— 移除「在线编辑」描述

---

## US-I6：导入 description 回退（P1）

作为 **平台管理员**  
我想要 **导入 frontmatter 无 description 的 Pack 时列表仍有可读描述**  
以便 **意图路由与下拉展示有效（ui-ux-pro-max 类）**

**验收标准：**

- [ ] AC-I6-1：description 为空时，回退顺序：**frontmatter description → SKILL.md 首段非空行（≤400 字）→ zip 顶层文件夹名**
- [ ] AC-I6-2：ui-ux-pro-max 导入后列表 description **非空**（回归）
- [ ] AC-I6-3：回退值写入 `user_skill_configs.description` 表字段

---

## 明确移除的能力（回归防护）

| 原能力（0.1.20 console） | 0.1.21 admin |
| --- | --- |
| `toolbar.create` / 新建 Modal | ❌ 移除 |
| `PackDetailDrawer` mode=`create` 空包 | ❌ 移除 |
| 单文件保存按钮 | ❌ 移除 |
| 新建/重命名/删除文件 | ❌ 移除 |
| SKILL.md 在线编辑保存 | ❌ 移除 |
| 导入 zip | ✅ 保留 |
| 删除 Pack | ✅ 保留 |
| enabled / alwaysLoad | ✅ 只读展示；变更靠重新导入 |
| Help Drawer（脚本说明） | ✅ 保留 |

---

## 测试场景（建议）

| # | 步骤 | 期望 |
| --- | --- | --- |
| T-I1 | 打开 admin Skills 详情 | 无文件 Save 按钮 |
| T-I2 | 打开 admin Skills 详情 | 无 Save/Switch；元数据只读 |
| T-I3 | 重新导入 zip（frontmatter 改 alwaysLoad） | 列表 Tag 随导入更新 |
| T-I4 | 尝试找「新增空包」 | 不存在 |
| T-I5 | 导入 ui-ux-pro-max | description 非空（P1） |

---

## 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-20 | 初稿 |
