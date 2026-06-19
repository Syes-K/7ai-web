# 对话文案对照表 — Skill Pack Turn 增量（version 0.1.19）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.19` |
| 范围 | Turn 推理面板 `skills_resolution`；`read_skill_file` 统计（Q13 MVP） |
| 基线 | `iterations/0.1.18/design/copy-chat-en-zh.md` |
| 命名空间 | `page.chat`、`api.message.turnSafe` |

---

## 1. 阶段标签（`page.chat.turn.stage`）

| Key | en | zh | 说明 |
| --- | --- | --- | --- |
| `turn.stage.skill` | Skill Packs | 技能包 | **替换** 0.1.18「Skills 合并」可选方案 |

---

## 2. `api.message.turnSafe` — 新增 / 更新

| Key | en | zh | 场景 |
| --- | --- | --- | --- |
| `skillsMerged` | Merged {count} Skill Pack(s) into system prompt. | 已合并 {count} 个技能包至 system prompt。 | readCount=0 |
| `skillsMergedWithRead` | Merged {count} Skill Pack(s); read {readCount} file(s) via read_skill_file. | 已合并 {count} 个技能包；通过 read_skill_file 读取 {readCount} 个文件。 | Q13 MVP |
| `skillsNoAssistant` | No assistant bound; Skill Packs not loaded. | 未绑定助手，未加载技能包。 | 文案升级 |
| `skillsNotMounted` | Assistant has no active Skill Packs mounted. | 助手未挂载可用技能包。 | 文案升级 |
| `skillsLoadSkipped` | Skill Packs could not be loaded; using base prompt only. | 技能包未能加载，仅使用基础提示。 | 文案升级 |

---

## 3. `turnSafe.detail` 增量

| Key | en | zh |
| --- | --- | --- |
| `skillsMergedTitle` | Merged Skill Packs | 已合并技能包 |
| `skillsMergedNameLine` | · {name} | · {name} |
| `skillsReadTitle` | Files read | 已读取文件 |
| `skillsReadLine` | · {packName}: {path} | · {packName}：{path} |
| `skillsReadOnlyNote` | Scripts are read as text only; not executed. | 脚本仅以文本读取，不会执行。 |

**当 `readFileCount > 0` 且 samples 含 `scripts/` 路径时，** 可在 details 末尾追加一行 `skillsReadOnlyNote`（小字 secondary）。

---

## 4. ChatWorkspace 行为

| 事件 | Toast | Turn 行 | details |
| --- | --- | --- | --- |
| 合并 N，read 0 | 无 | `skillsMerged` | 仅 Pack 名称列表 |
| 合并 N，read M>0 | 无 | `skillsMergedWithRead` | 名称列表 + read samples（≤5） |
| 单 Pack skip | 无 | 无额外说明 | 无 |
| read 含 scripts/*.py | 无 | 同上 | 可选 footnote `skillsReadOnlyNote` |
| **无**脚本执行 | **禁止**「Script executed」类文案 | — | — |

---

## 5. JSON 增量示意 — en

```json
{
  "turnSafe": {
    "skillsMerged": "Merged {count} Skill Pack(s) into system prompt.",
    "skillsMergedWithRead": "Merged {count} Skill Pack(s); read {readCount} file(s) via read_skill_file.",
    "skillsNoAssistant": "No assistant bound; Skill Packs not loaded.",
    "skillsNotMounted": "Assistant has no active Skill Packs mounted.",
    "skillsLoadSkipped": "Skill Packs could not be loaded; using base prompt only.",
    "detail": {
      "skillsMergedTitle": "Merged Skill Packs",
      "skillsMergedNameLine": "· {name}",
      "skillsReadTitle": "Files read",
      "skillsReadLine": "· {packName}: {path}",
      "skillsReadOnlyNote": "Scripts are read as text only; not executed."
    }
  }
}
```

zh 文件填入对应中文。

---

## 6. 不在范围

- 控制台技能包页（见 `copy-console-en-zh.md`）
- Tool invoke 全文、文件 content 展示
- `run_skill_script` 相关文案（0.1.20）
