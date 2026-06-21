# Admin Skills 详细设计（version 0.1.21）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.21` |
| 路由 | `/[locale]/admin/skills` |
| 组件 | `SkillsAdminClient`、`PackDetailDrawer`（只读）、`PackImportModal` |
| API | `/api/admin/skill-configs` |
| 用户故事 | US-M1、US-I1–I6、US-M6 |
| 文案 | `copy-admin-en-zh.md` |

---

## 1. 页面结构

### 1.1 文件布局（frontend 目标）

```text
src/app/[locale]/admin/skills/
  page.tsx                    # generateMetadata + SkillsAdminClient
  SkillsAdminClient.tsx       # 列表 + 工具栏 + Modal/Drawer 编排
  admin-skill-columns.tsx     # getAdminSkillColumns(t, ctx)
  components/
    PackDetailDrawer.tsx      # 只读详情
    PackImportModal.tsx       # create + overwrite
    pack-utils.ts             # 自 console 迁移或 common
```

### 1.2 page.tsx

- `generateMetadata`：`page.admin.skills.meta.*`
- 默认 export `SkillsAdminClient`
- 鉴权由 `admin/layout.tsx` `gateAdminPageAccess()` 承担（与 models 一致）

### 1.3 SkillsAdminClient

**参考：** `ModelsClient.tsx`、`console/skills/SkillsClient.tsx`

| 区域 | 内容 |
| --- | --- |
| PageContainer | `ghost`；`title={t("title")}` |
| Alert | `alert.productScope`（更新文案，见 copy） |
| Toolbar | **仅** `导入 Zip`（primary）、`刷新`；**无** `新建` |
| ProTable | `request` → `GET /api/admin/skill-configs` |
| 搜索 | `toolbar.searchPlaceholder`；filter `name` contains |
| 分页 | 默认 20；`showSizeChanger` |

**API 基址：** `const API_BASE = "/api/admin/skill-configs"`

**鉴权：** `handleAdminApiAuthStatus(res.status, locale, returnPath)`

**returnPath：** `/${locale}/admin/skills`

---

## 2. ProTable 列定义

`getAdminSkillColumns(t, ctx)` — `t` 命名空间 `page.admin.skills`。

| 列 key | dataIndex | width | 渲染 |
| --- | --- | --- | --- |
| name | name | 180 | 文本 + Tooltip；**不**在名称旁叠 alwaysLoad |
| description | description | 220 | 截断 80 字；空 `—` |
| fileCount | fileCount | 88 | 0 时 `text-orange-400` |
| hasScripts | hasScripts | 100 | gold Tag + tooltip；否 `—` |
| alwaysLoad | alwaysLoad | 100 | purple Tag / `—` |
| enabled | enabled | 88 | green `启用` / default `停用` |
| updatedAt | updatedAt | 160 | `YYYY-MM-DD HH:mm`（Q19 不改 locale 格式） |
| actions | option | 200 | 见 §3 |

**移除列（相对 console）：** `assistantRefs`（引用在删除失败时展示即可）。

**排序：** 默认 `updatedAt` desc（与 console 一致）。

---

## 3. 行操作

| 操作 | 图标 | 行为 |
| --- | --- | --- |
| 详情 | `EyeOutlined` 或 `FileSearchOutlined` | 打开只读 `PackDetailDrawer` |
| 重新导入 | `ImportOutlined` | `PackImportModal` mode=`overwrite`，传入 `packId` |
| 删除 | `DeleteOutlined` | `Popconfirm` → `DELETE` |

**移除：** `编辑`（原 `EditOutlined` + 可写 Drawer）。

### 3.1 删除流

1. `Popconfirm`：`confirm.delete.title` / `description`（更新：引导至助手解绑）
2. `DELETE /api/admin/skill-configs/:id`
3. 成功：`toast.deleted` + `actionRef.reload()`
4. 失败 `SKILL_CONFIG_REFERENCED`（或等价码）：
   - **不用** Popconfirm 内展示长列表
   - `modal.error`：`deleteBlocked.title` + `deleteBlocked.body`（富文本列出助手名）
   - body 数据来自 API `referencedAssistants: { id, name }[]`

