# 对话文案对照表 — Skills Turn 增量（version 0.1.18）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.18` |
| 范围 | Turn 推理面板 `skills_resolution` 步骤；服务端 `turnSafe.*` |
| 命名空间 | `page.chat`（UI 标签）、`api.message.turnSafe`（safeMessage / details） |

---

## 1. 现有 key（可保留或微调）

`page.chat.turn.stage.skill` 已存在：

| Key | 现 en | 现 zh | 建议 |
| --- | --- | --- | --- |
| `turn.stage.skill` | Skills | Skills 调用 | **可选**改为 en: `Skills merge` / zh: `Skills 合并`（更准确反映 system prompt 合并语义） |

若产品倾向最小 diff，**可不改**；`ChatWorkspace` 已引用该 key。

---

## 2. `api.message.turnSafe` 增量

写入 `messages/{en,zh}/api/message.json` 的 `turnSafe` 对象：

| Key | en | zh | 使用场景 |
| --- | --- | --- | --- |
| `skillsNoAssistant` | No assistant bound; Skills not loaded. | 未绑定助手，未加载 Skills。 | 无 assistantId |
| `skillsNotMounted` | Assistant has no active Skills mounted. | 助手未挂载可用 Skills。 | 无绑定或全部 disabled/缺失 |
| `skillsMerged` | Merged {count} Skill(s) into system prompt. | 已合并 {count} 项 Skills 至 system prompt。 | 成功路径 |
| `skillsLoadSkipped` | Skills could not be loaded; using base prompt only. | Skills 未能加载，仅使用基础提示。 | DB 整类失败 |

### 2.1 `turnSafe.detail` 增量

| Key | en | zh |
| --- | --- | --- |
| `skillsNote` | Note | 说明 |
| `skillsNoAssistantBody` | This conversation has no assistant; Skills were not merged for this turn. | 本会话未绑定助手，本轮未合并 Skills。 |
| `skillsNotMountedBody` | The assistant has no Skill configurations mounted, or they are disabled. | 助手未挂载 Skill，或均已停用。 |
| `skillsMergedTitle` | Merged Skills | 已合并 Skills |
| `skillsMergedNameLine` | · {name} | · {name} |

**不新增：** 单条 skip 原因、正文 excerpt、token 计数。

---

## 3. ChatWorkspace 隐藏集合

在 `ChatWorkspace.tsx` 中新增（对齐 MCP）：

```typescript
const TURN_SAFE_SKILLS_NO_ASSISTANT = new Set([
  enApiMessage.turnSafe.skillsNoAssistant,
  zhApiMessage.turnSafe.skillsNoAssistant,
]);
const TURN_SAFE_SKILLS_NOT_MOUNTED = new Set([
  enApiMessage.turnSafe.skillsNotMounted,
  zhApiMessage.turnSafe.skillsNotMounted,
]);
```

`shouldHideUnboundSkillsStep`：summary 命中上述集合且无 details → 不展示该行。

---

## 4. 完整 JSON 增量示意 — en

```json
{
  "turnSafe": {
    "skillsNoAssistant": "No assistant bound; Skills not loaded.",
    "skillsNotMounted": "Assistant has no active Skills mounted.",
    "skillsMerged": "Merged {count} Skill(s) into system prompt.",
    "skillsLoadSkipped": "Skills could not be loaded; using base prompt only.",
    "detail": {
      "skillsNote": "Note",
      "skillsNoAssistantBody": "This conversation has no assistant; Skills were not merged for this turn.",
      "skillsNotMountedBody": "The assistant has no Skill configurations mounted, or they are disabled.",
      "skillsMergedTitle": "Merged Skills",
      "skillsMergedNameLine": "· {name}"
    }
  }
}
```

zh 文件填入对应中文。

---

## 5. 用户可见级别（Q5 定稿）

| 事件 | Toast | Turn 行 | details 正文 |
| --- | --- | --- | --- |
| 合并 N 项成功 | 无 | 有 | 仅 Skill 名称列表 |
| 单条 skip | **无** | 无（计数仍按成功项） | 无 |
| 整类 load 失败 | 无 | 可选 `skillsLoadSkipped` | Note 块 |
| 无挂载 | 无 | **隐藏** | 无 |

---

## 6. 不在范围

- 控制台 Skills 页文案（见 `copy-console-en-zh.md`）
- 合并后 prompt 全文展示
