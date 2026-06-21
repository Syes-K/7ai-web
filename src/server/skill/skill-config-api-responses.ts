import type { AppLocale } from "@/common/constants/i18n";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";
import { tApiMessage } from "@/server/i18n/t-api-message";

/** Console skill-configs API 已废弃，统一返回 410。 */
export function skillConfigConsoleDeprecatedResponse(locale: AppLocale) {
  return jsonError(
    ErrorCode.SKILL_CONFIG_CONSOLE_DEPRECATED,
    tApiMessage(locale, "skillConfigConsoleDeprecated"),
    HttpStatus.GONE,
  );
}

/** Admin 禁止在线写 Skill Pack，统一返回 403。 */
export function skillConfigWriteDisabledResponse(locale: AppLocale) {
  return jsonError(
    ErrorCode.SKILL_CONFIG_WRITE_DISABLED,
    tApiMessage(locale, "skillConfigWriteDisabled"),
    HttpStatus.FORBIDDEN,
  );
}
