# 控制台文案对照表 — Skill Pack 增强增量（version 0.1.20）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.20` |
| 范围 | `alwaysLoad`、按需加载说明、脚本沙箱（替换只读） |
| 基线 | `iterations/0.1.19/design/copy-console-en-zh.md` |
| UGC 不译 | Pack `name`、`description`、文件 `content` |

---

## 1. 技能包页（`page.console.skills`）

### 1.1 产品说明 Alert（更新）

| Key | en | zh |
| --- | --- | --- |
| `alert.productScope.description` | Import zip folders compatible with `.cursor/skills/`. SKILL.md is applied when a pack is **loaded for the turn**; other files are read or run on demand. **Only packs relevant to your question are loaded** (unless marked Always load). Scripts under `scripts/` can be **run in a sandbox** during chat. | 支持导入与 `.cursor/skills/` 同构的 zip。SKILL.md 在技能包 **被本轮选用加载** 时生效；其他文件按需读取或运行。**仅与问题相关的包会被加载**（除非设为「始终加载」）。`scripts/` 下脚本可在对话 **沙箱** 中运行。 |

### 1.2 alwaysLoad（新增）

| Key | en | zh |
| --- | --- | --- |
| `tag.alwaysLoad` | Always load | 始终加载 |
| `form.alwaysLoad.label` | Always load | 始终加载 |
| `form.alwaysLoad.extra` | Apply this Skill Pack every turn, even when the question seems unrelated. | 每轮对话都会应用此技能包，即使与问题看似无关。 |
| `toast.alwaysLoadUpdated` | Always load setting updated | 已更新始终加载设置 |

### 1.3 列表列（增量）

- `name` 列：在名称下方或右侧展示 `tag.alwaysLoad`（当 `alwaysLoad=true`）

### 1.4 脚本相关（替换 0.1.19 只读）

| Key | en | zh | 说明 |
| --- | --- | --- | --- |
| `tag.hasScripts` | Has scripts | 含脚本 | 保留 |
| `tag.scriptsSandbox` | Sandbox | 沙箱 | 可选 secondary |
| `tag.scriptsReadOnly` | Read-only | 只读 | **废弃**，不再展示 |
| `alert.scriptsSandbox.message` | This pack includes runnable scripts | 此包包含可运行脚本 | 替换 `scriptsReadOnly` |
| `alert.scriptsSandbox.description` | The agent can run scripts under `scripts/` in a **sandbox** when the pack is loaded and the skill instructions call for it. **No outbound network** by default. Timeouts and per-turn limits apply. | 当技能包被加载且技能说明需要时，助手可在 **沙箱** 中运行 `scripts/` 下脚本。默认 **无出站网络**。受超时与每轮次数限制。 | |
| `alert.scriptsSandbox.tooltip` | Runnable in chat sandbox | 可在对话沙箱中运行 | 列表 Tag Tooltip |
| `fileTree.scriptRunnable` | Runnable | 可运行 | 树节点 Badge |
| `fileTree.scriptRunnableTooltip` | Can be run in sandbox when loaded | 加载后可在沙箱中运行 | |

### 1.5 Help Drawer `help.scripts`（重写 body）

| Key | en（结构） | zh（结构） |
| --- | --- | --- |
| `help.scripts.title` | Scripts in Skill Packs | 技能包中的脚本 |
| `help.scripts.body` | 1) **Read** file contents vs **run** scripts in sandbox. 2) Only `scripts/`; `.py` and `.sh`. 3) No outbound network. 4) Limits: {perTurn} runs per turn, {perDay} per day. 5) Example: ui-ux-pro-max `scripts/search.py`. | 1) **阅读** 文件与 **运行** 脚本的区别。2) 仅 `scripts/`；`.py` 与 `.sh`。3) 无出站网络。4) 限额：每轮 {perTurn} 次、每日 {perDay} 次。5) 示例：ui-ux-pro-max 的 `scripts/search.py`。 |

参数：`perTurn=5`，`perDay=100`。

### 1.6 废弃 key（实现时移除引用）

| Key | 说明 |
| --- | --- |
| `alert.scriptsReadOnly.*` | 由 `alert.scriptsSandbox.*` 替代 |
| `tag.scriptsReadOnly` | 移除 |

### 1.7 frontmatter 同步 Toast（扩展）

| Key | en | zh |
| --- | --- | --- |
| `toast.syncedFromFrontmatter` | Name, description, and always load synced from SKILL.md | 已从 SKILL.md 同步名称、描述与始终加载 |

---

## 2. 助手页（`page.console.assistants`）

| Key | en | zh |
| --- | --- | --- |
| `form.skillConfigs.extra` | Mount one or more Skill Packs. **Only packs relevant to each question are loaded** in chat (except packs marked Always load). | 可挂载一个或多个技能包。对话中 **仅加载与问题相关的包**（「始终加载」的包除外）。 |

（若 0.1.19 已有 `skillConfigs.extra`，**替换** 全文而非追加。）

---

## 3. API 错误（可选增量）

| Key | en | zh |
| --- | --- | --- |
| `api.skillConfigs.alwaysLoadInvalid` | Invalid always load value | 始终加载字段无效 |

---

## 4. SkillsClient 布局备注

| 区域 | 控件 |
| --- | --- |
| Drawer 顶栏 | `[始终加载 Switch]` 在 `[启用 Switch]` **左侧**（先策略后启用） |
| 元数据 Panel | 可重复 `form.alwaysLoad.extra` 或省略（顶栏已足够） |

---

## 5. JSON 增量示意 — zh `page.console.skills`

```json
{
  "tag": {
    "alwaysLoad": "始终加载",
    "scriptsSandbox": "沙箱"
  },
  "form": {
    "alwaysLoad": {
      "label": "始终加载",
      "extra": "每轮对话都会应用此技能包，即使与问题看似无关。"
    }
  },
  "alert": {
    "scriptsSandbox": {
      "message": "此包包含可运行脚本",
      "description": "当技能包被加载且技能说明需要时，助手可在沙箱中运行 scripts/ 下脚本。默认无出站网络。受超时与每轮次数限制。",
      "tooltip": "可在对话沙箱中运行"
    }
  }
}
```

en 文件填入 §1 表格英文。

---

## 6. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-19 | 初稿：alwaysLoad + 沙箱文案 |
