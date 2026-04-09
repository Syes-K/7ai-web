import { NavPlaceholder } from "./NavPlaceholder";

type PageShellProps = {
  title: string;
  children: React.ReactNode;
};

/**
 * 通用页面壳层：SSR 页面复用；仅布局与排版，不含业务状态。
 */
export function PageShell({ title, children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <NavPlaceholder />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {title}
        </h1>
        <div className="mt-8 space-y-6">{children}</div>
      </main>
    </div>
  );
}
