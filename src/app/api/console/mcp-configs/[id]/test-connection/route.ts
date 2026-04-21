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

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/console/mcp-configs/:id/test-connection — 对已落库配置做 list_tools 烟测并更新检测字段。
 */
export const POST = withApiWrapper(async (_request: Request, ctx: RouteParams) => {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;
  const { id } = await ctx.params;
  if (!id) {
    return jsonError(ErrorCode.VALIDATION_ERROR, "id 无效", HttpStatus.BAD_REQUEST);
  }

  const rl = assertMcpTestConnectionRateLimit(user.id, id);
  if (rl) {
    return jsonError(ErrorCode.RATE_LIMITED, "请求过于频繁，请稍后再试", HttpStatus.TOO_MANY_REQUESTS);
  }

  const ds = await getDataSource();
  const row = await ds.getRepository(UserMcpConfig).findOne({ where: { id, userId: user.id } });
  if (!row) {
    return jsonError(ErrorCode.MCP_CONFIG_NOT_FOUND, "配置不存在", HttpStatus.NOT_FOUND);
  }

  let credPlain: string | null = null;
  if (row.credentialsCipher) {
    credPlain = decryptMcpCredentials(row.credentialsCipher);
    if (!credPlain) {
      row.lastCheckedAt = new Date();
      row.lastCheckStatus = "failure";
      row.lastErrorSummary = "凭证解密失败（请检查服务端密钥或重新保存凭证）";
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
    row.lastErrorSummary = sanitizeMcpErrorSummary(e);
  }

  await ds.getRepository(UserMcpConfig).save(row);
  const refCount = await countAssistantsReferencingMcp(ds, user.id, id);
  const item = userMcpConfigToListItemJson(row, refCount);
  return NextResponse.json(
    { ok: row.lastCheckStatus === "success", item },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});
