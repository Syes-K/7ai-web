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
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";

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
 * GET / PATCH / DELETE MCP 配置；错误 message 随 locale 双语。
 */
export const GET = withApiWrapper(async (request: Request, ctx: RouteParams) => {
  const locale = resolveRequestLocale(request);
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(
      ErrorCode.UNAUTHORIZED,
      tApiMessage(locale, "unauthorized"),
      HttpStatus.UNAUTHORIZED,
    );
  }
  const { user } = reqCtx;
  const { id } = await ctx.params;
  if (!id) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidId"),
      HttpStatus.BAD_REQUEST,
    );
  }

  const { ds, row } = await getOwnedConfigOr404(user.id, id);
  if (!row) {
    return jsonError(
      ErrorCode.MCP_CONFIG_NOT_FOUND,
      tApiMessage(locale, "mcpConfigNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }
  const refCount = await countAssistantsReferencingMcp(ds, user.id, id);
  return NextResponse.json(
    { item: userMcpConfigToDetailItemJson(row, refCount) },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

export const PATCH = withApiWrapper(async (request: Request, ctx: RouteParams) => {
  const locale = resolveRequestLocale(request);
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(
      ErrorCode.UNAUTHORIZED,
      tApiMessage(locale, "unauthorized"),
      HttpStatus.UNAUTHORIZED,
    );
  }
  const { user } = reqCtx;
  const { id } = await ctx.params;
  if (!id) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidId"),
      HttpStatus.BAD_REQUEST,
    );
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidJson"),
      HttpStatus.BAD_REQUEST,
    );
  }

  const { ds, row } = await getOwnedConfigOr404(user.id, id);
  if (!row) {
    return jsonError(
      ErrorCode.MCP_CONFIG_NOT_FOUND,
      tApiMessage(locale, "mcpConfigNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }

  const details: JsonErrorDetail[] = [];

  if ("name" in body) {
    const name = trimString(body.name);
    const nameDetails: JsonErrorDetail[] = [];
    validateMcpName(name, nameDetails, locale);
    details.push(...nameDetails);
    if (nameDetails.length === 0) row.name = name;
  }

  if ("description" in body) {
    const d = validateMcpDescription(body.description, details, locale);
    if (d !== undefined) row.description = d;
  }

  if ("transport" in body) {
    const t = validateMcpTransport(body.transport, details, locale);
    if (t) row.transport = t;
  }

  if ("endpoint" in body) {
    const ep = validateMcpEndpoint(body.endpoint, details, locale);
    if (ep) row.endpoint = ep;
  }

  if ("metadata" in body) {
    const m = validateMcpMetadata(body.metadata, details, locale);
    if (m !== undefined) row.metadata = m;
  }

  if ("enabled" in body) {
    row.enabled = parseBoolean(body.enabled, row.enabled);
  }

  if ("credentials" in body && body.credentials !== undefined) {
    if (body.credentials === null) {
      details.push({
        field: "credentials",
        message: tApiMessage(locale, "validation.mcpCredentialsOmitToKeep"),
      });
    } else if (typeof body.credentials !== "string") {
      details.push({
        field: "credentials",
        message: tApiMessage(locale, "validation.mcpCredentialsStringRequired"),
      });
    } else {
      const c = body.credentials.trim();
      if (c.length === 0) {
        details.push({
          field: "credentials",
          message: tApiMessage(locale, "validation.mcpCredentialsEmptyString"),
        });
      } else if (!isMcpCredentialsMasterKeyConfigured()) {
        return jsonError(
          ErrorCode.MCP_CREDENTIALS_ENCRYPTION_UNAVAILABLE,
          tApiMessage(locale, "mcpCredentialsEncryptionUnavailable"),
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      } else {
        try {
          row.credentialsCipher = encryptMcpCredentials(c);
          row.credentialsUpdatedAt = new Date();
        } catch {
          return jsonError(
            ErrorCode.INTERNAL_ERROR,
            tApiMessage(locale, "credentialEncryptionFailed"),
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      }
    }
  }

  const transportForShape = row.transport;
  validateMcpEndpointShape(transportForShape, row.endpoint, details, locale);

  if (details.length > 0) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidParams"),
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    );
  }

  try {
    await ds.getRepository(UserMcpConfig).save(row);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("unique")) {
      return jsonError(
        ErrorCode.MCP_CONFIG_NAME_CONFLICT,
        tApiMessage(locale, "mcpConfigNameConflict"),
        HttpStatus.CONFLICT,
        [{
          field: "name",
          message: tApiMessage(locale, "validation.mcpConfigNameUnique", {
            maxLength: MCP_CONFIG_NAME_MAX_LENGTH,
          }),
        }],
      );
    }
    return jsonError(
      ErrorCode.INTERNAL_ERROR,
      tApiMessage(locale, "saveFailedRetry"),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  const refCount = await countAssistantsReferencingMcp(ds, user.id, id);
  return NextResponse.json(
    { item: userMcpConfigToDetailItemJson(row, refCount) },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});

export const DELETE = withApiWrapper(async (request: Request, ctx: RouteParams) => {
  const locale = resolveRequestLocale(request);
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(
      ErrorCode.UNAUTHORIZED,
      tApiMessage(locale, "unauthorized"),
      HttpStatus.UNAUTHORIZED,
    );
  }
  const { user } = reqCtx;
  const { id } = await ctx.params;
  if (!id) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidId"),
      HttpStatus.BAD_REQUEST,
    );
  }

  const { ds, row } = await getOwnedConfigOr404(user.id, id);
  if (!row) {
    return jsonError(
      ErrorCode.MCP_CONFIG_NOT_FOUND,
      tApiMessage(locale, "mcpConfigNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }

  const refCount = await countAssistantsReferencingMcp(ds, user.id, id);
  if (refCount > 0) {
    return jsonError(
      ErrorCode.MCP_CONFIG_REFERENCED_BY_ASSISTANT,
      tApiMessage(locale, "mcpConfigReferencedByAssistant"),
      HttpStatus.CONFLICT,
      [{
        field: "id",
        message: tApiMessage(locale, "validation.mcpConfigReferencedCount", { count: refCount }),
      }],
    );
  }

  await ds.getRepository(UserMcpConfig).delete({ id, userId: user.id });
  return new NextResponse(null, { status: HttpStatus.NO_CONTENT });
});
