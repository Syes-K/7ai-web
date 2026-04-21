/** MCP 传输类型（用户配置层）。 */
export type McpTransport = "stdio" | "sse" | "http";

export const MCP_TRANSPORT_VALUES: readonly McpTransport[] = ["stdio", "sse", "http"] as const;

/** 最近一次「测试连接」结果状态。 */
export type McpLastCheckStatus = "never" | "success" | "failure";
