/**
 * 首页模块占位块：仅表达未来扩展位，无交互。
 */
export function ModuleBlockPlaceholder({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-[72px] items-center rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 text-sm text-slate-500"
      aria-hidden
    >
      {label}
    </div>
  );
}
