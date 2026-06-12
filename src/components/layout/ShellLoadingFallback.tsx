/** 控制台/管理后台 hydration 前占位：纯 Tailwind，不依赖 antd */
export function ShellLoadingFallback() {
  return (
    <div
      className="flex min-h-[calc(100vh-56px)] flex-col gap-4 p-6"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="h-8 w-48 animate-pulse rounded bg-zinc-800/90" />
      <div className="flex flex-1 flex-col gap-4 lg:flex-row">
        <div className="hidden h-64 w-52 shrink-0 animate-pulse rounded-lg bg-zinc-900/80 lg:block" />
        <div className="min-h-[320px] flex-1 animate-pulse rounded-lg border border-zinc-800 bg-zinc-900/60" />
      </div>
      <p className="text-sm text-zinc-500">Loading…</p>
    </div>
  );
}
