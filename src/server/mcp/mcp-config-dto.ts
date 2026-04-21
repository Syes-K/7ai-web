import type { UserMcpConfig } from "@/server/db/entities/UserMcpConfig";
import { summarizeMcpEndpoint } from "./mcp-endpoint-summary";

export type McpConfigListItemJson = {
  id: string;
  name: string;
  description: string | null;
  transport: string;
  endpointSummary: string;
  credentialsConfigured: boolean;
  enabled: boolean;
  lastCheckedAt: string | null;
  lastCheckStatus: string;
  lastErrorSummary: string | null;
  createdAt: string;
  updatedAt: string;
  /** 引用该 MCP 配置的助手数量（用于删除拦截提示） */
  referencedAssistantCount: number;
};

export function userMcpConfigToListItemJson(
  row: UserMcpConfig,
  referencedAssistantCount: number,
): McpConfigListItemJson {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    transport: row.transport,
    endpointSummary: summarizeMcpEndpoint(row.transport, row.endpoint),
    credentialsConfigured: Boolean(row.credentialsCipher),
    enabled: row.enabled,
    lastCheckedAt: row.lastCheckedAt ? row.lastCheckedAt.toISOString() : null,
    lastCheckStatus: row.lastCheckStatus,
    lastErrorSummary: row.lastErrorSummary,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    referencedAssistantCount,
  };
}

/** 单条详情（编辑表单）：含可回填的 endpoint / metadata，仍不含 credentials 明文。 */
export type McpConfigDetailItemJson = McpConfigListItemJson & {
  endpoint: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
};

export function userMcpConfigToDetailItemJson(
  row: UserMcpConfig,
  referencedAssistantCount: number,
): McpConfigDetailItemJson {
  return {
    ...userMcpConfigToListItemJson(row, referencedAssistantCount),
    endpoint: row.endpoint,
    metadata: row.metadata,
  };
}
