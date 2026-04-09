/**
 * 进程内简单频控（单实例）；多节点需外置存储。
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * 允许请求
 * @param key 频控 key
 * @param limit 限制次数
 * @param windowMs 窗口时间（毫秒）
 * @returns 是否允许
 */
export function allowRate(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) {
    return false;
  }
  b.count += 1;
  return true;
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    return xff.split(",")[0]?.trim() || "unknown";
  }
  return "unknown";
}
