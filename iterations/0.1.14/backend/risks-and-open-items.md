# 风险与开放项 — i18n 认证 API（version 0.1.14）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.14` |
| 阶段 | 3A 文档 |

---

## 1. 风险登记

| ID | 风险 | 影响 | 概率 | 缓解措施 | 责任 |
| --- | --- | --- | --- | --- | --- |
| **R1** | middleware 旧路径 302 与 next-intl / 旧 page 冲突 | `/login` 404 或双重重定向 | 中 | 302 放在 `isI18nPath` 之前；matcher 显式含 `/login`；删除旧 page 或薄 redirect | 3B Backend |
| **R2** | `tApiMessage` 在 Edge 不可用（动态 import / Node API） | middleware 500 | 中 | 静态 import JSON；3B 验证 Edge 构建 | 3B Backend |
| **R3** | API locale 与 UI 不同步（未带 cookie） | 英文页显示中文错误 | 中 | 文档强调 `credentials: 'include'`；认证 fetch 审计 | Frontend |
| **R4** | `requireAdminApi` 用 `headers()` 无 Request 上下文 | 偶发默认 en | 低 | Route Handler 内必有 headers；单测 admin API | 3B Backend |
| **R5** | ICU plural 配置错误 | `1 minutes` 语法错误 | 低 | 验收 A4/A5；对照 design §3 | 3B Backend |
| **R6** | 登录 redirect 丢 query | 登录后回错页 | 中 | M2 专项；`url.search = search` 保留完整 query | 3B Backend |
| **R7** | 移除 `login` from `KNOWN_APP_SEGMENTS` 后 `/login` 被误判非法 locale | 302 `/en` 而非 `/en/login` | 低 | 旧路径分支在 illegal locale **之后**、且 `/login` 非 illegal | 3B Backend |
| **R8** | `validateNickName` 等与 register 双轨（util 中文 vs route key） | 控制台与注册行为漂移 | 低 | register route **不**透传 util 字符串；文档明确 | 3B Backend |
| **R9** | 非认证 API 仍为中文 | 英文用户进 chat/console 见中文错误 | 中 | PRD 非目标；0.1.15+ 扩展 | 产品 |
| **R10** | message JSON 与代码 key 漂移 | 运行时回退 en 或裸 key | 中 | 设计终稿为 SSOT；3B 对照表自检 | 3B Backend |

---

## 2. 技术债

### 2.1 `map*ApiError` 依赖 message 子串（Q4-B 已知限制）

**现状**（`src/components/auth/map-api-errors.ts`）：

| 函数 | 依赖 |
| --- | --- |
| `mapLoginApiError` | `VALIDATION_ERROR` 仅匹配中文「邮箱」 |
| `mapRegisterApiError` | `mapRegisterValidationMessage` 大量中文 keyword |

**本期 Frontend 须补强**（design §4.2）：

- login：`VALIDATION_ERROR` + `email`/`password` 英文 keyword
- register：增加 `mismatch`、`phone`、`display name` 等英文 keyword

**仍可能落入 `general` 的 case**：

- 英文注册校验若 keyword 未命中
- 未来新增 validation key 未同步 mapper

**清理计划（0.1.15+）**：

| 阶段 | 目标 |
| --- | --- |
| 0.1.15 | chat 壳层 API 双语；评估 `error.details[].field` |
| 0.1.16+ | 控制台 API；`map*ApiError` 改为 **纯 code** 或 `details[].field` |
| 长期 | 后端 validation 返回 `{ field, messageKey }`；废弃 message 子串 |

### 2.2 `validatePasswordPolicy` 双轨

| 消费方 | message 来源 |
| --- | --- |
| `/api/auth/register` | `tApiMessage(validation.*)` |
| `/api/console/profile/personal` 等 | util 中文字符串 |

**债**：同一规则两处维护。**0.1.16+** 控制台 API 双语时统一为 key 驱动。

### 2.3 `FORBIDDEN` 语义复用

| 场景 | message key | 中文差异 |
| --- | --- | --- |
| 注册非管理员 | `authAdminOnly` | 仅管理员可创建账号 |
| `requireAdminApi` | `forbidden` | 无管理员权限 vs 无权访问该资源 |

