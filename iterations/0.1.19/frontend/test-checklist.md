# 前端验收清单 — Skill Pack 0.1.19

## 控制台 — 技能包管理

- [ ] `/console/skills` 列表：fileCount、hasScripts Tag、无 contentPreview
- [ ] 新建技能包 → 打开 Drawer，含默认 `SKILL.md`
- [ ] 导入 `fixtures/greeting-test-skill.zip` → fileCount=3，hasScripts=含脚本
- [ ] Drawer：Tree 切换文件、保存当前/全部、新建/重命名/删除（不可删唯一 SKILL.md）
- [ ] scripts/ 显示只读 Badge + Alert
- [ ] 顶部说明为用户向文案（非「服务端技能包」）；**无**迁移 Banner

## 助手挂载

- [ ] Personal 助手 → 技能包多选 → 选项含 `{name} · N 个文件`、含脚本 Tag
- [ ] 保存后 GET skill-configs 子资源回显正确
- [ ] 删除被引用 Pack → 409 + 助手管理链接

## 对话运行时

- [ ] 使用已挂载助手的会话发送消息
- [ ] Turn C1b「技能包」步骤可见（有挂载时）
- [ ] 「请用技能包测试打个招呼，用中文」→ 可能 read greetings.md；展开 details
- [ ] 问无关问题（如天气）→ 仍显示合并/加载（**已知限制**，0.1.20 修复）

## 迁移

- [ ] 含 0.1.18 `content` 的旧库启动 → 自动生成 `SKILL.md`，content 清空
- [ ] 重复启动迁移幂等

## 构建

- [ ] `npm run build` 通过（TypeScript + ESLint）
