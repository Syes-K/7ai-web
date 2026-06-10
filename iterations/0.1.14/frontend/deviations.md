# 设计/需求偏差 — version 0.1.14

| 项 | 原规格 | 实际实现 | 原因 |
| --- | --- | --- | --- |
| 默认 locale 检测链 | cookie → `Accept-Language` → `en`（0.1.13 / 0.1.14 设计） | cookie → **`en`**；`localeDetection: false` | 产品验收：中文浏览器首次访问应默认英文 |
| 登录表单默认 email | 设计未规定预填 | `useState(() => t("testAccount.email"))` | 与 message 单源一致，便于 en/zh 不同测试账号 |

其余按设计交付，无额外偏差。
