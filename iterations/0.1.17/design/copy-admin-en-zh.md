# 管理后台文案对照表 — 中英双语（version 0.1.17）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.17` |
| 命名空间 | `page.admin.*`（主）、`page.shell`（共享 UserMenu/Confirm/Forbidden） |
| 语义源 locale | `en` |
| 上游 | `design-spec-i18n-admin.md`、现网 `src/app/admin/**` |

> UGC（用户 email/昵称、助手名/prompt、日志正文、prompt 模版 value、provider 枚举 key）**不**列入本表。

---

## 1. Shell（`page.admin.shell`）

### 1.1 Metadata

| Key | en | zh |
| --- | --- | --- |
| `meta.title` | Admin \| 7ai-web | 管理后台 \| 7ai-web |
| `meta.description` | System administration: users, configuration, models, prompts, and assistants. | 系统管理：用户、配置、模型、提示词与系统助手。 |

### 1.2 壳层

| Key | en | zh | 备注 |
| --- | --- | --- | --- |
| `title` | Admin | 管理后台 | ProLayout title |
| `skipToMain` | Skip to main content | 跳到主要内容 | |
| `chatLink` | Chat | 对话 | → `/chat` |
| `consoleLink` | Console | 控制台 | → `/console/profile` |

### 1.3 侧栏菜单（`menu`）

| Key | en | zh |
| --- | --- | --- |
| `menu.config` | Configuration | 配置管理 |
| `menu.users` | Users | 用户管理 |
| `menu.models` | Models | 模型管理 |
| `menu.prompts` | Prompt templates | 提示词模版 |
| `menu.logs` | Logs | 日志查询 |
| `menu.assistants` | System assistants | 系统助手管理 |

### 1.4 语言选择器

| Key | en | zh |
| --- | --- | --- |
| `langSwitcher.ariaLabel` | Language | 语言 |
| `langSwitcher.label.en` | English | English |
| `langSwitcher.label.zh` | 中文 | 中文 |
| `langSwitcher.label.enShort` | EN | EN |
| `langSwitcher.label.zhShort` | 中文 | 中文 |

### 1.5 共用错误 fallback（`errors`）

| Key | en | zh |
| --- | --- | --- |
| `errors.requestFailed` | Request failed ({status}). | 请求失败（{status}） |
| `errors.networkRetry` | Network error. Please try again later. | 网络异常，请稍后重试 |
| `errors.noAdminPermission` | You do not have admin permission. | 无管理员权限 |

---

## 2. Config（`page.admin.config`）

### 2.1 Metadata

| Key | en | zh |
| --- | --- | --- |
| `meta.title` | Configuration \| Admin | 配置管理 \| 管理后台 |
| `meta.description` | Conversation summary and system configuration. | 对话摘要与系统配置。 |

### 2.2 页面

| Key | en | zh |
| --- | --- | --- |
| `title` | Configuration | 配置管理 |
| `section.conversationSummary` | Conversation summary | 对话摘要 |

### 2.3 表单（`form`）

