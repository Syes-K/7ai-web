# API Spec（预留草案）- version 0.0.1

## 1. 文档定位

- 本文档属于阶段 3A（服务端文档先行）产物，仅用于定义后续版本的接口方向。
- `0.0.1` 版本不实现任何服务端 API，不进行前后端接口对接。
- 本文档中所有接口均标记为“预留（Draft）”，用于后续迭代评审与拆分。

## 2. 版本约束（0.0.1）

- 不创建任何可访问的业务接口。
- 不接入鉴权、会话、权限体系。
- 不接入模型能力调用链路。
- 不进行数据库读写。
- 四页面（首页/登录页/对话页/控制台）仅消费静态占位内容，不依赖服务端返回。

## 3. 渲染与技术策略（后续方案）

- 页面渲染策略（后续实现时遵循）：
  - 首页：SSR
  - 登录页：SSR
  - 对话页：SSR
  - 控制台：CSR
- 模型编排方案（后续实现时遵循）：LangChain。
- 数据层方案（后续实现时遵循）：TypeORM + SQLite。

## 4. 接口草案清单（全部为 Draft，0.0.1 不实现）

| 模块 | 方法 | 路径 | 说明 | 0.0.1 状态 |
| --- | --- | --- | --- | --- |
| 健康检查 | GET | `/api/health` | 服务健康探针 | 不实现 |
| 认证 | POST | `/api/auth/login` | 账号登录（会话创建） | 不实现 |
| 认证 | POST | `/api/auth/logout` | 账号登出（会话销毁） | 不实现 |
| 认证 | GET | `/api/auth/session` | 获取当前会话信息 | 不实现 |
| 对话 | POST | `/api/chat/completions` | 发起对话（可扩展流式） | 不实现 |
| 对话 | GET | `/api/chat/sessions` | 对话会话列表 | 不实现 |
| 对话 | GET | `/api/chat/sessions/:id/messages` | 会话消息列表 | 不实现 |
| 控制台 | GET | `/api/console/overview` | 控制台概览数据 | 不实现 |
| 控制台 | GET | `/api/console/config` | 配置读取 | 不实现 |
| 控制台 | PUT | `/api/console/config` | 配置更新 | 不实现 |

## 5. 接口契约示例（Draft）

### 5.1 `POST /api/auth/login`（Draft）

请求体（示例）：

```json
{
  "account": "13800138000",
  "password": "******"
}
```

请求字段约束（Draft）：

- `account`：可传邮箱或手机号；当为手机号时需满足 11 位数字。
- `password`：非空字符串。

成功响应（示例）：

```json
{
  "code": "OK",
  "data": {
    "userId": "u_123",
    "telNo": "13800138000",
    "nickName": "小安"
  }
}
```

错误码（预留）：

- `AUTH_INVALID_CREDENTIALS`
- `AUTH_ACCOUNT_DISABLED`
- `AUTH_RATE_LIMITED`
- `AUTH_TELNO_INVALID`
- `AUTH_NICKNAME_INVALID`

> 状态声明：以上仅为契约草案，`0.0.1` 不提供该接口实现。

### 5.2 `POST /api/chat/completions`（Draft）

请求体（示例）：

```json
{
  "sessionId": "s_123",
  "message": "你好",
  "stream": true
}
```

成功响应（非流式示例）：

```json
{
  "code": "OK",
  "data": {
    "reply": "这是模型回复示例",
    "messageId": "m_456"
  }
}
```

错误码（预留）：

- `CHAT_SESSION_NOT_FOUND`
- `CHAT_INPUT_INVALID`
- `CHAT_MODEL_UNAVAILABLE`

> 状态声明：后续版本若实现模型能力，统一通过 LangChain 编排；`0.0.1` 不对接。

## 6. 对前端影响说明（0.0.1）

- 前端四页面仅做静态占位渲染，不需要 API Mock 或真实请求。
- 前端禁止在 `0.0.1` 引入接口调用逻辑，避免越界实现。
- 后续版本若启用接口，以本文件更新后的“非 Draft”版本为准。
- 控制台阶段默认不区分 `admin/user`；角色分级能力在后续管理后台版本再设计。
