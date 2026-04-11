# 服务端实现说明：提示词模版 / 配置 API（0.0.4 · 3B）

## 代码位置

| 用途 | 路径 |
| --- | --- |
| Route Handler | `src/app/api/admin/prompt-config/route.ts` |
| 合并逻辑 | `src/server/prompt-config/merge.ts` |
| 文件 IO | `src/server/prompt-config/io.ts` |
| 对外加载入口 | `src/server/prompt-config/index.ts` → `loadMergedPromptConfig()` |
| 类型 | `src/common/types/prompt-config.ts`、`prompt-param-def.ts` |
| 模版占位符校验 | `src/common/prompt/validatePromptTemplate.ts`（PUT 与前端共用） |
| 统一错误体扩展 | `src/server/http/json-response.ts`（可选 `details` 数组） |

## 行为摘要

- **GET**：`readPromptConfigFile` → `mergePromptConfigFromFile` → `mergedToApiItems`（为每项附加 **`params`**，来自 `DEFAULT_PROMPT_CONFIG`）→ `items` + `fileState`；`invalid_json` 时附 `fileHint`。
- **PUT**：校验 `items` 与权威 key 一一对应、`value` trim 非空；对每项调用 **`validatePromptTemplate(value, DEFAULT_PROMPT_CONFIG[k].params)`**（仅允许 `{参数名}`，且须在声明列表中）；合并当前磁盘得到 `name`/`desc`，写入完整对象；原子写临时文件后 `rename`；响应体与 GET 同形。
- **鉴权**：`getCurrentUser()`，未登录 401；`/api/admin/*` 仍不在 middleware matcher 内，由 Handler 负责校验。

## 自测建议

1. 无 `data/promptConfig.json`：GET 为默认，`fileState: ok`。
2. 合法 JSON 部分覆盖：字段级合并正确。
3. 损坏 JSON：GET `invalid_json` + Alert 文案；PUT 成功后文件恢复。
4. 未登录：GET/PUT 均 401。
5. PUT 缺 key、空 value、多余字段：400。
6. PUT `value` 含非法占位或未声明 `{参数}`：400，`details` 带配置 key。

## 部署注意

- 持久化路径为 `path.join(process.cwd(), "data", "promptConfig.json")`；根目录 `/data/` 已在 `.gitignore`。
- 多实例同时写入仍可能竞态，与 3A 文档一致，以管理端串行使用为主。

## 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-04-11 | 同步：`params` 响应、模版校验、共用 `validatePromptTemplate` |
