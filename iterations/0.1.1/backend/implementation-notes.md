# 实现说明：助手管理（version 0.1.1，3B）

## 代码位置

| 模块 | 路径 |
| --- | --- |
| 实体 | `src/server/db/entities/Assistant.ts` |
| 数据源注册 | `src/server/db/data-source.ts` |
| DTO / 标签解析 | `src/server/assistant/assistant-dto.ts`、`parse-assistant-tags.ts`、`create-assistant.ts` |
| 控制台 API | `src/app/api/console/assistants/route.ts`、`src/app/api/console/assistants/[id]/route.ts` |
| 管理端 API | `src/app/api/admin/assistants/route.ts`、`src/app/api/admin/assistants/[id]/route.ts` |
| 控制台页面 | `src/app/console/assistants/page.tsx` |
| 管理端页面 | `src/app/admin/assistants/page.tsx` |
| 类型与常量 | `src/common/types/assistant.ts`、`src/common/constants/index.ts`、`src/common/enums/assistant-scope.ts`、`src/common/enums/http.ts`（`ASSISTANT_NOT_FOUND`） |

## 与 api-spec 的差异 / 约定

- **列表/详情**均返回完整 `prompt`（未做截断）；若后续需减轻列表 payload，可加分段字段并改前端。
- **DELETE 控制台/管理端**成功均为 **204 No Content**。
- **GET `/api/console/models/[id]`** 旧接口返回体未包一层 `item`；助手 **GET** 统一为 `{ item }`，与本文 `api-spec.md` 一致。

## 自测建议

1. 管理员登录：`/admin/assistants` 新建/编辑/删除系统助手；列表「搜索名称」可用。
2. 普通用户：`/console/assistants` 可见系统+个人助手；系统行仅「查看」可点；个人可编辑删除。
3. 未登录访问 `/api/console/assistants` → 401 JSON。

## 修订记录

| 日期 | 说明 |
| --- | --- |
| 2026-04-13 | 3B 初稿 |
