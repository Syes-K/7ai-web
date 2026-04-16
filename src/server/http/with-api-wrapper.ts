import { withApiLog } from "./with-api-log";

/** 使用 `any[]` 以兼容 Next.js 对 `RouteHandler` 的签名推断（避免 `never[]` 导致导出类型不兼容） */
type AnyRouteHandler = (...args: any[]) => Promise<Response> | Response;

/**
 * 可参与组合的中间层（自外向内：`extras[0]` 最先包住 handler，最后套上的最靠近业务）。
 * 默认会在最外层再套上 `withApiLog`。
 * 参数/返回值用 `any`：不同 wrapper（如 `withAdminApi`）对 handler 的约束不一致，由调用处业务函数保证类型。
 */
export type RouteWrapper = (inner: any) => any;

/**
 * API Route 统一入口：**默认包含** `withApiLog`（请求/响应日志 + 落盘），再按需叠加 `extras`。
 *
 * @example 仅默认（日志）
 * ```ts
 * export const POST = withApiWrapper(async (req: Request) => { ... });
 * ```
 *
 * @example 管理端：先鉴权，再业务，最外仍由 `withApiWrapper` 打日志
 * ```ts
 * export const GET = withApiWrapper([withAdminApi], async (user, request, ctx) => { ... });
 * ```
 */
/** 单参数：业务函数即 `(request, …) => Response`，保持签名供 Next.js `RouteHandlerConfig` 校验 */
export function withApiWrapper<H extends AnyRouteHandler>(handler: H): H;

/**
 * 带 `extras` 时，内层函数签名（如 `withAdminApi` 的 `(user, request, ctx)`）与最终导出签名不一致，
 * TypeScript 若用内层推断 `H` 会不满足 App Router 对 `GET`/`POST` 的约束，故返回 `any`。
 */
export function withApiWrapper(
    extras: readonly RouteWrapper[],
    handler: AnyRouteHandler,
): any;

export function withApiWrapper(
    extrasOrHandler: readonly RouteWrapper[] | AnyRouteHandler,
    maybeHandler?: AnyRouteHandler,
): any {
    if (maybeHandler !== undefined) {
        const extras = extrasOrHandler as readonly RouteWrapper[];
        let composed: any = maybeHandler;
        for (const wrap of extras) {
            composed = wrap(composed);
        }
        return withApiLog(composed);
    }
    return withApiLog(extrasOrHandler as AnyRouteHandler);
}
