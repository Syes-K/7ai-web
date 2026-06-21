import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { skillConfigConsoleDeprecatedResponse } from "@/server/skill/skill-config-api-responses";

export const runtime = "nodejs";

/** @deprecated 0.1.21 */
export const POST = withApiWrapper(async (request: Request) => {
  const locale = resolveRequestLocale(request);
  return skillConfigConsoleDeprecatedResponse(locale);
});