对齐 US-M6 / Q14。

---

## 4. PackDetailDrawer（只读改造）

### 4.1 Props

```typescript
type Props = {
  open: boolean;
  packId: string;
  initialHasScripts?: boolean;
  locale: string;
  adminPath: string;           // /{locale}/admin/skills
  onClose: () => void;
  onReimport: () => void;      // 打开 ImportModal overwrite
  onOpenScriptsHelp: () => void;
};
```

**移除：** `mode: "create" | "edit"`、`onSaved`、所有 draft state 写路径。

### 4.2 顶栏

| 元素 | 说明 |
| --- | --- |
| 标题 | `{meta.name}` |
| extra | `[重新导入]` Button default + `[?]` Help（脚本说明 Drawer） |
| **禁止** | Switch、保存、关闭前 unsaved 确认 |

### 4.3 元数据区（只读）

使用 `Descriptions` bordered size="small" column={2}：

| 字段 | 展示 |
| --- | --- |
| name | 文本 |
| description | 文本；空 `—` |
| enabled | Tag green/default |
| alwaysLoad | Tag purple / `—` |
| updatedAt | 格式化时间 |

下方 `Typography.Text type="secondary"`：`meta.readOnlyHint`（改 zip frontmatter 后重新导入）。

**禁止：** Input、TextArea、Switch、`保存设置`。

### 4.4 脚本 Alert

`hasScripts === true` 时展示 `alert.scriptsSandbox`（文案自 console 迁移）。

### 4.5 文件树 + 预览

| 能力 | 0.1.20 console | 0.1.21 admin |
| --- | --- | --- |
| 树展示 | ✅ | ✅ |
| 点击预览 | ✅ textarea 可编辑 | ✅ `<pre>` 只读 |
| 脚本 Badge | ✅ | ✅ |
| 新建/重命名/删除 | ✅ | ❌ |
| Save 按钮 | ✅ | ❌ |
| dirty 切换拦截 | ✅ | ❌ |
| SKILL.md 默认选中 | ✅ | ✅ |

**API：** `GET /api/admin/skill-configs/:id`、`GET .../files`、`GET .../files/:path`

**大文件：** 响应含 `truncated?: boolean` 时展示 `preview.truncated` Alert。

**加载态：** 树区 Spin；预览区 Spin。

**错误态：** `Result` status=warning + 重试按钮。

### 4.6 Help Drawer

保留 `help.scripts`；参数 `perTurn` / `perDay` 与 0.1.20 一致。

---

## 5. PackImportModal

### 5.1 Props 扩展

```typescript
type ImportMode = "create" | "overwrite";

type Props = {
  open: boolean;
  mode: ImportMode;
  packId?: string;              // overwrite 必填
  packName?: string;            // overwrite 时展示于警告
  onClose: () => void;
  onImported: (item, summary) => void;
};
```

### 5.2 UI

| mode | title key | 顶部 Alert |
| --- | --- | --- |
| create | `import.title` | 无 |
| overwrite | `import.overwriteTitle` | `import.overwriteWarning`（warning） |

overwrite 警告文案（中英见 copy）：

> 将替换技能包「{name}」内的**全部文件**。Pack id 与助手挂载关系保持不变。元数据将从 SKILL.md frontmatter 重新同步。

### 5.3 API

| mode | 请求 |
| --- | --- |
| create | `POST /api/admin/skill-configs/import` |
| overwrite | `POST /api/admin/skill-configs/import` + `packId`（form field 或 query，backend 3A 定） |

**校验：** 沿用 0.1.20（SKILL.md、大小、路径安全、文件数上限）。

**冲突：** 新建时 name 全局冲突 → 409 `SKILL_CONFIG_NAME_CONFLICT` → `import.conflict` Modal。

