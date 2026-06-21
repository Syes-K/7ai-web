# 控制台 Skills 退场与助手挂载（version 0.1.21）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.21` |
| 范围 | `/console/skills` 移除；助手页改系统库 catalog |
| 用户故事 | US-M2、US-M4、US-M5 |
| 关联 | `spec-admin-skills.md`、`copy-admin-en-zh.md` |

---

## 1. 控制台菜单

### 1.1 移除项

`console-menu.tsx` 删除 skills 路由项（原 path `/console/skills`）。

**影响：** 普通用户侧栏不再出现「技能包」。

### 1.2 i18n 清理

- `page.console.shell.menu.skills`（若存在）**删除引用**
- Skills 页文案 **不删除文件** 直至 frontend 完成迁移引用审计；最终 `messages/*/page/console/skills.json` 可标记 deprecated 或删除（实现阶段）

---

## 2. `/console/skills` 路由处置（Q6）

| 访问者 | 行为 |
| --- | --- |
| 未登录 | 沿用 console layout 鉴权 → login |
| 普通用户（已登录） | **404**（`notFound()`） |
| admin 用户 | **302** → `/{locale}/admin/skills` |

**实现建议：**

- 保留薄 `page.tsx` 仅做角色判断 redirect，或 middleware 层处理
- **不** 保留原 `SkillsClient` 页面

**书签：** admin 用户旧链自动进 admin；普通用户见 404 符合「资源非个人」预期。

---

## 3. Console API 废弃（Q7）

| 原端点 | 处置 |
| --- | --- |
| `GET/POST/PATCH/DELETE /api/console/skill-configs` | **移除或 410** |
| `POST /api/console/skill-configs/import` | **移除** |
| `.../files` 写操作 | **移除** |

**新增只读 catalog：**

```
GET /api/console/skill-catalog
```

| 项 | 说明 |
| --- | --- |
| 鉴权 | 登录用户（`handleConsoleApiAuth`） |
| 过滤 | `enabled === true` only |
| 字段 | `id`, `name`, `description`, `fileCount`, `hasScripts`, `alwaysLoad` |
| 分页 | 可选；助手多选场景可一次拉全（≤500） |

**Admin 助手页** 与 **用户助手页** 共用此 catalog（US-M4、US-M5）。

backend 3A 可选：admin assistants 调同一 catalog 或 `GET /api/admin/skill-configs?enabledOnly=true` — 设计倾向 **单一 catalog 端点** 减少分叉。

---

## 4. 用户助手页改造

**文件：** `src/app/[locale]/console/assistants/AssistantsClient.tsx`

### 4.1 数据源

```diff
- const SKILL_LIST_API = "/api/console/skill-configs";
+ const SKILL_CATALOG_API = "/api/console/skill-catalog";
```

`skillOptions` 类型与现 `SkillPackListItem` 子集兼容。

### 4.2 空状态（Q3 / AC-M4-4）

**条件：** `skillOptions.length === 0 && !skillLoading`

| Key | en | zh |
| --- | --- | --- |
| `alert.noSkills.message` | No Skill Packs available | 暂无可用技能包 |
| `alert.noSkills.description` | Ask an administrator to import Skill Packs in the admin console. | 请联系管理员在管理后台导入技能包。 |

**移除：** `alert.noSkillsAction` 中链至 `/console/skills` 的 `skillsLink` 富文本（普通用户无目标页）。

### 4.3 「管理技能包」链接（AC-M4-5）

| 用户 | 展示 |
| --- | --- |
| 非 admin | **隐藏** `form.skills.manageLink` |
| admin | 显示；`href="/admin/skills"`（next-intl Link） |

**判定：** layout 传入 `isAdmin` 或 client 调 `/api/auth/me` 一次（复用现有 session 模式 — backend 3A 与 admin 助手页对齐）。

```tsx
{isAdmin ? (
  <Link href="/admin/skills" className="text-xs ...">
    {t("form.skills.manageLinkAdmin")}
  </Link>
) : null}
```

**新 key：** `form.skills.manageLinkAdmin` — en `Manage Skill Packs` / zh `管理技能包`

**废弃 key：** `form.skills.manageLink`（原指向 console/skills）— 移除或别名至 admin。

### 4.4 多选 UX（保持 0.1.20）

| 项 | 不变 |
| --- | --- |
| `form.skills.extra` | 按需加载说明 |
| optionRender | name + fileCount + scripts Tag |
| tagRender | inactive Pack 橙色 |
| `hasInactiveMountedSkills` warning | 保留 |
| 绑定 API | `PUT .../assistants/:id/skill-configs` body `{ skillConfigIds }` |

**变更：** 可选 id 必须属于 catalog（enabled 或已挂载的 disabled）。

### 4.5 deleteBlocked 链接（Skills 列表已迁走）

原 `deleteBlocked.body` 中 `<assistantsLink>` 指向 `/console/assistants` — **admin skills 页** 删除失败时改为：

- 链至 `/admin/assistants`（系统助手）与 `/console/assistants`（用户助手）或统一文案「请在助手管理中解绑」

设计定稿：**Modal 内枚举引用助手名**即可；链接可选 `/admin/assistants`（admin 场景）。

---

## 5. Admin 助手页（US-M5）

**文件：** `src/app/[locale]/admin/assistants/AssistantsClient.tsx`

若当前 **无** 技能包多选 — 本期 **新增** 与 console 同构区块：

- 数据源：`GET /api/console/skill-catalog`（或 admin 等价）
- label / extra / optionRender 复用 console keys 或抽 `common/skill-picker-copy`
- 无「管理技能包」链接（已在 admin）

若已有挂载 UI — 仅换 API。

---

## 6. 状态矩阵

| 场景 | Console 助手 | Admin 助手 |
| --- | --- | --- |
| catalog 加载中 | Select loading | 同左 |
| catalog 空 | info Alert（联系管理员） | info Alert（前往 Skills 导入） |
| 选 disabled Pack | warning | 同左 |
| 保存 binding | 原 API | 原 API |
| admin 见管理链 | `/admin/skills` | N/A（侧栏已有） |

**Admin 助手空 catalog copy：**

| Key | en | zh |
| --- | --- | --- |
| `alert.noSkillsAdmin.description` | Import Skill Packs from <skillsLink>Skill Packs</skillsLink> first. | 请先在<skillsLink>技能包</skillsLink>页导入。 |

---

## 7. 迁移检查清单

| # | 项 |
| --- | --- |
| 1 | `console-menu` 无 skills |
| 2 | `/console/skills` 404/redirect |
| 3 | 无代码引用 `/api/console/skill-configs`（除废弃层） |
| 4 | `AssistantsClient` skillsLink 不指向 console/skills |
| 5 | `messages` 无死引用 `page.console.skills`（迁移后） |
| 6 | 0.1.20 挂载对话回归：系统 Pack loaded + run |

---

## 8. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-20 | 初稿 |
