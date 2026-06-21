import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { skillConfigConsoleDeprecatedResponse } from "@/server/skill/skill-config-api-responses";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

/** @deprecated 0.1.21 */
export const GET = withApiWrapper(async (request: Request, _ctx: RouteParams) => {
  const locale = resolveRequestLocale(request);
  return skillConfigConsoleDeprecatedResponse(locale);
});

/** @deprecated 0.1.21 */
export const PATCH = withApiWrapper(async (request: Request, _ctx: RouteParams) => {
  const locale = resolveRequestLocale(request);
  return skillConfigConsoleDeprecatedResponse(locale);
});

/** @deprecated 0.1.21 */
export const DELETE = withApiWrapper(async (request: Request, _ctx: RouteParams) => {
  const locale = resolveRequestLocale(request);
  return skillConfigConsoleDeprecatedResponse(locale);
});
