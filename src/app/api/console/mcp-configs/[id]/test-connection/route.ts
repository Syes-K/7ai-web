import { NextResponse } from "next/server";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { getDataSource } from "@/server/db/data-source";
import { UserMcpConfig } from "@/server/db/entities/UserMcpConfig";
import { jsonError } from "@/server/http/json-response";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { decryptMcpCredentials } from "@/server/crypto/mcp-credentials-crypto";
import { userMcpConfigToListItemJson } from "@/server/mcp/mcp-config-dto";
import { countAssistantsReferencingMcp } from "@/server/mcp/assistant-mcp-bindings";
import { loadLangChainToolsForUserMcpConfig, sanitizeMcpErrorSummary } from "@/server/mcp/mcp-client-tools";
import { assertMcpTestConnectionRateLimit } from "@/server/mcp/mcp-test-rate-limit";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

/** list_tools 超时时的内部 Error.message（与 mcp-client-tools 一致） */
const MCP_LIST_TOOLS_TIMEOUT_MESSAGE = "MCP list_tools 超时";

/**
 * 将连接测试失败摘要翻译为 locale 文案；不透传裸 exception 或硬编码中文。
 */
function translateMcpTestErrorSummary(locale: Parameters<typeof tApiMessage>[0], err: unknown): string {
  const rawMsg = err instanceof Error ? err.message : String(err);
  if (rawMsg === MCP_LIST_TOOLS_TIMEOUT_MESSAGE) {
    return tApiMessage(locale, "mcpTest.listToolsTimeout");
  }
  const sanitized = sanitizeMcpErrorSummary(err);
  return tApiMessage(locale, "mcpTest.connectionFailed", { detail: sanitized });
}

/**
 * POST /api/console/mcp-configs/:id/test-connection — list_tools 烟测；lastErrorSummary 写入前经 tApiMessage 翻译。
 */
export const POST = withApiWrapper(async (request: Request, ctx: RouteParams) => {
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

  const rl = assertMcpTestConnectionRateLimit(user.id, id);
  if (rl) {
    return jsonError(
      ErrorCode.RATE_LIMITED,
      tApiMessage(locale, "rateLimited"),
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  const ds = await getDataSource();
  const row = await ds.getRepository(UserMcpConfig).findOne({ where: { id, userId: user.id } });
  if (!row) {
    return jsonError(
      ErrorCode.MCP_CONFIG_NOT_FOUND,
      tApiMessage(locale, "mcpConfigNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }

  let credPlain: string | null = null;
  if (row.credentialsCipher) {
    credPlain = decryptMcpCredentials(row.credentialsCipher);
    if (!credPlain) {
      row.lastCheckedAt = new Date();
      row.lastCheckStatus = "failure";
      row.lastErrorSummary = tApiMessage(locale, "mcpTest.credentialsDecryptFailed");
      await ds.getRepository(UserMcpConfig).save(row);
      const refCount = await countAssistantsReferencingMcp(ds, user.id, id);
      return NextResponse.json(
        {
          ok: false,
          item: userMcpConfigToListItemJson(row, refCount),
        },
        { headers: { "Content-Type": "application/json; charset=utf-8" } },
      );
    }
  }

  try {
    await loadLangChainToolsForUserMcpConfig(row, credPlain);
    row.lastCheckedAt = new Date();
    row.lastCheckStatus = "success";
    row.lastErrorSummary = null;
  } catch (e) {
    row.lastCheckedAt = new Date();
    row.lastCheckStatus = "failure";
    row.lastErrorSummary = translateMcpTestErrorSummary(locale, e);
  }

  await ds.getRepository(UserMcpConfig).save(row);
  const refCount = await countAssistantsReferencingMcp(ds, user.id, id);
  const item = userMcpConfigToListItemJson(row, refCount);
  return NextResponse.json(
    { ok: row.lastCheckStatus === "success", item },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});
