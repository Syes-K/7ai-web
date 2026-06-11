# 控制台文案对照表 — 中英双语（version 0.1.16）

| 项 | 内容 |
| --- | --- |
| 版本 | `0.1.16` |
| 命名空间 | `page.console.*`（主）、`page.shell`（共享壳层 Forbidden/UserMenu/Confirm） |
| 语义源 locale | `en` |
| 上游 | `design-spec-i18n-console.md`、现网 `src/app/console/**` |

> 每个 string 对应唯一英文 key。UGC（昵称、模型名、助手名、知识库内容、MCP 名、连接 JSON）**不**列入本表。`vectorError` 原文不译。

---

## 1. Shell（`page.console.shell`）

### 1.1 Metadata

| Key | en | zh |
| --- | --- | --- |
| `meta.title` | Console \| 7ai-web | 控制台 \| 7ai-web |
| `meta.description` | Manage models, assistants, knowledge bases, and MCP integrations. | 管理模型、助手、知识库与 MCP 集成 |

### 1.2 壳层

| Key | en | zh | 备注 |
| --- | --- | --- | --- |
| `title` | Console | 控制台 | ProLayout title |
| `verifyingSession` | Verifying session… | 验证会话… | Q10-A 极少触发 |
| `skipToMain` | Skip to main content | 跳到主要内容 | |
| `chatLink` | Chat | 对话 | 顶栏链至 `/{locale}/chat` |

### 1.3 侧栏菜单（`menu`）

| Key | en | zh |
| --- | --- | --- |
| `menu.profile` | Profile & preferences | 账号与偏好 |
| `menu.models` | Models | 模型管理 |
| `menu.assistants` | Assistants | 助手管理 |
| `menu.knowledge` | Knowledge bases | 知识库管理 |
| `menu.mcp` | MCP | MCP 管理 |

### 1.4 语言选择器（与 chat 同结构）

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

---

## 2. Profile（`page.console.profile`）

### 2.1 Metadata

| Key | en | zh |
| --- | --- | --- |
| `meta.title` | Profile & preferences \| Console | 账号与偏好 \| 控制台 |
| `meta.description` | Account info and default model preferences. | 账号信息与默认模型偏好 |

### 2.2 页面

| Key | en | zh |
| --- | --- | --- |
| `title` | Profile & preferences | 账号与偏好 |
| `section.personal` | Personal info | 个人信息 |
| `section.preferences` | Preferences | 用户配置 |
| `actions.edit` | Edit | 编辑 |
| `actions.cancel` | Cancel | 取消 |
| `actions.save` | Save | 保存 |
| `actions.retry` | Retry | 重试 |

### 2.3 个人信息表单（`form.personal`）

| Key | en | zh |
| --- | --- | --- |
| `form.personal.email.label` | Email | 邮箱 |
| `form.personal.nickName.label` | Display name | 昵称 |
| `form.personal.nickName.rules.required` | Enter a display name. | 请输入昵称 |
| `form.personal.nickName.placeholder` | 1–32 characters | 1～32 个字符 |
| `form.personal.telNo.label` | Phone | 手机号 |
| `form.personal.telNo.extra` | Leave blank to unbind phone. | 留空表示不绑定手机号 |
| `form.personal.telNo.placeholder` | 11 digits, optional | 11 位数字，可选 |
| `form.personal.telNo.notSet` | Not set | 未填写 |

### 2.4 偏好表单（`form.preferences`）

