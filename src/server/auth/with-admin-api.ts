import type { NextRequest } from "next/server";
import type { User } from "../db/entities/User";
import { requireAdminApi } from "./admin";

/**
 * App Router 第二参数（动态路由时为分段占位符）。
 * 无动态段的 route 仍会得到 `params` Promise，业务可忽略。
 */
export type AdminApiHandlerContext = {
  params: Promise<Record<string, string | string[]>>;
};

/**
 * 统一管理员 API 鉴权：先 `requireAdminApi`，再执行业务。
 * 新增 `src/app/api/admin` 下各 `route.ts` 时优先用本包装，避免每处手写校验。
 *
 * @example
 * export const GET = withAdminApi(async (_user, _request, _ctx) => {
 *   return NextResponse.json({ ok: true });
 * });
 */
export function withAdminApi(
  handler: (
    user: User,
    request: NextRequest,
    context: AdminApiHandlerContext,
  ) => Promise<Response>,
): (request: NextRequest, context: AdminApiHandlerContext) => Promise<Response> {
  return async (request, context) => {
    const gate = await requireAdminApi();
    if (!gate.ok) {
      return gate.response;
    }
    return handler(gate.user, request, context);
  };
}
