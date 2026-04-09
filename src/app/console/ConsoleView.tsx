"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyStateCard } from "@/components/placeholders/EmptyStateCard";
import { ConsoleShellPlaceholder } from "@/components/placeholders/ConsoleShellPlaceholder";
import { NavPlaceholder } from "@/components/placeholders/NavPlaceholder";

/**
 * 控制台整页：CSR；校验会话（防过期 Cookie 仍通过 middleware）。
 */
export default function ConsoleView() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/auth/me");
      if (cancelled) {
        return;
      }
      if (res.status === 401) {
        router.replace("/login?redirect=/console");
        return;
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        验证会话…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavPlaceholder />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          控制台
        </h1>
        <div className="mt-8 space-y-6">
          <ConsoleShellPlaceholder />
          <EmptyStateCard>
            控制台占位中：配置管理与数据看板功能尚未开放。
          </EmptyStateCard>
        </div>
      </main>
    </div>
  );
}
