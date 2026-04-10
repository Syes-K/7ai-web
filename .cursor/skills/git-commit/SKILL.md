---
name: git-commit
description: >-
  Stages changes, writes commit messages, and runs git commit following project
  safety checks. After presenting the proposed title and description, MUST wait
  for the user to confirm they are correct before committing. Use when the user
  asks to 提交, commit, stage, write a commit message, or push (after commit
  only if they ask).
---

# Git 提交（项目内）

## 适用场景

用户要求：提交、commit、暂存、写提交说明、准备 push 前的本地提交等。

## 执行前检查

1. 运行 `git status`（必要时 `git diff` / `git diff --staged`）再决定暂存范围。
2. **禁止**将下列内容纳入提交：
   - `.env`、`.env.local`、含真实 API Key 的任何文件
   - `node_modules/`、`.next/`、`dist/`、`build/` 等构建或依赖目录（以 [.gitignore](/.gitignore) 为准）
3. 若用户误要求提交敏感文件，改为说明风险并建议只提交 `.env.example`（且不含真实密钥）。

## Commit message 格式（与仓库已有风格一致）

采用 **Conventional Commits**，分两层：

### Title（第一行，概要）

- **一行**、**概括本次改动**，可读作「这句话说完就知道这次 commit 在干什么」。
- 格式：`type: 概要`，`type` 同下；概要可用中文，建议 **约 50 字以内**（软限制，避免标题过长）。
- 类型：
  - `feat:` 新功能
  - `fix:` 修复
  - `chore:` 构建、工具、杂项
  - `docs:` 文档
  - `style:` 仅格式/样式（不影响逻辑）
  - `refactor:` 重构
  - `test:` 测试

### Description（正文，稍详细说明）

- Title **空一行** 之后写 **多行正文**（desc）：比标题具体一点即可，不必写成长文。
- 建议包含：**改了什么**、**为何改**（或动机）、**对行为/接口的影响**（若有）；列表条列亦可。
- 无必要时可省略正文（极小改动可只保留 title）。

### 示例（title + desc）

```
feat: 聊天面板支持切换 DeepSeek

- 请求体增加 provider 字段并与后端校验对齐
- 未配置 DEEPSEEK_API_KEY 时保持现有错误提示
```

对应命令示例：

```bash
git commit -m "feat: 聊天面板支持切换 DeepSeek" -m "- 请求体增加 provider 字段并与后端校验对齐
- 未配置 DEEPSEEK_API_KEY 时保持现有错误提示"
```

（第二个 `-m` 会作为正文段落；多段可用多个 `-m` 或编辑器撰写完整 message。）

## 推荐流程

1. 确认变更意图与范围；大块无关改动可拆成多次 commit。
2. `git add` 仅包含应进版本库的文件（必要时用路径限定，避免 `git add .` 带入忽略失效的文件）。
3. 先撰写 **title（概要）+ 可选 desc（稍详细正文）**，并向用户展示草案（同时说明将提交哪些文件）。
4. **提交信息确认门控（强制）**：展示草案后，**必须**请用户明确确认 **标题（title）** 与 **描述（desc，若无正文则说明「本次仅 title」）** 是否准确、可提交；**禁止**在未收到该确认的情况下执行 `git commit`。用户可要求修改 title/desc，更新草案后须再次走本门控。
5. 仅在用户确认标题与描述无误后，再执行 `git commit`。
6. 用户明确要求 **push** 时再执行 `git push`，并确认已配置 `remote` 与分支。

## 与用户沟通

- 提交前说明「将提交哪些文件」，并给出 **title（概要）** 与 **desc（稍详细正文）** 草案（无正文时说明「本次仅 title」）。
- **强制**：收集并展示提交信息后，**必须**停一步，用一句话请用户确认，例如：「请确认上述 **标题** 与 **描述** 是否正确；确认后我再执行 `git commit`。」仅当用户在新回复中明确表示同意（或逐条确认可接受）后，才允许执行 `git commit`。
- **未获用户对标题与描述的确认前，不执行 `git commit`**；模糊指令（如只说「提交」而未确认草案）应先完成展示与确认门控，不得默认通过。
- 若 working tree 干净，说明无需提交；若有未跟踪但应忽略的文件，说明已由 `.gitignore` 处理。
