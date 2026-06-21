# 手动测试清单（version 0.1.21 前端）

前置：`npm run dev`；admin 账号 + 普通用户账号。

---

## Admin Skills（P0-A）

- [ ] `/admin/skills` 侧栏可见「技能包」（models 与 prompts 之间）
- [ ] 列表 GET `/api/admin/skill-configs`；搜索 keyword 生效
- [ ] 导入 Zip → 201/200 toast；列表刷新
- [ ] 行「详情」→ 只读 Drawer：元数据 Descriptions、文件树、pre 预览；**无**保存/Switch
- [ ] 行「重新导入」→ overwrite Modal 警告 + 同 packId 导入
- [ ] 删除未挂载 Pack → 成功
- [ ] 删除被挂载 Pack → 409 Modal 列出助手名
- [ ] 非 admin 访问 `/api/admin/skill-configs` → 403

---

## 控制台退场（P0-B）

- [ ] 控制台侧栏**无**「技能包」
- [ ] 普通用户访问 `/console/skills` → 404
- [ ] admin 访问 `/console/skills` → 302 `/admin/skills`
- [ ] 控制台助手编辑：技能多选来自 `/api/console/skill-catalog`
- [ ] catalog 空 → info Alert「联系管理员」；**无** console/skills 链接
- [ ] admin 在助手表单见「管理技能包」→ `/admin/skills`
- [ ] 非 admin **无**管理链接
- [ ] 助手技能多选：**可点击选中**；保存 binding 成功

---

## Turn i18n（P0-C）

- [ ] 新 Turn C1b 展开：摘要随 UI locale（`safeMessageKey`）
- [ ] skipped 行 reason 为 i18n（非 LLM 原文）
- [ ] `intentSource=failed_safe` 时见 `skillsIntentFailedBody`
- [ ] 切换 en/zh 后历史 Turn 详情标题/行尽量映射为当前语言

---

## Admin 系统助手（P1）

- [ ] `/admin/assistants` 编辑表单有技能包多选
- [ ] catalog 空 → 链至 `/admin/skills` 的提示
- [ ] 保存后 binding PUT（若后端支持 system scope）

---

## 联调补丁（2026-06-21）

- [ ] 断网或服务未启动时发送消息 → Toast「网络异常，请重试」；输入框内容恢复；无残留假发送气泡
- [ ] `npm start` 后并发打开 admin 页 → 无 DB `prepare` 报错
- [ ] 助手表单**无**「部分已挂载的技能包已停用」黄色 Alert

---

## 回归

- [ ] 挂载技能包的对话：C1b loaded + 可选 read/run 详情
- [ ] `npx tsc --noEmit` 通过
- [ ] `npm run lint` 通过
