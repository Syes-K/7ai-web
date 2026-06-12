/** Profile 页 chunk 加载或 API 等待时的纯 CSS 占位（不依赖 antd hydration） */
export function ProfilePageFallback() {
  return (
    <div
      className="min-h-[420px] max-w-[1400px] space-y-5"
      aria-busy="true"
      aria-label="Loading profile"
    >
      <p className="text-sm text-zinc-500">Loading…</p>
      <div className="animate-pulse rounded-lg border border-zinc-800 bg-zinc-900/80 p-6">
        <div className="mb-4 h-5 w-28 rounded bg-zinc-700/80" />
        <div className="space-y-4">
          <div className="h-8 w-full max-w-md rounded bg-zinc-800/90" />
          <div className="h-8 w-full max-w-md rounded bg-zinc-800/90" />
          <div className="h-8 w-full max-w-md rounded bg-zinc-800/70" />
        </div>
      </div>
      <div className="animate-pulse rounded-lg border border-zinc-800 bg-zinc-900/80 p-6">
        <div className="mb-4 h-5 w-32 rounded bg-zinc-700/80" />
        <div className="space-y-4">
          <div className="h-8 w-full max-w-lg rounded bg-zinc-800/90" />
          <div className="h-8 w-full max-w-lg rounded bg-zinc-800/90" />
          <div className="h-8 w-full max-w-sm rounded bg-zinc-800/70" />
        </div>
      </div>
    </div>
  );
}
