import { MultiServerMCPClient, type Connection } from "@langchain/mcp-adapters";
import type { Tool } from "@langchain/core/tools";
import { MCP_LIST_TOOLS_TIMEOUT_MS } from "@/common/constants";
import type { UserMcpConfig } from "@/server/db/entities/UserMcpConfig";
import { mcpServerNameForConfigId, userMcpConfigToConnection } from "./mcp-connection-from-row";

export async function withTimeout<T>(p: Promise<T>, ms: number, message = "timeout"): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function sanitizeMcpErrorSummary(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const oneLine = raw.replace(/\s+/g, " ").trim();
  return oneLine.length > 400 ? `${oneLine.slice(0, 397)}...` : oneLine;
}

/**
 * 对单条 MCP 配置建立客户端、拉取 LangChain tools，并在 finally 中关闭连接。
 * 仅用于控制台「测试连接」等烟测；**对话链路勿用**——工具需依赖存活的 {@link MultiServerMCPClient} 才能 invoke。
 */
export async function loadLangChainToolsForUserMcpConfig(
  row: UserMcpConfig,
  credentialsPlain: string | null,
): Promise<Tool[]> {
  const serverName = mcpServerNameForConfigId(row.id);
  const connection = userMcpConfigToConnection(row, credentialsPlain);
  const client = new MultiServerMCPClient({
    mcpServers: { [serverName]: connection },
    onConnectionError: "ignore",
    throwOnLoadError: false,
    prefixToolNameWithServerName: true,
    useStandardContentBlocks: true,
  });
  try {
    const tools = await withTimeout(client.getTools(), MCP_LIST_TOOLS_TIMEOUT_MS, "MCP list_tools 超时");
    return tools as unknown as Tool[];
  }
  finally {
    await client.close().catch(() => undefined);
  }
}

export type McpChatSessionHandle = {
  tools: Tool[];
  /** 须在整轮 Agent（含流式）结束后调用，以释放子进程 / HTTP 连接 */
  dispose: () => Promise<void>;
};

/**
 * 为本轮对话建立 **单一** {@link MultiServerMCPClient}，拉取工具后**不**关闭连接；
 * 返回的 LangChain 工具内部仍绑定该客户端，须在 {@link McpChatSessionHandle.dispose} 中断开。
 */
export async function openMcpLangChainToolsForChatSession(
  rows: UserMcpConfig[],
  credentialPlainByConfigId: Map<string, string | null>,
): Promise<McpChatSessionHandle> {
  if (rows.length === 0) {
    return {
      tools: [],
      dispose: async () => undefined,
    };
  }
  const mcpServers: Record<string, Connection> = {};
  for (const row of rows) {
    const cred = credentialPlainByConfigId.has(row.id)
      ? credentialPlainByConfigId.get(row.id) ?? null
      : null;
    mcpServers[mcpServerNameForConfigId(row.id)] = userMcpConfigToConnection(row, cred);
  }
  const client = new MultiServerMCPClient({
    mcpServers,
    onConnectionError: "ignore",
    throwOnLoadError: false,
    prefixToolNameWithServerName: true,
    useStandardContentBlocks: true,
  });
  try {
    const tools = (await withTimeout(
      client.getTools(),
      MCP_LIST_TOOLS_TIMEOUT_MS,
      "MCP list_tools 超时",
    )) as unknown as Tool[];
    return {
      tools,
      dispose: async () => {
        await client.close().catch(() => undefined);
      },
    };
  } catch (e) {
    await client.close().catch(() => undefined);
    throw e;
  }
}
