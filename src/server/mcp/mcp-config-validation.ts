import type { AppLocale } from "@/common/constants/i18n";
import type { JsonErrorDetail } from "@/server/http/json-response";
import { MCP_TRANSPORT_VALUES, type McpTransport } from "@/common/enums";
import {
  MCP_CONFIG_DESCRIPTION_MAX_LENGTH,
  MCP_CONFIG_NAME_MAX_LENGTH,
  MCP_CONFIG_TRANSPORT_MAX_LENGTH,
} from "@/common/constants";
import { tApiMessage } from "@/server/i18n/t-api-message";

export function trimString(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

export function parseBoolean(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === "boolean") return raw;
  return fallback;
}

/**
 * MCP 配置字段校验；details[].message 经 locale 翻译后写入 API 响应。
 */
export function validateMcpName(
  name: string,
  details: JsonErrorDetail[],
  locale: AppLocale,
): void {
  if (!name) {
    details.push({ field: "name", message: tApiMessage(locale, "validation.required") });
  } else if (name.length > MCP_CONFIG_NAME_MAX_LENGTH) {
    details.push({
      field: "name",
      message: tApiMessage(locale, "validation.maxLength", { max: MCP_CONFIG_NAME_MAX_LENGTH }),
    });
  }
}

export function validateMcpDescription(
  raw: unknown,
  details: JsonErrorDetail[],
  locale: AppLocale,
): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== "string") {
    details.push({
      field: "description",
      message: tApiMessage(locale, "validation.mcpDescriptionStringOrNull"),
    });
    return undefined;
  }
  const d = raw.trim();
  if (d.length > MCP_CONFIG_DESCRIPTION_MAX_LENGTH) {
    details.push({
      field: "description",
      message: tApiMessage(locale, "validation.maxLength", {
        max: MCP_CONFIG_DESCRIPTION_MAX_LENGTH,
      }),
    });
    return undefined;
  }
  return d.length > 0 ? d : null;
}

export function validateMcpTransport(
  raw: unknown,
  details: JsonErrorDetail[],
  locale: AppLocale,
): McpTransport | undefined {
  const t = trimString(raw);
  if (!t) {
    details.push({
      field: "transport",
      message: tApiMessage(locale, "validation.mcpTransportRequired"),
    });
    return undefined;
  }
  if (t.length > MCP_CONFIG_TRANSPORT_MAX_LENGTH) {
    details.push({
      field: "transport",
      message: tApiMessage(locale, "validation.mcpTransportMaxLength"),
    });
    return undefined;
  }
  if (!MCP_TRANSPORT_VALUES.includes(t as McpTransport)) {
    details.push({
      field: "transport",
      message: tApiMessage(locale, "validation.mcpTransportAllowed", {
        allowed: MCP_TRANSPORT_VALUES.join(" / "),
      }),
    });
    return undefined;
  }
  return t as McpTransport;
}

export function validateMcpEndpoint(
  endpoint: unknown,
  details: JsonErrorDetail[],
  locale: AppLocale,
): Record<string, unknown> | undefined {
  if (endpoint === undefined || endpoint === null) {
    details.push({
      field: "endpoint",
      message: tApiMessage(locale, "validation.mcpEndpointRequired"),
    });
    return undefined;
  }
  if (typeof endpoint !== "object" || Array.isArray(endpoint)) {
    details.push({
      field: "endpoint",
      message: tApiMessage(locale, "validation.mcpEndpointObjectRequired"),
    });
    return undefined;
  }
  return endpoint as Record<string, unknown>;
}

export function validateMcpEndpointShape(
  transport: McpTransport,
  ep: Record<string, unknown>,
  details: JsonErrorDetail[],
  locale: AppLocale,
): void {
  if (transport === "stdio") {
    if (typeof ep.command !== "string" || !ep.command.trim()) {
      details.push({
        field: "endpoint.command",
        message: tApiMessage(locale, "validation.mcpStdioCommandRequired"),
      });
    }
    if (ep.args !== undefined && !Array.isArray(ep.args)) {
      details.push({
        field: "endpoint.args",
        message: tApiMessage(locale, "validation.mcpEndpointArgsStringArray"),
      });
    }
    return;
  }
  if (typeof ep.url !== "string" || !ep.url.trim()) {
    details.push({
      field: "endpoint.url",
      message: tApiMessage(locale, "validation.mcpEndpointUrlRequired"),
    });
    return;
  }
  try {
    void new URL(ep.url as string);
  } catch {
    details.push({
      field: "endpoint.url",
      message: tApiMessage(locale, "validation.mcpEndpointUrlInvalid"),
    });
  }
}

export function validateMcpMetadata(
  raw: unknown,
  details: JsonErrorDetail[],
  locale: AppLocale,
): Record<string, unknown> | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    details.push({
      field: "metadata",
      message: tApiMessage(locale, "validation.mcpMetadataObjectOrNull"),
    });
    return undefined;
  }
  return raw as Record<string, unknown>;
}
