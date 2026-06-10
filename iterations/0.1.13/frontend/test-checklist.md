# 自测清单（version 0.1.13 · i18n 首页）

| # | 项 | 期望 | 结果 |
| --- | --- | --- | --- |
| 1 | 访问 `/` | 302 → `/en` 或 `/zh`（cookie / Accept-Language） | ✅ |
| 2 | `/en` ↔ `/zh` 切换 | 首页文案全量更新 | ✅ |
| 3 | 刷新 / 再访 | 语言偏好保持 | ✅ |
| 4 | 访问 `/fr` | 302 → `/en` | ✅ |
| 5 | `/en` 首页 metadata | title / description 为英文 | ✅ |
| 6 | `html lang` | `en` → `en`；`zh` → `zh-CN` | ✅ |
| 7 | 顶栏语言选择器 | 桌面全称 / 窄屏缩写；无国旗 | ✅ |
| 8 | 从 `/en` 进 `/chat` | 仍为中文，无 banner | ✅ |
| 9 | 未登录 `/chat` | 重定向登录，无 locale 前缀 | ✅ |
| 10 | 备案 / mailto | 两种语言下可点击 | ✅ |
| 11 | `npm run build` | 通过 | ✅ |

> 注：联调基于本地 build 与开发冒烟；生产环境部署后建议复测 `/` 重定向与 cookie 行为。
