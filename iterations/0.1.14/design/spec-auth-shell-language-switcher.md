# AuthShell 顶栏 + LanguageSwitcher 嵌入规格（version 0.1.14）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.14` |
| 宿主 | `AuthShell` |
| 组件 | `LanguageSwitcher`（扩展） |
| 上游 | `0.1.13/spec-language-switcher.md`、`design-spec-i18n-auth.md` |
| 对应 AC | AC-A8–A11、AC-C1、AC-B9–B10 |

---

## 1. 目标

在认证页顶栏嵌入与首页**交互一致**的语言选择器，同时适配 AuthShell 较窄的 `max-w-lg` 顶栏与赛博黑配色；切换后导航至同路径另一 locale（保留 query）。

---

## 2. 顶栏布局

### 2.1 DOM 结构

```
<header> (AuthShell, border-b border-white/[0.08], px-4 py-4 sm:px-8)
  <div className="mx-auto flex max-w-lg items-center justify-between">
    <BrandMark />                    <!-- 左，shrink-0 -->
    <div className="flex items-center gap-2 sm:gap-3 shrink-0">  <!-- 右簇 -->
      <LanguageSwitcher namespace="page.login|register" />
      <Link href="/{locale}">{backToHome}</Link>
    </div>
  </div>
</header>
```

### 2.2 桌面线框（≥640px）

```
┌──────────────────────────────────────────────────────────────┐
│  7AI·CLUB                         [ English ▾ ]  Back to home │
├──────────────────────────────────────────────────────────────┤
│                        （主内容卡片）                          │
└──────────────────────────────────────────────────────────────┘
```

### 2.3 窄屏线框（<640px）

```
┌─────────────────────────────────────┐
│  7AI·CLUB        [ EN ▾ ]  Back home │  ← 右簇不换行优先；极端窄屏允许 back 文案缩短见 §5
├─────────────────────────────────────┤
│           （主内容卡片）               │
└─────────────────────────────────────┘
```

### 2.4 元素顺序（定稿）

| 顺序 | 元素 | 说明 |
| --- | --- | --- |
| 左 | `BrandMark` | 不翻译 |
| 右 1 | `LanguageSwitcher` | **在**「返回首页」**之前**（D2：品牌与导航之间） |
| 右 2 | 返回首页 `Link` | locale 感知 `href="/{locale}"` |

**与首页差异**：首页顺序为 `nav → LanguageSwitcher → Sign in`；认证页无 nav，仅语言 + 返回链接。

---

## 3. LanguageSwitcher 扩展

### 3.1 新增 Props

```typescript
type LanguageSwitcherProps = {
  /** next-intl 命名空间，默认 "page.home" */
  namespace?: "page.home" | "page.login" | "page.register";
};
```

- 认证页：`namespace="page.login"` 或 `"page.register"`。
- 文案仍从 `langSwitcher.*` 读取（各 JSON 块同值）。

### 3.2 切换行为（认证页）

| 当前 URL | 切换至 |
| --- | --- |
| `/en/login?redirect=/chat` | `/zh/login?redirect=/chat` |
| `/zh/register?redirect=/en/register` | `/en/register?redirect=/en/register` |

实现：沿用 `usePathname()` + `router.replace(pathname, { locale: target })`（next-intl navigation）；**自动保留 search params**。

### 3.3 交互（继承 0.1.13）

- 下拉 / 缩写规则、键盘、a11y、300ms 防连点 — **与首页完全一致**（见 `0.1.13/spec-language-switcher.md` §3–§6）。
- 无确认框、无 toast。

---

## 4. 视觉差异：认证页 vs 首页顶栏

