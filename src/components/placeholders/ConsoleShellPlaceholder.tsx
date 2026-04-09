"use client";

/**
 * 控制台页面骨架占位（CSR 页面内使用）：统计与配置区均为静态框线。
 */
export function ConsoleShellPlaceholder() {
  return (
    <div className="space-y-6">
      <section aria-label="统计区块占位">
        <div className="grid gap-4 sm:grid-cols-3">
          {["指标 A", "指标 B", "指标 C"].map((label) => (
            <div
              key={label}
              className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm"
            >
              {label}
            </div>
          ))}
        </div>
      </section>
      <section
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        aria-label="配置区块占位"
      >
        <div className="h-32 rounded-lg border border-dashed border-slate-200 bg-slate-50/80" />
      </section>
    </div>
  );
}