**成功：** `toast.imported`；若有 skipped → warning + 表；overwrite 时额外关闭详情内缓存并 reload 文件树。

### 5.4 frontmatter 同步（Q10 / 0.1.20 Q3）

导入成功时服务端从 SKILL.md YAML 同步至表字段：

| frontmatter 字段 | 表字段 |
| --- | --- |
| `name` | `name` |
| `description` | `description`（可经回退策略，§7） |
| `enabled` | `enabled`（缺省 true） |
| `alwaysLoad` | `alwaysLoad`（缺省 false） |

**UI 无 toast「已同步」**（零保存交互；列表/详情刷新即可见）。可选 P2：`toast.syncedFromFrontmatter` 仅 debug — **本期不做**。

---

## 6. 空态与边界

| 场景 | UI |
| --- | --- |
| 系统库 0 Pack | `empty.noPacks` + CTA 文案指向导入 |
| 导入 zip 无 SKILL.md | API 4xx + `import.missingSkillMd` |
| enabled=false | 列表 Tag「停用」；不出现在 catalog |
| fileCount=0 | 橙色 0；详情树空态 |
| 并发导入 | 按钮 loading 互斥 |
| 非 admin 直链 | layout redirect forbidden |

---

## 7. description 回退策略（P1 — Q22）

**时机：** import 解析 SKILL.md 后，若 frontmatter `description` 为空或仅空白。

**回退顺序：**

1. frontmatter `description`（trim 后非空）
2. SKILL.md body：首个非空、非标题行（`#` 开头跳过），截断 ≤400 字符
3. zip 顶层文件夹名（去扩展名）

**写入：** `description` 表字段；列表/详情/catalog 立即可见。

**回归：** ui-ux-pro-max 导入后 description 非空。

---

## 8. 数据模型（设计层 — backend 3A 细化）

| 字段 | 变更 |
| --- | --- |
| `userId` | **删除** |
| `name` | **全局唯一**（非 per-user） |
| `id` | 迁移保留 |
| 其余 | `description`、`enabled`、`alwaysLoad`、`fileCount`、`hasScripts` 等沿用 |

**API 列表项：**

```typescript
type AdminSkillPackListItem = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  alwaysLoad: boolean;
  fileCount: number;
  hasScripts: boolean;
  createdAt: string;
  updatedAt: string;
};
```

**删除错误体：**

```typescript
{
  code: "SKILL_CONFIG_REFERENCED";
  referencedAssistants: Array<{ id: string; name: string }>;
}
```

---

## 9. Admin API 端点（设计期望）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/admin/skill-configs` | 分页列表；admin guard |
| GET | `/api/admin/skill-configs/:id` | 单条元数据 |
| DELETE | `/api/admin/skill-configs/:id` | 删除；引用检查 |
| POST | `/api/admin/skill-configs/import` | 新建或覆盖 |
| GET | `/api/admin/skill-configs/:id/files` | 文件列表 meta |
| GET | `/api/admin/skill-configs/:id/files/*` | 单文件只读内容 |

**不提供 UI 的写端点（建议 403 或移除）：**

- `POST /api/admin/skill-configs`（空包创建）
- `PATCH /api/admin/skill-configs/:id`（元数据在线改）
- `PUT/PATCH/DELETE .../files/*`（单文件写）

---

## 10. 验收对照

| AC | 设计满足方式 |
| --- | --- |
| AC-M1-1–5 | §1–2、menu、i18n namespace |
| AC-I1-1–5 | §1.3、§5 |
| AC-I2-1–4 | §3、§4.2、§5 |
| AC-I3-1–4 | §4.5 |
| AC-I4-1–4 | §4.3 |
| AC-I5-1–3 | §2 |
| AC-I6-1–3 | §7 |
| AC-M6-1–3 | §3.1 |
| AC-4、AC-5 | §4 零保存 |

---

## 11. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-20 | 初稿 |
