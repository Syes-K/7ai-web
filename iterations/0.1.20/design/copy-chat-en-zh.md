# 对话文案对照表 — Skill Pack 增强 Turn 增量（version 0.1.20）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.20` |
| 范围 | Turn `skills_resolution`：mounted/loaded/skipped/read/run；legacy `merged` 映射 |
| 基线 | `iterations/0.1.19/design/copy-chat-en-zh.md` |
| 命名空间 | `api.message.turnSafe`、`page.chat.turn` |

---

## 1. 阶段标签（无变更）

| Key | en | zh |
| --- | --- | --- |
| `turn.stage.skill` | Skill Packs | 技能包 |

---

## 2. `turnSafe` — 新增 / 替换

### 2.1 摘要 safeMessage

| Key | en | zh | 场景 |
| --- | --- | --- | --- |
| `skillsLoaded` | Loaded {count} Skill Pack(s). | 已加载 {count} 个技能包。 | loaded>0, read=0, run=0 |
| `skillsLoadedWithRead` | Loaded {count}; read {readCount} file(s). | 已加载 {count} 个；读取 {readCount} 个文件。 | + read |
| `skillsLoadedWithRun` | Loaded {count}; ran {runCount} script(s). | 已加载 {count} 个；运行 {runCount} 个脚本。 | + run |
| `skillsLoadedWithReadAndRun` | Loaded {count}; read {readCount} file(s); ran {runCount} script(s). | 已加载 {count} 个；读取 {readCount} 个文件；运行 {runCount} 个脚本。 | read+run |
| `skillsMountedNotSelected` | Mounted {mountedCount}; none selected this turn. | 已挂载 {mountedCount} 个，本轮未选用。 | mounted>0, loaded=0 |
| `skillsSelectionFailed` | Skill Pack selection unavailable; optional packs not loaded this turn. | 技能包选用暂不可用，本轮未加载可选包。 | failed_safe |
| `skillsNoAssistant` | No assistant bound; Skill Packs not loaded. | 未绑定助手，未加载技能包。 | 沿用，文案可微调 |
| `skillsNotMounted` | Assistant has no Skill Packs mounted. | 助手未挂载技能包。 | mounted=0（通常隐藏 C1b） |
| `skillsLoadSkipped` | Skill Packs could not be loaded; using base prompt only. | 技能包未能加载，仅使用基础提示。 | loadFailed |

### 2.2 废弃 / legacy 别名

| Key | 处理 |
| --- | --- |
| `skillsMerged` | **保留** key；值改为与 `skillsLoaded` 用户向一致（无 system prompt）；历史 Turn 摘要映射 |
| `skillsMergedWithRead` | **保留**；值去掉 `read_skill_file`；映射到 loaded+read 语义 |

**禁止出现在用户向字符串中：** `system prompt`、`read_skill_file`、`run_skill_script`、`Merged ... into`。

### 2.3 `turnSafe.detail` — 新增 / 更新

| Key | en | zh |
| --- | --- | --- |
| `skillsMountedTitle` | Mounted Skill Packs | 已挂载 |
| `skillsLoadedTitle` | Loaded this turn | 本轮已加载 |
| `skillsLoadedNameLine` | · {name} | · {name} |
| `skillsSkippedTitle` | Not selected this turn | 未选用 |
| `skillsSkippedLine` | · {name} — {reason} | · {name} — {reason} |
| `skillsSkippedLineNoReason` | · {name} | · {name} |
| `skillsReadTitle` | Files read | 已读取文件 |
| `skillsReadLine` | · {packName}: {path} | · {packName}：{path} |
| `skillsScriptRunTitle` | Scripts run | 已运行脚本 |
| `skillsScriptRunLine` | · {packName}: {path} (exit {exitCode}) | · {packName}：{path}（退出码 {exitCode}） |
| `skillsNote` | Note | 说明 |
| `skillsNoAssistantBody` | （沿用 0.1.19 用户向升级文案） | （沿用） |
| `skillsNotMountedBody` | （沿用） | （沿用） |

### 2.4 移除 / 不再使用

| Key | 说明 |
| --- | --- |
| `skillsMergedTitle` | 新 Turn 用 `skillsLoadedTitle`；legacy 映射见 `localize-turn-detail.ts` |
| `skillsMergedNameLine` | 别名 → `skillsLoadedNameLine` |
| `skillsReadOnlyNote` | **删除** 或保留但不触发（0.1.20 脚本可 run） |

---

## 3. `page.chat.turn.detail` 镜像

与 `api.message.turnSafe.detail` 同步新增 key（`ChatWorkspace` 用 `turn.detail.*` 前缀）。

| Key | 说明 |
| --- | --- |
| `skillsMountedTitle` | 同 api |
| `skillsLoadedTitle` | 同 api |
| `skillsSkippedTitle` | 同 api |
| `skillsScriptRunTitle` | 同 api |

---

## 4. ChatWorkspace 行为矩阵

| 场景 | C1b 可见 | 摘要 key | details |
| --- | --- | --- | --- |
| 无助手 | 是 | `skillsNoAssistant` | Note |
| mounted=0 | **否** | — | — |
| mounted>0, loaded=0 | 是 | `skillsMountedNotSelected` | 已挂载 + 未选用 |
| failed_safe | 是 | `skillsSelectionFailed` | 已挂载 + 可选未选用说明 |
| loaded>0 | 是 | `skillsLoaded*` | 已挂载 + 已加载 + read/run |
| 0.1.19 历史 merged | 是 | legacy `skillsMerged*` | merged 映射为已加载 |

---

## 5. localize-turn-detail.ts legacy 映射

| 历史字符串 | 映射 key |
| --- | --- |
| 已合并技能包 | `skillsLoadedTitle` |
| Merged Skill Packs | `skillsLoadedTitle` |
| 已挂载 | `skillsMountedTitle` |
| Mounted Skill Packs | `skillsMountedTitle` |
| 未选用 | `skillsSkippedTitle` |
| 已运行脚本 | `skillsScriptRunTitle` |
| Scripts run | `skillsScriptRunTitle` |

---

## 6. JSON 增量示意 — en

```json
{
  "turnSafe": {
    "skillsLoaded": "Loaded {count} Skill Pack(s).",
    "skillsLoadedWithRead": "Loaded {count}; read {readCount} file(s).",
    "skillsLoadedWithRun": "Loaded {count}; ran {runCount} script(s).",
    "skillsLoadedWithReadAndRun": "Loaded {count}; read {readCount} file(s); ran {runCount} script(s).",
    "skillsMountedNotSelected": "Mounted {mountedCount}; none selected this turn.",
    "skillsSelectionFailed": "Skill Pack selection unavailable; optional packs not loaded this turn.",
    "detail": {
      "skillsMountedTitle": "Mounted Skill Packs",
      "skillsLoadedTitle": "Loaded this turn",
      "skillsLoadedNameLine": "· {name}",
      "skillsSkippedTitle": "Not selected this turn",
      "skillsSkippedLine": "· {name} — {reason}",
      "skillsSkippedLineNoReason": "· {name}",
      "skillsScriptRunTitle": "Scripts run",
      "skillsScriptRunLine": "· {packName}: {path} (exit {exitCode})"
    }
  }
}
```

zh 文件填入对应中文（见 §2 表格）。

---

## 7. 不在范围

- 控制台技能包页（见 `copy-console-en-zh.md`）
- Tool invoke 全文、stdout 全文展示
- 意图路由内部日志文案

---

## 8. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-19 | 初稿：loaded/skipped/run 用户向文案 |