| Key | en | zh |
| --- | --- | --- |
| `form.preferences.chatModel.label` | Chat model | 对话模型 |
| `form.preferences.chatModel.hint` | Account default for new chats. Register models in Model management first; chat and vector models can differ or reuse the same entry. | 账号级默认对话（Chat）模型，用于新会话等。请先在「模型管理」登记接入后再选；可与向量模型分别绑定，同一条登记也可复用。 |
| `form.preferences.vectorModel.label` | Embedding model | 向量模型 |
| `form.preferences.vectorModel.hint` | Used for knowledge retrieval and document embeddings. Register in Model management first. | 用于知识库检索、文档分段嵌入（Embedding）等。请先在「模型管理」登记接入后再选；与对话模型可分别绑定。 |
| `form.preferences.topK.label` | Retrieval topK | 检索 topK |
| `form.preferences.topK.hint` | Max hits per knowledge search. Leave blank for default. | 知识库检索每次最多返回的命中条数。留空时使用系统默认值。 |
| `form.preferences.topK.placeholder` | Blank for default (3) | 留空使用默认值（3） |
| `form.preferences.threshold.label` | Retrieval threshold | 检索置信度 |
| `form.preferences.threshold.hint` | Score threshold 0–1. Leave blank for default. | 知识库检索命中阈值（0-1）。留空时使用系统默认值。 |
| `form.preferences.threshold.placeholder` | Blank for default (0.75) | 留空使用默认值（0.75） |
| `form.preferences.chunkSize.label` | Chunk size | 分片长度 |
| `form.preferences.chunkSize.hint` | Vectorization chunk length. Leave blank for default. | 知识库向量化分片长度。留空时使用系统默认值。 |
| `form.preferences.chunkSize.placeholder` | Blank for default (1000) | 留空使用默认值（1000） |
| `form.preferences.chunkOverlap.label` | Chunk overlap | 重叠长度 |
| `form.preferences.chunkOverlap.hint` | Vectorization overlap. Leave blank for default. | 知识库向量化分片重叠长度。留空时使用系统默认值。 |
| `form.preferences.chunkOverlap.placeholder` | Blank for default (200) | 留空使用默认值（200） |
| `form.preferences.selectPlaceholder` | Select… | 请选择 |
| `form.preferences.notSelected` | Not selected | 未选择 |

### 2.5 模型选项标签（`visibility` + `provider` 引用 models）

| Key | en | zh |
| --- | --- | --- |
| `modelOption.public` | Public | 公有 |
| `modelOption.private` | Private | 私有 |

### 2.6 Alert / Empty

| Key | en | zh |
| --- | --- | --- |
| `alert.loadProfileFailed` | Failed to load | 加载失败 |
| `alert.loadModelsFailed` | Failed to load model list | 模型列表加载失败 |
| `alert.chatModelStale` | Previous default chat model is no longer valid. Please select again. | 原对话模型默认配置已失效，请重新选择。 |
| `alert.vectorModelStale` | Previous default embedding model is no longer valid. Please select again. | 原向量模型默认配置已失效，请重新选择。 |
| `empty.noModels` | No models registered yet. Add a model configuration in Model management first. | 尚未登记模型。请先在模型管理中新增接入配置。 |
| `empty.goToModels` | Go to Model management | 前往模型管理 |
| `tooltip.prefEditDisabled` | Add at least one model in Model management first. | 请先在模型管理中新增至少一条接入配置 |

### 2.7 Toast

| Key | en | zh |
| --- | --- | --- |
| `toast.saved` | Saved | 已保存 |

---

## 3. Models（`page.console.models`）

### 3.1 Metadata

| Key | en | zh |
| --- | --- | --- |
| `meta.title` | Models \| Console | 模型管理 \| 控制台 |
| `meta.description` | Manage your model API configurations. | 管理模型 API 接入配置 |

### 3.2 页面与工具栏

| Key | en | zh |
| --- | --- | --- |
| `title` | Models | 模型管理 |
| `toolbar.create` | New model | 新建模型 |
| `toolbar.refresh` | Refresh | 刷新 |
| `toolbar.searchPlaceholder` | — | （本期无搜索框） |
| `pagination.total` | {total} total | 共 {total} 条 |
| `empty.noData` | No model configurations yet | 暂无模型配置 |

### 3.3 Alert

| Key | en | zh |
| --- | --- | --- |
| `alert.publicModelNotice` | Private models are editable only by you; public models are maintained in the admin console and available to all users in preferences. | 私有模型仅您本人可编辑删除；公有模型由管理后台维护，全站用户可在偏好中选用。 |

### 3.4 Provider（`provider`）

| Key | en | zh |
| --- | --- | --- |
| `provider.aliyun` | Alibaba Cloud Bailian | 阿里云百炼 |
| `provider.glm` | Zhipu GLM | 智谱 |
| `provider.deepseek` | DeepSeek | 深度求索 |
| `provider.kimi` | Moonshot Kimi | 月之暗面 |
| `provider.siliconflow` | SiliconFlow | 硅基流动 |

### 3.5 列头（`columns`）— `getModelColumns`

