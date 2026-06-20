# 前端实现说明 — version 0.1.20

## 范围

Skill Pack 增强：Turn C1b 展示、控制台 `alwaysLoad`、脚本沙箱文案、助手挂载说明。

## 改动摘要

### 对话 Turn（`ChatWorkspace` + i18n）

- **`page.chat.turn.detail`** 补齐与 `api.message.turnSafe.detail` 镜像 key：`skillsMountedTitle`、`skillsLoadedTitle`、`skillsLoadedNameLine`、`skillsSkippedTitle`、`skillsSkippedLine`、`skillsSkippedLineNoReason`、`skillsScriptRunTitle`、`skillsScriptRunLine`。
- **`localize-turn-detail.ts`**：legacy 标题「已加载技能包 / Loaded Skill Packs」映射到 `skillsLoadedTitle`。
- **`shouldHideUnboundSkillsStep`**：仅 `mounted=0`（`skillsNotMounted`）隐藏 C1b；**无助手**场景改为展示（修复 0.1.19 误隐藏）。

### 控制台技能包

- **`SkillPackListItem`** 增加 `alwaysLoad`。
- **`SkillsClient`**：名称列紫色 Tag「始终加载」；含脚本 Tooltip 改为沙箱文案；产品 Alert / Help 按设计更新。
- **`PackDetailDrawer`**：顶栏 **始终加载 Switch** 在启用 Switch **左侧**；切换即 PATCH `alwaysLoad`；脚本 Alert / 树节点 Badge 改为可运行沙箱样式。

### 助手页

- **`form.skills.extra`** / **`scriptsTooltip`** 替换为按需加载 + 沙箱可运行说明。

### i18n

- `messages/en|zh/page/console/skills.json` 全量对齐 `copy-console-en-zh.md`。
- `messages/en|zh/page/chat.json` Turn detail 镜像。
- `messages/en|zh/api/message.json`：`skillsNoAssistantBody` 用户向文案微调。

## 依赖与 Provider

无新增 npm 依赖；控制台仍使用既有 `/console` layout 下的 antd + Pro Components。

## 自测入口

见 [test-checklist.md](./test-checklist.md)。

## 结项

状态 **已完成**。跨阶段偏差见 [../deviations.md](../deviations.md)。
