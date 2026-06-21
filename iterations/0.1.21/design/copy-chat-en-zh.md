# 对话文案对照表 — Turn i18n 增量（version 0.1.21）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.21` |
| 范围 | reasonCode、failed_safe details、safeMessageKey 相关 |
| 基线 | `iterations/0.1.20/design/copy-chat-en-zh.md` |
| 命名空间 | `api.message.turnSafe`、`page.chat.turn` |

---

## 1. 新增 — skip reasonCode（P0）

### 1.1 `turnSafe.detail.skillsSkipReason.*`

| Key | en | zh |
| --- | --- | --- |
| `skillsSkipReason.unrelated` | Unrelated to this question | 与当前问题无关 |
| `skillsSkipReason.low_confidence` | Not needed for this turn | 本轮不需要 |
| `skillsSkipReason.user_small_talk` | Small talk | 寒暄闲聊 |
| `skillsSkipReason.duplicate_coverage` | Covered by another pack | 已由其他包覆盖 |
| `skillsSkipReason.other` | Not selected | 未选用 |

### 1.2 镜像至 `page.chat.turn.detail`

同上路径：`turn.detail.skillsSkipReason.*`

### 1.3 行模板（已有，无文案变更）

| Key | en | zh |
| --- | --- | --- |
| `skillsSkippedLine` | · {name} — {reason} | · {name} — {reason} |
| `skillsSkippedLineNoReason` | · {name} | · {name} |

`{reason}` 由 `skillsSkipReason.{code}` 填入，非 LLM 原文。

---

## 2. 新增 — failed_safe 详情（P1）

| Key | en | zh |
| --- | --- | --- |
| `skillsIntentFailedBody` | Selection service was unavailable (timeout or parse error). Optional packs were skipped this turn. | 选用服务暂不可用（超时或解析失败），已跳过可选技能包。 |

**位置：**

- `api.message.turnSafe.detail.skillsIntentFailedBody`
- `page.chat.turn.detail.skillsIntentFailedBody`

**展示条件：** `intentSource === "failed_safe"`；作为 details 独立小块或附在 `skillsNote` 后。

---

## 3. 行级 detail keys（0.1.20 已有 — parity 确认）

以下 key **应已存在**；本期确保 en/zh 对齐且 `localize-turn-detail` 引用：

| Key | en | zh |
| --- | --- | --- |
| `skillsLoadedNameLine` | · {name} | · {name} |
| `skillsReadLine` | · {packName}: {path} | · {packName}：{path} |
| `skillsScriptRunLine` | · {packName}: {path} (exit {exitCode}) | · {packName}：{path}（退出码 {exitCode}） |

---

## 4. 摘要 safeMessage（无新增 key）

沿用 0.1.20 `turnSafe.skills*` 全集。本期改为通过 `safeMessageKey` 引用，文案不变：

| safeMessageKey | 对应 i18n key |
| --- | --- |
| `turnSafe.skillsLoaded` | `skillsLoaded` |
| `turnSafe.skillsLoadedWithRead` | `skillsLoadedWithRead` |
| `turnSafe.skillsLoadedWithRun` | `skillsLoadedWithRun` |
| `turnSafe.skillsLoadedWithReadAndRun` | `skillsLoadedWithReadAndRun` |
| `turnSafe.skillsMountedNotSelected` | `skillsMountedNotSelected` |
| `turnSafe.skillsSelectionFailed` | `skillsSelectionFailed` |
| `turnSafe.skillsNoAssistant` | `skillsNoAssistant` |
| `turnSafe.skillsNotMounted` | `skillsNotMounted` |
| `turnSafe.skillsLoadSkipped` | `skillsLoadSkipped` |

KB / MCP 同类 key 一并纳入 `turn-safe-message-keys.ts`（非 skills 范围但同批消除硬编码）。

---

## 5. MCP disabled legacy

| Key | en | zh |
| --- | --- | --- |
| `mcpDisabled` | MCP not enabled | 未启用 MCP |

用于 `safeMessageKey` 与 legacy 映射；若已有等价 key 则复用。

---

## 6. JSON 增量示意 — en `api/message.json`

```json
{
  "turnSafe": {
    "detail": {
      "skillsSkipReason": {
        "unrelated": "Unrelated to this question",
        "low_confidence": "Not needed for this turn",
        "user_small_talk": "Small talk",
        "duplicate_coverage": "Covered by another pack",
        "other": "Not selected"
      },
      "skillsIntentFailedBody": "Selection service was unavailable (timeout or parse error). Optional packs were skipped this turn."
    }
  }
}
```

zh 文件填入 §1–2 中文表。

`page/chat.json` 的 `turn.detail` 段 **镜像相同 key**。

---

## 7. 禁止出现在用户向字符串中

- LLM 自由文本 skip reason（中文或英文）
- `timeout`、`intent_json_parse_failed`
- `system prompt`、`read_skill_file`、`run_skill_script`

---

## 8. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-20 | 初稿 |
