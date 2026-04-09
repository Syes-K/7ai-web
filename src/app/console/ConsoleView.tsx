"use client";

import { EmptyStateCard } from "@/components/placeholders/EmptyStateCard";
import { ConsoleShellPlaceholder } from "@/components/placeholders/ConsoleShellPlaceholder";
import { NavPlaceholder } from "@/components/placeholders/NavPlaceholder";

/**
 * 控制台整页：客户端渲染（由 page 中 dynamic(ssr:false) 挂载），无业务逻辑。
 */
export default function ConsoleView() {
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
