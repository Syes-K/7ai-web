# 风险与实现注意事项（version 0.1.21）

开放问题 Q1/Q2/Q8/Q10/Q16 已关闭；Q3–Q27 按建议默认执行。Backend 3A 已定稿 B1–B8、T1–T5（见 [README.md](./README.md) §4）。本文列 **3B 实现与运维风险**。

---

## 1. 数据迁移风险

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| **迁移失败 mid-flight** | SQLite 重建表中断 | 迁移前 **全库备份**；单事务；失败则恢复备份 |
| **name 冲突未穷尽** | 后缀后仍 UNIQUE 失败 | B2 算法追加 `-2` 序号；迁移 log 人工复核 |
| **Pack id 变化** | 误用 DELETE+INSERT | overwrite **仅**删 files；**禁止**删 Pack 行 |
| **binding 断裂** | 误删 Pack 或改 id | 迁移脚本 **不** 动 `assistant_skill_bindings` |
| **SkillPackFile userId 残留** | 代码仍带 userId 查询 | 3B checklist：grep `userId` in `pack-files` / routes |
| **多环境不同步** | dev/staging 未迁移 | 部署 runbook：先 migrate 再启 app |

**回滚**：仅支持 **整库恢复** + 代码回退 0.1.20；不支持在线逆迁移。

---

## 2. API 与权限风险

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| **console API 仍被调用** | 旧 frontend 缓存 | 410 + 明确 message；frontend 同步发版 |
| **catalog 泄露 disabled** | 错误过滤 | SQL `WHERE enabled = 1`；集成测试 |
| **非 admin import** | 路由漏 guard | 所有 admin 路由 **必须** `withAdminApi` code review |
| **403 vs 410 混淆** | 客户端处理错误 | 文档化 ErrorCode；frontend 分支清晰 |
| **DELETE 409 体不一致** | 旧客户端只读 details | 新增 `referencedAssistants` **向后兼容**（增量字段） |

---

## 3. 运行时一致性风险

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| **turn-capabilities 漏改 userId** | Pack 查不到 → loadFailed | 迁移后全量 grep；E2E 对话回归 |
| **intent agent 仍写中文 reason** | 英文 UI 泄漏 | 单测 parseReasonCode；无效值丢弃 |
| **reasonCode 与 i18n 漂移** | 新增 code 无 key | enum 与 message.json **同 PR** |
| **safeMessageKey 未落库** | 语言切换失败 | T1 定稿双写；GET messages 断言 |
| **failed_safe 误判** | 与 mounted-not-selected 混淆 | 保持 0.1.20 分支顺序 |

**关键**：`resolveSkillPackSelectionForTurn` 主流程 **不变**；仅数据源从 per-user → 系统库。

---

## 4. 兼容与历史数据风险

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| **旧 Turn 中文 reason** | 英文 UI 显示中文 | B7：无 reasonCode → 仅包名 |
| **旧 Turn 无 safeMessageKey** | ChatWorkspace 隐藏逻辑失效 | `legacySafeMessageMatches` 集中维护 |
| **0.1.19 merged[] Turn** | 展示崩溃 | 沿用 `normalizeSkillsTurnUi` |
| **bookmark /console/skills** | 用户困惑 | B8：admin 302；普通 404 |

**决策 T4**：**不**批量迁移历史 Turn；接受 legacy 展示降级。

---

## 5. 产品与运营风险

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| **用户 Pack 「被收归国有」** | Q1 取消用户级 | 迁移保留 id；公告（可选）；绑定仍有效 |
| **admin 无法在线改 enabled** | Q10 零保存 | 文档 + Alert：改 frontmatter → re-import |
| **系统 Pack 上限** | 200 不够 | env 可配置；监控 Pack 总数 |
| **多用户同名 Pack 后缀丑** | migrated 后缀 | 仅冲突行；admin 可 re-import 改名 zip |

---

## 6. 性能风险

| 指标 | 风险点 | 缓解 |
| --- | --- | --- |
| catalog GET | 全表扫描 | Pack 规模小（≤200）；索引 `enabled, updatedAt` 可选 |
| admin 列表分页 | 大库 | 默认 pageSize 20 |
| import 覆盖 | 大 zip 事务长 | 沿用 0.1.20 大小限制；事务超时监控 |
| DELETE 引用查询 | JOIN Assistant | binding 表 indexed；单次 DELETE |

**不变**：intent 15s 超时、run 沙箱性能特征与 0.1.20 相同。

---

## 7. 测试与验收风险

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| **#17 i18n 测试失败** | key 漏翻 | en/zh parity 脚本；SSE + GET 双路径 |
| **0.1.20 回归失败** | 迁移破坏 runtime | 场景 A/B 列为 P0 门禁 |
| **410 误伤 E2E** | 测试仍调 console API | 更新测试 fixture 路径 |
| **多 admin 并发 import** | 最后写入赢 | MVP 接受；按钮 loading 互斥（frontend） |

---

## 8. 未决项（需用户确认或 3B 前拍板）

| ID | 项 | 默认 | 需确认？ |
| --- | --- | --- | --- |
| **R1** | `SKILL_PACK_MAX_SYSTEM` 默认 **200** vs 沿用 50 | 200 | 可选确认 |
| **R2** | console GET files 短期 alias | **否**，直接 410 | 否 |
| **R3** | P1 `lines[]` 是否纳入 0.1.21 结项 | **否**，可延期 | 否 |
| **R4** | 迁移后是否发 admin 公告 | 产品可选 | 否 |
| **R5** | `UserSkillConfig` 类名长期是否重命名为 `SkillPack` | 保留现名 | 否（B1 已关闭） |

**无阻塞 3B 的开放项**：R1 可按默认 200 实施；若产品要强约束 50，3B 改常量即可。

---

## 9. Frontend 交接注意

| 项 | backend 依赖 |
| --- | --- |
| Admin Skills 页 | §2 Admin API；DELETE 409 `referencedAssistants` |
| 助手 catalog | `GET /api/console/skill-catalog` |
| 零保存 UI | 无 PATCH；403 不应被用户触发 |
| ChatWorkspace | `safeMessageKey` + legacy helper |
| localize-turn-detail | 行级 legacy；skipped 无 reasonCode |
| `/console/skills` | 302/404（frontend 路由，非 API） |

---

## 10. 不在本期缓解的已知限制

- 用户私有 Skill Pack（Q1 已关闭）
- Intent 快模型 / 沙箱容器化（0.1.20 P2）
- `skill_script_runs` 审计 UI（P3）
- 历史 Turn 批量 reasonCode 迁移（T4 否）
- `failureKind` 细分 copy（T5 否）
- 在线 IDE / 单文件编辑

---

## 11. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-20 | 3A：迁移/API/兼容风险与未决项 R1–R5 |
