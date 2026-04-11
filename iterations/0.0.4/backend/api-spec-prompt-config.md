# API 规格：提示词配置（管理端）

**版本**：`0.0.4`  
**对应需求**：`iterations/0.0.4/product/prd-prompt-management.md`  
**对应设计**：`iterations/0.0.4/design/spec-prompt-management.md`  
**技术栈**：Next.js App Router、Route Handlers、TypeScript  

---

## 1. 概述

为 `/admin/prompts` 提供「合并读取」与「整表保存写回」的 JSON API，持久化目标为项目根目录 **`data/promptConfig.json`**。权威 key 列表与默认值来源为代码常量 **`DEFAULT_PROMPT_CONFIG`**（`src/common/constants/defautPromptConfig.ts`）。

---

## 2. 建议路由

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/prompt-config` | 返回按权威 key 排序的合并后配置 + 文件级状态（供顶栏 Alert） |
| `PUT` | `/api/admin/prompt-config` | 整表保存：校验后以原子写方式覆盖/创建 `promptConfig.json` |

**路径惯例**：与现有 `src/app/api/auth/*/route.ts` 一致，本功能建议落在 **`src/app/api/admin/prompt-config/route.ts`**（`export const runtime = "nodejs"`，因需 `fs` 读写字典文件）。

**说明（与当前仓库 middleware 的关系）**：

- 页面路由 `/admin` 与 `/admin/:path*` 已在 `src/middleware.ts` 的 `matcher` 中；无 `SESSION_COOKIE` 时会重定向登录。
- **`/api/admin/*` 当前未列入 `matcher`**，浏览器携带的 Cookie 仍会随请求发送，但**不能**依赖 middleware 代做登录拦截。
- **契约要求**：本组 Route Handler **必须在处理逻辑内**调用与全站一致的会话解析（与 `GET /api/auth/me` 相同，例如 `getCurrentUser()`）；无有效会话时返回 **401**，与「管理端与现有会话对齐」一致。

---

## 3. 鉴权与权限

| 项 | 约定 |
| --- | --- |
| 会话载体 | 与全站一致：HttpOnly Cookie **`7ai_session`**（`SESSION_COOKIE`） |
| 校验方式 | 服务端读取 Cookie 并解析会话，得到当前用户；实现上与 `src/app/api/auth/me/route.ts` 对齐 |
| 未登录 | **401** + 统一错误体（见 §6） |
| 已登录非管理员 | 本期 PRD/设计：**不**单独区分角色；若未来引入「仅管理员可改配置」，可对写操作返回 **403**，错误码建议扩展或使用 `FORBIDDEN` 语义（3B 再定枚举） |
| CSRF | 若前端以 `fetch` + Cookie 同站发送，需与项目现有 admin/API 调用方式一致；3B 若新增跨站场景再补 Token 策略 |

---

## 4. `GET /api/admin/prompt-config`

### 4.1 语义

- 以 **`DEFAULT_PROMPT_CONFIG` 的 key 集合与源码定义顺序**为权威列表，逐项产出合并后的 `{ key, name, desc, value, params }`（合并规则见 `data-models.md`）。其中 **`params` 始终来自代码常量**，不由磁盘 JSON 覆盖。
- **文件不存在**：视为合法成功，合并结果全部为默认（**不**要求顶栏告警）。
- **文件存在但整文件无法解析为 JSON**：合并结果对各 key **回退为默认**；响应携带 **`fileState: "invalid_json"`**，供前端展示设计稿中的 **Alert + 仍展示表单**。
- **文件可解析但某 key 片段非法或缺字段**：该 key 在字段维度用默认补齐（**不**因单项失败导致整接口 5xx）；可选在扩展字段中携带 per-key 提示（本期可省略，由设计「非必须」项覆盖）。

### 4.2 成功响应

- **HTTP 200**
- **`Content-Type`**: `application/json; charset=utf-8`

**JSON 结构（建议）**：

```json
{
  "items": [
    {
      "key": "summarySystemPrefix",
      "name": "摘要注入前缀",
      "desc": "……",
      "value": "……",
      "params": [
        {
          "name": "content",
          "type": "string",
          "description": "摘要内容"
        }
      ]
    }
  ],
  "fileState": "ok"
}
```

**`params`**：与 `DEFAULT_PROMPT_CONFIG` 中该项的 `params` 一致；用于管理端展示与**模版占位符校验**（正文仅允许出现 `{参数名}`，且 `参数名` 须在此列表中）。

**`fileState` 枚举**：

| 值 | 含义 |
| --- | --- |
| `ok` | 文件不存在、或存在且解析成功（含「部分 key 用默认补齐」） |
| `invalid_json` | 文件存在但整文件非合法 JSON 或顶层非 object，已降级为全默认合并 |

**可选扩展**（3B 按需实现，前端可忽略）：

- `fileState === "invalid_json"` 时增加 `fileHint`（string）：短文案，供前端直接放入 Alert（具体文案可由前端固定，后端仅提供技术原因摘要）。

### 4.3 错误响应

| HTTP | 场景 | `error.code`（建议） |
| --- | --- | --- |
| 401 | 无会话或会话无效 | `UNAUTHORIZED` |
| 500 | 未捕获异常、读取文件非预期错误等 | `INTERNAL_ERROR` |

**注意**：磁盘只读、权限导致读失败等，若无法区分于「文件不存在」，可按 **500** 处理并在 `message` 中说明；与「坏 JSON」的 **200 + fileState** 区分。

---

## 5. `PUT /api/admin/prompt-config`

### 5.1 语义（整表保存写回）

- **一次请求提交全部权威 key** 的待持久化内容，与设计的「整表保存」一致，降低并发多次写文件的风险。
- 与设计默认一致：**用户仅编辑 `value`**；`name` / `desc` 的持久化取值由服务端在保存时按 **「当前合并结果中的 name/desc」** 规则计算（见 `data-models.md`），避免仅提交 `value` 时意外抹掉 JSON 里曾覆盖的 `name`/`desc`（若实现选择「永远写回默认 name/desc」须在实现说明中显式注明并与产品确认）。

- 成功后在磁盘上写入 **`data/promptConfig.json`**，顶层为 object，**key 与 `DEFAULT_PROMPT_CONFIG` 一致**，值为 `{ "name", "desc", "value" }` 片段（见 `data-models.md`）。

### 5.2 请求体（建议）

**方案 A（推荐，与 GET 对称）**：

```json
{
  "items": [
    { "key": "summarySystemPrefix", "value": "用户编辑后的正文……" }
  ]
}
```

约束：

- `items` 为数组，**必须覆盖全部权威 key**，且 **无重复 key**。
- 每项仅含 `key` + `value`（string）；**不允许**通过本接口增删 key。

**方案 B（等价）**：

```json
{
  "values": {
    "summarySystemPrefix": "……"
  }
}
```

约束：`values` 的 key 集合与权威 key 集合**完全一致**。

3B 实现任选其一并在实现说明中写死；前端对接以最终实现为准。

### 5.3 校验规则（建议）

| 规则 | 失败时 |
| --- | --- |
| JSON 体可解析 | 400 |
| 结构符合方案 A/B | 400 |
| 每个权威 key 恰好出现一次 | 400 |
| 每项 `value` 为 string，且 **trim 后非空**（与 PRD「value 非空等业务规则可按实现约定」— 本期建议非空） | 400，可附字段级信息 |
| **模版占位符**：`value` 中仅允许形如 `{paramName}` 的占位（`paramName` 为 ASCII 标识符）；去除合法占位后若仍含 `{`，或出现**未在** `DEFAULT_PROMPT_CONFIG[key].params` 中声明的参数名 → **400**，`details` 可指向该配置 key | 400 |
| 禁止额外 key | 400 |

### 5.4 成功响应

- **HTTP 200**
- Body 建议二选一（3B 定一种即可）：
  - **精简**：`{ "ok": true }`，前端再 `GET` 刷新；或
  - **与 GET 同形**：直接返回最新合并结果 + `fileState: "ok"`，减少一次往返。

### 5.5 错误响应

| HTTP | 场景 | `error.code`（建议） |
| --- | --- | --- |
| 400 | 结构/类型/缺 key/空 value | `VALIDATION_ERROR` |
| 401 | 未登录 | `UNAUTHORIZED` |
| 403 | 预留：无写权限（本期可不实现） | `FORBIDDEN` 或扩展码 |
| 500 | 磁盘写入失败、临时文件失败等 | `INTERNAL_ERROR` |

---

## 6. 统一错误体

与现有 `src/server/http/json-response.ts` 的 `jsonError` 保持一致，便于前端统一处理：

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "未登录"
  }
}
```

**字段级校验**（可选，便于表单高亮）：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "校验失败",
    "details": [
      { "field": "items[0].value", "message": "value 不能为空" }
    ]
  }
}
```

`details` 为可选扩展；3B 若不做 details，仅返回 `message` 亦可。

---

## 7. 与「合并读取 / 整表保存」的契约小结

| 能力 | 契约要点 |
| --- | --- |
| 合并读取 | 权威 key = 常量；按 key 将文件片段与默认做字段级合并；缺 key 用整项默认；坏文件 = 全默认 + `fileState: invalid_json`；**响应 `items[]` 含 `params`（仅来自常量）** |
| 整表保存 | 客户端提交全部 key 的 `value`；服务端写回完整 JSON 对象；**保存前校验 `{参数}` 占位符**；写后再次读取应与 GET 一致（在无异步外部修改前提下） |
| 鉴权 | Handler 内会话校验，与 `/api/auth/me` 同源逻辑；401 与页面 middleware 重定向并存（API 客户端不会收到 302 时） |

---

## 8. 修订记录

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-04-10 | 0.0.4 | 3A：初稿，对齐 PRD/设计与现有 auth 模式 |
| 2026-04-11 | 0.0.4 | 同步实现：`items[].params`、PUT 模版占位符校验 |
