# 规格：0.1.18 → 0.1.19 迁移 UX 与脚本说明（version 0.1.19）

**产品策略（D8）：** 部署 0.1.19 时 **一次性自动迁移** 旧 `UserSkillConfig.content` → `SkillPackFile(path='SKILL.md')`；`AssistantSkillBinding` **不变**。

---

## 1. 迁移脚本行为（服务端，供 backend 3B）

### 1.1 每条旧记录

| 步骤 | 动作 |
| --- | --- |
| 1 | 若该 `id` 已有 `skill_pack_files` 行 → **跳过**并 log（Q8） |
| 2 | 生成 `SKILL.md` 内容 |

```markdown
---
name: {row.name}
description: {row.description or ""}
---

{row.content}
```

| 3 | INSERT `skill_pack_files(packId, userId, path='SKILL.md', content=上述)` |
| 4 | 清空或 NULL `user_skill_configs.content`（列可保留 deprecated） |
| 5 | `name`/`description` 主表字段 **保留**（与 frontmatter 一致） |

### 1.2 不迁移

- 无 `content` 或已空的记录：仅 log；用户需在控制台补 `SKILL.md`
- 助手绑定：零改动

### 1.3 验收（AC-P13）

- 迁移后对话合并正文与旧 `content` **语义等价**（允许多 frontmatter 剥离层）
- 列表 `name` 不变；`fileCount >= 1`

---

## 2. 用户可见 UX

### 2.1 首次登录 Banner（推荐 MVP）

**触发：** 用户首次在 0.1.19 访问 `/console/skills` 且存在曾迁移的 Pack（或全局 feature flag `skillPackMigrationDone`）。

**组件：** `Alert` `type="info"` `banner` `closable` + localStorage `skillPackMigrationBannerDismissed`

| 项 | 内容 |
| --- | --- |
| message | `migration.banner.title` |
| description | 单正文 Skill 已转为目录包；入口文件为 `SKILL.md`；可 zip 导入 Cursor 同构目录 |
| 操作 | 「了解详情」→ 打开 **迁移说明 Drawer** |

**不阻断** 正常使用；关闭后不再显示。

### 2.2 迁移说明 Drawer

**章节：**

1. **发生了什么** — 每条旧 Skill 变成含 `SKILL.md` 的技能包；附属文件可在编辑器中添加
2. **对话行为** — `SKILL.md` 仍合并进 prompt；新增 `read_skill_file` 读其他文件
3. **脚本说明** — 若你导入含 `scripts/` 的包，Agent **只能阅读**源码，**0.1.19 不执行**（链到帮助文案）
4. **手工重建（US-D2）** — 解绑助手 → 删除旧 Pack → zip 导入 → 重新挂载
5. **回滚** — 产品不承诺降级；升级前请自行备份

### 2.3 列表 / 详情微提示

| 场景 | UI |
| --- | --- |
| 迁移 Pack 首次打开详情 | 一次性 `message.info`「此技能包由旧版自动迁移，可在文件树中编辑 SKILL.md」 |
| 仅含 SKILL.md 单文件 | 文件树正常；无特殊标记（避免噪音） |

**不做：** 全站 Modal 强制阅读；阻塞登录。

---

## 3. 运维与公告（可选）

| 渠道 | 内容 |
| --- | --- |
| 部署 Changelog | 说明迁移窗口、脚本不执行边界 |
| 管理员工具 | 迁移报告：总数 / 跳过 / 失败 id 列表 |

---

## 4. 手工迁移路径（US-D2）

面向高级用户的 **Console 帮助 Drawer** 或文档段落：

```text
1. 在助手管理中解除旧 Skill 挂载
2. 删除旧 Skill（无引用后）
3. 在技能包管理「导入 Zip」上传 .cursor/skills/<name>/
4. 重新挂载新 Pack 到助手
```

**自动迁移不覆盖** 用户已手工编辑的同 id Pack（Q8）。

---

## 5. 错误与恢复

| 情况 | 用户侧 | 运维 |
| --- | --- | --- |
| 单条迁移失败 | 该 Pack 可能无文件；打开详情提示补建 SKILL.md | log id + 人工 SQL |
| 整批失败 | Banner 不显示成功态；联系支持 | 回滚部署 +  DB restore |

---

## 6. i18n

见 `copy-console-en-zh.md` §「迁移」keys：`migration.banner.*`、`migration.drawer.*`

---

## 7. 故事映射

| 故事/AC | 本节 |
| --- | --- |
| US-D1, AC-P13 | §1 脚本 + §2 Banner |
| US-D2 | §4 手工路径 |