| Key | en | zh |
| --- | --- | --- |
| `form.enabled.label` | Enable conversation summary | 启用对话摘要 |
| `form.enabled.hint` | When off, the chat pipeline skips summary middleware. When on, session-level summaries are generated using the parameters below and prompt templates. | 关闭后对话链路不再挂载摘要中间件；开启后按下方参数与提示词模版生成会话级摘要。 |
| `form.enabled.rules.required` | Select whether to enable. | 请选择是否启用 |
| `form.enabled.option.on` | Enabled | 启用 |
| `form.enabled.option.off` | Disabled | 关闭 |
| `form.maxChars.label` | Max summary length (characters) | 摘要最大字数 |
| `form.maxChars.hint` | Maps to {maxChars} in the prompt template. Constrains model output length (characters, including spaces). Server does not truncate again after generation. | 对应提示词中的 {maxChars}，用于约束模型生成摘要时的正文长度（按字符计，含标点与空格）。仅作提示词参数，服务端不会对摘要结果做二次截断。 |
| `form.maxChars.rules.required` | Enter max summary length. | 请输入摘要最大字数 |
| `form.maxChars.rules.range` | Enter an integer from 1 to {max}. | 请输入 1~{max} 的整数 |
| `form.mode.label` | Summary trigger mode | 摘要触发模式 |
| `form.mode.hint` | By message count: trigger after N messages. By tokens: trigger by estimated token count. Earlier content is folded into the summary; works with the keep window. | 按消息条数：累计若干条对话后触发摘要；按 Token：按估算 token 量触发。触发后较早内容会折叠进摘要，与「保留窗口」配合使用。 |
| `form.mode.rules.required` | Select a mode. | 请选择模式 |
| `form.mode.option.messages` | By message count | 按消息条数 |
| `form.mode.option.tokens` | By token estimate | 按 Token 估算 |
| `form.triggerMessages.label` | Trigger threshold (messages) | 触发阈值（消息条数） |
| `form.triggerMessages.hint` | When message count reaches this value, earlier messages are folded into the summary. | 当消息条数达到该值时触发摘要，将更早的消息折叠进摘要。 |
| `form.triggerMessages.rules.required` | Enter trigger threshold. | 请输入触发阈值 |
| `form.triggerMessages.rules.range` | Enter an integer from 1 to {max}. | 请输入 1~{max} 的整数 |
| `form.keepMessages.label` | Keep window (messages) | 保留窗口（消息条数） |
| `form.keepMessages.hint` | How many recent messages to keep unfolded; matches summary middleware keep.messages. | 在最近对话中保留多少条消息不折叠；与摘要中间件的 keep.messages 一致。 |
| `form.keepMessages.rules.required` | Enter keep window. | 请输入保留窗口 |
| `form.keepMessages.rules.range` | Enter an integer from 1 to {max}. | 请输入 1~{max} 的整数 |
| `form.triggerTokens.label` | Trigger threshold (tokens) | 触发阈值（Token） |
| `form.triggerTokens.hint` | When estimated context tokens exceed this value, earlier messages fold into the summary. | 当累计上下文 token 估算超过该值时触发摘要，将更早的消息折叠进摘要。 |
| `form.triggerTokens.rules.required` | Enter trigger threshold. | 请输入触发阈值 |
| `form.triggerTokens.rules.range` | Enter an integer from 1 to {max}. | 请输入 1~{max} 的整数 |
| `form.keepTokens.label` | Keep window (tokens) | 保留窗口（Token） |
| `form.keepTokens.hint` | Approximate token size of recent dialogue to keep unfolded; matches keep.tokens. | 在最近对话中保留约多少 token 规模的原文不折叠；与 LangChain 摘要中间件的 keep.tokens 一致。 |
| `form.keepTokens.rules.required` | Enter keep window. | 请输入保留窗口 |
| `form.keepTokens.rules.range` | Enter an integer from 1 to {max}. | 请输入 1~{max} 的整数 |
| `form.minRecentMessages.label` | Minimum recent messages to keep | 最少保留消息条数 |
| `form.minRecentMessages.hint` | After summarization, keep at least this many recent messages (both modes), to preserve recent turns. | 摘要后至少保留最近多少条原文消息（无论当前模式是 messages 还是 tokens），用于保留近几轮细节。 |
| `form.minRecentMessages.rules.required` | Enter minimum recent messages. | 请输入最少保留消息条数 |
| `form.minRecentMessages.rules.range` | Enter an integer from 1 to {max}. | 请输入 1~{max} 的整数 |

### 2.4 操作与 Toast

| Key | en | zh |
| --- | --- | --- |
| `actions.resetDefaults` | Restore defaults | 恢复默认 |
| `actions.save` | Save | 保存 |
| `toast.saved` | Saved | 保存成功 |
| `toast.loadFailed` | Could not load conversation summary configuration. | 加载对话摘要配置失败 |
| `toast.saveFailed` | Could not save. | 保存失败 |

### 2.5 坏 JSON Alert（Q2-B，`fileState`）

| Key | en | zh |
| --- | --- | --- |
| `fileState.invalidJson.title` | Configuration file could not be parsed | 配置文件无法解析 |
| `fileState.invalidJson.description` | Showing built-in defaults. Saving will overwrite with valid JSON. | 已回退到默认配置，保存后将覆盖为合法 JSON。 |

### 2.6 页脚说明（`hint`）

| Key | en | zh |
| --- | --- | --- |
| `hint.promptTemplates` | Edit summary prompts on the {link} page (`contextSummarySystem` / `summarySystemPrefix`). | 摘要提示词请在 {link} 页面维护（`contextSummarySystem` / `summarySystemPrefix`）。 |
| `hint.promptTemplatesLink` | Prompt templates | 提示词模版 |

