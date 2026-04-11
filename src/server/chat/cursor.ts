/**
 * API 分页 cursor：opaque base64url(JSON)，避免暴露内部主键策略细节。
 */

export function encodeCursor(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCursor<T>(raw: string | null): T | null {
  if (!raw?.trim()) {
    return null;
  }
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