**债**：同 ErrorCode 多文案靠调用方选 key，无集中枚举。**可接受**至控制台全量 i18n 时再引入 `ErrorCode` 细分或 `messageKey` 响应字段（Q10 扩展）。

### 2.4 `readApiErrorPayload` 未扩展（Q10）

客户端无法按 `messageKey` 二次翻译；依赖服务端 message 正确。

**0.1.15+ 扩展点**：

```typescript
type ApiErrorPayload = {
  code?: string;
  message: string;
  messageKey?: string;   // 未来
  params?: Record<string, string | number>;  // 未来
  details?: ...;
};
```

---

## 3. 0.1.15+ 扩展点

### 3.1 建议下一批 Backend 范围

| 批次 | 内容 |
| --- | --- |
| **0.1.15** | `/chat` 相关 API 错误双语；`with-readonly-api` message；middleware 只读拦截 |
| **0.1.16+** | `/api/console/*` 业务错误；antd 动态 locale 配套 |
| **低优先级** | `/api/admin/*` 业务错误（内部工具） |

### 3.2 复用模式（供后续迭代）

1. 在 `api/message.json` 增加 key。
2. Route / middleware 调用 `tApiMessage(locale, key)`。
3. 前端继续展示 `error.message`（至 Q10 扩展启用前）。
4. `map*ApiError` 优先 `code` 映射字段。

### 3.3 路由扩展

| 项 | 说明 |
| --- | --- |
| `/chat` 迁入 `[locale]` | 与 login 同模式；middleware KNOWN_APP_SEGMENTS 调整 |
| 共享 `resolveRequestLocale` | 已就绪，API 与 middleware 共用 |

### 3.4 可选增强（非阻塞）

| 项 | 说明 |
| --- | --- |
| `messageKey` + `params` 响应 | 控制台 antd 表格批量错误 |
| Vitest 覆盖 `localeFromAcceptLanguage` | 防回归 |
| 共享 `common.langSwitcher` namespace | 减少三处重复 key |
| CDN `Vary: Accept-Language, Cookie` | `/` 与 `/login` 302 缓存 |

---

## 4. 开放项（3B 前确认）

| ID | 议题 | 状态 | 说明 |
| --- | --- | --- | --- |
| **O1** | Q1–Q11 产品/设计决策 | ✅ 已确认 | 见 `../product/open-questions.md` |
| **O2** | `tApiMessage` 实现方案 A/B | 建议 A（next-intl createTranslator） | 3B 首 PR 定稿 |
| **O3** | 旧 `app/login/page.tsx` 删除 vs redirect | middleware 302 优先 | Frontend/Backend 协调 |
| **O4** | Q12 0.1.15 范围 | 待定 | 不阻塞 0.1.14 |

---

## 5. 本期明确不做

| 项 | 说明 |
| --- | --- |
| `error.messageKey` 响应字段 | Q10 |
| 非认证 API 双语 | PRD 非目标 |
| User 表语言字段 | 非目标 |
| 重构 `map*ApiError` 为纯 code | Q4-B 渐进 |
| Geo/IP 语言推断 | 非目标 |

---

## 6. 回滚策略

| 场景 | 动作 |
| --- | --- |
| API 双语导致生产问题 | revert auth route + `tApiMessage`；message 可保留 |
| middleware 302 异常 | revert `middleware.ts` 至 0.1.13；恢复 `KNOWN_APP_SEGMENTS` 含 login/register |
| 仅英文 message 错误 | 临时固定 locale=`zh`（**不推荐**，仅应急） |

---

## 7. 3B 实现后须补充

| 文档 | 内容 |
| --- | --- |
| `iterations/0.1.14/backend/implementation-notes.md` | 实际 `tApiMessage` 方案、Edge 验证、与本文差异 |
| `iterations/0.1.14/frontend/implementation-notes.md` | Frontend 阶段 |

---

## 8. 关联文档

- `implementation-plan.md`
- `api-spec.md`
- `data-models.md`
- `../product/open-questions.md`
- `../design/spec-api-message-auth.md` §4.3 技术债