---

## 3. Users（`page.admin.users`）

### 3.1 Metadata

| Key | en | zh |
| --- | --- | --- |
| `meta.title` | Users \| Admin | 用户管理 \| 管理后台 |
| `meta.description` | Manage accounts, access mode, and passwords. | 系统账号运维：状态、可用性与密码。 |

### 3.2 页面

| Key | en | zh |
| --- | --- | --- |
| `title` | Users | 用户管理 |
| `subTitle` | Account operations: view status, adjust availability, reset passwords. | 系统账号运维：查看状态、调整可用性、重置密码。 |
| `search.placeholder` | Search by email or display name | 搜索邮箱或用户名 |
| `search.button` | Search | 搜索 |
| `toolbar.refresh` | Refresh | 刷新 |

### 3.3 列头（`columns`）

| Key | en | zh |
| --- | --- | --- |
| `columns.user` | User | 用户 |
| `columns.status` | Status | 状态 |
| `columns.accessMode` | Access mode | 访问模式 |
| `columns.loginLock` | Login failure lock | 登录失败锁 |
| `columns.updatedAt` | Last updated | 最近更新 |
| `columns.actions` | Actions | 操作 |

### 3.4 Tag（`tag`）

| Key | en | zh |
| --- | --- | --- |
| `tag.active` | Active | 启用 |
| `tag.disabled` | Disabled | 停用 |
| `tag.readOnly` | Read-only | 只读 |
| `tag.readWrite` | Read-write | 读写 |
| `tag.locked` | Locked | 已锁定 |
| `tag.normal` | Normal | 正常 |

### 3.5 操作与 Tooltip

| Key | en | zh |
| --- | --- | --- |
| `actions.setReadOnly` | Set read-only | 设为只读 |
| `actions.unsetReadOnly` | Remove read-only | 取消只读 |
| `actions.enable` | Enable | 启用 |
| `actions.disable` | Disable | 停用 |
| `actions.resetPassword` | Reset password | 重置密码 |
| `tooltip.cannotChangeOwnReadOnly` | You cannot change read-only for your own account. Use another admin. | 不能变更当前登录账号的只读状态，请使用其他管理员操作 |
| `tooltip.cannotChangeOwnStatus` | You cannot change status for your own account. Use another admin. | 不能变更当前登录账号的状态，请使用其他管理员操作 |
| `tooltip.cannotResetOwnPassword` | You cannot reset your own password from here. | 不能通过管理端重置当前登录账号的密码 |

### 3.6 锁定剩余时间（`lockRemain`）

| Key | en | zh |
| --- | --- | --- |
| `lockRemain.aboutMinutes` | ~{minutes} min | 约 {minutes} 分钟 |
| `lockRemain.lessThanOneMinute` | Less than 1 min | 不到 1 分钟 |

### 3.7 确认弹窗（`confirm`）

| Key | en | zh |
| --- | --- | --- |
| `confirm.disableUser.title` | Disable this user? | 停用用户账号？ |
| `confirm.enableUser.title` | Enable this user? | 启用用户账号？ |
| `confirm.disableUser.content` | Disable 「{label}」. The user may not be able to sign in (per system policy). | 将对「{label}」执行「停用」。停用后该用户将无法登录系统（具体以系统策略为准）。 |
| `confirm.enableUser.content` | Enable 「{label}」. | 将对「{label}」执行「启用」。 |
| `confirm.disableUser.ok` | Confirm disable | 确认停用 |
| `confirm.enableUser.ok` | Confirm enable | 确认启用 |
| `confirm.setReadOnly.title` | Set read-only account? | 设为只读账号？ |
| `confirm.unsetReadOnly.title` | Remove read-only? | 取消只读账号？ |
| `confirm.setReadOnly.content` | Enable read-only for 「{label}」: only GET requests after sign-in. | 将对「{label}」开启只读限制：登录后仅允许 GET 请求。 |
| `confirm.unsetReadOnly.content` | Disable read-only for 「{label}」: restore write access. | 将对「{label}」关闭只读限制：恢复新增/修改/删除等写操作能力。 |
| `confirm.setReadOnly.ok` | Confirm read-only | 确认设为只读 |
| `confirm.unsetReadOnly.ok` | Confirm remove read-only | 确认取消只读 |
| `confirm.resetPassword.title` | Reset password for this user? | 重置该用户的密码？ |
| `confirm.resetPassword.content` | Generate a new password for 「{label}」. Share only over a secure channel; do not display in public. | 将为「{label}」生成新的登录密码。请仅在安全渠道告知用户；请勿在公共场合展示。 |
| `confirm.resetPassword.ok` | Confirm reset | 确认重置 |

