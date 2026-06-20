# 风险与实现注意事项（version 0.1.20）

开放问题已在产品阶段按默认关闭（见 `iterations/0.1.20/product/open-questions.md` §已拍板）。本文仅列 **3B 实现与运维风险**。

---

## 1. 架构与一致性风险

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| **prompt / tools / snapshot 不一致** | 0.1.19 根因：三处独立 `loadSkillPackRefsForChatTurn` | 强制单入口 `resolveSkillPackSelectionForTurn`；code review 禁止并行全量 load |
| **loaded 与 merge 结果漂移** | 意图选中但 SKILL.md 缺失导致未 merge | 工具白名单用 **merge 成功后** 的 id；`buildSkillsMergeResult` 后再收窄 `selectedRefs` |
| **`userMessageText` 未透传** | 路由有 content 但 Agent 未收到 | `assistant.ts` + `langchain-agent.ts` 显式参数；集成测试覆盖 stream/non-stream |
| **C1b 误隐藏** | loaded=0 被当成未挂载 | `shouldEmitSkillsStep` 只看 `mounted.length`；**不**用 `loaded===0` 隐藏 |

---

## 2. 意图路由风险

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| **延迟叠加** | 每轮多一次 LLM 调用 | 默认 **15s** 超时（联调自 1500ms 调整）；temperature=0；输入仅 name+description |
| **误选 / 漏选** | 分类器不准 | MVP 接受；`alwaysLoad` 兜底合规包；P1 可加 SKILL 摘要（Q19） |
| **failed_safe 体验** | 用户看到「选用暂不可用」 | 产品已定；日志区分 timeout vs parse；监控 `failed_safe` 率 |
| **空用户消息** | 非 always 不加载 | 与 KB intent skipped 一致；文档化边界 |

---

## 3. 脚本沙箱安全风险

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| **子进程非硬隔离** | MVP 无容器/isolate | 明确「best-effort」；禁止出站网络验收；仅 `scripts/`；py/sh 白名单 |
| **命令注入** | `args[]` 拼接 shell | argv 分离传递；禁止 `bash -c` 用户字符串 |
| **路径穿越** | 恶意 path | `normalizePackFilePath` + 强制 `scripts/` 前缀 |
| **资源耗尽** | CPU/内存/磁盘 | 超时 kill；Turn/日配额；临时目录及时删除 |
| **跨 Pack 读文件** | 脚本读其他 Pack | 沙箱复制**同 Pack** `scripts/**` + `data/`；cwd 限定 workspace |
| **敏感数据泄露** | stdout 进模型上下文 | 输出截断 32k；审计不存 stdout 全文 |

---

## 4. 配额与成本风险

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| **日配额 DB 压力** | 每 spawn 前 COUNT | 索引 `(userId, createdAt)`；可考虑当日缓存（P1） |
| **配额绕过** | 多 Tab 并发 | MVP 接受轻微竞态；事务内 COUNT+INSERT 可 P1 加强 |
| **审计表膨胀** | 高频 run | 90 天清理；启动时 purge job |

---

## 5. 兼容与数据风险

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| **历史 Turn 展示** | 仅 `merged[]` | `normalizeSkillsTurnUi`；`localize-turn-detail.ts` legacy 映射 |
| **`alwaysLoad` 列迁移** | 旧 SQLite | `synchronize: true` 自动加列 default false |
| **frontmatter 与表冲突** | 用户改 SKILL 未改 Switch | 保存 SKILL 时显式 alwaysLoad 才覆盖表；PATCH Switch 不回写文件（Q3） |

---

## 6. 性能风险

| 指标 | 目标 | 风险点 |
| --- | --- | --- |
| 意图路由 P95 | PRD 原 ≤ 1.5s | 默认超时已改为 **15s**；见 [../deviations.md](../deviations.md) |
| 脚本执行 P95 | ≤ 默认 30s | 重 Python 依赖、大 stdout |
| Turn 首 token | 不显著劣化 | selection + intent 在 Agent 构建前串行；MCP 仍并行 |

**缓解**：intent 与 `buildSkillsMergeResult` 可并行（intent 不依赖 SKILL 正文）；merge 仅对 selectedRefs 查询 DB。

---

## 7. 测试与验收风险

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| **环境无 python3** | run tool 全失败 | 部署文档注明依赖；启动时可选探测 log warning |
| **ui-ux-pro-max 依赖** | search.py 多文件 + CSV | 沙箱已复制整个 `scripts/**`；联调 search.py exit 0 通过 |
| **意图不稳定** | E2E flake | 测试可用 alwaysLoad 或 mock intent agent |

---

## 8. 前端交接注意（非 backend 实现，但影响验收）

| 项 | backend 依赖 |
| --- | --- |
| Turn 新 key | `messages/route.ts` 已用新 `turnSafe.*` |
| C1b 隐藏 | 前端 `ChatWorkspace` 同步 `shouldHideUnboundSkillsStep` |
| alwaysLoad UI | PATCH `alwaysLoad` 字段已文档化 |
| legacy Turn | 前端 `normalizeSkillsTurnUi` 或 backend details 已本地化 |

---

## 9. 不在本期缓解的已知限制

- Skills **用户级 vs 系统级** 治理（defer 0.1.21+ 产品确认）
- 容器级沙箱 / seccomp / Landlock
- 出站网络可配置放行
- 意图分类输入含 SKILL 正文摘要（Q19 P1）
- 审计表控制台 UI（Q14 P1）
- 模型是否「遵循」SKILL 的正文检测

---

## 10. 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-06-19 | 3A：实现风险清单（开放问题已关闭） |
| 2026-06-20 | 结项：意图超时 15s、沙箱 scripts/**、ui-ux 联调 |
