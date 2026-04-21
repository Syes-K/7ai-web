import type { McpTransport } from "@/common/enums";

function hostOnly(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    return `${u.protocol}//${u.host}${u.pathname === "/" ? "" : u.pathname}`;
  } catch {
    return "(无效 URL)";
  }
}

export function summarizeMcpEndpoint(transport: McpTransport, endpoint: Record<string, unknown>): string {
  if (transport === "stdio") {
    const cmd = typeof endpoint.command === "string" ? endpoint.command : "";
    const args = Array.isArray(endpoint.args) ? (endpoint.args as unknown[]).filter((a) => typeof a === "string") : [];
    const head = [cmd, ...args.slice(0, 2)].join(" ");
    return head.length > 96 ? `${head.slice(0, 93)}...` : head || "(stdio)";
  }
  const url = typeof endpoint.url === "string" ? endpoint.url : "";
  if (!url) return `(${transport})`;
  return hostOnly(url);
}