| Key | en | zh |
| --- | --- | --- |
| `columns.modelName` | Model name | 模型名称 |
| `columns.visibility` | Type | 类型 |
| `columns.tags` | Tags | 标签 |
| `columns.updatedAt` | Last updated | 最近更新 |
| `columns.vectorDefault` | Embedding default | 向量默认 |
| `columns.actions` | Actions | 操作 |
| `tag.public` | Public | 公有 |
| `tag.private` | Private | 私有 |
| `tag.dataError` | Data error | 数据异常 |
| `tag.embedding` | Embedding | 嵌入 |
| `columns.vectorDefaultBadge` | Embedding default | 向量默认 |
| `columns.setVectorDefault` | Set as embedding default | 设为向量默认 |
| `columns.vectorDefaultSet` | Default set | 已设默认 |
| `columns.edit` | Edit | 编辑 |
| `columns.delete` | Delete | 删除 |
| `tooltip.embeddingOnly` | Only models tagged “Embedding” are supported | 仅支持带「嵌入」标签的模型 |
| `tooltip.publicEditAdmin` | Public models are edited in the admin console | 公有模型请在管理后台编辑 |
| `tooltip.publicDeleteAdmin` | Public models are deleted in the admin console | 公有模型请在管理后台删除 |

### 3.6 Modal 表单（`modal`）

| Key | en | zh |
| --- | --- | --- |
| `modal.create.title` | New model | 新建模型 |
| `modal.edit.title` | Edit model | 编辑模型 |
| `modal.ok.create` | Create | 创建 |
| `modal.ok.save` | Save | 保存 |
| `modal.cancel` | Cancel | 取消 |
| `form.provider.label` | Provider | Provider |
| `form.provider.rules.required` | Select a provider. | 请选择 Provider |
| `form.provider.placeholder` | Select… | 请选择 |
| `form.modelName.label` | Model name | 模型名称 |
| `form.modelName.rules.required` | Enter a model name. | 请输入模型名称 |
| `form.modelName.placeholder` | e.g. qwen-turbo-latest | 例如 qwen-turbo-latest |
| `form.tags.label` | Tags | 标签 |
| `form.tags.extra` | Optional, multiple allowed; none means no tags | 可选，可多选；不选表示无标签 |
| `form.tags.placeholder` | Select tags | 选择标签 |
| `form.apiKey.label` | API key | API Key |
| `form.apiKey.rules.required` | Enter an API key. | 请输入 API Key |
| `form.apiKey.extra.edit` | Leave blank to keep the saved key | 留空则不修改已保存的 API Key |
| `form.apiKey.extra.create` | Key from your provider console | 请输入厂商控制台获取的密钥 |

### 3.7 Confirm

| Key | en | zh |
| --- | --- | --- |
| `confirm.delete.title` | Delete this model configuration? | 确定删除该模型配置？ |
| `confirm.delete.description` | “{name}” will be permanently removed. | 「{name}」删除后不可恢复。 |
| `confirm.delete.ok` | Delete | 删除 |

### 3.8 Toast

| Key | en | zh |
| --- | --- | --- |
| `toast.created` | Created | 已创建 |
| `toast.saved` | Saved | 已保存 |
| `toast.deleted` | Deleted | 已删除 |
| `toast.vectorDefaultSet` | Set as default embedding model | 已设为向量默认模型 |

---

## 4. Assistants（`page.console.assistants`）

### 4.1 Metadata

| Key | en | zh |
| --- | --- | --- |
| `meta.title` | Assistants \| Console | 助手管理 \| 控制台 |
| `meta.description` | Manage personal and system assistants. | 管理个人与系统助手 |

### 4.2 页面与工具栏

| Key | en | zh |
| --- | --- | --- |
| `title` | Assistants | 助手管理 |
| `toolbar.create` | New assistant | 新建助手 |
| `toolbar.refresh` | Refresh | 刷新 |
| `toolbar.searchPlaceholder` | Search by name | 搜索名称 |
| `toolbar.scopePlaceholder` | Scope | 范围 |
| `filter.all` | All | 全部 |
| `filter.systemOnly` | System only | 仅系统 |
| `filter.personalOnly` | Personal only | 仅个人 |
| `pagination.total` | {total} total | 共 {total} 条 |
| `empty.description` | No assistants yet. Create a personal assistant or ask an admin to publish system assistants. | 暂无助手。您可新建个人助手，或由管理员在后台发布系统助手。 |

