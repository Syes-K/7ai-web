import type { AppLocale } from "@/common/constants/i18n";
import type { JsonErrorDetail } from "@/server/http/json-response";
import { MCP_CONFIG_MAX_PER_ASSISTANT } from "@/common/constants";
import { tApiMessage } from "@/server/i18n/t-api-message";

/** 解析助手挂载的 mcpConfigIds；message 经 locale 翻译后写入 details。 */
export function parseMcpConfigIdsField(
  raw: unknown,
  details: JsonErrorDetail[],
  locale: AppLocale,
): string[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    details.push({
      field: "mcpConfigIds",
      message: tApiMessage(locale, "validation.mcpConfigIdsStringArray"),
    });
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
      message: tApiMessage(locale, "validation.mcpConfigMaxPerAssistant", {
        max: MCP_CONFIG_MAX_PER_ASSISTANT,
      }),
    });
    return undefined;
  }
  return unique;
}
