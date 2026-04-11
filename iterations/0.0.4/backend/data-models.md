# 数据模型：提示词配置（文件持久化）

**版本**：`0.0.4`  
**对应需求**：`iterations/0.0.4/product/prd-prompt-management.md`  
**对应设计**：`iterations/0.0.4/design/spec-prompt-management.md`  

---

## 1. 存储介质与数据库

- 本期配置持久化在 **项目根目录** 下的 JSON 文件：**`data/promptConfig.json`**。
- **无 TypeORM / SQLite 实体**：不涉及数据库表与迁移；若后续改为 DB，需另版迭代模型与 API。

---

## 2. 文件路径约定

- **逻辑路径**：`<projectRoot>/data/promptConfig.json`
- **projectRoot**：在 Next.js Node 运行时建议使用 **`process.cwd()`** 解析（与 `implementation-plan.md` 一致）。
- **版本库**：是否将 `promptConfig.json` 纳入 Git 由运维决定；PRD 建议 gitignore 或提供 example 模板。

---

## 3. `promptConfig.json` 结构

### 3.1 顶层

- 类型：**JSON Object**（非数组）。
- **Key**：与 **`DEFAULT_PROMPT_CONFIG`** 中定义的 key **同名、同集合**（当前示例含 `summarySystemPrefix`；扩展 key 仅能通过发版改常量）。
- **Value**：每个 key 对应一个 **配置片段（fragment）**。

### 3.2 配置片段（fragment）

与 PRD「单项结构约定」及常量中每项形状一致：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `name` | string | 表单项标签来源 |
| `desc` | string | Tooltip / 说明文案 |
| `value` | string | 提示词**模版**正文（可含占位符 **`{参数名}`**，与代码中 `DEFAULT_PROMPT_CONFIG[key].params[].name` 一致；原样存储） |

**文件示例**（演示结构，内容可省略）：

```json
{
  "summarySystemPrefix": {
    "name": "摘要注入前缀",
    "desc": "……",
    "value": "……\n\n{content}"
  }
}
```

### 3.3 参数声明（仅代码常量，不在 JSON 文件）

- **`DEFAULT_PROMPT_CONFIG` 每项可含 `params: { name, type, description }[]`**，用于说明该模版允许的占位符。
- **磁盘文件 `promptConfig.json` 不存储 `params`**；**GET `/api/admin/prompt-config`** 的 `items[]` 在合并后的 `name`/`desc`/`value` 之外，**附加**来自常量的 **`params`**，供 UI 展示 Tag/Tooltip 及与 `{参数名}` 校验一致。

### 3.4 与 TypeScript 类型的对齐说明

| 概念 | TypeScript 侧 |
| --- | --- |
| 权威 key 列表 | `keyof typeof DEFAULT_PROMPT_CONFIG` 或显式 `PromptConfigKey` 与常量同步 |
| 单项形状（合并/文件） | `PromptConfigFragment = { name: string; desc: string; value: string }` |
| 参数定义 | `PromptParamDef`（见 `@/common/types/prompt-param-def.ts`） |
| 完整常量类型 | `DEFAULT_PROMPT_CONFIG` 每项含 `params` |
| 文件顶层类型 | `Record<PromptConfigKey, PromptConfigFragment>`（写入时保证键齐全） |
| API 单项（含 key + params） | `PromptConfigApiItem`：`PromptConfigFragment & { key; params: PromptParamDef[] }` |

**约束**：运行时 **不得** 在服务端手写与常量漂移的 key 列表；应以 `DEFAULT_PROMPT_CONFIG` 为单一数据源迭代 key。

---

## 4. 合并读取算法（与设计 / PRD 一致）

### 4.1 输入

- `defaults`：`DEFAULT_PROMPT_CONFIG`（对象）
- `fileJson`：自磁盘读取并 **JSON.parse** 的结果；或表示「文件不存在」；或表示「整文件解析失败」

### 4.2 输出

- `merged`：对每个权威 key，`PromptConfigFragment`
- `fileState`：`ok` | `invalid_json`（语义同 `api-spec-prompt-config.md`）

### 4.3 步骤（伪代码）