### 4.3 列头 — `getAssistantColumns`

| Key | en | zh |
| --- | --- | --- |
| `columns.type` | Type | 类型 |
| `columns.icon` | Icon | 图标 |
| `columns.name` | Name | 名称 |
| `columns.tags` | Tags | 标签 |
| `columns.opening` | Opening message | 开场白 |
| `columns.updatedAt` | Last updated | 最近更新 |
| `columns.actions` | Actions | 操作 |
| `tag.system` | System | 系统 |
| `tag.personal` | Personal | 个人 |
| `columns.view` | View | 查看 |
| `columns.edit` | Edit | 编辑 |
| `columns.delete` | Delete | 删除 |
| `tooltip.systemMaintainAdmin` | System assistants are maintained in the admin console | 系统助手请在管理后台维护 |

### 4.4 Drawer / Modal

| Key | en | zh |
| --- | --- | --- |
| `drawer.create.title` | New assistant | 新建助手 |
| `drawer.edit.title` | Edit assistant | 编辑助手 |
| `drawer.viewSystem.title` | View assistant (system) | 查看助手（系统） |
| `drawer.ok` | Save | 保存 |
| `drawer.cancel` | Cancel | 取消 |
| `drawer.close` | Close | 关闭 |
| `form.name.label` | Name | 名称 |
| `form.name.rules.required` | Enter a name. | 请输入名称 |
| `form.name.rules.max` | At most {max} characters | 最多 {max} 字 |
| `form.name.placeholder` | Assistant name | 助手名称 |
| `form.prompt.label` | System prompt | 提示词 |
| `form.prompt.rules.required` | Enter a prompt. | 请输入提示词 |
| `form.prompt.rules.max` | At most {max} characters | 最多 {max} 字 |
| `form.prompt.placeholder` | Model system / behavior instructions | 模型 system / 行为说明 |
| `form.icon.label` | Icon (emoji) | 图标（emoji） |
| `form.icon.rules.max` | At most {max} characters | 最多 {max} 字符 |
| `form.icon.placeholder` | e.g. 🤖 | 例如 🤖 |
| `form.opening.label` | Opening message | 开场白 |
| `form.opening.rules.max` | At most {max} characters | 最多 {max} 字 |
| `form.opening.placeholder` | Optional | 可选 |
| `form.tags.label` | Tags | 标签 |
| `form.tags.placeholder` | Type and press Enter | 输入后回车添加 |
| `form.knowledgeBases.label` | Knowledge bases (multi-select) | 知识库（多选） |
| `form.knowledgeBases.extra` | Knowledge bases this assistant may retrieve during chat. | 为该助手配置可用知识库；对话时将按需检索这些知识库。 |
| `form.knowledgeBases.placeholder` | Select knowledge bases | 请选择知识库 |
| `section.mcpMount` | MCP mount | MCP 挂载 |
| `alert.noMcp` | You have no MCP configurations yet | 您还没有可用的 MCP |
| `alert.noMcpAction` | Add one in {mcpLink} first. | 请先到 MCP 管理添加配置。 |
| `alert.mcpInactive` | Some mounted MCPs are disabled | 部分已挂载的 MCP 已停用 |
| `alert.mcpInactiveDesc` | Disabled MCPs are not loaded in chat. Enable or remove them. | 对话中不会加载已停用的 MCP，建议启用或移除。 |
| `form.mcp.label` | MCP (multi-select) | MCP（多选） |
| `form.mcp.manageLink` | Manage MCP… | 管理 MCP… |
| `form.mcp.extra` | Tools loaded for this assistant in chat; independent of knowledge retrieval. | 对话时为本助手加载对应工具；与是否使用知识库检索无关。 |
| `form.mcp.placeholder` | Loading MCP list… | 加载 MCP 列表… |
| `form.mcp.inactiveSuffix` | (disabled) | （已停用） |

### 4.5 Confirm

| Key | en | zh |
| --- | --- | --- |
| `confirm.delete.title` | Delete this assistant? | 确定删除该助手？ |
| `confirm.delete.description` | “{name}” will be permanently removed. | 「{name}」删除后不可恢复。 |

### 4.6 Toast

