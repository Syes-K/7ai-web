# 首页文案对照表 — 中英双语（version 0.1.13）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.13` |
| 命名空间 | `page/home`（文件：`messages/{locale}/page/home.json`） |
| 语义源 locale | `en` |
| 上游 | `design-spec-i18n.md` §6（Hero Q5-B） |

> 每个 string 对应唯一英文 key。合规数据（邮箱、备案号）key 保留，**各 locale 值相同**。

---

## 1. Metadata

| Key | en | zh | 备注 |
| --- | --- | --- | --- |
| `meta.title` | 7AI·CLUB | 7AI·CLUB | 品牌名不翻译 |
| `meta.description` | Personal AI playground — experiment with models, prompts, and pipelines. | 个人 AI AI实验场 | |

---

## 2. 顶栏导航（PunkHomeHeader）

| Key | en | zh | 备注 |
| --- | --- | --- | --- |
| `nav.ariaLabel` | Main navigation | 主导航 | `<nav aria-label>` |
| `nav.chat` | Chat | 对话 | 链至 `/chat` |
| `nav.console` | Console | 控制台 | 链至 `/console` |
| `nav.signIn` | Sign in | 登录 | 未登录态 |

---

## 3. 语言选择器

| Key | en | zh | 备注 |
| --- | --- | --- | --- |
| `langSwitcher.ariaLabel` | Language | 语言 | 触发器 `aria-label` |
| `langSwitcher.label.en` | English | English | 下拉项 / 当前为 en 时触发器（桌面） |
| `langSwitcher.label.zh` | 中文 | 中文 | 下拉项 / 当前为 zh 时触发器（桌面） |
| `langSwitcher.label.enShort` | EN | EN | 窄屏触发器缩写 |
| `langSwitcher.label.zhShort` | 中文 | 中文 | 窄屏触发器缩写 |

---

## 4. 用户菜单（UserAvatarMenu · home variant）

| Key | en | zh | 备注 |
| --- | --- | --- | --- |
| `userMenu.ariaLabel` | User menu | 用户菜单 | 无昵称时 |
| `userMenu.ariaLabelWithName` | User menu: {name} | 用户菜单：{name} | `{name}` 为昵称或邮箱 |
| `userMenu.logout` | Sign out | 退出登录 | 下拉唯一菜单项 |

---

## 5. Hero

| Key | en | zh | 备注 |
| --- | --- | --- | --- |
| `hero.tag` | PERSONAL · AI LEARNING | PERSONAL · AI LEARNING | Punk 标签，双语共用英文 |
| `hero.title` | **CRACK THE STACK** | **解构智能** | Q5-B：英文独立 slogan；glitch 层同文案 |
| `hero.subtitle` | DECONSTRUCT · LEARN · BREAK THINGS | DECONSTRUCT · LEARN · BREAK THINGS | 全球 tagline，双语共用 |
| `hero.description` | An AI playground for models, prompts, and pipelines — play first, pitch never, break things on purpose. | AI实验场：模型、提示词、管线——只管玩，不管懂，不装腔，只折腾。 | |

---

## 6. CTA

| Key | en | zh | 备注 |
| --- | --- | --- | --- |
| `cta.chat` | Enter chat | 进入对话 | 主 CTA，链至 `/chat` |
| `cta.console` | Open console | 后台控制 | 次 CTA，链至 `/console` |

---

## 7. 特性列表

UI 展示为 `[01]` + 文案；**序号由组件渲染**，message 仅存描述句。

| Key | en | zh |
| --- | --- | --- |
| `features.01` | Streaming chat · Multi-model | 流式对话 · 多模型 |
| `features.02` | Prompts & config | 提示词与配置 |
| `features.03` | Knowledge base · Intent routing | 知识库 · 意图路由 |
| `features.04` | Assistants · Custom personas | 助手 · 指定人设 |

---

## 8. 页脚

| Key | en | zh | 备注 |
| --- | --- | --- | --- |
| `footer.sysLine` | SYS://local · learning mode · no warranty | SYS://local · learning mode · no warranty | 系统美学行，不翻译 |
| `footer.emailLabel` | Author email: | 作者邮箱： | 与邮箱拼接为 `<a>` 可见文案 |
| `footer.email` | kuangyssky@163.com | kuangyssky@163.com | **不翻译**；`mailto:` 目标 |
| `footer.icp` | 皖ICP备2026009633号-1 | 皖ICP备2026009633号-1 | **不翻译**；链至 beian.miit.gov.cn |

---

## 9. 完整 key 清单（实现校验用）

共 **28** 个 leaf key（含 `langSwitcher.label` 下 4 项）：

```
meta.title
meta.description
nav.ariaLabel
nav.chat
nav.console
nav.signIn
langSwitcher.ariaLabel
langSwitcher.label.en
langSwitcher.label.zh
langSwitcher.label.enShort
langSwitcher.label.zhShort
userMenu.ariaLabel
userMenu.ariaLabelWithName
userMenu.logout
hero.tag
hero.title
hero.subtitle
hero.description
cta.chat
cta.console
features.01
features.02
features.03
features.04
footer.sysLine
footer.emailLabel
footer.email
footer.icp
```

---

## 10. 与现网硬编码对照

| 现网位置 | 现网文案 | Key |
| --- | --- | --- |
| `page.tsx` metadata title | 7AI·CLUB | `meta.title` |
| `page.tsx` metadata description | 个人 AI AI实验场 | `meta.description` |
| PunkHomeHeader nav | 对话 / 控制台 / 登录 | `nav.*` |
| PunkLanding hero tag | PERSONAL · AI LEARNING | `hero.tag` |
| PunkLanding h1 | 解构智能 | `hero.title` |
| PunkLanding subtitle | DECONSTRUCT · LEARN · BREAK THINGS | `hero.subtitle` |
| PunkLanding 描述段 | AI实验场：… | `hero.description` |
| CTA 主/次 | 进入对话 / 后台控制 | `cta.*` |
| features [01]–[04] | 四条特性 | `features.01`–`04` |
| footer | SYS… / 作者邮箱 / 备案号 | `footer.*` |
| UserAvatarMenu | 退出登录 | `userMenu.logout` |
