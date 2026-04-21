import type { Connection } from "@langchain/mcp-adapters";
import type { UserMcpConfig } from "@/server/db/entities/UserMcpConfig";
import type { McpTransport } from "@/common/enums";

function mergeHeaders(
  metadata: Record<string, unknown> | null | undefined,
  credentialsPlain: string | null,
): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  const mh = metadata && typeof metadata.headers === "object" ? (metadata.headers as Record<string, unknown>) : null;
  if (mh) {
    for (const [k, v] of Object.entries(mh)) {
      if (typeof v === "string" && v.trim()) out[k] = v;
    }
  }
  const t = credentialsPlain?.trim();
  if (t) {
    if (t.startsWith("{")) {
      try {
        const j = JSON.parse(t) as Record<string, unknown>;
        const h = j.headers;
        if (h && typeof h === "object") {
          for (const [k, v] of Object.entries(h as Record<string, unknown>)) {
            if (typeof v === "string" && v.trim()) out[k] = v;
          }
        }
      } catch {
        // fall through to bearer-style
      }
    }
    if (!out.Authorization && !out.authorization) {
      if (/^Bearer\s+/i.test(t)) out.Authorization = t;
      else if (!t.startsWith("{")) out.Authorization = `Bearer ${t}`;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * 将持久化的 `UserMcpConfig` 转为 `@langchain/mcp-adapters` 可识别的连接描述。
 */
export function userMcpConfigToConnection(row: UserMcpConfig, credentialsPlain: string | null): Connection {
  const ep = row.endpoint && typeof row.endpoint === "object" ? row.endpoint : {};
  const headers = mergeHeaders(row.metadata, credentialsPlain);
  const transport = row.transport as McpTransport;

  if (transport === "stdio") {
    const command = typeof ep.command === "string" ? ep.command : "";
    const args = Array.isArray(ep.args) ? (ep.args as unknown[]).filter((a): a is string => typeof a === "string") : [];
    if (!command) {
      throw new Error("stdio 缺少 endpoint.command");
    }
    const env =
      ep.env && typeof ep.env === "object"
        ? Object.fromEntries(
            Object.entries(ep.env as Record<string, unknown>).filter(
              (e): e is [string, string] => typeof e[1] === "string",
            ),
          )
        : undefined;
    const cwd = typeof ep.cwd === "string" ? ep.cwd : undefined;
    return {
      transport: "stdio",
      command,
      args,
      ...(env && Object.keys(env).length ? { env } : {}),
      ...(cwd ? { cwd } : {}),
    };
  }

  const url = typeof ep.url === "string" ? ep.url.trim() : "";
  if (!url) {
    throw new Error("缺少 endpoint.url");
  }

  if (transport === "sse") {
    return {
      transport: "sse",
      url,
      ...(headers ? { headers } : {}),
    };
  }

  // http：Streamable HTTP（仅 url + headers）
  return {
    url,
    ...(headers ? { headers } : {}),
  };
}

export function mcpServerNameForConfigId(configId: string): string {
  return `mcp_${configId.replace(/-/g, "_")}`;
}
