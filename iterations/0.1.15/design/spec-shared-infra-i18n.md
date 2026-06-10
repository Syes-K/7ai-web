# 共享 i18n 基础设施设计（version 0.1.15）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.15` |
| 范围 | antd/dayjs 动态 locale、ConfirmProvider、modal-shell、UserAvatarMenu shell、ConsoleForbiddenNotice、withReadOnlyApi |
| 下游 | 0.1.16 ConsoleShell / 0.1.17 AdminShell 直接复用 |
| message | `messages/{locale}/page/shell.json` → 命名空间 `page.shell` |

---

## 1. antd / dayjs 动态 locale（US-A1）

### 1.1 映射工具（设计定稿）

新增 `src/common/utils/antd-locale.ts`（或 `src/i18n/antd-dayjs.ts`）：

```typescript
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import type { AppLocale } from "@/common/constants/i18n";

export function getAntdLocale(locale: AppLocale) {
  return locale === "zh" ? zhCN : enUS;
}

export function getDayjsLocaleName(locale: AppLocale): string {
  return locale === "zh" ? "zh-cn" : "en";
}
```

### 1.2 接入模式

| 消费者 | 方式 |
| --- | --- |
| `[locale]/layout.tsx` | 已有 `ConfigProvider locale={getAntdLocale(locale)}` |
| dayjs | layout 内 client 子组件 `DayjsLocaleSync`：`useEffect(() => dayjs.locale(getDayjsLocaleName(locale)), [locale])` |
| Chat | 继承 layout，无额外包裹 |
| ConsoleShell / AdminShell | **0.1.16/17** 移除硬编码 `zhCN` + `dayjs.locale('zh-cn')`，改用上述工具 |

### 1.3 验收（Chat 子树）

- Modal 默认按钮若走 antd（当前 Confirm 为自定义，不受影响）
- `UserAvatarMenu` Dropdown 内置 aria 随 `ConfigProvider`
- 切换 `/en/chat` ↔ `/zh/chat` 后 dayjs 格式化（若 chat 侧栏日期未来改用 dayjs）与 locale 一致

---

## 2. ConfirmProvider / confirm / modal-shell（US-C1）

### 2.1 现状

| 文件 | 硬编码中文 |
| --- | --- |
| `ConfirmProvider.tsx` | 默认 title `确认操作`；按钮 `取消` / `确定` |
| `modal-shell.tsx` | 遮罩 `aria-label="关闭"` |

Chat 调用处传入具体 `title` / `content` / `okText` / `cancelText`（改读 `page.chat.confirm.*`）。

### 2.2 设计定稿

**ConfirmProvider** 改为 client 组件内 `useTranslations('page.shell')`：

| 用途 | key | en | zh |
| --- | --- | --- | --- |
| 默认标题 | `confirm.defaultTitle` | Confirm action | 确认操作 |
| 默认取消 | `confirm.cancel` | Cancel | 取消 |
| 默认确定 | `confirm.ok` | OK | 确定 |

调用方传入的 `options.title` / `okText` / `cancelText` **优先**于默认值。

**modal-shell.tsx：**

| key | en | zh |
| --- | --- | --- |
| `modal.closeOverlay` | Close | 关闭 |

实现：`ModalShell` 增加可选 prop `closeAriaLabel`；默认从 `page.shell` 读取（需 client wrapper 或 prop drilling from ConfirmProvider）。

### 2.3 与 Chat 危险操作

Chat 删除/清空须显式传入 `page.chat.confirm.*`（见 `copy-chat-en-zh.md` §6），**不**依赖 shell 默认标题。

---

## 3. UserAvatarMenu — shell 变体（US-B1）

### 3.1 现状

`variant="shell"` 默认 `logoutLabel="退出登录"`，`aria-label` 中文模板。

### 3.2 设计定稿

| 项 | home（0.1.13） | shell（0.1.15+） |
| --- | --- | --- |
| logout | `page.home.userMenu.logout` | `page.shell.userMenu.logout` |
| aria | `page.home.userMenu.ariaLabel*` | `page.shell.userMenu.ariaLabel*` |
| 登出后跳转 | `router.refresh()` | `router.replace(\`/${locale}/login\`)`（**locale 感知**） |

**实现要点：**