| Key | en | zh |
| --- | --- | --- |
| `toast.created` | Created | 已创建 |
| `toast.saved` | Saved | 已保存 |
| `toast.deleted` | Deleted | 已删除 |
| `toast.kbBindFailedOnCreate` | Assistant created, but knowledge base binding failed | 助手已创建，但知识库绑定保存失败 |
| `toast.mcpBindFailedOnCreate` | Assistant created, but MCP mount failed | 助手已创建，但 MCP 挂载保存失败 |
| `toast.kbBindFailedOnSave` | Assistant saved, but knowledge base binding failed | 助手已保存，但知识库绑定保存失败 |
| `toast.mcpBindFailedOnSave` | Assistant saved, but MCP mount failed | 助手已保存，但 MCP 挂载保存失败 |

---

## 5. Knowledge（`page.console.knowledge`）

### 5.1 Metadata

| Key | en | zh |
| --- | --- | --- |
| `meta.title` | Knowledge bases \| Console | 知识库管理 \| 控制台 |
| `meta.description` | Create and manage knowledge bases for retrieval. | 创建与管理用于检索的知识库 |

### 5.2 页面与工具栏

| Key | en | zh |
| --- | --- | --- |
| `title` | Knowledge bases | 知识库管理 |
| `toolbar.create` | New knowledge base | 新建知识库 |
| `toolbar.refresh` | Refresh | 刷新 |
| `toolbar.searchPlaceholder` | Search name or description | 搜索名称/描述 |
| `empty.noData` | No knowledge bases yet. Create one to get started. | 暂无知识库，请先创建。 |

### 5.3 向量状态 Tag

| Key | en | zh |
| --- | --- | --- |
| `tag.vectorSuccess` | Ready | 已完成 |
| `tag.vectorFailed` | Failed | 失败 |
| `tag.vectorPending` | Vectorizing | 向量化中 |

### 5.4 列头 — `getKnowledgeColumns`

| Key | en | zh |
| --- | --- | --- |
| `columns.name` | Name | 名称 |
| `columns.format` | Format | 格式 |
| `columns.tags` | Tags | 标签 |
| `columns.vectorStatus` | Vectorization | 向量化 |
| `columns.updatedAt` | Last updated | 最近更新 |
| `columns.actions` | Actions | 操作 |
| `tag.plainText` | Text | 文本 |
| `columns.view` | View | 查看 |
| `columns.chunkTest` | Retrieval test | 检索效果测试 |
| `columns.edit` | Edit | 编辑 |
| `columns.delete` | Delete | 删除 |

### 5.5 新建/编辑 Modal

| Key | en | zh |
| --- | --- | --- |
| `modal.create.title` | New knowledge base | 新建知识库 |
| `modal.edit.title` | Edit knowledge base | 编辑知识库 |
| `modal.cancel` | Cancel | 取消 |
| `modal.save` | Save | 保存 |
| `form.name.label` | Name | 名称 |
| `form.name.rules.required` | Enter a name. | 请输入名称 |
| `form.name.rules.max` | At most {max} characters | 最多 {max} 字 |
| `form.name.placeholder` | Knowledge base name | 知识库名称 |
| `form.description.label` | Description | 描述 |
| `form.description.rules.max` | At most {max} characters | 最多 {max} 字 |
| `form.description.placeholder` | Shown for intent routing (optional) | 用于意图识别与选择展示（可选） |
| `form.tags.label` | Tags | 标签 |
| `form.tags.placeholder` | Type and press Enter | 输入后回车添加 |
| `form.contentFormat.label` | Content format | 内容格式 |
| `form.contentFormat.rules.required` | Select a content format. | 请选择内容格式 |
| `form.contentFormat.plain` | Plain text | 普通文本 |
| `form.content.label` | Body | 正文内容 |
| `form.content.rules.required` | Enter content. | 请输入正文内容 |
| `form.content.rules.max` | At most {max} characters | 最多 {max} 字符 |
| `form.content.placeholder` | Direct text input (only option in this release) | 直接文本输入（本期仅支持该方式） |
| `form.uploadNotice` | File upload (PDF/TXT/MD) coming soon; not available in this release. | 文件上传（PDF/TXT/MD）即将支持，本期暂不可用。 |

### 5.6 详情 Drawer

