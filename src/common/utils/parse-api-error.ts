/** parseApiError 选项：传入 page.console.shell 命名空间的 t */
type ParseApiErrorOptions = {
  t: (key: string, values?: Record<string, string | number>) => string;
};

/**
 * 统一解析 REST 错误响应：优先展示 API error.message，否则回退 shell.errors。
 */
export async function parseApiError(
  res: Response,
  { t }: ParseApiErrorOptions,
): Promise<string> {
  const j = (await res.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  const msg = j?.error?.message?.trim();
  if (msg) return msg;
  return t("errors.requestFailed", { status: res.status });
}
