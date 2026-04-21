import { NextResponse } from "next/server";
import { AssistantScope, ErrorCode, HttpStatus } from "@/common/enums";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { getDataSource } from "@/server/db/data-source";
import { Assistant } from "@/server/db/entities/Assistant";
import {
  listMcpConfigIdsByAssistantIds,
  replaceAssistantMcpBindings,
} from "@/server/mcp/assistant-mcp-bindings";
import { parseMcpConfigIdsField } from "@/server/mcp/parse-mcp-config-ids";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

type PutBody = { mcpConfigIds?: unknown };

/**
 * GET /api/console/assistants/:id/mcp-configs — 当前用户个人助手已挂载的 MCP 配置 id 列表。
 */
export const GET = withApiWrapper(async (_request: Request, ctx: RouteParams) => {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  const { id: assistantId } = await ctx.params;
  if (!assistantId) {
    return jsonError(ErrorCode.VALIDATION_ERROR, "id 无效", HttpStatus.BAD_REQUEST);
  }

  const ds = await getDataSource();
  const assistant = await ds.getRepository(Assistant).findOne({
    where: { id: assistantId, scope: AssistantScope.Personal, userId: user.id },
  });
  if (!assistant) {
    return jsonError(ErrorCode.ASSISTANT_NOT_FOUND, "助手不存在", HttpStatus.NOT_FOUND);
  }

  const map = await listMcpConfigIdsByAssistantIds(ds, user.id, [assistantId]);
  const ids = map.get(assistantId) ?? [];
  return NextResponse.json(
    { assistantId, mcpConfigIds: ids },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

/**
 * PUT /api/console/assistants/:id/mcp-configs — 全量替换助手 ↔ MCP 挂载。
 */
export const PUT = withApiWrapper(async (request: Request, ctx: RouteParams) => {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  const { id: assistantId } = await ctx.params;
  if (!assistantId) {
    return jsonError(ErrorCode.VALIDATION_ERROR, "id 无效", HttpStatus.BAD_REQUEST);
  }

  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return jsonError(ErrorCode.VALIDATION_ERROR, "请求体须为 JSON", HttpStatus.BAD_REQUEST);
  }

  if (body.mcpConfigIds === undefined) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "请求参数不合法",
      HttpStatus.UNPROCESSABLE_ENTITY,
      [{ field: "mcpConfigIds", message: "须提供 mcpConfigIds 数组（可为空数组）" }],
    );
  }
  const details: JsonErrorDetail[] = [];
  const mcpConfigIds = parseMcpConfigIdsField(body.mcpConfigIds, details);
  if (mcpConfigIds === undefined || details.length > 0) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "请求参数不合法",
      HttpStatus.UNPROCESSABLE_ENTITY,
      details.length > 0 ? details : [{ field: "mcpConfigIds", message: "格式无效" }],
    );
  }

  const ds = await getDataSource();
  const assistant = await ds.getRepository(Assistant).findOne({
    where: { id: assistantId, scope: AssistantScope.Personal, userId: user.id },
  });
  if (!assistant) {
    return jsonError(ErrorCode.ASSISTANT_NOT_FOUND, "助手不存在", HttpStatus.NOT_FOUND);
  }

  const rep = await replaceAssistantMcpBindings(ds, user.id, assistantId, mcpConfigIds);
  if (!rep.ok) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "请求参数不合法",
      HttpStatus.UNPROCESSABLE_ENTITY,
      [{ field: "mcpConfigIds", message: "包含无效 MCP 配置" }],
    );
  }

  return NextResponse.json(
    { assistantId, mcpConfigIds },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});
