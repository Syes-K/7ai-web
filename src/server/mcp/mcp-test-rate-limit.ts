import { MCP_TEST_CONNECTION_MIN_INTERVAL_MS } from "@/common/constants";

const lastAttemptAt = new Map<string, number>();

export function assertMcpTestConnectionRateLimit(userId: string, mcpConfigId: string): { retryAfterMs: number } | null {
  const key = `${userId}:${mcpConfigId}`;
  const now = Date.now();
  const last = lastAttemptAt.get(key) ?? 0;
  const delta = now - last;
  if (delta < MCP_TEST_CONNECTION_MIN_INTERVAL_MS) {
    return { retryAfterMs: MCP_TEST_CONNECTION_MIN_INTERVAL_MS - delta };
  }
  lastAttemptAt.set(key, now);
  return null;
}
