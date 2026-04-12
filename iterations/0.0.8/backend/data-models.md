# 数据模型：控制台「模型管理」（version 0.0.8）

## 文档信息

| 项 | 内容 |
|----|------|
| 版本 | `0.0.8` |
| 持久化 | **TypeORM + SQLite**（`getDataSource()`） |
| 实体目录 | 建议 `src/server/db/entities/`（与 `User`、`Conversation` 等一致） |
| 隔离 | 与设计 §8.4、PRD 假设一致：**按 `userId` 隔离**，仅当前登录用户可读写自己的记录 |

---

## 1. 建议表名与实体名

| 项 | 建议值 | 说明 |
|----|--------|------|
| 表名 | `user_model_configs` | 表达「用户级模型接入配置」；若需更短可改为 `model_configs`，但须在注释中标明按用户隔离 |
| 实体类名 | `UserModelConfig`（示例） | 与表一一对应，避免与 LLM 抽象「Model」混淆 |

---

## 2. 字段定义

| 列名 | TypeORM 类型建议 | 约束 | 说明 |
|------|------------------|------|------|
| `id` | `varchar(36)` | PK | UUID |
| `userId` | `varchar(36)` | 非空，索引 | 关联 `users.id`，**单用户可见** |
| `provider` | `varchar(32)` | 非空 | 取值仅 `ALYUN` / `GLM` / `DEEPSEEK`（应用层枚举校验 + DB 层可选 CHECK） |
| `modelName` | `varchar(255)` | 非空 | 展示名 / 模型 id，与 PRD 一致 |
| `apiKey` | `text` 或 `varchar` | 非空 | **存储策略见 §3** |
| `createdAt` | `datetime` | 非空 | `CreateDateColumn` |
| `updatedAt` | `datetime` | 非空 | `UpdateDateColumn` |

**本期采用物理删除**：不提供 `deletedAt` 软删除字段；删除通过 `DELETE /api/console/models/[id]` 从表中移除行（见 `api-spec.md` 第 6 节）。若未来需审计追溯，可再评估增加软删除与「停用」态。

---

## 3. `apiKey` 存储策略（推荐方案与理由）

### 3.1 需求

- 运行时若将来要用该配置调用厂商 API，服务端必须能**还原出明文**（或等价可用的密钥材料），因此**不能**仅存不可逆哈希（除非改为 OAuth 等流程，本期不适用）。
- 列表/API **永不对外返回明文**（仅掩码），与实现层加密正交。

### 3.2 推荐方案：**应用层对称加密后落库**

- 使用 Node `crypto`（如 AES-256-GCM）加密明文，密文 + IV + auth tag 以可序列化形式存入 `apiKey` 列（或拆列 `apiKeyCiphertext` / `apiKeyIv` 等，3B 任选一种清晰结构）。
- 密钥材料来自环境变量，例如 **`MODEL_CONFIG_SECRET`** 或复用项目既有「服务端加密用」密钥（须与 `OPENAI_API_KEY` 等区分用途，避免混用）。
- **理由**：SQLite 无透明列加密；对称加密在单租户自部署场景常见；泄露风险主要在 DB 文件与备份，需配合文件权限与备份策略。

### 3.3 备选（不推荐作默认）

- **明文存储**：实现成本最低，**仅适合本地开发**；生产与 PRD「密钥安全」意图不符，若采用须在 `risks-and-open-items.md` 中显式记录并限环境。

### 3.4 实现注意

- 加密/解密逻辑放在 `server` 侧模块（如 `server/model-config/crypto.ts`），**不**放入 `@/common`，除非明确为无 Node 依赖的纯算法且复用面广。
- 日志与错误信息**禁止**打印解密后的 Key。

---

## 4. 索引

| 索引 | 列 | 用途 |
|------|-----|------|
| 建议 | `userId` | 按用户过滤列表 |
| 建议复合 | `(userId, updatedAt)` | 列表排序与分页（与 `Conversation` 的 `(userId, updatedAt)` 思路一致） |

可选：`userId + id` 用于稳定排序（若分页需要）。

---

## 5. 与 TypeORM 同步 / 迁移（SQLite）

- 与现有项目一致：开发环境可使用 `synchronize` 策略（以 `data-source` 实际配置为准）；生产或严肃环境建议迁移脚本（3B 按仓库既有迁移方式执行）。
- 新表加入 `src/server/db/data-source.ts`（或项目集中注册实体的位置）的 `entities` 列表。

---

## 6. 与 API 层的对应关系

- **列表/详情响应**：从不从 DB 直接返回 `apiKey` 列明文；经 **掩码函数** 生成 `apiKeyMasked`。
- **写入**：POST 接收明文 → 加密 → 存库；PATCH 在「更新密钥」分支解密替换流程由 3B 实现。