```
function mergePromptConfig(defaults, fileRaw: string | null, fileReadError: Error | null):
  authoritativeKeys = orderedKeys(defaults)   // 与常量对象定义顺序一致

  if fileRaw === null:  // 文件不存在
    merged = { for k in authoritativeKeys: deepCopy(defaults[k]) }
    return { merged, fileState: "ok" }

  let fileObj
  try:
    fileObj = JSON.parse(fileRaw)
  catch:
    merged = { for k in authoritativeKeys: deepCopy(defaults[k]) }
    return { merged, fileState: "invalid_json" }

  if fileObj is not plain object:
    merged = { for k in authoritativeKeys: deepCopy(defaults[k]) }
    return { merged, fileState: "invalid_json" }

  merged = {}
  for k in authoritativeKeys:
    defFrag = defaults[k]
    if k not in fileObj:
      merged[k] = deepCopy(defFrag)
      continue
    rawFrag = fileObj[k]
    if rawFrag is not plain object:
      merged[k] = deepCopy(defFrag)
      continue
    merged[k] = {
      name:  isNonEmptyString(rawFrag.name)  ? rawFrag.name  : defFrag.name,
      desc:  isNonEmptyString(rawFrag.desc)  ? rawFrag.desc  : defFrag.desc,
      value: isNonEmptyString(rawFrag.value) ? rawFrag.value : defFrag.value,
    }
    // 说明：若产品要求「空字符串也覆盖默认」，3B 需调整 isNonEmptyString 语义并与产品确认

  return { merged, fileState: "ok" }
```

**字段级覆盖（PRD F1）**：文件某 key 存在且为 object 时，对 `name`/`desc`/`value` **分别**判断：合法非空则用文件值，否则该字段回落到默认值。这样「某 key 对象缺少某字段」不会导致整表失败（US-3 AC2）。

**整文件坏（设计默认）**：`invalid_json` 时 `merged` 全部为默认；前端 **Alert + 仍展示表单 + 允许保存修复**（见 §5）。

### 4.4 `isNonEmptyString` 的默认建议

- **本期建议**：`trim` 后长度 > 0 视为合法；否则视为缺失，用默认字段补齐。
- 若 `value` 业务上允许仅空白，需产品明确后再改规则。

---

## 5. 坏文件策略（与设计 §2.7 / §4 一致）

| 场景 | 行为 |
| --- | --- |
| 文件不存在 | `fileState: ok`，全部默认 |
| 顶层非 object / `JSON.parse` 抛错 | `fileState: invalid_json`，合并结果全默认；**仍允许**用户通过 `PUT` 写入合法新文件覆盖（修复） |
| 某 key 类型不对（非 object） | 该 key 整项用默认；`fileState` 仍为 `ok` |
| 某 key 内字段非法 | 该字段单独回默认；`fileState: ok` |

**与「禁止保存直至运维修复」的替代策略**：若产品改确认，API 需在 `invalid_json` 时对 `PUT` 返回 **403/423** 等并在文档中更新；**当前 0.0.4 设计默认**为允许保存修复。

---

## 6. 保存写回时的片段构造（与 API 契约配合）

在客户端**仅提交各 key 的 `value`**（设计默认）时，服务端持久化到文件的每个片段建议为：

```
for k in authoritativeKeys:
  fragment[k].value = requestValue[k]   // 已校验非空等
  fragment[k].name = mergedBeforeSave[k].name
  fragment[k].desc = mergedBeforeSave[k].desc
```

其中 `mergedBeforeSave` 为**写盘前**对「当前磁盘文件 + defaults」再跑一遍 §4 合并的结果（若刚发生 `invalid_json`，则等价于全默认的 name/desc）。这样：

- 不会在保存时把 JSON 里曾自定义的 `name`/`desc` 静默改回常量（除非合并结果本身已是默认）。
- 用户改的 `value` 一定落盘。

**替代实现（需产品确认）**：每次写盘 `name`/`desc` 一律取自 `defaults`，则文件侧对 name/desc 的覆盖会在保存后被抹掉——**不推荐**，除非产品明确要求「展示可来自文件，保存后统一回默认文案」。

---

## 7. 修订记录

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-04-10 | 0.0.4 | 3A：文件模型、类型对齐、合并与坏文件策略 |
| 2026-04-11 | 0.0.4 | 同步实现：`params` 仅常量、API 返回、`{参数}` 占位符；节号调整（原 3.3→3.4） |
