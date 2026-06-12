"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * 客户端 hydration 完成前不渲染 ProLayout / ProTable，避免慢网下 antd CSS-in-JS 未注入时出现「无样式 HTML」。
 */
export function ShellHydrationGate({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