### 3.8 Toast

| Key | en | zh |
| --- | --- | --- |
| `toast.disabled` | User disabled | 已停用 |
| `toast.enabled` | User enabled | 已启用 |
| `toast.readOnlyOn` | Read-only enabled | 已设为只读账号 |
| `toast.readOnlyOff` | Read-only removed | 已取消只读账号 |

### 3.9 列表态

| Key | en | zh |
| --- | --- | --- |
| `alert.listFailed` | Failed to load user list | 用户列表加载失败 |
| `actions.retry` | Retry | 重试 |
| `empty.loading` | Loading… | 加载中… |
| `empty.noUsers` | No users | 暂无用户 |
| `pagination.total` | {count} total | 共 {count} 条 |

### 3.10 重置密码 Modal（`modal.resetPassword`）

| Key | en | zh |
| --- | --- | --- |
| `modal.resetPassword.title` | Password reset | 密码已重置 |
| `modal.resetPassword.body` | Temporary password for 「{label}」. Shown once only; share securely before closing. | 「{label}」的临时密码如下。此密码仅显示一次，关闭窗口后请通过安全渠道告知用户。 |
| `modal.resetPassword.warning` | Do not send via public chat groups. Ask the user to change password after first sign-in. | 请勿通过即时通讯公群发送；建议用户首次登录后尽快修改密码。 |
| `modal.resetPassword.close` | Close | 关闭 |
| `modal.resetPassword.copyAndClose` | Copy password and close | 复制密码并关闭 |
| `toast.copied` | Copied to clipboard | 已复制到剪贴板 |
| `toast.copyFailed` | Copy failed. Copy the password manually. | 复制失败，请手动复制密码 |

### 3.11 页脚（`hint`）

| Key | en | zh |
| --- | --- | --- |
| `hint.lockDistributed` | Login failure lock is in-process state; in multi-instance deployments the list may not match the node that enforced the lock. | 登录失败锁为进程内状态，多实例部署下列表展示可能与实际命中节点不一致。 |

---

## 4. Models（`page.admin.models`）

### 4.1 Metadata

| Key | en | zh |
| --- | --- | --- |
| `meta.title` | Models (public) \| Admin | 模型管理（公有）\| 管理后台 |
| `meta.description` | Site-wide public model configurations. | 全站公有模型接入配置。 |

### 4.2 页面

| Key | en | zh |
| --- | --- | --- |
| `title` | Models (public) | 模型管理（公有） |
| `alert.publicModelNotice` | Models created here are public: all signed-in users can see them and set defaults under Console → Profile & preferences. | 此处创建的均为公有模型，全站登录用户可见并可在「控制台 → 账号与偏好」中选为默认对话/向量模型。 |

### 4.3 列头

| Key | en | zh |
| --- | --- | --- |
| `columns.modelName` | Model name | 模型名称 |
| `columns.type` | Type | 类型 |
| `columns.tags` | Tags | 标签 |
| `columns.updatedAt` | Last updated | 最近更新 |
| `columns.actions` | Actions | 操作 |
| `tag.public` | Public | 公有 |
| `tag.dataError` | Data error | 数据异常 |
| `actions.edit` | Edit | 编辑 |
| `actions.delete` | Delete | 删除 |

### 4.4 Toolbar / Modal / Form

