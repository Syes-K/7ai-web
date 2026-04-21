import type { JsonErrorDetail } from "@/server/http/json-response";
import { MCP_TRANSPORT_VALUES, type McpTransport } from "@/common/enums";
import {
  MCP_CONFIG_DESCRIPTION_MAX_LENGTH,
  MCP_CONFIG_NAME_MAX_LENGTH,
  MCP_CONFIG_TRANSPORT_MAX_LENGTH,
} from "@/common/constants";

export function trimString(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

export function parseBoolean(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === "boolean") return raw;
  return fallback;
}

export function validateMcpName(name: string, details: JsonErrorDetail[]): void {
  if (!name) details.push({ field: "name", message: "不能为空" });
  else if (name.length > MCP_CONFIG_NAME_MAX_LENGTH) {
    details.push({ field: "name", message: `长度不能超过 ${MCP_CONFIG_NAME_MAX_LENGTH}` });
  }
}

export function validateMcpDescription(raw: unknown, details: JsonErrorDetail[]): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== "string") {
    details.push({ field: "description", message: "须为字符串或 null" });
    return undefined;
  }
  const d = raw.trim();
  if (d.length > MCP_CONFIG_DESCRIPTION_MAX_LENGTH) {
    details.push({ field: "description", message: `长度不能超过 ${MCP_CONFIG_DESCRIPTION_MAX_LENGTH}` });
    return undefined;
  }
  return d.length > 0 ? d : null;
}

export function validateMcpTransport(raw: unknown, details: JsonErrorDetail[]): McpTransport | undefined {
  const t = trimString(raw);
  if (!t) {
    details.push({ field: "transport", message: "不能为空" });
    return undefined;
  }
  if (t.length > MCP_CONFIG_TRANSPORT_MAX_LENGTH) {
    details.push({ field: "transport", message: `长度不能超过 ${MCP_CONFIG_TRANSPORT_MAX_LENGTH}` });
    return undefined;
  }
  if (!MCP_TRANSPORT_VALUES.includes(t as McpTransport)) {
    details.push({ field: "transport", message: `须为 ${MCP_TRANSPORT_VALUES.join(" / ")} 之一` });
    return undefined;
  }
  return t as McpTransport;
}

export function validateMcpEndpoint(endpoint: unknown, details: JsonErrorDetail[]): Record<string, unknown> | undefined {
  if (endpoint === undefined || endpoint === null) {
    details.push({ field: "endpoint", message: "不能为空" });
    return undefined;
  }
  if (typeof endpoint !== "object" || Array.isArray(endpoint)) {
    details.push({ field: "endpoint", message: "须为 JSON 对象" });
    return undefined;
  }
  return endpoint as Record<string, unknown>;
}

export function validateMcpEndpointShape(transport: McpTransport, ep: Record<string, unknown>, details: JsonErrorDetail[]): void {
  if (transport === "stdio") {
    if (typeof ep.command !== "string" || !ep.command.trim()) {
      details.push({ field: "endpoint.command", message: "stdio 须提供非空 command" });
    }
    if (ep.args !== undefined && !Array.isArray(ep.args)) {
      details.push({ field: "endpoint.args", message: "须为字符串数组" });
    }
    return;
  }
  if (typeof ep.url !== "string" || !ep.url.trim()) {
    details.push({ field: "endpoint.url", message: "须提供非空 url" });
    return;
  }
  try {
    void new URL(ep.url as string);
  } catch {
    details.push({ field: "endpoint.url", message: "url 格式无效" });
  }
}

export function validateMcpMetadata(raw: unknown, details: JsonErrorDetail[]): Record<string, unknown> | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    details.push({ field: "metadata", message: "须为 JSON 对象或 null" });
    return undefined;
  }
  return raw as Record<string, unknown>;
}
