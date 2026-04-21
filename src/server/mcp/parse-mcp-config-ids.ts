import type { JsonErrorDetail } from "@/server/http/json-response";
import { MCP_CONFIG_MAX_PER_ASSISTANT } from "@/common/constants";

export function parseMcpConfigIdsField(raw: unknown, details: JsonErrorDetail[]): string[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    details.push({ field: "mcpConfigIds", message: "须为字符串数组" });
    return undefined;
  }
  const ids = raw
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
  const unique = [...new Set(ids)];
  if (unique.length > MCP_CONFIG_MAX_PER_ASSISTANT) {
    details.push({
      field: "mcpConfigIds",
      message: `最多挂载 ${MCP_CONFIG_MAX_PER_ASSISTANT} 个 MCP 配置`,
    });
    return undefined;
  }
  return unique;
}
