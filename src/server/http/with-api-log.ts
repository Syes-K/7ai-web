import { logger } from "@/server/logs";

/**
 * 根据 Request 对象生成日志中的 href 字段
 * @param request Request 对象
 * @returns 
 */
function requestHrefForLog(request: Request): string {
    const fallback = new URL(request.url);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost || request.headers.get("host")?.trim();
    const forwardedProto = request.headers
        .get("x-forwarded-proto")
        ?.split(",")[0]
        ?.trim()
        .toLowerCase();
    const proto =
        forwardedProto && (forwardedProto === "http" || forwardedProto === "https")
            ? forwardedProto
            : fallback.protocol.replace(":", "");
    if (!host) {
        return fallback.href;
    }
    return `${proto}://${host}${fallback.pathname}${fallback.search}`;
}

/**
 * 包裹 App Router Route Handler（Node runtime），统一记录请求与响应。
 */
export function withApiLog<H extends (...args: any[]) => Promise<Response> | Response>(
    handler: H,
): H {
    return (async (...args: Parameters<H>) => {
        const req = args[0] as unknown;
        if (!(req instanceof Request)) {
            return handler(...args);
        }
        const request = req as Request;
        const href = requestHrefForLog(request);
        const method = request.method;
        // `request.body` 为 ReadableStream，JSON 序列化常为 {}，且不能在此读取（会消费流）；只记元数据
        logger.info("api.request", {
            method,
            href,
            referer: request.headers.get("referer"),
            contentType: request.headers.get("content-type"),
            contentLength: request.headers.get("content-length"),
            hasBody: request.body != null,
        });
        return handler(...args);
    }) as H;
}