| 属性 | 首页 `PunkHomeHeader` | 认证页 `AuthShell` |
| --- | --- | --- |
| 高度 | `h-14` (56px) | `py-4`（约 56–73px，随内容） |
| 边框 | `border-cyan-500/15` | `border-white/[0.08]` |
| 背景 | `bg-black/30 backdrop-blur-md` | 透明（页面渐变可见） |
| 容器宽 | 全宽 | `max-w-lg` 居中 |
| 触发器文字色 | `text-zinc-300/90` | **`text-[#9AA3B2]`**（与认证页次要文案一致） |
| 触发器 hover | `hover:text-cyan-200/90` | **`hover:text-[#00E5FF]`**（与返回链接 hover 一致） |
| 触发器基底 class | `headerActionLinkClass` | 同左（保持触控尺寸与 focus ring） |
| 下拉面板 | cyan/zinc 赛博半透明 | **同首页**（`border-cyan-500/20 bg-zinc-950/95`） |
| 返回链接 | — | `text-sm text-[#9AA3B2] hover:text-[#00E5FF]` |
| 字体 | `font-mono`（nav） | 返回链接默认 sans；LanguageSwitcher **仍用 `font-mono`** |

**设计意图**：认证页顶栏更「沉」、次要文字用 `#9AA3B2`；hover 统一青色 `#00E5FF`；下拉面板保持站点级 cyan accent 以识别为同一控件。

### 4.1 LanguageSwitcher 认证主题 class（建议）

```typescript
// 认证页传入 variant 或 className 覆盖
const authTriggerClass =
  "font-mono text-[#9AA3B2] hover:text-[#00E5FF]";
```

首页保持现网 `text-zinc-300/90 hover:text-cyan-200/90`。

---

## 5. 响应式与窄屏

| 视口 | 行为 |
| --- | --- |
| ≥640px | 触发器全称 `English` / `中文`；返回链接全文 `Back to home` / `返回首页` |
| <640px | 触发器缩写 `EN` / `中文` |
| 320px | 右簇 `gap-2`；BrandMark `text-sm`；**不**截断 BrandMark |

**英文返回链接过长**：`Back to home` 在 320px 仍优先完整显示；若溢出，允许 `text-xs` 或缩写 key `shell.backToHomeShort`（**本期不新增 key**；`Back to home` 长度可接受）。

**换行策略**：顶栏 `flex justify-between` **不换行**；右簇 `shrink-0`。与首页不同，认证页无 nav wrap 需求。

---

## 6. 返回首页链接

| 项 | 定稿 |
| --- | --- |
| href | `/{locale}`（next-intl `Link` 或 `useLocale()` 拼接） |
| 文案 key | `shell.backToHome` |
| 禁止 | `href="/"`（避免额外重定向或语言丢失） |

---

## 7. 状态说明

| 状态 | 顶栏表现 |
| --- | --- |
| 默认 | BrandMark + Switcher + 返回链接均可见 |
| 表单 loading | Switcher 可切换（不禁用整个顶栏）；`busy` 时 Switcher 自身 `aria-busy` |
| 注册 success | 同左 |
| Suspense fallback | 仅 main 区显示 `shell.loading`；顶栏仍渲染 |

---

## 8. 可访问性

| 要求 | 说明 |
| --- | --- |
| `html lang` | 由 `[locale]/layout` 设置 |
| 返回链接 | 普通 `<Link>`，无需额外 `aria-label`（可见文案已说明） |
| LanguageSwitcher | 继承 0.1.13 §6 全部 a11y 要求 |
| 焦点顺序 | BrandMark（若可聚焦）→ Switcher → 返回链接 → main 表单 |

---

## 9. 验收检查表

- [ ] `/en/login` 顶栏可见 LanguageSwitcher + `Back to home`
- [ ] `/zh/login` 切换至 `/zh` 返回中文首页
- [ ] 切换语言保留 `redirect` query
- [ ] 窄屏触发器显示 `EN` / `中文`
- [ ] 认证页触发器色为 `#9AA3B2`，hover `#00E5FF`
- [ ] 下拉面板样式与首页一致
- [ ] Tab / Enter / Esc / ↑↓ 键盘行为符合 0.1.13
- [ ] 英文标题变长不严重挤压 BrandMark
