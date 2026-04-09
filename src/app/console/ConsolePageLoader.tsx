"use client";

import dynamic from "next/dynamic";

const ConsoleView = dynamic(() => import("./ConsoleView"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
      加载中…
    </div>
  ),
});

/**
 * 在客户端组件内使用 dynamic(ssr:false)，满足控制台 CSR 交付要求。
 */
export function ConsolePageLoader() {
  return <ConsoleView />;
}