| Key | en | zh |
| --- | --- | --- |
| `detail.title` | Knowledge base details | 知识库详情 |
| `detail.loading` | Loading… | 加载中… |
| `detail.edit` | Edit | 编辑 |
| `detail.retryVector` | Retry vectorization | 重试向量化 |
| `detail.chunkTest` | Retrieval test | 检索效果测试 |
| `detail.format` | Format | 格式 |
| `detail.vectorStatus` | Vectorization | 向量化 |
| `detail.updatedAt` | Updated | 更新时间 |
| `detail.vectorCompletedAt` | Vectorization completed | 向量完成时间 |
| `detail.failureReason` | Failure reason: {error} | 失败原因：{error} |
| `detail.vectorPendingHint` | Vectorization in progress… This page will refresh automatically. Run retrieval test when ready. | 向量化进行中…完成后即可进行检索效果测试。页面将自动刷新状态。 |
| `detail.body` | Body | 正文 |

### 5.7 分片测试 Drawer

| Key | en | zh |
| --- | --- | --- |
| `chunkTest.title` | Retrieval test | 检索效果测试 |
| `chunkTest.titleWithName` | Retrieval test — {name} | 检索效果测试 - {name} |
| `chunkTest.intro` | Enter a query to see ranked chunks (order, index, score). | 输入一段文本作为 query，返回按相关度排序的命中片段（展示顺序、片段序号、相关度）。 |
| `chunkTest.query.placeholder` | e.g. What is our refund policy? | 例如：我们的退款规则是什么？ |
| `chunkTest.threshold.placeholder` | Threshold 0–1 | 阈值 0~1 |
| `chunkTest.run` | Run test | 开始测试 |
| `chunkTest.reset` | Reset | 重置 |
| `chunkTest.hits` | {count} hits (topK={topK}, threshold={threshold}) | 命中 {count} 条（topK={topK}，阈值={threshold}） |
| `chunkTest.noResults` | No results. Try another query or lower the threshold. | 暂无结果。你可以尝试换一种问法，或降低阈值后再试。 |
| `chunkTest.chunkIndex` | Chunk index={index} | 片段序号={index} |
| `chunkTest.score` | Score={score} | 相关度={score} |
| `chunkTest.copy` | Copy | 复制 |
| `chunkTest.warn.selectKb` | Select a knowledge base to test first. | 请先选择要测试的知识库 |
| `chunkTest.warn.notReady` | Vectorization not complete; test unavailable. | 当前知识库尚未完成向量化，暂不可测试 |
| `chunkTest.warn.enterQuery` | Enter a test question. | 请输入测试问题 |
| `chunkTest.status.pending` | Vectorization in progress; test when complete | 向量化进行中，完成后可测试 |
| `chunkTest.status.failed` | Vectorization failed; retry before testing | 向量化失败，请重试后再测试 |

### 5.8 Confirm

| Key | en | zh |
| --- | --- | --- |
| `confirm.delete.title` | Delete this knowledge base? | 确定删除该知识库？ |
| `confirm.delete.description` | “{name}” will be permanently removed. | 「{name}」删除后不可恢复。 |
| `confirm.delete.hint` | If assistants still use this knowledge base, delete will fail. Unlink in Assistant management first. | 若仍有助手在使用该知识库，将无法删除；请先到「助手管理」解除关联后再删。 |

### 5.9 Toast

| Key | en | zh |
| --- | --- | --- |
| `toast.created` | Created | 已创建 |
| `toast.saved` | Saved | 已保存 |
| `toast.deleted` | Deleted | 已删除 |
| `toast.retryTriggered` | Retry triggered | 已触发重试 |
| `toast.copied` | Copied | 已复制 |
| `toast.copyFailed` | Copy failed; copy manually | 复制失败，请手动复制 |

---

## 6. MCP（`page.console.mcp`）

### 6.1 Metadata

| Key | en | zh |
| --- | --- | --- |
| `meta.title` | MCP \| Console | MCP 管理 \| 控制台 |
| `meta.description` | Manage personal MCP server connections. | 管理个人 MCP 服务连接 |

### 6.2 页面

| Key | en | zh |
| --- | --- | --- |
| `title` | MCP | MCP 管理 |
| `intro` | Maintain personal MCP connections here; mount them on assistants in Assistant management for chat tools. | 在此维护个人 MCP 连接；在「助手管理」中为助手挂载 MCP，对话时按助手加载工具。 |
| `toolbar.create` | New MCP | 新建 MCP |
| `toolbar.refresh` | Refresh | 刷新 |
| `toolbar.searchPlaceholder` | Search name or description | 搜索名称/描述 |
| `empty.noData` | No MCP configurations yet. | 暂无 MCP 配置。 |

