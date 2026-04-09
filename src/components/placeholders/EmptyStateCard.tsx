"use client";

type EmptyStateCardProps = {
  children: React.ReactNode;
};

/**
 * 主占位卡片：承载页面说明文案。
 */
export function EmptyStateCard({ children }: EmptyStateCardProps) {
  return (
    <section
      className="rounded-xl border border-dashed border-slate-300 bg-white p-6 shadow-sm sm:p-8"
      aria-label="占位说明"
    >
      <p className="text-base leading-relaxed text-slate-800">{children}</p>
    </section>
  );
}