| Key | en | zh |
| --- | --- | --- |
| `toolbar.create` | New public model | 新建公有模型 |
| `toolbar.refresh` | Refresh | 刷新 |
| `empty.noModels` | No public models yet | 暂无公有模型 |
| `modal.create.title` | New public model | 新建公有模型 |
| `modal.edit.title` | Edit public model | 编辑公有模型 |
| `modal.ok.create` | Create | 创建 |
| `modal.ok.save` | Save | 保存 |
| `form.provider.label` | Provider | Provider |
| `form.provider.rules.required` | Select a provider. | 请选择 Provider |
| `form.provider.placeholder` | Select… | 请选择 |
| `form.modelName.label` | Model name | 模型名称 |
| `form.modelName.rules.required` | Enter model name. | 请输入模型名称 |
| `form.modelName.placeholder` | e.g. moonshot-v1-8k | 例如 moonshot-v1-8k |
| `form.tags.label` | Tags | 标签 |
| `form.tags.extra` | Optional, multiple; none means no tags. | 可选，可多选；不选表示无标签 |
| `form.tags.placeholder` | Select tags | 选择标签 |
| `form.apiKey.label` | API key | API Key |
| `form.apiKey.rules.required` | Enter API key. | 请输入 API Key |
| `form.apiKey.hint.edit` | Leave blank to keep the saved key. | 留空则不修改已保存的 API Key |
| `form.apiKey.hint.create` | Key from the provider console. | 请输入厂商控制台获取的密钥 |
| `form.apiKey.placeholder.edit` | Leave blank to keep unchanged | 留空则不修改已保存的 API Key |
| `form.apiKey.placeholder.create` | Enter API key | 请输入 API Key |

### 4.5 Provider 展示名（`provider`）

| Key | en | zh |
| --- | --- | --- |
| `provider.aliyun` | Alibaba Cloud Bailian | 阿里云百炼 |
| `provider.glm` | Zhipu GLM | 智谱 |
| `provider.deepseek` | DeepSeek | 深度求索 |
| `provider.kimi` | Moonshot Kimi | 月之暗面 |
| `provider.siliconflow` | SiliconFlow | 硅基流动 |

### 4.6 Confirm / Toast

| Key | en | zh |
| --- | --- | --- |
| `confirm.delete.title` | Delete this public model? | 确定删除该公有模型？ |
| `confirm.delete.description` | Deleting 「{name}」 clears site-wide defaults that referenced it. | 「{name}」删除后，全站用户若已选为默认将自动清空偏好。 |
| `toast.created` | Public model created | 已创建公有模型 |
| `toast.saved` | Saved | 已保存 |
| `toast.deleted` | Deleted | 已删除 |
| `pagination.total` | {count} total | 共 {count} 条 |

---

## 5. Prompts（`page.admin.prompts`）

### 5.1 Metadata

| Key | en | zh |
| --- | --- | --- |
| `meta.title` | Prompt templates \| Admin | 提示词模版 \| 管理后台 |
| `meta.description` | System prompt template configuration. | 系统提示词模版配置。 |

### 5.2 页面

| Key | en | zh |
| --- | --- | --- |
| `title` | Prompt templates | 提示词模版 |
| `actions.reset` | Reset | 重置 |
| `actions.save` | Save | 保存 |
| `label.configKey` | Config key: {key} | 配置 key：{key} |
| `label.supportedParams` | Supported parameters: | 支持参数： |
| `form.template.rules.required` | Enter template body. | 请输入模版正文 |
| `form.item.ariaViewDesc` | View description: {name} | 查看说明：{name} |

### 5.3 坏 JSON Alert（Q2-B）

| Key | en | zh |
| --- | --- | --- |
| `fileState.invalidJson.title` | Configuration file could not be parsed | 配置文件无法解析 |
| `fileState.invalidJson.description` | Showing built-in defaults. Saving will write a valid JSON file. | 已使用内置默认文案；保存后将写入合法 JSON 文件。 |

### 5.4 Confirm / Toast

| Key | en | zh |
| --- | --- | --- |
| `confirm.reset.title` | Confirm reset | 确认重置 |
| `confirm.reset.content` | Restore built-in defaults; unsaved edits will be lost. Click Save to persist. | 将把表单恢复为代码内置默认；当前未保存的编辑将丢失。若需使用重置的配置，请再点「保存」。 |
| `confirm.save.title` | Confirm save | 确认保存 |
| `confirm.save.content` | Write current templates to the server. Continue? | 将把当前表单中的提示词模版写入服务器。是否继续？ |
| `toast.saved` | Saved | 保存成功 |
| `toast.loadFailed` | Failed to load configuration | 加载配置失败 |
| `toast.saveFailed` | Could not save. | 保存失败 |

### 5.5 开发提示（`hint.dev`）

