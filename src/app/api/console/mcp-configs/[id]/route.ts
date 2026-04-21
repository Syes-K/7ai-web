import { NextResponse } from "next/server";
import { MCP_CONFIG_NAME_MAX_LENGTH } from "@/common/constants";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { getDataSource } from "@/server/db/data-source";
import { UserMcpConfig } from "@/server/db/entities/UserMcpConfig";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { encryptMcpCredentials, isMcpCredentialsMasterKeyConfigured } from "@/server/crypto/mcp-credentials-crypto";
import { userMcpConfigToDetailItemJson } from "@/server/mcp/mcp-config-dto";
import { countAssistantsReferencingMcp } from "@/server/mcp/assistant-mcp-bindings";
import {
  parseBoolean,
  trimString,
  validateMcpDescription,
  validateMcpEndpoint,
  validateMcpEndpointShape,
  validateMcpMetadata,
  validateMcpName,
  validateMcpTransport,
} from "@/server/mcp/mcp-config-validation";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

type PatchBody = {
  name?: unknown;
  description?: unknown;
  transport?: unknown;
  endpoint?: unknown;
  metadata?: unknown;
  credentials?: unknown;
  enabled?: unknown;
};

async function getOwnedConfigOr404(userId: string, id: string) {
  const ds = await getDataSource();
  const row = await ds.getRepository(UserMcpConfig).findOne({ where: { id, userId } });
  if (!row) {
    return { ds, row: null as null };
  }
  return { ds, row };
}

/**
 * GET /api/console/mcp-configs/:id
 */
export const GET = withApiWrapper(async (_request: Request, ctx: RouteParams) => {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;
  const { id } = await ctx.params;
  if (!id) {
    return jsonError(ErrorCode.VALIDATION_ERROR, "id 无效", HttpStatus.BAD_REQUEST);
  }

  const { ds, row } = await getOwnedConfigOr404(user.id, id);
  if (!row) {
    return jsonError(ErrorCode.MCP_CONFIG_NOT_FOUND, "配置不存在", HttpStatus.NOT_FOUND);
  }
  const refCount = await countAssistantsReferencingMcp(ds, user.id, id);
  return NextResponse.json(
    { item: userMcpConfigToDetailItemJson(row, refCount) },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

/**
 * PATCH /api/console/mcp-configs/:id
 */
export const PATCH = withApiWrapper(async (request: Request, ctx: RouteParams) => {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;
  const { id } = await ctx.params;
  if (!id) {
    return jsonError(ErrorCode.VALIDATION_ERROR, "id 无效", HttpStatus.BAD_REQUEST);
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return jsonError(ErrorCode.VALIDATION_ERROR, "请求体须为 JSON", HttpStatus.BAD_REQUEST);
  }

  const { ds, row } = await getOwnedConfigOr404(user.id, id);
  if (!row) {
    return jsonError(ErrorCode.MCP_CONFIG_NOT_FOUND, "配置不存在", HttpStatus.NOT_FOUND);
  }

  const details: JsonErrorDetail[] = [];

  if ("name" in body) {
    const name = trimString(body.name);
    const nameDetails: JsonErrorDetail[] = [];
    validateMcpName(name, nameDetails);
    details.push(...nameDetails);
    if (nameDetails.length === 0) row.name = name;
  }

  if ("description" in body) {
    const d = validateMcpDescription(body.description, details);
    if (d !== undefined) row.description = d;
  }

  if ("transport" in body) {
    const t = validateMcpTransport(body.transport, details);
    if (t) row.transport = t;
  }

  if ("endpoint" in body) {
    const ep = validateMcpEndpoint(body.endpoint, details);
    if (ep) row.endpoint = ep;
  }

  if ("metadata" in body) {
    const m = validateMcpMetadata(body.metadata, details);
    if (m !== undefined) row.metadata = m;
  }

  if ("enabled" in body) {
    row.enabled = parseBoolean(body.enabled, row.enabled);
  }

  if ("credentials" in body && body.credentials !== undefined) {
    if (body.credentials === null) {
      details.push({ field: "credentials", message: "请省略 credentials 表示不修改；不支持通过 null 清空（后续可加专用字段）" });
    } else if (typeof body.credentials !== "string") {
      details.push({ field: "credentials", message: "须为字符串" });
    } else {
      const c = body.credentials.trim();
      if (c.length === 0) {
        details.push({ field: "credentials", message: "不允许传空字符串" });
      } else if (!isMcpCredentialsMasterKeyConfigured()) {
        return jsonError(
          ErrorCode.MCP_CREDENTIALS_ENCRYPTION_UNAVAILABLE,
          "服务端未配置 MCP 凭证加密主密钥（MCP_CREDENTIALS_MASTER_KEY），无法保存密钥。",
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      } else {
        try {
          row.credentialsCipher = encryptMcpCredentials(c);
          row.credentialsUpdatedAt = new Date();
        } catch {
          return jsonError(ErrorCode.INTERNAL_ERROR, "密钥加密失败", HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }
    }
  }

  const transportForShape = row.transport;
  validateMcpEndpointShape(transportForShape, row.endpoint, details);

  if (details.length > 0) {
    return jsonError(ErrorCode.VALIDATION_ERROR, "请求参数不合法", HttpStatus.UNPROCESSABLE_ENTITY, details);
  }

  try {
    await ds.getRepository(UserMcpConfig).save(row);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("unique")) {
      return jsonError(
        ErrorCode.MCP_CONFIG_NAME_CONFLICT,
        "名称已存在",
        HttpStatus.CONFLICT,
        [{ field: "name", message: `同一用户下名称须唯一（最长 ${MCP_CONFIG_NAME_MAX_LENGTH} 字）` }],
      );
    }
    return jsonError(ErrorCode.INTERNAL_ERROR, "保存失败，请稍后重试", HttpStatus.INTERNAL_SERVER_ERROR);
  }

  const refCount = await countAssistantsReferencingMcp(ds, user.id, id);
  return NextResponse.json(
    { item: userMcpConfigToDetailItemJson(row, refCount) },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

/**
 * DELETE /api/console/mcp-configs/:id
 */
export const DELETE = withApiWrapper(async (_request: Request, ctx: RouteParams) => {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;
  const { id } = await ctx.params;
  if (!id) {
    return jsonError(ErrorCode.VALIDATION_ERROR, "id 无效", HttpStatus.BAD_REQUEST);
  }

  const { ds, row } = await getOwnedConfigOr404(user.id, id);
  if (!row) {
    return jsonError(ErrorCode.MCP_CONFIG_NOT_FOUND, "配置不存在", HttpStatus.NOT_FOUND);
  }

  const refCount = await countAssistantsReferencingMcp(ds, user.id, id);
  if (refCount > 0) {
    return jsonError(
      ErrorCode.MCP_CONFIG_REFERENCED_BY_ASSISTANT,
      "无法删除：仍被助手引用，请先在助手管理中解除 MCP 挂载。",
      HttpStatus.CONFLICT,
      [{ field: "id", message: `仍被 ${refCount} 个助手引用` }],
    );
  }

  await ds.getRepository(UserMcpConfig).delete({ id, userId: user.id });
  return new NextResponse(null, { status: HttpStatus.NO_CONTENT });
});