### 6.3 检测状态 Tag

| Key | en | zh |
| --- | --- | --- |
| `tag.testSuccess` | Success | 成功 |
| `tag.testFailure` | Failed | 失败 |
| `tag.testUnknown` | Not tested | 未检测 |
| `tag.enabled` | Enabled | 启用 |
| `tag.disabled` | Disabled | 停用 |

### 6.4 列头 — `getMcpColumns`

| Key | en | zh |
| --- | --- | --- |
| `columns.name` | Name | 名称 |
| `columns.enabled` | Enabled | 启用 |
| `columns.transport` | Transport | 传输 |
| `columns.connectionSummary` | Connection summary | 连接摘要 |
| `columns.assistantRefs` | Assistant refs | 助手引用 |
| `columns.lastTest` | Last test | 最近检测 |
| `columns.actions` | Actions | 操作 |
| `columns.testConnection` | Test connection | 测试连接 |
| `columns.edit` | Edit | 编辑 |
| `columns.delete` | Delete | 删除 |

### 6.5 Modal 表单

| Key | en | zh |
| --- | --- | --- |
| `modal.create.title` | New MCP | 新建 MCP |
| `modal.edit.title` | Edit MCP | 编辑 MCP |
| `modal.testConnection` | Test connection | 测试连接 |
| `modal.cancel` | Cancel | 取消 |
| `modal.save` | Save | 保存 |
| `form.name.label` | Name | 名称 |
| `form.name.rules.required` | Enter a name. | 请输入名称 |
| `form.name.rules.max` | At most {max} characters | 最多 {max} 字 |
| `form.name.placeholder` | Display name | 展示名称 |
| `form.description.label` | Description | 描述 |
| `form.description.rules.max` | At most {max} characters | 最多 {max} 字 |
| `form.description.placeholder` | Optional | 可选 |
| `form.transport.label` | Transport | 传输方式 |
| `form.transport.rules.required` | Select a transport. | 请选择传输方式 |
| `form.transport.stdio` | STDIO (subprocess) | STDIO（子进程） |
| `form.endpoint.label` | Connection params (JSON) | 连接参数（JSON） |
| `form.endpoint.rules.required` | Enter connection JSON. | 请填写连接参数 JSON |
| `form.endpoint.extra.edit` | Blank means no change. HTTP/SSE: {"url":"https://..."}; stdio: {"command":"npx","args":["-y","pkg"]}. Loaded from server when editing. | 留空表示不修改。HTTP/SSE 示例：{"url":"https://..."}；stdio 示例：{"command":"npx","args":["-y","包名"]}；打开编辑时会从服务端加载当前配置。 |
| `form.endpoint.extra.create` | Must be a JSON object. | 须为 JSON 对象 |
| `form.endpoint.placeholder` | e.g. {"url":"https://api.example.com/mcp"} | 例如 {"url":"https://api.example.com/mcp"} |
| `form.metadata.label` | metadata (optional JSON) | metadata（可选 JSON） |
| `form.metadata.extra` | JSON object; blank to skip or keep unchanged on edit. | 须为 JSON 对象；留空表示不设置或不修改（编辑时留空不改）。 |
| `form.credentials.label` | Credentials / token | 凭证 / Token |
| `form.credentials.ariaHelp` | Credentials and token help | 凭证与 Token 说明 |
| `form.credentials.extra.edit` | If configured, blank keeps existing; new value overwrites encrypted storage. | 已配置则留空表示不修改；填写新值则覆盖加密存储。 |
| `form.credentials.extra.create` | Optional; server needs MCP_CREDENTIALS_MASTER_KEY to save. | 可选；服务端需配置 MCP_CREDENTIALS_MASTER_KEY 才能保存。 |
| `form.credentials.placeholder.edit` | Leave blank to keep unchanged | 留空表示不修改 |
| `form.credentials.placeholder.create` | Optional | 可选 |
| `form.enabled.label` | Enable this MCP | 启用该 MCP |

**`form.credentials.help`（Tooltip 富文本，可用 `t.rich` 或多 key 拼接）：**