| Key | en | zh |
| --- | --- | --- |
| `hint.dev.persistPath` | Dev note: persisted at project root data/promptConfig.json (directory is in .gitignore). | 开发提示：持久化路径为项目根目录下 data/promptConfig.json（目录已加入 .gitignore）。 |

**不译：** 各 item 的 `name`、`desc`、`value` 正文（系统配置数据）。

---

## 6. Logs（`page.admin.logs`）

### 6.1 Metadata

| Key | en | zh |
| --- | --- | --- |
| `meta.title` | Logs \| Admin | 日志查询 \| 管理后台 |
| `meta.description` | System log search (in development). | 系统日志检索（开发中）。 |

### 6.2 占位页

| Key | en | zh |
| --- | --- | --- |
| `title` | Logs | 日志查询 |
| `placeholder.description` | Log search and audit is in development. | 日志检索与审计开发中。 |
| `placeholder.emptyDescription` | This module is under development; system management capabilities will follow. | 本模块开发中，后续将提供系统管理能力。 |

---

## 7. Assistants（`page.admin.assistants`）

### 7.1 Metadata

| Key | en | zh |
| --- | --- | --- |
| `meta.title` | System assistants \| Admin | 系统助手管理 \| 管理后台 |
| `meta.description` | Built-in assistants available to all users. | 全站内置系统助手。 |

### 7.2 页面

| Key | en | zh |
| --- | --- | --- |
| `title` | System assistants | 系统助手管理 |
| `search.placeholder` | Search by name | 搜索名称 |
| `toolbar.create` | New assistant | 新建助手 |
| `toolbar.refresh` | Refresh | 刷新 |
| `empty.noAssistants` | No system assistants yet. Click New system assistant to add one. | 暂无系统助手，可点击「新建系统助手」添加。 |
| `empty.createCta` | New system assistant | 新建系统助手 |

### 7.3 列头

| Key | en | zh |
| --- | --- | --- |
| `columns.type` | Type | 类型 |
| `columns.icon` | Icon | 图标 |
| `columns.name` | Name | 名称 |
| `columns.tags` | Tags | 标签 |
| `columns.openingMessage` | Opening message | 开场白 |
| `columns.updatedAt` | Last updated | 最近更新 |
| `columns.actions` | Actions | 操作 |
| `tag.system` | System | 系统 |

### 7.4 Modal / Form

| Key | en | zh |
| --- | --- | --- |
| `modal.create.title` | New system assistant | 新建系统助手 |
| `modal.edit.title` | Edit system assistant | 编辑系统助手 |
| `form.name.label` | Name | 名称 |
| `form.name.rules.required` | Enter a name. | 请输入名称 |
| `form.name.rules.max` | At most {max} characters. | 最多 {max} 字 |
| `form.name.placeholder` | Assistant name | 助手名称 |
| `form.prompt.label` | Prompt | 提示词 |
| `form.prompt.rules.required` | Enter prompt. | 请输入提示词 |
| `form.prompt.rules.max` | At most {max} characters. | 最多 {max} 字 |
| `form.prompt.placeholder` | System / behavior instructions | 模型 system / 行为说明 |
| `form.icon.label` | Icon (emoji) | 图标（emoji） |
| `form.icon.rules.max` | At most {max} characters. | 最多 {max} 字符 |
| `form.icon.placeholder` | e.g. 🤖 | 例如 🤖 |
| `form.openingMessage.label` | Opening message | 开场白 |
| `form.openingMessage.rules.max` | At most {max} characters. | 最多 {max} 字 |
| `form.openingMessage.placeholder` | Optional | 可选 |
| `form.tags.label` | Tags | 标签 |
| `form.tags.placeholder` | Type and press Enter | 输入后回车添加 |

### 7.5 Confirm / Toast

| Key | en | zh |
| --- | --- | --- |
| `confirm.delete.title` | Delete this system assistant? | 确定删除该系统助手？ |
| `confirm.delete.description` | Deleting 「{name}」 cannot be undone. | 「{name}」删除后不可恢复。 |
| `toast.created` | System assistant created | 已创建系统助手 |
| `toast.saved` | Saved | 已保存 |
| `toast.deleted` | Deleted | 已删除 |
| `pagination.total` | {count} total | 共 {count} 条 |

**不译：** 助手 `name`、`prompt`、`openingMessage` 内容。
