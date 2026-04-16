import { logger } from "@/server/logs";

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
        const href = new URL(request.url).href;
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
