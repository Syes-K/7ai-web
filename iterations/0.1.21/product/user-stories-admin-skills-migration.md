# 用户故事：Skills 迁管理后台（admin-skills-migration）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.21` |
| 主题 | 控制台 → `/admin/skills`；系统级治理；助手挂载 |
| 关联 PRD | [prd.md §5.1](./prd.md) |

---

## 背景

0.1.19–0.1.20 在 **`/console/skills`** 实现用户级 `UserSkillConfig` CRUD。运营反馈与架构对齐要求：技能包与 **系统助手、模型配置** 同级，由管理员在 **`/admin`** 维护。

0.1.20 结项明确：**「Skills 用户级 vs 系统级 — 下期由产品自行确认」**。本期迁 admin **必须** 关闭该决策。

---

## US-M1：管理员在后台管理技能包

作为 **平台管理员**  
我想要 **在 `/admin/skills` 查看、导入、配置、删除系统技能包**  
以便 **集中治理平台技能资产，普通用户无法擅自上传**

**验收标准：**

- [ ] AC-M1-1：Admin 侧栏新增「技能包 / Skill Packs」，路由 `/admin/skills`
- [ ] AC-M1-2：页面结构对齐 `/admin/models`（PageContainer + ProTable + 工具栏）
- [ ] AC-M1-3：仅 `admin` 角色可访问；非 admin 见 403 或 `noAdminPermission` 提示
- [ ] AC-M1-4：API 走 `/api/admin/skill-configs`，复用 `handleAdminApiAuthStatus`
- [ ] AC-M1-5：i18n 命名空间 `page.admin.skills`（中英完整）

---

## US-M2：普通用户无法访问控制台 Skills 页

作为 **普通用户**  
我想要 **控制台不再出现「技能包管理」入口**  
以便 **明确技能包非个人资源，避免误操作**

**验收标准：**

- [ ] AC-M2-1：`console-menu.tsx` 移除 skills 菜单项
- [ ] AC-M2-2：访问 `/console/skills` 返回 404 或重定向（产品定 Q6）
- [ ] AC-M2-3：`/api/console/skill-configs` 写操作废弃；读操作改为 catalog 或移除
- [ ] AC-M2-4：控制台 Skills 相关 i18n 文件 **迁移或复制** 至 admin 命名空间，无死 key 引用

---

## US-M3：系统级技能库与数据迁移

作为 **平台管理员**  
我想要 **现有技能包迁入系统库且助手绑定不断裂**  
以便 **升级后对话与挂载关系仍可用**

**验收标准：**

- [ ] AC-M3-1：表 **删除 `userId` 列**；所有 Pack 为全局系统级（name 全局唯一）
- [ ] AC-M3-2：Pack **id 保持不变**，已有 `AssistantSkillBinding` 仍有效
- [ ] AC-M3-3：name 冲突有明确策略（合并或重命名后缀 — backend 3A 文档化）
- [ ] AC-M3-4：迁移后可测：至少一个原用户 Pack 在助手挂载下对话 **loaded + run** 正常

---

## US-M4：用户助手从系统库挂载技能包

作为 **普通用户**  
我想要 **在编辑自己的助手时，从系统技能库多选挂载**  
以便 **使用管理员提供的技能，而无需自己维护 Pack**

**验收标准：**

- [ ] AC-M4-1：`/console/assistants` 技能包多选下拉数据源为 **enabled 系统 Pack 列表**
- [ ] AC-M4-2：下拉展示 name、description（截断）、含脚本/始终加载 Tag（只读）
- [ ] AC-M4-3：extra 文案保留 0.1.20「仅加载与问题相关的包」说明
- [ ] AC-M4-4：无 Pack 时展示空状态引导（「请联系管理员导入技能包」类 copy）
- [ ] AC-M4-5：admin 用户在助手页可见「管理技能包」链至 `/admin/skills`（可选）

---

## US-M5：系统助手挂载同一技能库

作为 **平台管理员**  
我想要 **在 `/admin/assistants` 挂载与用户使用相同的系统 Pack**  
以便 **系统预设助手与用户助手技能来源一致**

**验收标准：**

- [ ] AC-M5-1：Admin 助手编辑表单技能包多选与 US-M4 同源 API
- [ ] AC-M5-2：挂载/解绑行为与 0.1.20 一致（binding 表不变）

---

## US-M6：删除保护与引用提示

作为 **平台管理员**  
我想要 **删除仍被助手挂载的技能包时被阻止并看到引用列表**  
以便 **避免线上助手静默失效**

**验收标准：**

- [ ] AC-M6-1：删除被挂载 Pack → API 4xx + 错误码含引用助手名
- [ ] AC-M6-2：UI Popconfirm 或 Modal 展示引用信息
- [ ] AC-M6-3：解绑后可成功删除

---

## 非功能需求

| 项 | 要求 |
| --- | --- |
| 权限 | 与现有 admin 模块一致 |
| 审计 | 本期不要求 script_runs UI（0.1.20 移交 P3） |
| 性能 | 系统库列表 ≤500 Pack 时列表加载 P95 < 2s |

---

## 测试场景（建议）

| # | 步骤 | 期望 |
| --- | --- | --- |
| T-M1 | admin 登录 → `/admin/skills` | 列表正常 |
| T-M2 | 普通用户 → `/admin/skills` | 403 |
| T-M3 | 普通用户控制台侧栏 | 无「技能包」 |
| T-M4 | 用户助手挂载系统 Pack → 对话 | Turn loaded 正常 |
| T-M5 | 删除被挂载 Pack | 失败 + 提示 |

---

## 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-20 | 初稿 |
