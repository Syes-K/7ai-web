"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { EmptyStateCard } from "@/components/placeholders/EmptyStateCard";
import { ConsoleShellPlaceholder } from "@/components/placeholders/ConsoleShellPlaceholder";
import { NavPlaceholder } from "@/components/placeholders/NavPlaceholder";

/**
 * 控制台整页：CSR；校验会话（防过期 Cookie 仍通过 middleware）。
 */
export default function ConsoleView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [adminForbiddenNotice, setAdminForbiddenNotice] = useState(false);

  useEffect(() => {
    if (searchParams.get("notice") === "admin_forbidden") {
      setAdminForbiddenNotice(true);
    }
  }, [searchParams]);

  const dismissAdminNotice = useCallback(() => {
    setAdminForbiddenNotice(false);
    router.replace("/console", { scroll: false });
  }, [router]);

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
        {adminForbiddenNotice ? (
          <div
            className="mb-6 flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"
            role="status"
          >
            <p>
              当前账号不在管理后台白名单中，无法进入系统管理。如需权限请联系管理员配置{" "}
              <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs">ADMIN_USER</code>
              。
            </p>
            <button
              type="button"
              onClick={dismissAdminNotice}
              className="shrink-0 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-amber-900 transition hover:bg-amber-100"
            >
              知道了
            </button>
          </div>
        ) : null}
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
