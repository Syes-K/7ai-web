# 风险与开放项 — i18n 服务端/架构（version 0.1.13）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.13` |
| 阶段 | 3A 文档 |

---

## 1. 风险登记

| ID | 风险 | 影响 | 概率 | 缓解措施 | 责任阶段 |
| --- | --- | --- | --- | --- | --- |
| **R1** | 现网 `middleware.ts` 多次赋值 `res`，末尾 `NextResponse.next()` **覆盖** redirect/401 | auth 守卫失效或与 i18n 合并后行为不可预测 | 高 | 3B **重构为 early return**；合并前补冒烟测试 `/chat` 无 session | 3B Backend |
| **R2** | matcher 过宽导致 `/login`、`/api/*` 被 i18n rewrite | API 404、登录页异常 | 中 | 函数体内 `isProtectedPath` / `isI18nPath` 双判断；matcher 排除 `login` | 3B Backend |
| **R3** | 非法 locale 与合法单 segment 路由冲突（如未来新增 `/docs`） | 误 302 至 `/en` | 低 | 非法 locale 正则不匹配已知应用路由；新路由加入排除列表 | 3B+ |
| **R4** | 双层 `<html lang>`（根 layout + `[locale]` layout） | 校验失败或 SEO/a11y 信号错误 | 中 | 按 next-intl 官方示例调整根/`[locale]` layout 职责 | 3B |
| **R5** | 首页英文 Hero 较长导致 glitch 层溢出 | 视觉回归 | 低 | 设计已要求真机验证；不缩小字号 | 3B Frontend |
| **R6** | 用户 `/en` 进 `/chat` 仍为中文（Q4-A 静默） | 体验困惑、支持咨询 | 中 | PRD 非目标；文档说明；后续迭代迁移 `/chat` | 产品 |
| **R7** | `UserAvatarMenu` antd 内置中文与英文首页混排 | 菜单项语言不一致 | 中 | `[locale]/layout` 局部 `ConfigProvider locale={enUS\|zhCN}` | 3B Frontend |
| **R8** | 无自动化测试基线 | middleware 回归难发现 | 中 | 3B 至少 curl/Playwright 覆盖 T1–T9（见 implementation-plan §8） | 3B |
| **R9** | next-intl 大版本升级 API 变动 | 升级成本 | 低 | 锁定 `^4.13.0`；升级前读 CHANGELOG | 运维 |
| **R10** | CDN/反向代理缓存 `/` 302 | 错误 locale 被缓存 | 低 | `/` 302 带 `Vary: Accept-Language, Cookie`（若 CDN 支持） | 部署 |

---

## 2. 开放项（须 3B 前或实现中确认）

### 2.1 产品决策（open-questions.md 对照）

| 编号 | 议题 | 文档采用 | 用户确认状态 | 3B 前须确认 |
| --- | --- | --- | --- | --- |
| **Q1** | 仅首页 vs 含登录页 | **A — 仅首页** | ✅ 已确认 | 否 |
| **Q2** | 默认语言策略 | **C — cookie/URL → Accept-Language → `en`** | ✅ 已确认 | 否 |
| **Q3** | URL 形态 | **A — locale 前缀 + cookie** | ⚠️ 设计定稿，确认表未签字 | **建议用户口头确认** |
| **Q4** | 跨页静默 vs banner | **A — 静默** | ⚠️ 设计定稿，确认表未签字 | **建议用户口头确认** |
| **Q5** | Hero 英文策略 | **B — 独立 slogan** | 设计定稿 | 否（设计 copy 已出） |
| **Q6** | 语言选择器形式 | **C/A — 下拉/缩写** | 设计定稿 | 否 |
| **Q12** | hreflang / canonical | 本期可选 | 未决 | 否（不阻塞） |

**3B 门控建议**：若用户对 **Q3-A（/en、/zh 前缀）** 或 **Q4-A（静默跨页）** 有异议，须在代码编写前回溯 PRD/设计。

### 2.2 技术实现待决（3B 首 Sprint）

| ID | 议题 | 选项 | 建议 |
| --- | --- | --- | --- |
| **T1** | matcher 策略 | A. 显式列举 i18n + auth<br>B. next-intl 全局 matcher + 函数内排除 | **A** 与现网 auth 范围更易推理 |
| **T2** | 根 layout 结构 | A. 根 layout 无 `<html>`，仅 `[locale]` 输出<br>B. 根保留 `<html>`，`[locale]` 只包 body 内容 | 按 next-intl App Router 官方示例 **择一并文档化** |
| **T3** | message 组装 | A. 单文件 merge 至 nested object<br>B. next-intl 多 namespace import | **B** 与 PRD 文件拆分一致 |
| **T4** | middleware 单测 | Vitest edge / Playwright | 资源允许时 **Vitest** 测纯函数；否则 Playwright 冒烟 |
| **T5** | 非法 locale 实现 | A. middleware 前置 regex<br>B. 依赖 next-intl 默认 | **A** 以满足 302 `/en`（非 404） |

### 2.3 与设计/前端交接项

| 项 | 说明 |
| --- | --- |
| 登录 `redirect` | 统一为 `/{locale}`，非 `/`（避免二次 302） |
| LanguageSwitcher | Client 写 cookie 与 middleware 命名一致 |
| features `[01]` 前缀 | 组件渲染，非 message |
| 英文 metadata | 与 `copy-home-en-zh.md` 一致 |

---

## 3. 本期明确不做（避免范围蔓延）

| 项 | 说明 |
| --- | --- |
| API 错误 message i18n | `jsonError` 仍中文；`api/message.json` 仅占位 |
| 账号级语言字段 | 无 User 表字段、无 sync API |
| `/en/chat` 等假双语 URL | 不实现 |
| Geo/IP 语言推断 | 非目标 |
| 第三语言 / RTL | 非目标 |
| 全站 hreflang | 可选增强 |
| 翻译管理平台 | 非目标 |
| ConsoleShell / AdminShell 动态 locale | 后续迭代 |

---

## 4. 3B 实现后须补充的文档

| 文档 | 内容 |
| --- | --- |
| `iterations/0.1.13/backend/implementation-notes.md` | 实际 matcher、layout 结构、与本文差异 |
| `iterations/0.1.13/frontend/implementation-notes.md` | 组件改造、antd 接入（Frontend 阶段） |

---

## 5. 回滚策略

| 场景 | 动作 |
| --- | --- |
| i18n 上线严重阻塞 |  revert `middleware.ts` matcher 至现网；恢复 `app/page.tsx`；移除 `[locale]` 树 |
| 仅 middleware 缺陷 | 临时禁用 i18n 分支，保留 auth |
| cookie 问题 | 客户端可手动访问 `/zh` 或 `/en` 绕过 `/` 重定向 |

---

## 6. 关联文档

- `implementation-plan.md`
- `api-spec.md`
- `data-models.md`
- `../product/open-questions.md`
