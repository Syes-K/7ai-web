# 前端实现说明（version 0.1.13 · i18n 首页）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.13` |
| 状态 | **已完成** |
| 范围 | 首页双语 + 顶栏语言选择器 |

## 组件变更

| 文件 | 说明 |
| --- | --- |
| `src/components/home/PunkLanding.tsx` | RSC + `getTranslations('page.home')` |
| `src/components/home/PunkHomeHeader.tsx` | Client + `useTranslations`；嵌入 `LanguageSwitcher`；登录 `redirect=/{locale}` |
| `src/components/home/LanguageSwitcher.tsx` | **新建**；下拉切换；`router.replace(pathname, { locale })` |
| `src/components/user/UserAvatarMenu.tsx` | 新增 `logoutLabel` / `ariaLabel` props（home variant i18n） |
| `src/components/i18n/LocaleHtmlLang.tsx` | **新建**；同步 `document.documentElement.lang` |

## 设计对齐

- 语言选择器位于 nav 与登录/头像之间
- 桌面全称 / 窄屏缩写（`EN` / `中文`）
- Hero 英文 slogan：`CRACK THE STACK`
- features `[01]`–`[04]` 序号在组件内渲染

## 布局与视觉（实现后微调）

- Hero **居中** + features **贴底**（`flex-1` + `mt-auto`）
- 英文描述：单行 punch line + mono 弱化
- 全站 `::selection` cyan 主题色；首页 hero 描述 fuchsia 选中态

## 偏差

无。

## 自测清单

见 [`test-checklist.md`](test-checklist.md)（均已通过 build / 冒烟）。