- shell 变体使用 `useLocale()` + `useTranslations('page.shell')`
- home 变体行为不变
- Chat 顶栏本期可不挂载；ConsoleShell 0.1.16 挂载

### 3.3 message（`page.shell.userMenu`）

| key | en | zh |
| --- | --- | --- |
| `logout` | Sign out | 退出登录 |
| `ariaLabel` | User menu | 用户菜单 |
| `ariaLabelWithName` | User menu: {name} | 用户菜单：{name} |

---

## 4. ConsoleForbiddenNotice（US-D1）

### 4.1 文案 key（`page.shell.forbiddenNotice`）

| key | en | zh |
| --- | --- | --- |
| `body` | Your account is not on the admin allowlist, so you cannot access system administration. To request access, ask an administrator to configure | 当前账号不在管理后台白名单中，无法进入系统管理。如需权限请联系管理员配置 |
| `bodySuffix` | . | 。 |
| `stayOnPage` | Stay on this page | 留在当前页 |
| `dismiss` | Got it | 知道了 |

**`ADMIN_USER`：** 字面量不译，保持 `<code>ADMIN_USER</code>`。

### 4.2 dismiss 行为

`router.replace(pathname)` 应 **strip `notice=admin_forbidden`** query（现网行为保留）；LanguageSwitcher 切换时 **保留** 其它 query（Q5-A），但若用户已 dismiss 则不再显示。

### 4.3 挂载点

`ConsoleShell` 内（console 未 i18n 前组件可先双语）；0.1.15 仅组件文案就绪。

---

## 5. withReadOnlyApi（US-F1）

见 `spec-api-message-chat.md` §4。

| 项 | 定稿 |
| --- | --- |
| ErrorCode | `FORBIDDEN` |
| key | `readOnlyAccountBlocked` |
| locale | `resolveRequestLocale(req)` |

---

## 6. LanguageSwitcher 扩展（US-E1）

| 项 | 0.1.15 | 0.1.16+ |
| --- | --- | --- |
| Chat 顶栏 | `namespace="page.chat"` `variant="shell"` | — |
| ConsoleShell actionsRender | — | 同 shell variant |
| AdminShell | — | 0.1.17 |

各页 JSON 均含完整 `langSwitcher.*` 块（与 0.1.14 auth 模式一致）。

---

## 7. message 文件 — `page/shell.json`

```json
{
  "confirm": {
    "defaultTitle": "Confirm action",
    "ok": "OK",
    "cancel": "Cancel"
  },
  "modal": {
    "closeOverlay": "Close"
  },
  "userMenu": {
    "logout": "Sign out",
    "ariaLabel": "User menu",
    "ariaLabelWithName": "User menu: {name}"
  },
  "forbiddenNotice": {
    "body": "Your account is not on the admin allowlist, so you cannot access system administration. To request access, ask an administrator to configure",
    "bodySuffix": ".",
    "stayOnPage": "Stay on this page",
    "dismiss": "Got it"
  }
}
```

**zh** 对称（见 `copy-chat-en-zh.md` 未单列 shell 时以本文件为准）。

### 7.1 `src/i18n/request.ts`

并行 import `page/shell.json` → `page.shell`。

### 7.2 与 `page.home.userMenu` 关系

home 与 shell **值相同、key 独立**（避免 chat/console 加载 home message）。后续可考虑抽 `common` 命名空间（非本期）。

---

## 8. Console/Admin Shell 预留（0.1.16+）

| 文案 | 建议 key（未来 `page/console/shell.json`） |
| --- | --- |
| 控制台标题 | `shell.title` |
| 验证会话 loading | `shell.verifyingSession` |
| Skip link | `shell.skipToMain` |
| 顶栏「对话」 | `shell.nav.chat` |

0.1.15 仅在本文档记录，**不**创建 console message 文件。

---

## 9. 验收检查表

- [ ] `/en/chat` 删除确认：按钮 Cancel / OK 或自定义 Delete 为英文
- [ ] Confirm 默认 title 英文（若调用方未传 title 的其它页）
- [ ] `UserAvatarMenu` shell + `/en/console`：Sign out 英文
- [ ] `ConsoleForbiddenNotice` 在 `?notice=admin_forbidden` 下英文
- [ ] 只读写 API 返回英文 `readOnlyAccountBlocked`
- [ ] layout 切换 locale 后 `getAntdLocale` / dayjs 同步（冒烟）