| Key | en | zh |
| --- | --- | --- |
| `form.credentials.help.intro` | Authentication sent when connecting to the MCP endpoint (e.g. API key, Bearer token). | 用于连接该 MCP 服务端点时的鉴权信息（例如 API Key、Bearer Token），让远端识别合法客户端。 |
| `form.credentials.help.http` | HTTP/SSE: usually a token string; for multiple headers use JSON e.g. {"Authorization":"Bearer …"} (merged with metadata headers). | HTTP/SSE：一般填一串 token；若需多个请求头或自定义头名，也可填 JSON（会与 metadata 中的 headers 合并）。 |
| `form.credentials.help.stdio` | STDIO: usually omit; put secrets in connection env if required by docs. | STDIO：多数情况无需在此填写；若文档要求通过环境变量传密钥，优先写在连接参数里。 |
| `form.credentials.help.storage` | Saved encrypted; never shown in lists/API. MCP_CREDENTIALS_MASTER_KEY encrypts storage—it is not the token for the MCP provider. | 保存后加密入库，列表与接口不回显明文。环境变量 MCP_CREDENTIALS_MASTER_KEY 是服务端用来加密存储的密钥，不是要填给 MCP 服务商的那份 token。 |

### 6.6 未保存测试 Modal

| Key | en | zh |
| --- | --- | --- |
| `testChoice.title` | Unsaved changes | 未保存的修改 |
| `testChoice.body` | Connection test uses saved server config. Choose: | 测试连接以服务端已保存配置为准。请选择： |
| `testChoice.cancel` | Cancel | 取消 |
| `testChoice.discardAndTest` | Discard changes and test | 放弃修改并测试 |
| `testChoice.saveAndTest` | Save and test | 保存并测试 |

### 6.7 删除阻断 Modal

| Key | en | zh |
| --- | --- | --- |
| `deleteBlocked.title` | Cannot delete | 无法删除 |
| `deleteBlocked.body` | Unmount this MCP from assistants in {assistantsLink} first. | 请先在助手管理解除 MCP 挂载后再试。 |

### 6.8 Confirm

| Key | en | zh |
| --- | --- | --- |
| `confirm.delete.title` | Delete this MCP configuration? | 确定删除该 MCP 配置？ |
| `confirm.delete.description` | Cannot be undone. Deletion fails if still referenced by assistants. | 删除后无法恢复。若仍被助手引用将无法删除。 |

### 6.9 Toast / 本地校验

| Key | en | zh |
| --- | --- | --- |
| `toast.created` | Created | 已创建 |
| `toast.saved` | Saved | 已保存 |
| `toast.deleted` | Deleted | 已删除 |
| `toast.testSuccess` | Connection test succeeded | 连接测试成功 |
| `toast.testFailed` | Connection test failed | 连接测试失败 |
| `toast.loadFailed` | Failed to load configuration | 加载配置失败 |
| `toast.saveBeforeTest` | Save the configuration before testing | 请先保存配置后再测试连接 |
| `toast.endpointInvalidJson` | Connection params must be valid JSON object (e.g. {"url":"https://..."}) | 连接参数须为合法 JSON 对象（如 {"url":"https://..."}） |
| `toast.endpointParseError` | JSON could not be parsed or is not an object | 连接参数 JSON 无法解析或不是对象 |
| `toast.metadataInvalidJson` | metadata must be a valid JSON object | metadata 须为合法 JSON 对象 |

---

## 7. Settings（`page.console.settings`）

| Key | en | zh |
| --- | --- | --- |
| `meta.title` | Settings \| Console | 设置 \| 控制台 |
| `meta.description` | Redirects to profile and preferences. | 重定向至账号与偏好 |

（无可见 UI；仅 redirect + metadata。）

---

## 8. 共享壳层（`page.shell`，引用不重复维护）

见 `0.1.15/design/spec-shared-infra-i18n.md`：

- `forbiddenNotice.*` — ConsoleForbiddenNotice
- `userMenu.*` — UserAvatarMenu shell
- `confirm.ok` / `confirm.cancel` / `confirm.defaultTitle`

---

## 9. API 错误（`api.message`）

见 `spec-api-message-console.md`；前端 REST 错误**直接展示** `error.message`。

**已知限制：** `/api/knowledge-bases/**` 错误可能仍为中文（0.1.18 前）。
