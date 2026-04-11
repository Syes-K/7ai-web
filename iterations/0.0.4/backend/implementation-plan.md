# 实现计划：提示词配置 API（3B 前准备）

**版本**：`0.0.4`  
**阶段**：**3A 文档** — 本文**不包含**具体实现代码，仅指导 3B 开发。  

---

## 1. 目标与边界

- 实现 `GET` / `PUT` **`/api/admin/prompt-config`**，读写 **`data/promptConfig.json`**，合并逻辑与 **`DEFAULT_PROMPT_CONFIG`** 对齐。
- 遵守设计：**坏文件 → Alert 数据 + 全默认展示 + 允许 PUT 修复**。
- **3B** 需在 `src/`、`app/` 下落地代码；**3A 不得改代码**。

---

## 2. 建议文件与模块划分

| 用途 | 建议路径 | 说明 |
| --- | --- | --- |
| Route Handler | `src/app/api/admin/prompt-config/route.ts` | `GET`、`PUT` 导出；`runtime = "nodejs"` |
| 合并与校验纯逻辑 | `src/server/prompt-config/merge.ts`（或 `src/server/admin/prompt-config/`） | 便于单测与对话/其他模块复用 |
| 路径解析与读写 | 同上目录 `io.ts` 或与 merge 同文件 | 集中 `fs` 与 `path`，避免 Handler 臃肿 |
| 类型 | `@/common/types` 中 `prompt-config.ts`、`prompt-param-def.ts` 等 | 经 `index.ts` 聚合导出，符合项目约定 |
| 模版校验（可选共用） | `@/common/prompt/validatePromptTemplate.ts` | PUT 与前端表单规则一致 |
| 错误响应 | 复用 `@/server/http/json-response` 的 `jsonError` | 与现有 API 一致 |

**枚举/错误码**：优先复用 `ErrorCode`、`HttpStatus`；若需 `PROMPT_CONFIG_READ_ERROR` 等，在 `@/common/enums` 扩展并在本文档与 `api-spec-prompt-config.md` 同步。

---

## 3. 路径解析：`process.cwd()` + `data/`

- 使用 **`path.join(process.cwd(), "data", "promptConfig.json")`** 作为唯一真源路径字符串。
- **假设**：应用启动时 cwd 为项目根（本地 `next dev` / 常规 Node 部署通常成立）。
- **风险**：部分托管环境 cwd 非仓库根 — 3B 应在 `implementation-notes.md` 中记录验证方式；若需可配置，可引入环境变量 `PROMPT_CONFIG_PATH`（可选，非本期必须）。

**读取**：

- `fs.promises.readFile(absolutePath, "utf8")`；文件不存在（`ENOENT`）→ 按「无文件」分支处理，**非** 500。
- 其他 IO 错误 → 500 + `INTERNAL_ERROR`（与 API 规格一致）。

---

## 4. 原子写入建议

避免写入半截 JSON 导致下次读取失败：

1. 序列化对象为 **带缩进的 JSON 字符串**（便于运维 Git diff；缩进风格与团队一致即可）。
2. 写入 **`data/` 目录下临时文件**，例如 **`promptConfig.json.tmp`** 或 **`promptConfig.<random>.tmp`**（同一目录保证 `rename` 原子性）。
3. **`fs.promises.writeFile(tmp, content, "utf8")`** 完成后，**`fs.promises.rename(tmp, finalPath)`** 覆盖目标文件。
4. Windows 上若目标已存在，`rename` 行为需验证；若不可覆盖，可采用「先删后 rename」或项目已用的跨平台封装（3B 查证 Node 版本行为）。

**并发**：整表 `PUT` + 单文件仍可能被多实例同时写；本期以「管理端串行使用」为主；若多实例部署，需在运维层避免双写或后续引入文件锁/外部存储。

---

## 5. 与运行时其他模块的一致性

- **任何**在请求处理、Server Action、或 SSR 中需要「当前生效提示词」的代码，应调用 **同一套合并函数**（例如 `loadMergedPromptConfig()`），避免：
  - Handler 一套合并、业务模块另一套硬编码读文件；
  - 合并规则与 `GET` 响应不一致导致「管理页看到的」与「对话使用的」不同。
- **缓存**：若对合并结果做内存缓存，须在 `PUT` 成功后 **失效或更新缓存**；否则出现保存成功但进程仍读旧内容。PRD 已说明文件变更后不保证全进程立即感知 — 文档化部署建议（重启或多实例一致性）即可。
- **LangChain / 对话链路**：若提示词在模块加载时读入常量，需评估是否改为每次请求读文件或读缓存；属 3B/业务侧改造范围，此处仅作提醒。

---

## 6. 鉴权实现要点（3B）

- 在 `GET`/`PUT` 开头调用 **`getCurrentUser()`**（与 `src/app/api/auth/me/route.ts` 一致）；`null` → `jsonError(UNAUTHORIZED, ..., 401)`。
- **可选**：将 `middleware.ts` 的 `matcher` 增加 `/api/admin/:path*`，仅做「有 Cookie」快速拦截，**不能**替代 Handler 内完整校验（middleware 当前对 `/admin` 也仅检查 Cookie 存在）。

---

## 7. 测试与自测清单（3B 完成后补充）

- 无文件 → `GET` 200，`fileState: ok`，内容与 `DEFAULT_PROMPT_CONFIG` 一致。
- 合法部分覆盖 → 合并字段正确。
- 损坏 JSON → `GET` 200，`fileState: invalid_json`，`PUT` 合法 body 后文件恢复、`GET` 正常。
- 未登录 → 401。
- `PUT` 缺 key、空 value、多余 key → 400。
- `PUT` 模版正文含非法 `{` 或未声明 `{参数}` → 400（与 `validatePromptTemplate` 一致）。
- 原子写：可人工在写入过程中杀进程，确认不易长期留下比坏文件更糟的状态（尽量只剩旧文件或完整新文件）。

---

## 8. 修订记录

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-04-10 | 0.0.4 | 3A：实现计划与风险点，无代码 |
| 2026-04-11 | 0.0.4 | 同步：模版校验模块与自测项 |
