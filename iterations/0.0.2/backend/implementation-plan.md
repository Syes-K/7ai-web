# 实现计划（认证域）- version 0.0.2

## 1. 文档信息

| 项 | 内容 |
| --- | --- |
| 版本 | 0.0.2 |
| 阶段 | 3A 文档规划；**3B 编码时**按本文档分步实施并回填本目录说明 |
| 约束 | **Next.js** Route Handlers / Server Actions；**TypeORM + SQLite**；**LangChain** 仅作后续对话等能力占位，本迭代不实现对话链路 |

---

## 2. 范围与影响面（渲染策略）

| 页面/路由 | 策略 | 本迭代认证工作影响 |
| --- | --- | --- |
| 首页 `/` | **SSR** | 可读取会话以展示登录态 UI；**产品默认**：首页可公开访问（FR-AUTH-007），中间件是否强制登录须与产品一致 |
| 登录 `/login`、注册 `/register` | **SSR** | 表单提交走 Route Handler 或 Server Action；成功后 `Set-Cookie` + 重定向 |
| 对话 `/chat` | **SSR** | 服务端校验会话；未登录重定向至 `/login`（带 `redirect`） |
| 控制台 `/console` | **CSR** | 客户端 `fetch` `/api/auth/me` 等同步状态；路由守卫在客户端执行，**接口层仍须校验**，防绕过 |

**控制台**：不区分 admin/user，接口与模型均无角色维度。

**LangChain**：不在本迭代引入对话存储、工具编排代码；仅在项目结构中可预留 `lib/ai/` 等目录占位（若 3B 选择完全不建空目录，则仅在 README/本文件文字说明）。

---

## 3. 分步实施顺序

### 步骤 1：数据库与迁移

1. 确认 TypeORM 数据源与 SQLite 文件路径（环境变量，不写死）。
2. 定义 **User**、**Session**（若采用表存储）、**CaptchaChallenge**（若采用表存验证码）实体。
3. 生成并执行迁移：**email** 唯一、**telNo** 可空唯一、索引与默认值。
4. 自测：重复插入 email、可空 telNo 多 NULL、冲突 case。

### 步骤 2：密码哈希

1. 选用 **bcrypt** 或 **argon2**（团队统一一种）；成本因子可配置。
2. 注册：哈希后写入 `passwordHash`；**禁止**日志打印明文密码。
3. 登录：常量时间比较或库提供安全比较；失败路径统一对外文案。

### 步骤 3：图形验证码方案

1. **生成**：服务端随机字符串（长度 4–6 可配置），绘制 PNG（或 SVG）或使用轻量库；答案 **规范化**（如转小写）后哈希存入 `CaptchaChallenge` 或内存 TTL。
2. **签发**：`GET /api/auth/captcha` 返回 `captchaId` + 图片；设置短 TTL（如 2–5 分钟）。
3. **校验**：登录/注册时比对；**成功或多次失败后**作废该 `captchaId`。
4. **刷新**：前端每次点击重新 GET；旧 id 自然过期。

### 步骤 4：会话 Cookie

1. 登录/注册成功创建 **Session** 记录，签发 Cookie（HttpOnly、Secure、SameSite、Path）。
2. 中间件或各 Route Handler 读取 Cookie → 查库/校验 → 注入 `userId`。
3. 登出：删 Session + 清除 Cookie。

### 步骤 5：Rate limit（频控）

1. 维度建议：**IP** +（可选）**email** 对登录接口。
2. 覆盖：`/api/auth/captcha`、`/api/auth/login`、`/api/auth/register`。
3. 响应：`429` + `RATE_LIMITED`；不在 body 暴露内部阈值。
4. 实现选项：内存令牌桶、或后续 Redis；单实例可先内存。

### 步骤 6：REST 接口实现

1. 按 `api-spec.md` 实现各 Route Handlers。
2. **redirect 白名单**：仅允许本站 path 列表；默认成功落地 `/`。
3. 错误码与 `message` 与 **`spec-auth-pages.md`** 文案策略对齐（登录凭证统一、注册邮箱冲突可明示）。

### 步骤 7：路由保护（Next.js）

1. **Middleware**：对 `/chat`、`/console`（及若需的其它路径）校验会话；未登录 → `/login?redirect=...`。
2. **`/`**：按产品默认**不**强制登录；若 middleware 匹配需注意排除 `/` 或静态资源。
3. **Server Actions**（若使用）：与 Handler 复用同一套鉴权/校验函数，避免重复逻辑。

### 步骤 8：与前端字段对齐

1. 请求体字段名：`email`、`password`、`passwordConfirm`、`nickName`、`telNo`、`captchaId`、`captcha`（见 `api-spec.md` §6）。
2. 服务端校验顺序建议：验证码 → 业务字段 → 密码策略 → DB 写入（注册）或凭证（登录），减少无效库访问的取舍可由实现微调，但**须**保证验证码仍占优先（防自动化）。

### 步骤 9：自测清单（3B 完成后）

- [ ] 注册成功 → Cookie → `/`、`/chat`、`/console` 可访问（在策略允许下）。
- [ ] 未登录访问 `/chat`、`/console` → 跳转登录。
- [ ] 登录错误：统一文案；注册邮箱重复：可区分文案。
- [ ] 验证码错误：与凭证错误区分；刷新后旧 captcha 失效。
- [ ] 登出 → 再访问受保护路由需重新登录。
- [ ] `redirect` 仅白名单内生效；恶意 URL 被拒绝。
- [ ] 429 可触发（可临时调低阈值测）。

---

## 4. 风险与假设

| 项 | 说明 |
| --- | --- |
| SQLite 并发 | 高并发写可能锁；认证写频率通常可接受；生产若升级 PG 另立项 |
| 验证码 OCR | 产品接受实现阶段强度；可调整干扰线与长度 |
| 多实例部署 | Session 表 + 共享 DB 可水平扩展；内存验证码需改为 DB 或 Redis |

---

## 5. 文档与代码产物（3B 时）

- 本目录可增补：`implementation-notes.md`（环境变量表、本地启动、自测命令）。
- **不**同步到 `docs/backend/`（按任务要求）。

---

## 6. 修订记录

| 版本 | 说明 |
| --- | --- |
| 0.0.2 | 初版：分步实施、SSR/CSR 影响、频控与字段对齐 |
