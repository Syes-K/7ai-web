import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  MCP_CONFIG_MAX_PER_USER,
  MCP_CONFIG_NAME_MAX_LENGTH,
} from "@/common/constants";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { getDataSource } from "@/server/db/data-source";
import { UserMcpConfig } from "@/server/db/entities/UserMcpConfig";
import { AssistantMcpBinding } from "@/server/db/entities/AssistantMcpBinding";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { encryptMcpCredentials, isMcpCredentialsMasterKeyConfigured } from "@/server/crypto/mcp-credentials-crypto";
import { userMcpConfigToListItemJson } from "@/server/mcp/mcp-config-dto";
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

type PostBody = {
  name?: unknown;
  description?: unknown;
  transport?: unknown;
  endpoint?: unknown;
  metadata?: unknown;
  credentials?: unknown;
  enabled?: unknown;
};

async function loadReferenceCountsByMcpId(ds: Awaited<ReturnType<typeof getDataSource>>, userId: string) {
  const raw = await ds
    .getRepository(AssistantMcpBinding)
    .createQueryBuilder("b")
    .select("b.mcpConfigId", "mid")
    .addSelect("COUNT(*)", "cnt")
    .where("b.userId = :uid", { uid: userId })
    .groupBy("b.mcpConfigId")
    .getRawMany<{ mid: string; cnt: string }>();
  const m = new Map<string, number>();
  for (const r of raw) {
    m.set(r.mid, Number.parseInt(String(r.cnt), 10) || 0);
  }
  return m;
}

/**
 * GET /api/console/mcp-configs — 当前用户的 MCP 配置列表。
 */
export const GET = withApiWrapper(async (request: Request) => {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  const url = new URL(request.url);
  const keyword = (url.searchParams.get("keyword") ?? "").trim();

  const ds = await getDataSource();
  const repo = ds.getRepository(UserMcpConfig);
  const qb = repo.createQueryBuilder("m").where("m.userId = :uid", { uid: user.id });
  if (keyword.length > 0) {
    qb.andWhere("(instr(lower(m.name), lower(:kw)) > 0 OR instr(lower(m.description), lower(:kw)) > 0)", {
      kw: keyword,
    });
  }
  const rows = await qb.orderBy("m.updatedAt", "DESC").addOrderBy("m.id", "DESC").getMany();
  const counts = await loadReferenceCountsByMcpId(ds, user.id);
  const items = rows.map((r) => userMcpConfigToListItemJson(r, counts.get(r.id) ?? 0));
  return NextResponse.json({ items }, { headers: { "Content-Type": "application/json; charset=utf-8" } });
});

/**
 * POST /api/console/mcp-configs — 新建 MCP 配置。
 */
export const POST = withApiWrapper(async (request: Request) => {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return jsonError(ErrorCode.VALIDATION_ERROR, "请求体须为 JSON", HttpStatus.BAD_REQUEST);
  }

  const details: JsonErrorDetail[] = [];
  const name = trimString(body.name);
  validateMcpName(name, details);

  let description: string | null = null;
  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    const d = validateMcpDescription(body.description, details);
    if (d !== undefined) description = d;
  }

  const transport = validateMcpTransport(body.transport, details);
  const endpoint = validateMcpEndpoint(body.endpoint, details);

  let metadata: Record<string, unknown> | null = null;
  if (Object.prototype.hasOwnProperty.call(body, "metadata")) {
    const m = validateMcpMetadata(body.metadata, details);
    if (m !== undefined) metadata = m;
  }

  const enabled = parseBoolean(body.enabled, true);

  let credentialsCipher: string | null = null;
  let credentialsUpdatedAt: Date | null = null;
  if ("credentials" in body && body.credentials !== undefined && body.credentials !== null) {
    if (typeof body.credentials !== "string") {
      details.push({ field: "credentials", message: "须为字符串或 null" });
    } else {
      const c = body.credentials.trim();
      if (c.length === 0) {
        details.push({ field: "credentials", message: "不允许传空字符串；省略字段表示不配置密钥" });
      } else if (!isMcpCredentialsMasterKeyConfigured()) {
        return jsonError(
          ErrorCode.MCP_CREDENTIALS_ENCRYPTION_UNAVAILABLE,
          "服务端未配置 MCP 凭证加密主密钥（MCP_CREDENTIALS_MASTER_KEY），无法保存密钥。",
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      } else {
        try {
          credentialsCipher = encryptMcpCredentials(c);
          credentialsUpdatedAt = new Date();
        } catch {
          return jsonError(ErrorCode.INTERNAL_ERROR, "密钥加密失败", HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }
    }
  }

  if (transport && endpoint) {
    validateMcpEndpointShape(transport, endpoint, details);
  }

  if (details.length > 0) {
    return jsonError(ErrorCode.VALIDATION_ERROR, "请求参数不合法", HttpStatus.UNPROCESSABLE_ENTITY, details);
  }
  if (!transport || !endpoint) {
    return jsonError(ErrorCode.VALIDATION_ERROR, "请求参数不合法", HttpStatus.UNPROCESSABLE_ENTITY, details);
  }

  const ds = await getDataSource();
  const existingCount = await ds.getRepository(UserMcpConfig).count({ where: { userId: user.id } });
  if (existingCount >= MCP_CONFIG_MAX_PER_USER) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      `单用户 MCP 配置最多 ${MCP_CONFIG_MAX_PER_USER} 条`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      [{ field: "name", message: "已达上限" }],
    );
  }

  const row = ds.getRepository(UserMcpConfig).create({
    id: uuidv4(),
    userId: user.id,
    name,
    description,
    transport,
    endpoint,
    metadata,
    credentialsCipher,
    credentialsUpdatedAt,
    enabled,
    lastCheckedAt: null,
    lastCheckStatus: "never",
    lastErrorSummary: null,
  });

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

  const counts = await loadReferenceCountsByMcpId(ds, user.id);
  return NextResponse.json(
    { item: userMcpConfigToListItemJson(row, counts.get(row.id) ?? 0) },
    { status: HttpStatus.CREATED, headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});
